import { ADJUSTED_STRENGTH_V1 } from "@/rules/adjusted-strength.v1";
import { RELATION_EFFECTS_V1 } from "@/rules/relation-effects.v1";
import { TRANSFORMATION_TRANSFER_V1 } from "@/rules/transformation-transfer.v1";
import { ROOT_DAMAGE_V1 } from "@/rules/root-damage.v1";
import { ROOTING_V1 } from "@/rules/rooting.v1";
import type { AdjustedStrengthResult, Element, FiveElementsResult,
  RelationsResult, RootDamageEntry, StrengthResult, TransferLedgerEntry } from "@/types/saju-analysis";

const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];

export function emptyAdjustedStrength(): AdjustedStrengthResult {
  return { status: "not_implemented", ruleVersion: ADJUSTED_STRENGTH_V1.rulesetVersion,
    effectRuleVersion: RELATION_EFFECTS_V1.rulesetVersion,
    transferRuleVersion: TRANSFORMATION_TRANSFER_V1.rulesetVersion,
    rootDamageRuleVersion: ROOT_DAMAGE_V1.rulesetVersion,
    elements: null, transferLedger: [], rootDamage: [], evidence: [] };
}

/** Root weakening is metadata only: never subtract hidden-stem elemental contributions here. */
export function assessRootDamage(strength: StrengthResult, relations: RelationsResult) {
  if (!strength.rooting) throw new Error("Rooting assessment required");
  const clashes = relations.earthlyBranches.clashes;
  const rootDamage: RootDamageEntry[] = strength.rooting.roots.flatMap((root) => {
    const related = clashes.filter((clash) => clash.positions.includes(root.pillar));
    if (!related.length) return [];
    const damageRatio = Math.min(ROOT_DAMAGE_V1.cumulativeDamageRatioCap,
      related.length * ROOT_DAMAGE_V1.clashRatio[root.role]);
    const damagedAmount = root.score * damageRatio;
    return [{ rootId: `root:${root.pillar}:${root.role}:${root.hiddenStem}`, pillar: root.pillar,
      branch: root.branch, hiddenStem: root.hiddenStem, role: root.role,
      originalRootScore: root.score, damageRatio, damagedAmount,
      remainingRootScore: root.score - damagedAmount, causedByRelationIds: related.map((clash) => clash.id) }];
  });
  const damagedTotal = rootDamage.reduce((sum, root) => sum + root.damagedAmount, 0);
  // Reapply the original rooting cap after weakening the raw roots. The strength-v1 score stays unchanged.
  const adjustedRootingScore = Math.min(ROOTING_V1.cap, strength.rooting.rawScore - damagedTotal);
  return { rootDamage, adjustedRootingScore };
}

type Request = Pick<TransferLedgerEntry, "relationId" | "sourceContributionId" | "sourceType" | "pillar" |
  "character" | "state" | "transferRatio" | "nativeContribution" | "requestedAmount" |
  "fromElement" | "toElement" | "reason">;

