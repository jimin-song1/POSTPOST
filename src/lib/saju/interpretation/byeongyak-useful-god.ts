import { BYEONGYAK_EXCESS_MEDICINE_TABLE, BYEONGYAK_USEFUL_GOD_V1 as RULE,
  type MedicineCategory } from "@/rules/byeongyak-useful-god.v1";
import { STRUCTURE_INTERACTIONS_V1 } from "@/rules/structure-interactions.v1";
import type { AdjustedStrengthResult, Element, RelationsResult, Stem,
  StrengthResult, StructureResult, StructureType } from "@/types/saju-analysis";
import type { ByeongyakDisease, ByeongyakElementPreference, ByeongyakEvidence,
  ByeongyakMedicineCandidate, ByeongyakMedicineRole, ByeongyakResult,
  TonggwanResult } from "@/types/useful-gods";
import { categoryElement, tenGodCategory } from "./ten-god-category";

type StandardStructure = keyof typeof STRUCTURE_INTERACTIONS_V1.standard;
const isStandard = (type: StructureType | undefined): type is StandardStructure =>
  type !== undefined && type in STRUCTURE_INTERACTIONS_V1.standard;

export function medicineElement(dayStem: Stem, medicineCategory: MedicineCategory): Element {
  return categoryElement(dayStem, medicineCategory);
}

export function byeongyakRole(score: number): ByeongyakMedicineRole {
  if (score >= RULE.roles.primaryMinimum) return "PRIMARY_MEDICINE";
  if (score >= RULE.roles.strongMinimum) return "STRONG_MEDICINE";
  if (score >= RULE.roles.supportingMinimum) return "SUPPORTING_MEDICINE";
  if (score >= RULE.roles.conditionalMinimum) return "CONDITIONAL_MEDICINE";
  if (score >= RULE.roles.lowMinimum) return "LOW_NEED";
  return "NOT_NEEDED";
}

export function medicineAvailabilityAdjustment(percentage: number): number {
  return RULE.availability.find((entry) => "maximumExclusive" in entry
    ? percentage < entry.maximumExclusive : percentage <= entry.maximumInclusive)!.delta;
}

export function emptyByeongyak(): ByeongyakResult {
  return { status: "not_implemented", ruleVersion: RULE.rulesetVersion,
    diseaseRuleVersion: RULE.diseaseRuleVersion, medicineRuleVersion: RULE.medicineRuleVersion,
    applicability: "NOT_APPLICABLE", diseases: [], medicineCandidates: [], elementPreferences: [],
    context: { strength: { originalScore: null, originalLevel: null, adjustedScore: null, adjustedLevel: null },
      structure: { type: null, integrity: "UNRESOLVED", qualityScore: null },
      tonggwan: { applicability: "NOT_APPLICABLE", candidateElements: [] }, relationIds: [],
      transformedRelationIds: [], rootDamageIds: [] }, evidence: [] };
}

function structureDiseases(structure: StructureResult): Array<{ disease: ByeongyakDisease;
  medicineCategory: MedicineCategory }> {
  const type = structure.primary?.type;
  if (structure.qualityEvaluation.status !== "implemented" || !isStandard(type)) return [];
  const rescueTenGods = STRUCTURE_INTERACTIONS_V1.standard[type].rescue;
  if (!rescueTenGods.length) return [];
  return structure.qualityEvaluation.damageSignals.map((damage) => {
    const rescue = structure.qualityEvaluation.rescueSignals.find((row) => row.rescuesDamageId === damage.id);
    const severityScore = rescue ? RULE.structureDamage.rescuedSeverity : RULE.structureDamage.activeSeverity;
    const evidence: ByeongyakEvidence[] = [{ factor: "STRUCTURE_DAMAGE_SEVERITY", delta: severityScore,
      details: { sourceDamageId: damage.id, structureType: type, damagingTenGod: damage.tenGod,
        linkedRescue: rescue?.id ?? null } }];
    if (rescue) evidence.push({ factor: "EXISTING_RESCUE", delta: 0,
      details: { rescueId: rescue.id, tenGod: rescue.tenGod, rescuesDamageId: damage.id } });
    return { disease: { id: `structure-damage:${damage.id}`, type: "STRUCTURE_DAMAGE" as const,
      state: rescue ? "ALREADY_RESCUED" as const : "ACTIVE" as const,
      severityLevel: "STRUCTURAL" as const, severityScore, sourceDamageId: damage.id,
      structureType: type, damagingTenGod: damage.tenGod,
      ...(rescue ? { existingRescue: { id: rescue.id, tenGod: rescue.tenGod,
        stem: rescue.stem, position: rescue.position } } : {}), evidence },
      medicineCategory: tenGodCategory(rescueTenGods[0]) };
  });
}

