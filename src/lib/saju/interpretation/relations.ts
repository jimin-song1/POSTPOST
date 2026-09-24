import { notImplemented } from "../contracts";
import { RELATIONS_V1 } from "@/rules/relations.v1";
import { STEM_RELATIONS_V1 } from "@/rules/stem-relations.v1";
import { BRANCH_RELATIONS_V1 } from "@/rules/branch-relations.v1";
import { PUNISHMENT_V1 } from "@/rules/punishment.v1";
import type { Branch, Element, Pillar, PillarPosition, RelationGroup, RelationPair,
  RelationPairType, RelationRuleVersion, RelationsResult, Stem } from "@/types/saju-analysis";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const positionOrder = (position: PillarPosition) => positions.indexOf(position);
type Character = Stem | Branch;
type PairRule<C extends Character> = { pair: readonly [C, C]; rule: string; targetElement?: Element };
type GroupRule = { group: readonly [Branch, Branch, Branch]; rule: string; targetElement?: Element };

function detectPairs<C extends Character>(
  rules: readonly PairRule<C>[], characters: Record<PillarPosition, C>,
  type: RelationPairType, ruleVersion: RelationRuleVersion
): RelationPair<C>[] {
  const results: RelationPair<C>[] = [];
  for (const rule of rules) for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
    const first = positions[i], second = positions[j];
    const a = characters[first], b = characters[second];
    if (!((a === rule.pair[0] && b === rule.pair[1]) || (a === rule.pair[1] && b === rule.pair[0]))) continue;
    results.push({ id: `${type}:${first}-${second}`, type, members: [a, b], positions: [first, second],
      ruleVersion, rule: rule.rule, exists: true, transformed: null,
      ...("targetElement" in rule ? { targetElement: rule.targetElement } : {}) });
  }
  return results;
}

function detectGroups(
  rules: readonly GroupRule[], branches: Record<PillarPosition, Branch>,
  type: RelationGroup["type"], ruleVersion: RelationRuleVersion
): RelationGroup[] {
  const results: RelationGroup[] = [];
  for (const rule of rules) {
    // One group character can occur in several pillars: emit one result per position assignment.
    const available = rule.group.map((branch) => positions.filter((position) => branches[position] === branch)
      .map((position) => ({ branch, position })));
    const present = available.filter((members) => members.length > 0);
    if (present.length < RELATIONS_V1.minimumGroupMembers) continue;
    let assignments: Array<Array<{ branch: Branch; position: PillarPosition }>> = [[]];
    for (const choices of present) assignments = assignments.flatMap((assignment) =>
      choices.map((choice) => [...assignment, choice]));
    for (const memberPositions of assignments) {
      const orderedPositions = memberPositions.map(({ position }) => position).sort((a, b) => positionOrder(a) - positionOrder(b));
      const complete = present.length === rule.group.length;
      results.push({ id: `${type}:${rule.group.join("")}:${orderedPositions.join("-")}`,
        type, ...(type === "THREE_PUNISHMENT" ? { kind: type } : {}),
        group: [...rule.group], present: memberPositions.map(({ branch }) => branch),
        memberPositions, positions: orderedPositions, complete, partial: !complete,
        ruleVersion, rule: rule.rule, transformed: null,
        ...("targetElement" in rule ? { targetElement: rule.targetElement } : {}) });
    }
  }
  return results;
}

function detectSelfPunishments(branches: Record<PillarPosition, Branch>): RelationPair<Branch>[] {
  const results: RelationPair<Branch>[] = [];
  for (const { branch, rule } of PUNISHMENT_V1.self) {
    const occurrences = positions.filter((position) => branches[position] === branch);
    for (let i = 0; i < occurrences.length; i++) for (let j = i + 1; j < occurrences.length; j++) {
      const first = occurrences[i], second = occurrences[j];
      results.push({ id: `SELF_PUNISHMENT:${first}-${second}`, type: "SELF_PUNISHMENT", kind: "SELF_PUNISHMENT",
        branch, members: [branch, branch], positions: [first, second], exists: true, complete: true,
        ruleVersion: PUNISHMENT_V1.rulesetVersion, rule, transformed: null });
    }
  }
  return results;
}

