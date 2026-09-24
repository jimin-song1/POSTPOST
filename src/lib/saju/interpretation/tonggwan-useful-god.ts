import { TONGGWAN_BRIDGE_TABLE, TONGGWAN_USEFUL_GOD_V1 as RULE,
  type TonggwanBridgeRule } from "@/rules/tonggwan-useful-god.v1";
import type { AdjustedStrengthResult, Element, RelationsResult } from "@/types/saju-analysis";
import type { SpecialStructureResult } from "@/types/special-structure";
import type { TonggwanBridgeRole, TonggwanCandidate, TonggwanConflict,
  TonggwanConflictState, TonggwanEvidence, TonggwanResult } from "@/types/useful-gods";

type ElementStrengths = Record<Element, { score: number; percentage: number }>;

export function emptyTonggwan(): TonggwanResult {
  return { status: "not_implemented", ruleVersion: RULE.rulesetVersion,
    conflictRuleVersion: RULE.conflictRuleVersion, bridgeRuleVersion: RULE.bridgeRuleVersion,
    strengthSource: null, applicability: "NOT_APPLICABLE", applicabilityCaution: false,
    confidence: "LOW", conflicts: [], rankedCandidates: [], elementPreferences: [],
    explicitRelations: [], evidence: [] };
}

export function classifyTonggwanConflict(controllerPercentage: number,
  controlledPercentage: number): TonggwanConflictState {
  const combined = controllerPercentage + controlledPercentage;
  const maximum = Math.max(controllerPercentage, controlledPercentage);
  const ratio = maximum === 0 ? 0 : Math.min(controllerPercentage, controlledPercentage) / maximum;
  const bothMeetMinimum = controllerPercentage >= RULE.conflict.minimumSidePercentage &&
    controlledPercentage >= RULE.conflict.minimumSidePercentage;
  if (bothMeetMinimum && combined >= RULE.conflict.minimumCombinedPercentage) {
    if (ratio >= RULE.conflict.strongBalanceRatioMinimum) return "STRONG_CONFLICT";
    if (ratio >= RULE.conflict.conditionalBalanceRatioMinimum) return "CONDITIONAL_CONFLICT";
    return "ONE_SIDED";
  }
  if (controllerPercentage < RULE.conflict.minimumSidePercentage &&
    controlledPercentage < RULE.conflict.minimumSidePercentage) return "WEAK";
  if (!bothMeetMinimum) return "ONE_SIDED";
  return "NOT_APPLICABLE";
}

export function tonggwanRole(score: number): TonggwanBridgeRole {
  if (score >= RULE.roles.primaryMinimum) return "PRIMARY_BRIDGE";
  if (score >= RULE.roles.strongMinimum) return "STRONG_BRIDGE";
  if (score >= RULE.roles.conditionalMinimum) return "CONDITIONAL_BRIDGE";
  if (score >= RULE.roles.lowMinimum) return "LOW_NEED";
  return "NOT_NEEDED";
}

function explicitRelationIds(relations: RelationsResult): string[] {
  if (relations.status !== "implemented") return [];
  return [...relations.heavenlyStems.clashes, ...relations.earthlyBranches.clashes,
    ...relations.earthlyBranches.punishments, ...relations.earthlyBranches.breaks,
    ...relations.earthlyBranches.harms].map((relation) => relation.id).sort();
}

function conflict(rule: TonggwanBridgeRule, strengths: ElementStrengths): TonggwanConflict {
  const controllerPercentage = strengths[rule.controller].percentage;
  const controlledPercentage = strengths[rule.controlled].percentage;
  const maximum = Math.max(controllerPercentage, controlledPercentage);
  return { ...rule, controllerPercentage, controlledPercentage,
    combinedPercentage: controllerPercentage + controlledPercentage,
    balanceRatio: maximum === 0 ? 0 : Math.min(controllerPercentage, controlledPercentage) / maximum,
    conflictState: classifyTonggwanConflict(controllerPercentage, controlledPercentage) };
}

