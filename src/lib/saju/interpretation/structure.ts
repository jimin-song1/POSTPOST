import { emptySpecialStructure, evaluateSpecialStructure } from "./special-structure";
import { STRUCTURE_V1 } from "@/rules/structure.v1";
import { STANDARD_STRUCTURE_V1 } from "@/rules/standard-structure.v1";
import { MONTH_COMMAND_V1 } from "@/rules/month-command.v1";
import { DEOK_ROK_STRUCTURE_V1 } from "@/rules/deok-rok-structure.v1";
import { YANG_BLADE_STRUCTURE_V1 } from "@/rules/yang-blade-structure.v1";
import { getTwelveStage } from "./twelve-stages";
import { emptyStructureQuality, evaluateStructureQuality } from "./structure-quality";
import type { BranchHiddenStems, HiddenStemDetail } from "./hidden-stems";
import type { AdjustedStrengthResult, Branch, Pillar, PillarPosition, RelationsResult,
  Stem, StructureCandidate, StructureEvidence, StructureResult, StructureSource, StructureStatus,
  StructureType, StrengthResult } from "@/types/saju-analysis";

function standardType(tenGod: HiddenStemDetail["tenGod"]["korean"]): StructureType | null {
  return Object.prototype.hasOwnProperty.call(STANDARD_STRUCTURE_V1.byTenGod, tenGod)
    ? STANDARD_STRUCTURE_V1.byTenGod[tenGod as keyof typeof STANDARD_STRUCTURE_V1.byTenGod] : null;
}

export function emptyStructure(): StructureResult {
  return { status: "not_implemented", ruleVersion: STRUCTURE_V1.rulesetVersion,
    standardRuleVersion: STANDARD_STRUCTURE_V1.rulesetVersion,
    monthCommandRuleVersion: MONTH_COMMAND_V1.rulesetVersion,
    deokRokRuleVersion: DEOK_ROK_STRUCTURE_V1.rulesetVersion,
    yangBladeRuleVersion: YANG_BLADE_STRUCTURE_V1.rulesetVersion,
    classificationStatus: "UNRESOLVED", primary: null, secondary: [], specialCandidates: [], exposures: [],
    mixedPatterns: [], dayMasterStrength: null,
    adjustedElementContext: { status: "not_implemented", ruleVersion: "adjusted-strength-v1" },
    transformationContext: [],
    specialStructure: emptySpecialStructure(),
    qualityEvaluation: emptyStructureQuality(), evidence: [] };
}