export function emptyRelations(): RelationsResult {
  return {
    status: "not_implemented", ruleVersion: RELATIONS_V1.rulesetVersion,
    heavenlyStems: { combinations: [], clashes: [] },
    earthlyBranches: { sixCombinations: [], threeHarmonies: [], directionalCombinations: [],
      clashes: [], punishments: [], breaks: [], harms: [], wonjin: [] },
    transformation: notImplemented("합화 및 관계 간 상호작용은 후속 단계에서 평가"),
    strengthAdjustmentApplied: false, evidence: []
  };
}

export function detectRelations(pillars: Record<PillarPosition, Pillar>): RelationsResult {
  const stems = Object.fromEntries(positions.map((position) => [position, pillars[position].stem])) as Record<PillarPosition, Stem | null>;
  const branches = Object.fromEntries(positions.map((position) => [position, pillars[position].branch])) as Record<PillarPosition, Branch | null>;
  if (positions.some((position) => !stems[position] || !branches[position])) throw new Error("Four complete pillars required");
  const s = stems as Record<PillarPosition, Stem>;
  const b = branches as Record<PillarPosition, Branch>;
  const heavenlyStems = {
    combinations: detectPairs(STEM_RELATIONS_V1.combinations, s, "STEM_COMBINATION", STEM_RELATIONS_V1.rulesetVersion),
    clashes: detectPairs(STEM_RELATIONS_V1.clashes, s, "STEM_CLASH", STEM_RELATIONS_V1.rulesetVersion)
  };
  const earthlyBranches = {
    sixCombinations: detectPairs(BRANCH_RELATIONS_V1.sixCombinations, b, "SIX_COMBINATION", BRANCH_RELATIONS_V1.rulesetVersion),
    threeHarmonies: detectGroups(BRANCH_RELATIONS_V1.threeHarmonies, b, "THREE_HARMONY", BRANCH_RELATIONS_V1.rulesetVersion),
    directionalCombinations: detectGroups(BRANCH_RELATIONS_V1.directionalCombinations, b, "DIRECTIONAL_COMBINATION", BRANCH_RELATIONS_V1.rulesetVersion),
    clashes: detectPairs(BRANCH_RELATIONS_V1.clashes, b, "BRANCH_CLASH", BRANCH_RELATIONS_V1.rulesetVersion),
    punishments: [
      ...detectGroups(PUNISHMENT_V1.three, b, "THREE_PUNISHMENT", PUNISHMENT_V1.rulesetVersion),
      ...detectPairs(PUNISHMENT_V1.mutual, b, "MUTUAL_PUNISHMENT", PUNISHMENT_V1.rulesetVersion)
        .map((item) => ({ ...item, kind: "MUTUAL_PUNISHMENT" as const, complete: true as const })),
      ...detectSelfPunishments(b)
    ],
    breaks: detectPairs(BRANCH_RELATIONS_V1.breaks, b, "BRANCH_BREAK", BRANCH_RELATIONS_V1.rulesetVersion),
    harms: detectPairs(BRANCH_RELATIONS_V1.harms, b, "BRANCH_HARM", BRANCH_RELATIONS_V1.rulesetVersion),
    wonjin: detectPairs(BRANCH_RELATIONS_V1.wonjin, b, "WONJIN", BRANCH_RELATIONS_V1.rulesetVersion)
  };
  const all = [...Object.values(heavenlyStems).flat(), ...Object.values(earthlyBranches).flat()];
  return {
    status: "implemented", ruleVersion: RELATIONS_V1.rulesetVersion, heavenlyStems, earthlyBranches,
    transformation: notImplemented("합화 여부 및 관계 간 상호작용은 후속 단계에서 평가"),
    strengthAdjustmentApplied: false,
    evidence: all.map((relation) => ({ relationId: relation.id, ruleVersion: relation.ruleVersion,
      type: relation.type, positions: relation.positions,
      characters: "members" in relation ? relation.members : relation.positions.map((position) =>
        relation.memberPositions.find((member) => member.position === position)!.branch),
      rule: relation.rule,
      ...("targetElement" in relation ? { targetElement: relation.targetElement } : {}),
      ...("complete" in relation ? { complete: relation.complete } : {}),
      ...("partial" in relation ? { partial: relation.partial } : {}) }))
  };
}