export function calculateAdjustedStrength(
  native: Pick<FiveElementsResult, "nativeStrength" | "evidence">,
  relations: RelationsResult,
  strength: StrengthResult
): AdjustedStrengthResult {
  if (!native.nativeStrength || relations.transformation.status !== "implemented" || !strength.rooting)
    throw new Error("Native element strength, relation evaluations, and original rooting required");
  const sources = new Map(native.evidence.map((item) => [item.id, item]));
  if (sources.size !== native.evidence.length) throw new Error("Contribution IDs must be unique");
  const detected = [...Object.values(relations.heavenlyStems).flat(), ...Object.values(relations.earthlyBranches).flat()];
  const byRelation = new Map(detected.map((relation) => [relation.id, relation]));
  const requests: Request[] = [];
  for (const evaluation of relations.transformation.evaluations) {
    const relation = byRelation.get(evaluation.relationId);
    if (!relation) throw new Error(`Missing detected relation ${evaluation.relationId}`);
    const groupIsPartial = "partial" in relation && relation.partial === true;
    const ratio = groupIsPartial ? Math.min(TRANSFORMATION_TRANSFER_V1.partialGroupMaximumRatio,
      TRANSFORMATION_TRANSFER_V1.ratios[evaluation.state]) : TRANSFORMATION_TRANSFER_V1.ratios[evaluation.state];
    if (ratio === 0) continue;
    if (!evaluation.targetElement) throw new Error(`Missing transfer target ${relation.id}`);
    const ids = relation.type === "STEM_COMBINATION"
      ? relation.positions.map((position) => `stem:${position}`)
      : relation.positions.flatMap((position) => native.evidence.filter((item) => item.pillar === position &&
        item.sourceType === "HIDDEN_STEM").map((item) => item.id));
    for (const id of ids) {
      const source = sources.get(id);
      if (!source) throw new Error(`Missing native source ${id}`);
      requests.push({ relationId: relation.id, sourceContributionId: id,
        sourceType: source.sourceType, pillar: source.pillar, character: source.character,
        state: evaluation.state, transferRatio: ratio, nativeContribution: source.nativeContribution,
        requestedAmount: source.nativeContribution * ratio, fromElement: source.originalElement,
        toElement: evaluation.targetElement, reason: relation.rule });
    }
  }
  const requestedBySource = new Map<string, number>();
  for (const item of requests) requestedBySource.set(item.sourceContributionId,
    (requestedBySource.get(item.sourceContributionId) ?? 0) + item.requestedAmount);
  const actualBySource = new Map<string, number>();
  const transferLedger = requests.map((request) => {
    const totalRequested = requestedBySource.get(request.sourceContributionId)!;
    const scale = Math.min(RELATION_EFFECTS_V1.maximumFractionPerSource, request.nativeContribution / totalRequested);
    const actualAmount = request.requestedAmount * scale;
    actualBySource.set(request.sourceContributionId,
      (actualBySource.get(request.sourceContributionId) ?? 0) + actualAmount);
    return { ...request, scale, actualAmount,
      remainingSourceContribution: 0, netElementChange: request.fromElement === request.toElement ? 0 : actualAmount };
  });
  for (const item of transferLedger) item.remainingSourceContribution = Math.max(0,
    item.nativeContribution - actualBySource.get(item.sourceContributionId)!);
  const adjustments = Object.fromEntries(elements.map((element) => [element, 0])) as Record<Element, number>;
  const evidence = transferLedger.map((item) => {
    adjustments[item.fromElement] -= item.actualAmount;
    adjustments[item.toElement] += item.actualAmount;
    return { relationId: item.relationId, sourceContributionId: item.sourceContributionId,
      fromElement: item.fromElement, toElement: item.toElement, actualAmount: item.actualAmount,
      deltaFrom: -item.actualAmount, deltaTo: item.actualAmount };
  });
  const adjustedScores = Object.fromEntries(elements.map((element) => [element,
    native.nativeStrength![element].score + adjustments[element]])) as Record<Element, number>;
  const total = elements.reduce((sum, element) => sum + adjustedScores[element], 0);
  const resultElements = Object.fromEntries(elements.map((element) => [element, {
    nativeScore: native.nativeStrength![element].score, adjustment: adjustments[element],
    adjustedScore: adjustedScores[element], percentage: adjustedScores[element] / total * 100
  }])) as NonNullable<AdjustedStrengthResult["elements"]>;
  return { status: "implemented", ruleVersion: ADJUSTED_STRENGTH_V1.rulesetVersion,
    effectRuleVersion: RELATION_EFFECTS_V1.rulesetVersion,
    transferRuleVersion: TRANSFORMATION_TRANSFER_V1.rulesetVersion,
    rootDamageRuleVersion: ROOT_DAMAGE_V1.rulesetVersion,
    elements: resultElements, transferLedger, rootDamage: assessRootDamage(strength, relations).rootDamage, evidence };
}