function excessDisease(adjusted: AdjustedStrengthResult): ByeongyakDisease | null {
  if (adjusted.status !== "implemented" || !adjusted.elements) return null;
  const ranked = RULE.canonicalElementOrder.map((element) => ({ element,
    percentage: adjusted.elements![element].percentage })).sort((a, b) => b.percentage - a.percentage ||
      RULE.canonicalElementOrder.indexOf(a.element) - RULE.canonicalElementOrder.indexOf(b.element));
  const top = ranked[0], second = ranked[1], gap = top.percentage - second.percentage;
  if (top.percentage < RULE.excess.minimumPercentage || gap < RULE.excess.minimumGapPercentagePoints) return null;
  const severity = RULE.excess.severity.find((row) => top.percentage >= row.minimum)!;
  const id = `dominant-excess:${top.element}`;
  return { id, type: "DOMINANT_ELEMENT_EXCESS", state: "ACTIVE", severityLevel: severity.level,
    severityScore: severity.score, dominantElement: top.element, dominantPercentage: top.percentage,
    secondHighestPercentage: second.percentage, gapPercentagePoints: gap,
    evidence: [{ factor: "DOMINANT_EXCESS_SEVERITY", delta: severity.score,
      details: { element: top.element, percentage: top.percentage,
        secondHighestPercentage: second.percentage, gapPercentagePoints: gap,
        severity: severity.level } }] };
}

function makeCandidate(element: Element, disease: ByeongyakDisease,
  strategy: ByeongyakMedicineCandidate["strategy"], strategyScore: number,
  adjusted: NonNullable<AdjustedStrengthResult["elements"]>): ByeongyakMedicineCandidate {
  const medicinePercentage = adjusted[element].percentage;
  const availabilityAdjustment = medicineAvailabilityAdjustment(medicinePercentage);
  const finalScore = disease.severityScore + strategyScore + availabilityAdjustment;
  const evidence: ByeongyakEvidence[] = [...disease.evidence,
    { factor: "MEDICINE_STRATEGY", delta: strategyScore,
      details: { strategy, element, treatsDiseaseId: disease.id } },
    { factor: "MEDICINE_AVAILABILITY", delta: availabilityAdjustment,
      details: { element, percentage: medicinePercentage } }];
  return { element, treatsDiseaseId: disease.id, strategy, diseaseScore: disease.severityScore,
    strategyScore, availabilityAdjustment, medicinePercentage, finalScore,
    role: byeongyakRole(finalScore), state: disease.state === "ALREADY_RESCUED" ? "ALREADY_RESCUED" :
      finalScore <= 0 ? "NOT_NEEDED" : "NEEDED", evidence };
}