function candidate(row: TonggwanConflict, strengths: ElementStrengths,
  explicitRelations: string[]): TonggwanCandidate {
  const bridgePercentage = strengths[row.bridge].percentage;
  const scarcity = RULE.scarcity.find((entry) => "maximumExclusive" in entry
    ? bridgePercentage < entry.maximumExclusive : bridgePercentage <= entry.maximumInclusive)!;
  const conflictDelta = row.conflictState === "STRONG_CONFLICT"
    ? RULE.score.strongConflict : RULE.score.conditionalConflict;
  const alreadySufficient = bridgePercentage >= RULE.sufficientPercentage;
  const state = alreadySufficient ? "ALREADY_SUFFICIENT" as const :
    row.conflictState === "STRONG_CONFLICT" ? "APPLICABLE" as const : "CONDITIONAL" as const;
  const evidence: TonggwanEvidence[] = [{ factor: "CONFLICT_PAIR", delta: conflictDelta,
    details: { controller: row.controller, controlled: row.controlled,
      controllerPercentage: row.controllerPercentage, controlledPercentage: row.controlledPercentage,
      combinedPercentage: row.combinedPercentage, balanceRatio: row.balanceRatio,
      state: row.conflictState } }, { factor: "BRIDGE_SCARCITY", delta: scarcity.delta,
    details: { bridge: row.bridge, percentage: bridgePercentage, need: scarcity.need } }];
  if (alreadySufficient) evidence.push({ factor: "BRIDGE_ALREADY_SUFFICIENT", delta: 0,
    details: { bridge: row.bridge, percentage: bridgePercentage,
      sufficientThreshold: RULE.sufficientPercentage,
      excessive: bridgePercentage >= RULE.excessivePercentage } });
  if (explicitRelations.length) evidence.push({ factor: "EXPLICIT_RELATIONS_CONTEXT", delta: 0,
    details: { relationIds: explicitRelations, scoreEffect: 0 } });
  return { ...row, bridgePercentage, bridgeNeed: scarcity.need,
    score: conflictDelta + scarcity.delta, state, evidence };
}

export function evaluateTonggwanUsefulGod(adjusted: AdjustedStrengthResult,
  nativeStrength: ElementStrengths | null, relations: RelationsResult,
  special: SpecialStructureResult): TonggwanResult {
  const adjustedAvailable = adjusted.status === "implemented" && adjusted.elements !== null;
  const strengths: ElementStrengths | null = adjustedAvailable
    ? Object.fromEntries(RULE.canonicalElementOrder.map((element) => [element, {
      score: adjusted.elements![element].adjustedScore,
      percentage: adjusted.elements![element].percentage,
    }])) as ElementStrengths : nativeStrength;
  if (!strengths) return emptyTonggwan();
  const strengthSource = adjustedAvailable ? "adjusted" as const : "native" as const;
  const evaluated = TONGGWAN_BRIDGE_TABLE.map((row) => conflict(row, strengths));
  const conflicts = evaluated.filter((row) => row.conflictState === "STRONG_CONFLICT" ||
    row.conflictState === "CONDITIONAL_CONFLICT");
  const relationIds = explicitRelationIds(relations);
  const canonical = (element: Element) => RULE.canonicalElementOrder.indexOf(element);
  const rankedCandidates = conflicts.map((row) => candidate(row, strengths, relationIds))
    .sort((a, b) => b.score - a.score || b.combinedPercentage - a.combinedPercentage ||
      b.balanceRatio - a.balanceRatio || canonical(a.bridge) - canonical(b.bridge));
  const byBridge = new Map<Element, Array<{ row: TonggwanCandidate; index: number }>>();
  rankedCandidates.forEach((row, index) => byBridge.set(row.bridge,
    [...(byBridge.get(row.bridge) ?? []), { row, index }]));
  const elementPreferences = Array.from(byBridge.entries()).map(([element, entries]) => {
    const best = [...entries].sort((a, b) => b.row.score - a.row.score || a.index - b.index)[0];
    return { element, score: best.row.score, role: tonggwanRole(best.row.score),
      candidateIndexes: entries.map((entry) => entry.index), evidence: best.row.evidence };
  }).sort((a, b) => b.score - a.score || canonical(a.element) - canonical(b.element));
  const qualified = special.status === "implemented" ? special.candidates
    .filter((row) => row.state === "QUALIFIED_CANDIDATE") : [];
  const applicabilityCaution = qualified.length > 0;
  const evidence: TonggwanEvidence[] = [];
  if (applicabilityCaution) evidence.push({ factor: "SPECIAL_STRUCTURE_CONTEXT", delta: 0,
    details: { qualifiedCandidates: qualified.map(({ type, state }) => ({ type, state })), scoreEffect: 0 } });
  if (relationIds.length) evidence.push({ factor: "EXPLICIT_RELATIONS_CONTEXT", delta: 0,
    details: { relationIds, scoreEffect: 0 } });
  const applicability = rankedCandidates.some((row) => row.state === "APPLICABLE") ? "APPLICABLE" :
    rankedCandidates.some((row) => row.state === "CONDITIONAL") ? "CONDITIONAL" :
    rankedCandidates.length ? "ALREADY_SUFFICIENT" : "NOT_APPLICABLE";
  return { status: "implemented", ruleVersion: RULE.rulesetVersion,
    conflictRuleVersion: RULE.conflictRuleVersion, bridgeRuleVersion: RULE.bridgeRuleVersion,
    strengthSource, applicability, applicabilityCaution,
    confidence: applicabilityCaution ? "LOW" : "MEDIUM", conflicts, rankedCandidates,
    elementPreferences, explicitRelations: relationIds, evidence };
}
