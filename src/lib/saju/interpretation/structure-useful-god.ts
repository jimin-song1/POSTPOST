import { STRUCTURE_INTERACTIONS_V1 } from "@/rules/structure-interactions.v1";
import { STRUCTURE_RESCUE_V1 } from "@/rules/structure-rescue.v1";
import { STRUCTURE_CORE_V1, STRUCTURE_USEFUL_GOD_V1 as RULE,
  type StandardStructure, type TenGodCategory } from "@/rules/structure-useful-god.v1";
import type { AdjustedStrengthResult, Element, Stem, StructureResult } from "@/types/saju-analysis";
import type { StructureUsefulCandidate, StructureUsefulEvidence, StructureUsefulResult,
  StructureUsefulRole, StructureUsefulSource } from "@/types/useful-gods";
import { categoryElement, tenGodCategory } from "./ten-god-category";

const isStandard = (value: string | undefined): value is StandardStructure =>
  value !== undefined && value in STRUCTURE_CORE_V1;

export function structureUsefulRole(score: number): StructureUsefulRole {
  if (score >= RULE.roles.primaryMinimum) return "PRIMARY_STRUCTURE";
  if (score >= RULE.roles.strongMinimum) return "STRONG_STRUCTURE";
  if (score >= RULE.roles.supportingMinimum) return "SUPPORTING_STRUCTURE";
  if (score >= RULE.roles.conditionalMinimum) return "CONDITIONAL_STRUCTURE";
  return "NOT_NEEDED";
}

export function structureAvailabilityAdjustment(percentage: number): number {
  return RULE.availability.find((row) => "maximumExclusive" in row
    ? percentage < row.maximumExclusive : percentage <= row.maximumInclusive)!.delta;
}

export function emptyStructureUseful(): StructureUsefulResult {
  return { status: "not_implemented", ruleVersion: RULE.rulesetVersion,
    coreRuleVersion: RULE.coreRuleVersion, preferenceRuleVersion: RULE.preferenceRuleVersion,
    interactionRuleVersion: STRUCTURE_INTERACTIONS_V1.ruleVersion,
    rescueRuleVersion: STRUCTURE_RESCUE_V1.ruleVersion, structureType: null,
    applicability: "NOT_APPLICABLE", confidence: "LOW", core: null, candidates: [],
    elementPreferences: [], damageContext: [], rescueContext: [], mixedContext: [],
    specialStructureCaution: false, evidence: [] };
}