export function evaluateByeongyakUsefulGod(dayStem: Stem | null, adjusted: AdjustedStrengthResult,
  strength: StrengthResult, structure: StructureResult, relations: RelationsResult,
  tonggwan: TonggwanResult): ByeongyakResult {
  if (!dayStem || adjusted.status !== "implemented" || !adjusted.elements ||
    structure.status !== "implemented") return emptyByeongyak();
  const structured = structureDiseases(structure);
  const excess = excessDisease(adjusted);
  const diseases = [...structured.map((row) => row.disease), ...(excess ? [excess] : [])];
  const medicineCandidates: ByeongyakMedicineCandidate[] = [];
  for (const row of structured) medicineCandidates.push(makeCandidate(
    medicineElement(dayStem, row.medicineCategory), row.disease, "STRUCTURE_RESCUE",
    RULE.structureDamage.medicineStrategyBase, adjusted.elements));
  if (excess?.dominantElement) {
    const medicine = BYEONGYAK_EXCESS_MEDICINE_TABLE[excess.dominantElement];
    medicineCandidates.push(makeCandidate(medicine.control, excess, "CONTROL",
      RULE.excess.strategy.CONTROL, adjusted.elements));
    medicineCandidates.push(makeCandidate(medicine.drain, excess, "DRAIN",
      RULE.excess.strategy.DRAIN, adjusted.elements));
  }
  const canonical = (element: Element) => RULE.canonicalElementOrder.indexOf(element);
  medicineCandidates.sort((a, b) => b.finalScore - a.finalScore || canonical(a.element) - canonical(b.element) ||
    a.treatsDiseaseId.localeCompare(b.treatsDiseaseId));
  const grouped = new Map<Element, Array<{ candidate: ByeongyakMedicineCandidate; index: number }>>();
  medicineCandidates.forEach((candidate, index) => grouped.set(candidate.element,
    [...(grouped.get(candidate.element) ?? []), { candidate, index }]));
  const elementPreferences: ByeongyakElementPreference[] = Array.from(grouped.entries()).map(([element, entries]) => {
    const sorted = [...entries].sort((a, b) => b.candidate.finalScore - a.candidate.finalScore || a.index - b.index);
    const score = sorted.reduce((sum, entry, index) =>
      sum + entry.candidate.finalScore * (RULE.aggregationWeights[index] ?? 0), 0);
    return { element, score, role: byeongyakRole(score), candidateIndexes: entries.map((entry) => entry.index),
      evidence: sorted.flatMap((entry) => entry.candidate.evidence) };
  }).sort((a, b) => b.score - a.score || canonical(a.element) - canonical(b.element));
  const relationIds = relations.status === "implemented" ? relations.evidence.map((row) => row.relationId).sort() : [];
  const transformedRelationIds = relations.transformation.status === "implemented" ?
    relations.transformation.evaluations.filter((row) => row.state === "TRANSFORMED")
      .map((row) => row.relationId).sort() : [];
  const rootDamageIds = adjusted.rootDamage.map((row) => `${row.pillar}:${row.hiddenStem}`).sort();
  const evidence: ByeongyakEvidence[] = [];
  if (relationIds.length) evidence.push({ factor: "RELATION_CONTEXT", delta: 0, details: { relationIds } });
  if (transformedRelationIds.length) evidence.push({ factor: "TRANSFORMATION_CONTEXT", delta: 0,
    details: { relationIds: transformedRelationIds } });
  if (rootDamageIds.length) evidence.push({ factor: "ROOT_DAMAGE_CONTEXT", delta: 0, details: { rootDamageIds } });
  if (tonggwan.status === "implemented") evidence.push({ factor: "TONGGWAN_CONTEXT", delta: 0,
    details: { applicability: tonggwan.applicability,
      candidateElements: tonggwan.elementPreferences.map((row) => row.element) } });
  const active = diseases.filter((row) => row.state === "ACTIVE");
  const applicability = !diseases.length ? "NOT_APPLICABLE" : !active.length ? "ALREADY_TREATED" :
    active.some((disease) => medicineCandidates.some((candidate) => candidate.treatsDiseaseId === disease.id &&
      candidate.state === "NEEDED")) ? "APPLICABLE" : "PARTIALLY_APPLICABLE";
  return { status: "implemented", ruleVersion: RULE.rulesetVersion,
    diseaseRuleVersion: RULE.diseaseRuleVersion, medicineRuleVersion: RULE.medicineRuleVersion,
    applicability, diseases, medicineCandidates, elementPreferences,
    context: { strength: { originalScore: strength.score, originalLevel: strength.level,
      adjustedScore: strength.adjusted.score, adjustedLevel: strength.adjusted.level },
      structure: { type: structure.primary?.type ?? null, integrity: structure.qualityEvaluation.integrity,
        qualityScore: structure.qualityEvaluation.qualityScore },
      tonggwan: { applicability: tonggwan.applicability,
        candidateElements: tonggwan.elementPreferences.map((row) => row.element) },
      relationIds, transformedRelationIds, rootDamageIds }, evidence };
}
