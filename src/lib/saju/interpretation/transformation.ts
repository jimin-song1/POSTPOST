import { TRANSFORMATION_V1 } from "@/rules/transformation.v1";
import { RELATION_INTERACTION_V1 } from "@/rules/relation-interaction.v1";
import { BRANCH_COMBINATION_TARGET_V1 } from "@/rules/branch-combination-target.v1";
import { SEASONAL_ELEMENT_STATE_V1 } from "@/rules/seasonal-element-state.v1";
import { DAY_MASTER_SUPPORT_V1 } from "@/rules/strength.v1";
import { stemTrait } from "./ten-gods";
import type { BranchHiddenStems } from "./hidden-stems";
import type { Branch, Element, FiveElementsResult, Pillar, PillarPosition, RelationGroup, RelationPair, RelationsResult, Stem,
  TransformationEvaluation, TransformationFactor, TransformationResult, TransformationState } from "@/types/saju-analysis";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
type Relation = RelationPair<Stem> | RelationPair<Branch> | RelationGroup;
type NativeScores = NonNullable<FiveElementsResult["nativeStrength"]>;

export function transformationState(score: number, partialGroup = false): TransformationState {
  const thresholds = TRANSFORMATION_V1.thresholds;
  if (score >= thresholds.transformed) return partialGroup ? TRANSFORMATION_V1.partialGroupMaximumState : "TRANSFORMED";
  if (score >= thresholds.partial) return "PARTIAL";
  if (score >= thresholds.combinationOnly) return "COMBINATION_ONLY";
  return "WEAK";
}

export function emptyTransformation(): TransformationResult {
  return { status: "not_implemented", ruleVersion: TRANSFORMATION_V1.rulesetVersion,
    interactionRuleVersion: RELATION_INTERACTION_V1.rulesetVersion,
    branchTargetRuleVersion: BRANCH_COMBINATION_TARGET_V1.rulesetVersion,
    evaluations: [], interactions: [] };
}

function targetOf(relation: Relation): Element {
  if (relation.type === "SIX_COMBINATION" && "members" in relation) {
    const matching = BRANCH_COMBINATION_TARGET_V1.sixCombinations.find(({ pair }) =>
      pair.every((branch) => (relation.members as Array<Stem | Branch>).includes(branch)));
    if (!matching) throw new Error(`Missing six-combination target for ${relation.id}`);
    return matching.targetElement;
  }
  if ("targetElement" in relation && relation.targetElement) return relation.targetElement;
  throw new Error(`Missing target metadata for ${relation.id}`);
}

const isCandidate = (relation: Relation) => RELATION_INTERACTION_V1.candidateTypes.some((type) => type === relation.type);
const isStem = (relation: Relation) => relation.type.startsWith("STEM_");
const intersects = (a: Relation, b: Relation) => a.positions.some((position) => b.positions.includes(position));
const sameDomain = (a: Relation, b: Relation) => isStem(a) === isStem(b);

