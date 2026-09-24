import { EOKBU_USEFUL_GOD_V1 as RULE } from "@/rules/eokbu-useful-god.v1";
import { DAY_MASTER_SUPPORT_V1 } from "@/rules/strength.v1";
import type { AdjustedStrengthResult, Element, StrengthResult } from "@/types/saju-analysis";
import type { SpecialStructureResult } from "@/types/special-structure";
import type { EokbuElementPreference, EokbuElementRole, EokbuEvidence,
  EokbuResult, UsefulGodsResult } from "@/types/useful-gods";
import { emptyJohu } from "./johu-useful-god";
import { emptyTonggwan } from "./tonggwan-useful-god";
import { emptyByeongyak } from "./byeongyak-useful-god";
import { emptyStructureUseful } from "./structure-useful-god";

const pending = { status: "not_implemented" } as const;
export function emptyUsefulGods(): UsefulGodsResult {
  return { status: "not_implemented", eokbu: {
    status: "not_implemented", ruleVersion: RULE.rulesetVersion,
    elementPreferenceRuleVersion: RULE.elementPreferenceRuleVersion, strengthSource: null,
    strengthScore: null, strengthLevel: null, applicability: "STANDARD", conditional: false,
    confidence: "LOW", specialCandidates: [], elements: [], primaryElements: [],
    supportiveElements: [], conditionalElements: [], neutralElements: [], unfavorableElements: [], evidence: [],
  }, johu: emptyJohu(), tonggwan: emptyTonggwan(), byeongyak: emptyByeongyak(),
  structure: emptyStructureUseful(), synthesis: pending };
}

export function eokbuRole(score: number): EokbuElementRole {
  if (score >= RULE.roles.primaryMinimum) return "PRIMARY";
  if (score >= RULE.roles.supportiveMinimum) return "SUPPORTIVE";
  if (score >= RULE.roles.conditionalMinimum) return "CONDITIONAL";
  if (score >= RULE.roles.neutralMinimum) return "NEUTRAL";
  return "UNFAVORABLE";
}

export function evaluateEokbuUsefulGod(strength: StrengthResult,
  adjustedStrength: AdjustedStrengthResult, special: SpecialStructureResult): UsefulGodsResult {
  const adjustedAvailable = strength.adjusted.status === "implemented" &&
    strength.adjusted.score !== null && strength.adjusted.level !== null;
  const strengthScore = adjustedAvailable ? strength.adjusted.score : strength.score;
  const strengthLevel = adjustedAvailable ? strength.adjusted.level : strength.level;
  const strengthSource = adjustedAvailable ? "adjusted" as const : "original" as const;
  if (strength.status !== "implemented" || !strength.dayMaster || strengthScore === null ||
    strengthLevel === null || adjustedStrength.status !== "implemented" || !adjustedStrength.elements) {
    return emptyUsefulGods();
  }
  const qualified = special.candidates.filter((candidate) => candidate.state === "QUALIFIED_CANDIDATE");
  const caution = qualified.length > 0;
  const overallEvidence: EokbuEvidence[] = caution ? [{ factor: "SPECIAL_STRUCTURE_CONTEXT", delta: 0,
    details: { qualifiedCandidates: qualified.map(({ type, label }) => ({ type, label })),
      reason: "일반 억부 방향이 특수격에서 달라질 수 있으므로 최종 합성 전까지 조건부로 유지" } }] : [];
  const dayIndex = RULE.canonicalElementOrder.indexOf(strength.dayMaster.element);
  const elementRows = RULE.canonicalElementOrder.map((element, canonicalIndex): EokbuElementPreference & { canonicalIndex: number } => {
    const distance = (RULE.canonicalElementOrder.indexOf(element) - dayIndex + 5) % 5;
    const relation = DAY_MASTER_SUPPORT_V1.relationByForwardDistance[distance];
    const baseScore = RULE.baseByLevel[strengthLevel][relation];
    const percentage = adjustedStrength.elements![element].percentage;
    const availabilityTable = baseScore > 0 ? RULE.favorableAvailability : RULE.unfavorableAvailability;
    const availability = availabilityTable.find((entry) => "maximumExclusive" in entry
      ? percentage < entry.maximumExclusive : percentage <= entry.maximumInclusive)!;
    const scarcityAdjustment = availability.factor === "ELEMENT_SCARCITY" ? availability.delta : 0;
    const excessAdjustment = availability.factor === "ELEMENT_SCARCITY" ||
      availability.factor === "ELEMENT_AVAILABILITY_BALANCED" ||
      availability.factor === "ELEMENT_SCARCITY_NO_BONUS" ? 0 : availability.delta;
    const evidence: EokbuEvidence[] = [{ factor: "STRENGTH_RELATION_BASE", strengthLevel,
      element, relation, delta: baseScore }, { factor: availability.factor,
      element, relation, adjustedPercentage: percentage, delta: availability.delta }];
    const finalScore = baseScore + availability.delta;
    return { element, relationToDayMaster: relation, baseScore, scarcityAdjustment,
      excessAdjustment, specialStructureAdjustment: 0, finalScore, role: eokbuRole(finalScore),
      evidence, canonicalIndex };
  }).sort((a, b) => b.finalScore - a.finalScore || a.canonicalIndex - b.canonicalIndex);
  const elements = elementRows.map(({ canonicalIndex: _canonicalIndex, ...row }) => row);
  const byRole = (role: EokbuElementRole) => elements.filter((row) => row.role === role).map((row) => row.element);
  return { status: "partial", eokbu: {
    status: "implemented", ruleVersion: RULE.rulesetVersion,
    elementPreferenceRuleVersion: RULE.elementPreferenceRuleVersion,
    strengthSource, strengthScore, strengthLevel,
    applicability: caution ? "CAUTION_SPECIAL_STRUCTURE" : "STANDARD",
    conditional: caution, confidence: caution ? "LOW" : "MEDIUM",
    specialCandidates: special.candidates.map(({ type, state }) => ({ type, state })),
    elements, primaryElements: byRole("PRIMARY"), supportiveElements: byRole("SUPPORTIVE"),
    conditionalElements: byRole("CONDITIONAL"), neutralElements: byRole("NEUTRAL"),
    unfavorableElements: byRole("UNFAVORABLE"), evidence: overallEvidence,
  }, johu: emptyJohu(), tonggwan: emptyTonggwan(), byeongyak: emptyByeongyak(),
  structure: emptyStructureUseful(), synthesis: pending };
}