/** The month branch's original mainQi decides the standard candidate; exposure never replaces it. */
export function evaluateStructure(
  pillars: Record<PillarPosition, Pillar>, hidden: Record<PillarPosition, BranchHiddenStems>,
  strength: StrengthResult, adjustedStrength: AdjustedStrengthResult, relations: RelationsResult
): StructureResult {
  const dayMaster = pillars.day.stem;
  const monthBranch = pillars.month.branch;
  if (!dayMaster || !monthBranch || !strength.level || strength.score === null)
    throw new Error("Complete month command, day master and strength required");
  const month = hidden.month;
  if (month.branch !== monthBranch) throw new Error("Month branch and hidden-stem source disagree");
  const details = MONTH_COMMAND_V1.roleOrder.map((role) => month[role]).filter((item) => item !== null);
  const exposedPositions = (stem: Stem): PillarPosition[] => MONTH_COMMAND_V1.visiblePillars.filter((position) =>
    pillars[position].stem === stem);
  const exposures = details.map(({ stem, role }) => ({ stem, role,
    positions: exposedPositions(stem), exposed: exposedPositions(stem).length > 0 }));
  const evidence: StructureEvidence[] = [];
  const main = month.mainQi;
  const mainType = standardType(main.tenGod.korean);
  evidence.push({ factor: "MONTH_MAIN_QI", monthBranch, hiddenStem: main.stem, role: main.role,
    dayMaster, tenGod: main.tenGod.korean, result: mainType });
  for (const entry of exposures) evidence.push({ factor: "EXPOSURE", monthBranch,
    stem: entry.stem, role: entry.role, positions: entry.positions, exposed: entry.exposed });
  const source = (detail: HiddenStemDetail): StructureSource => ({ branch: monthBranch,
    hiddenStem: detail.stem, hiddenRole: detail.role,
    tenGod: detail.tenGod.korean, tenGodHanja: detail.tenGod.hanja });
  const candidate = (type: StructureType, detail: HiddenStemDetail, status: StructureStatus,
    ruleEvidence: StructureEvidence[]): StructureCandidate => ({ type, source: source(detail),
    exposed: exposedPositions(detail.stem).length > 0,
    exposedPositions: exposedPositions(detail.stem), status,
    confidence: MONTH_COMMAND_V1.confidenceByStatus[status], evidence: ruleEvidence });
  const secondary: StructureCandidate[] = [];
  for (const detail of details.filter((item) => item.role !== MONTH_COMMAND_V1.primaryRole)) {
    const type = standardType(detail.tenGod.korean);
    const exposed = exposedPositions(detail.stem);
    if (!type || exposed.length === 0) continue;
    const row: StructureEvidence = { factor: "SECONDARY_CANDIDATE", monthBranch, hiddenStem: detail.stem,
      role: detail.role, tenGod: detail.tenGod.korean, candidate: type, positions: exposed, exposed: true };
    evidence.push(row);
    secondary.push({ ...candidate(type, detail, "ESTABLISHED", [row]),
      confidence: MONTH_COMMAND_V1.secondaryConfidence });
  }
  const mixedPatterns: StructureResult["mixedPatterns"] = mainType &&
    (!MONTH_COMMAND_V1.mixedRequiresPrimaryExposure || exposedPositions(main.stem).length > 0)
    ? secondary.filter((item) => item.type !== mainType).map((item) => ({
      candidate: item.type, sourceRole: item.source.hiddenRole,
      exposed: true as const, positions: item.exposedPositions
    })) : [];
  for (const mixed of mixedPatterns) evidence.push({ factor: "MIXED_PATTERN", monthBranch,
    candidate: mixed.candidate, role: mixed.sourceRole, positions: mixed.positions, exposed: true });

  const specialCandidates: StructureCandidate[] = [];
  if (DEOK_ROK_STRUCTURE_V1.byDayStem[dayMaster] === monthBranch) {
    if (getTwelveStage(dayMaster, monthBranch).korean !== "건록")
      throw new Error("Deok-rok rule disagrees with twelve-stages-v1");
    const row: StructureEvidence = { factor: "SPECIAL_RULE", monthBranch, dayMaster,
      candidate: "건록격", ruleVersion: DEOK_ROK_STRUCTURE_V1.rulesetVersion };
    evidence.push(row);
    specialCandidates.push(candidate("건록격", main, "SPECIAL_CANDIDATE", [row]));
  }
  const bladeBranches: Partial<Record<Stem, Branch>> = YANG_BLADE_STRUCTURE_V1.byDayStem;
  if (bladeBranches[dayMaster] === monthBranch) {
    const row: StructureEvidence = { factor: "SPECIAL_RULE", monthBranch, dayMaster,
      candidate: "양인격", ruleVersion: YANG_BLADE_STRUCTURE_V1.rulesetVersion };
    evidence.push(row);
    specialCandidates.push(candidate("양인격", main, "SPECIAL_CANDIDATE", [row]));
  }
  let primary: StructureCandidate | null = null;
  if (mainType) {
    const status: StructureStatus = mixedPatterns.length ? "MIXED" :
      exposedPositions(main.stem).length ? "ESTABLISHED" : "UNEXPOSED";
    primary = candidate(mainType, main, status,
      evidence.filter((item) => item.factor === "MONTH_MAIN_QI" ||
        (item.factor === "EXPOSURE" && item.role === "mainQi") || item.factor === "MIXED_PATTERN"));
  } else if (specialCandidates.length) primary = specialCandidates[0];
  else evidence.push({ factor: "UNRESOLVED", monthBranch, hiddenStem: main.stem,
    role: main.role, tenGod: main.tenGod.korean, result: null });
  const transformationContext = relations.transformation.evaluations.filter((entry) =>
    relations.evidence.some((relation) => relation.relationId === entry.relationId && relation.positions.includes("month")))
    .map(({ relationId, state }) => ({ relationId, state }));
  for (const entry of transformationContext) evidence.push({ factor: "TRANSFORMATION_CONTEXT", monthBranch,
    relationId: entry.relationId, transformationState: entry.state });
  const qualityEvaluation = evaluateStructureQuality(pillars, { primary, secondary, mixedPatterns }, relations);
  return { status: "implemented", ruleVersion: STRUCTURE_V1.rulesetVersion,
    standardRuleVersion: STANDARD_STRUCTURE_V1.rulesetVersion,
    monthCommandRuleVersion: MONTH_COMMAND_V1.rulesetVersion,
    deokRokRuleVersion: DEOK_ROK_STRUCTURE_V1.rulesetVersion,
    yangBladeRuleVersion: YANG_BLADE_STRUCTURE_V1.rulesetVersion,
    classificationStatus: primary?.status ?? "UNRESOLVED", primary, secondary, specialCandidates,
    exposures, mixedPatterns, dayMasterStrength: { score: strength.score, level: strength.level },
    adjustedElementContext: { status: adjustedStrength.status, ruleVersion: adjustedStrength.ruleVersion },
    transformationContext, specialStructure: evaluateSpecialStructure(pillars, strength, adjustedStrength, relations),
    qualityEvaluation, evidence };
}