export function evaluateTransformation(
  relations: RelationsResult,
  pillars: Record<PillarPosition, Pillar>,
  hidden: Record<PillarPosition, BranchHiddenStems>,
  nativeStrength: NativeScores
): TransformationResult {
  if (relations.status !== "implemented" || !pillars.month.branch) throw new Error("Calculated original pillars and detected relations required");
  const all: Relation[] = [...Object.values(relations.heavenlyStems).flat(), ...Object.values(relations.earthlyBranches).flat()];
  const combinations = all.filter(isCandidate);
  const clashes = all.filter((relation) => RELATION_INTERACTION_V1.blockerTypes.some((type) => type === relation.type));
  const interactions: TransformationResult["interactions"] = [];
  const evaluations: TransformationEvaluation[] = all.map((relation) => {
    if (!isCandidate(relation)) return {
      relationId: relation.id, relationType: relation.type, targetElement: null, score: 0,
      state: "NOT_APPLICABLE", factors: [], evidence: [], competingRelations: [], blockingRelations: [],
      adjacent: null, complete: null
    };
    const targetElement = targetOf(relation);
    const factors: TransformationFactor[] = [];
    const add = (factor: TransformationFactor) => { factors.push(factor); };
    const seasonalState = SEASONAL_ELEMENT_STATE_V1.byMonthBranch[pillars.month.branch!][targetElement];
    add({ factor: "season", delta: TRANSFORMATION_V1.seasonal[seasonalState],
      reason: `월지 ${pillars.month.branch}의 목표 오행 ${targetElement}: ${seasonalState}`,
      details: { monthBranch: pillars.month.branch, seasonalState, targetElement } });
    const roots = positions.flatMap((position) => [hidden[position].mainQi, hidden[position].middleQi, hidden[position].residualQi]
      .filter((item): item is NonNullable<typeof item> => item !== null && item.element === targetElement)
      .map((item) => ({ position, branch: hidden[position].branch, hiddenStem: item.stem, role: item.role })));
    if (roots.length) add({ factor: "targetRoot", delta: TRANSFORMATION_V1.targetRoot,
      reason: "목표 오행 지장간 통근", details: { roots } });
    const exposed = positions.filter((position) => stemTrait(pillars[position].stem!).element === targetElement);
    if (exposed.length) add({ factor: "targetExposure", delta: TRANSFORMATION_V1.targetExposure,
      reason: "목표 오행 천간 투출", details: { exposedPositions: exposed,
        participantPositions: exposed.filter((position) => relation.positions.includes(position)),
        thirdPartyPositions: exposed.filter((position) => !relation.positions.includes(position)) } });
    const indexes = relation.positions.map((position) => positions.indexOf(position));
    const adjacent = Math.max(...indexes) - Math.min(...indexes) ===
      RELATION_INTERACTION_V1.adjacencyDistance * (relation.positions.length - 1);
    if ("members" in relation && adjacent) add({ factor: "adjacency", delta: TRANSFORMATION_V1.adjacentPair,
      reason: "두 기둥 인접", details: { positions: relation.positions } });
    const cycle = DAY_MASTER_SUPPORT_V1.elements;
    const generator = cycle[(cycle.indexOf(targetElement) - 1 + cycle.length) % cycle.length];
    const generatingPercentage = nativeStrength[generator].percentage;
    if (generatingPercentage >= TRANSFORMATION_V1.generatingPercentageMinimum) add({
      factor: "generatingSupport", delta: TRANSFORMATION_V1.generatingSupport,
      reason: "목표 오행을 생하는 오행의 원국 비중 충족",
      details: { generator, percentage: generatingPercentage, minimum: TRANSFORMATION_V1.generatingPercentageMinimum }
    });
    const competing = combinations.filter((other) => other.id !== relation.id && sameDomain(relation, other) && intersects(relation, other));
    const blocking = clashes.filter((other) => sameDomain(relation, other) && intersects(relation, other));
    for (const other of competing) {
      add({ factor: "competition", delta: RELATION_INTERACTION_V1.competingCandidatePenalty,
        reason: "합 후보의 참여 위치 공유", relatedRelationId: other.id });
      interactions.push({ sourceRelationId: relation.id, interactingRelationId: other.id,
        interactionType: "COMPETING", scoreDelta: RELATION_INTERACTION_V1.competingCandidatePenalty,
        ruleVersion: RELATION_INTERACTION_V1.rulesetVersion });
    }
    for (const other of blocking) {
      add({ factor: "blockingClash", delta: RELATION_INTERACTION_V1.blockingClashPenalty,
        reason: "합 참여 위치의 충", relatedRelationId: other.id });
      interactions.push({ sourceRelationId: relation.id, interactingRelationId: other.id,
        interactionType: "BLOCKING", scoreDelta: RELATION_INTERACTION_V1.blockingClashPenalty,
        ruleVersion: RELATION_INTERACTION_V1.rulesetVersion });
    }
    if (relation.type === "STEM_COMBINATION" && "members" in relation) {
      const originalStrongRoots = relation.members.flatMap((stem, index) => {
        const originalElement = stemTrait(stem as Stem).element;
        return positions.filter((position) => hidden[position].mainQi.element === originalElement)
          .map((position) => ({ stem, participantPosition: relation.positions[index], rootBranch: hidden[position].branch,
            rootPosition: position, role: TRANSFORMATION_V1.originalStrongRootRole }));
      });
      if (originalStrongRoots.length) add({ factor: "originalStrongRoot", delta: TRANSFORMATION_V1.originalStrongRootPenalty,
        reason: "합 참여 천간의 원래 오행에 본기 뿌리 존재", details: { originalStrongRoots } });
    }
    const score = factors.reduce((sum, factor) => sum + factor.delta, 0);
    const partialGroup = "partial" in relation && relation.partial === true;
    return { relationId: relation.id, relationType: relation.type, targetElement, score,
      state: transformationState(score, partialGroup), factors,
      evidence: factors.map((factor) => ({ ...factor })),
      competingRelations: competing.map((item) => item.id), blockingRelations: blocking.map((item) => item.id),
      adjacent, complete: "complete" in relation ? relation.complete ?? null : null };
  });
  return { status: "implemented", ruleVersion: TRANSFORMATION_V1.rulesetVersion,
    interactionRuleVersion: RELATION_INTERACTION_V1.rulesetVersion,
    branchTargetRuleVersion: BRANCH_COMBINATION_TARGET_V1.rulesetVersion, evaluations, interactions };
}
