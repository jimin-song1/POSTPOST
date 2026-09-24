import { ADJUSTED_DAYMASTER_STRENGTH_V1 as RULE } from "@/rules/adjusted-daymaster-strength.v1";
import { DAY_MASTER_SUPPORT_V1, STRENGTH_V1 } from "@/rules/strength.v1";
import type { AdjustedDayMasterStrengthResult, AdjustedStrengthResult,
  Element, StrengthResult } from "@/types/saju-analysis";

export function emptyAdjustedDayMasterStrength(): AdjustedDayMasterStrengthResult {
  return { status: "not_implemented", ruleVersion: RULE.rulesetVersion,
    evaluationRuleVersion: RULE.evaluationRuleVersion, originalScore: null, originalLevel: null,
    score: null, level: null, deltas: [], evidence: [] };
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const adjustedLevel = (score: number) => [...STRENGTH_V1.levels].reverse()
  .find((entry) => score >= entry.minimum)!.level;

/** Applies only upstream root loss and the net support/opposition ratio movement. */
export function evaluateAdjustedDayMasterStrength(
  strength: StrengthResult,
  nativeStrength: Record<Element, { score: number; percentage: number }> | null,
  adjustedStrength: AdjustedStrengthResult,
): AdjustedDayMasterStrengthResult {
  const originalScore = strength.score;
  const originalLevel = strength.level;
  const originalRooting = strength.adjustments.originalRootingScore;
  const adjustedRooting = strength.adjustments.adjustedRootingScore;
  if (strength.status !== "implemented" || originalScore === null || originalLevel === null ||
    !strength.dayMaster || !nativeStrength || adjustedStrength.status !== "implemented" ||
    !adjustedStrength.elements || originalRooting === null || adjustedRooting === null) {
    return emptyAdjustedDayMasterStrength();
  }
  const elementOrder = DAY_MASTER_SUPPORT_V1.elements;
  const dayIndex = elementOrder.indexOf(strength.dayMaster.element);
  const same = elementOrder[dayIndex];
  const resource = elementOrder[(dayIndex + 4) % elementOrder.length];
  const supportElements: Element[] = [same, resource];
  const nativeSupport = elementOrder.filter((element) => supportElements.includes(element))
    .reduce((sum, element) => sum + nativeStrength[element].percentage, 0);
  const adjustedSupport = elementOrder.filter((element) => supportElements.includes(element))
    .reduce((sum, element) => sum + adjustedStrength.elements![element].percentage, 0);
  const nativeOpposition = elementOrder.filter((element) => !supportElements.includes(element))
    .reduce((sum, element) => sum + nativeStrength[element].percentage, 0);
  const adjustedOpposition = elementOrder.filter((element) => !supportElements.includes(element))
    .reduce((sum, element) => sum + adjustedStrength.elements![element].percentage, 0);
  const nativeBalance = nativeSupport - nativeOpposition;
  const adjustedBalance = adjustedSupport - adjustedOpposition;
  const balanceDelta = adjustedBalance - nativeBalance;
  const uncappedElementDelta = balanceDelta / RULE.percentagePointsPerStrengthPoint;
  const elementDelta = clamp(uncappedElementDelta,
    -RULE.elementBalanceAdjustmentCap, RULE.elementBalanceAdjustmentCap);
  // The original strength already contains original rooting; subtract exactly the lost amount once.
  const rootDelta = adjustedRooting - originalRooting;
  const beforeClamp = originalScore + rootDelta + elementDelta;
  const score = clamp(beforeClamp, RULE.minimum, RULE.maximum);
  const clampDelta = score - beforeClamp;
  const evidence: AdjustedDayMasterStrengthResult["evidence"] = [
    { factor: "ORIGINAL_STRENGTH", value: originalScore, delta: 0 },
    { factor: "ROOTING_ADJUSTMENT", originalRootingScore: originalRooting,
      adjustedRootingScore: adjustedRooting, delta: rootDelta },
    { factor: "ELEMENT_BALANCE_ADJUSTMENT", nativeSupportPercentage: nativeSupport,
      adjustedSupportPercentage: adjustedSupport, nativeOppositionPercentage: nativeOpposition,
      adjustedOppositionPercentage: adjustedOpposition, nativeBalancePercentagePoints: nativeBalance,
      adjustedBalancePercentagePoints: adjustedBalance, balanceDeltaPercentagePoints: balanceDelta,
      uncappedScoreDelta: uncappedElementDelta, scoreDelta: elementDelta, delta: elementDelta },
  ];
  if (clampDelta !== 0) evidence.push({ factor: "CLAMP", before: beforeClamp, after: score, delta: clampDelta });
  return { status: "implemented", ruleVersion: RULE.rulesetVersion,
    evaluationRuleVersion: RULE.evaluationRuleVersion, originalScore, originalLevel,
    score, level: adjustedLevel(score),
    deltas: evidence.filter((row) => row.factor !== "ORIGINAL_STRENGTH")
      .map((row) => ({ factor: row.factor, delta: row.delta })), evidence };
}