export function evaluateStructureUsefulGod(dayStem: Stem | null, adjusted: AdjustedStrengthResult,
  structure: StructureResult): StructureUsefulResult {
  if (!dayStem || adjusted.status !== "implemented" || !adjusted.elements ||
    structure.status !== "implemented") return emptyStructureUseful();
  const type = structure.primary?.type;
  const base = emptyStructureUseful();
  base.status = "implemented";
  base.structureType = type ?? null;
  base.damageContext = structure.qualityEvaluation.damageSignals.map(({ id, tenGod }) => ({ id, tenGod }));
  base.rescueContext = structure.qualityEvaluation.rescueSignals.map(({ id, tenGod, rescuesDamageId }) =>
    ({ id, tenGod, rescuesDamageId: rescuesDamageId! }));
  base.mixedContext = structure.mixedPatterns.map(({ candidate, positions }) => ({ candidate, positions }));
  const qualified = structure.specialStructure.candidates.filter((row) => row.state === "QUALIFIED_CANDIDATE");
  base.specialStructureCaution = qualified.length > 0;
  if (!isStandard(type)) {
    base.applicability = type === "건록격" || type === "양인격" ? "LIMITED" : "NOT_APPLICABLE";
    return base;
  }

  base.applicability = qualified.length ? "CAUTION_SPECIAL_STRUCTURE" : "STANDARD";
  base.confidence = qualified.length || structure.primary?.status === "MIXED" ? "LOW" :
    structure.primary?.status === "ESTABLISHED" ? "HIGH" : "MEDIUM";
  const coreCategory = STRUCTURE_CORE_V1[type];
  base.core = { tenGodCategory: coreCategory, element: categoryElement(dayStem, coreCategory) };
  const sourceRows: Array<{ element: Element; source: StructureUsefulSource }> = [];
  const add = (category: TenGodCategory, source: Omit<StructureUsefulSource, "tenGodCategory" | "structure">) =>
    sourceRows.push({ element: categoryElement(dayStem, category),
      source: { ...source, tenGodCategory: category, structure: type } });
  add(coreCategory, { type: "CORE", score: RULE.scores.core,
    currentlyActive: structure.primary?.exposed ?? false });

  const supportCategories = Array.from(new Set(
    STRUCTURE_INTERACTIONS_V1.standard[type].support.map(tenGodCategory)));
  for (const category of supportCategories) add(category, { type: "SUPPORT", score: RULE.scores.support,
    currentlyActive: structure.qualityEvaluation.supportSignals.some((row) => tenGodCategory(row.tenGod) === category) });

  for (const damage of structure.qualityEvaluation.damageSignals) {
    const rescue = structure.qualityEvaluation.rescueSignals.find((row) => row.rescuesDamageId === damage.id);
    const rescueTenGod = STRUCTURE_INTERACTIONS_V1.standard[type].rescue[0];
    if (!rescueTenGod || !(STRUCTURE_RESCUE_V1.triggers[type] as readonly string[]).includes(damage.tenGod)) continue;
    add(tenGodCategory(rescueTenGod), { type: "RESCUE",
      score: rescue ? RULE.scores.alreadyRescued : RULE.scores.unresolvedRescue,
      currentlyActive: Boolean(rescue), damageId: damage.id,
      rescueState: rescue ? "ALREADY_RESCUED" : "UNRESOLVED" });
  }

  const grouped = new Map<Element, StructureUsefulSource[]>();
  for (const row of sourceRows) grouped.set(row.element, [...(grouped.get(row.element) ?? []), row.source]);
  const canonical = (element: Element) => RULE.canonicalElementOrder.indexOf(element);
  base.candidates = Array.from(grouped.entries()).map(([element, sources]): StructureUsefulCandidate => {
    const sorted = [...sources].sort((a, b) => b.score - a.score || a.type.localeCompare(b.type));
    const evidence: StructureUsefulEvidence[] = sorted.map((source, index) => ({
      factor: source.type === "CORE" ? "STRUCTURE_CORE" : source.type === "SUPPORT" ?
        "STRUCTURE_SUPPORT" : "STRUCTURE_RESCUE",
      delta: source.score * (RULE.aggregationWeights[index] ?? 0),
      details: { structure: type, tenGodCategory: source.tenGodCategory,
        sourceScore: source.score, aggregationWeight: RULE.aggregationWeights[index] ?? 0,
        currentlyActive: source.currentlyActive, ...(source.damageId ? { damageId: source.damageId } : {}),
        ...(source.rescueState ? { rescueState: source.rescueState } : {}) }
    }));
    const structuralScore = evidence.reduce((sum, row) => sum + row.delta, 0);
    const availabilityPercentage = adjusted.elements![element].percentage;
    const availabilityAdjustment = structureAvailabilityAdjustment(availabilityPercentage);
    evidence.push({ factor: "ELEMENT_AVAILABILITY", delta: availabilityAdjustment,
      details: { element, percentage: availabilityPercentage } });
    const finalScore = structuralScore + availabilityAdjustment;
    return { element, tenGodCategories: Array.from(new Set(sources.map((row) => row.tenGodCategory))), sources,
      availabilityPercentage, availabilityAdjustment, structuralScore, finalScore,
      role: structureUsefulRole(finalScore), evidence };
  }).sort((a, b) => b.finalScore - a.finalScore || canonical(a.element) - canonical(b.element));
  base.elementPreferences = base.candidates.map(({ element, finalScore: score, role }) => ({ element, score, role }));
  base.evidence = [{ factor: "PRIMARY_STATUS", delta: 0,
    details: { status: structure.primary?.status, confidence: base.confidence } }];
  if (structure.mixedPatterns.length) base.evidence.push({ factor: "MIXED_CONTEXT", delta: 0,
    details: { patterns: base.mixedContext } });
  if (qualified.length) base.evidence.push({ factor: "SPECIAL_STRUCTURE_CONTEXT", delta: 0,
    details: { qualifiedCandidates: qualified.map((row) => row.type) } });
  return base;
}
