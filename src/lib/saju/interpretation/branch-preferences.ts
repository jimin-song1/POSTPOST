import { BRANCH_PREFERENCES_V1 as RULE } from "@/rules/branch-preferences.v1";
import { BRANCH_RELATIONS_V1 } from "@/rules/branch-relations.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { PUNISHMENT_V1 } from "@/rules/punishment.v1";
import { stemTrait } from "./ten-gods";
import { synthesisRole } from "./useful-god-synthesis";
import type { Branch, Element, Pillar, PillarPosition } from "@/types/saju-analysis";
import type { BranchHiddenComponent, BranchPreference, BranchPreferencesResult,
  ProspectiveBranchRelation, ProspectiveBranchRelationType } from "@/types/branch-preferences";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import type { SynthesisRole } from "@/types/useful-gods";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const natalPositions = (branch: Branch, pillars: Record<PillarPosition, Pillar>) =>
  positions.filter(position => pillars[position].branch === branch);
const natalMembers = (members: readonly Branch[], pillars: Record<PillarPosition, Pillar>) =>
  members.flatMap(branch => {
    const found = natalPositions(branch, pillars);
    return found.length ? [{ branch, positions: found }] : [];
  });

export function prospectiveBranchRelations(candidate: Branch,
  pillars: Record<PillarPosition, Pillar>): ProspectiveBranchRelation[] {
  const result: ProspectiveBranchRelation[] = [];
  const pairs = (rules: readonly { pair: readonly [Branch, Branch]; rule: string }[],
    type: ProspectiveBranchRelationType, ruleVersion: string) => {
    for (const row of rules) {
      if (!row.pair.includes(candidate)) continue;
      const other = row.pair.find(branch => branch !== candidate)!;
      const found = natalPositions(other, pillars);
      if (found.length) result.push({ type, state: "PAIR", members: [...row.pair],
        natalMembers: [{ branch: other, positions: found }], ruleVersion, rule: row.rule });
    }
  };
  const groups = (rules: readonly { group: readonly [Branch, Branch, Branch]; rule: string; targetElement?: Element }[],
    type: ProspectiveBranchRelationType, ruleVersion: string) => {
    for (const row of rules) {
      if (!row.group.includes(candidate)) continue;
      const present = new Set<Branch>([candidate]);
      for (const branch of row.group) if (natalPositions(branch, pillars).length) present.add(branch);
      if (present.size < 2) continue;
      result.push({ type, state: present.size === 3 ? "COMPLETE" : "PARTIAL",
        members: [...row.group], natalMembers: natalMembers(row.group, pillars),
        ...(row.targetElement ? { targetElement: row.targetElement } : {}), ruleVersion, rule: row.rule });
    }
  };
  pairs(BRANCH_RELATIONS_V1.sixCombinations, "SIX_COMBINATION", BRANCH_RELATIONS_V1.rulesetVersion);
  groups(BRANCH_RELATIONS_V1.threeHarmonies, "THREE_HARMONY", BRANCH_RELATIONS_V1.rulesetVersion);
  groups(BRANCH_RELATIONS_V1.directionalCombinations, "DIRECTIONAL_COMBINATION", BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.clashes, "BRANCH_CLASH", BRANCH_RELATIONS_V1.rulesetVersion);
  groups(PUNISHMENT_V1.three, "THREE_PUNISHMENT", PUNISHMENT_V1.rulesetVersion);
  pairs(PUNISHMENT_V1.mutual, "MUTUAL_PUNISHMENT", PUNISHMENT_V1.rulesetVersion);
  const self = PUNISHMENT_V1.self.find(row => row.branch === candidate);
  const same = natalPositions(candidate, pillars);
  if (self && same.length) result.push({ type: "SELF_PUNISHMENT", state: "PAIR",
    members: [candidate, candidate], natalMembers: [{ branch: candidate, positions: same }],
    ruleVersion: PUNISHMENT_V1.rulesetVersion, rule: self.rule });
  pairs(BRANCH_RELATIONS_V1.harms, "BRANCH_HARM", BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.breaks, "BRANCH_BREAK", BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.wonjin, "WONJIN", BRANCH_RELATIONS_V1.rulesetVersion);
  return result;
}

export function evaluateBranchPreferences(pillars: Record<PillarPosition, Pillar>,
  stemPreferences: StemPreferencesResult): BranchPreferencesResult {
  const branches = RULE.canonicalBranchOrder.map((branch): BranchPreference => {
    const hidden = HIDDEN_STEMS_V1.branches[branch];
    const rows = (["mainQi", "middleQi", "residualQi"] as const)
      .flatMap(qiRole => hidden[qiRole] ? [{ qiRole, stem: hidden[qiRole] }] : []);
    const allocation = rows.length === 1 ? ELEMENT_WEIGHT_V1.allocations.one :
      rows.length === 2 ? ELEMENT_WEIGHT_V1.allocations.two : ELEMENT_WEIGHT_V1.allocations.three;
    const hiddenComponents: BranchHiddenComponent[] = rows.map(({ stem, qiRole }) => {
      const preference = stemPreferences.stems.find(row => row.stem === stem);
      if (!preference) throw new Error(`Missing stem preference for ${stem}`);
      const weight = allocation[qiRole];
      return { stem, qiRole, weight, stemScore: preference.score, stemRole: preference.role,
        stemConfidence: preference.confidence, weightedScore: preference.score * weight };
    });
    const baseScore = hiddenComponents.reduce((sum, row) => sum + row.weightedScore, 0);
    const main = hiddenComponents.find(row => row.qiRole === "mainQi")!;
    const present = natalPositions(branch, pillars);
    const relations = prospectiveBranchRelations(branch, pillars);
    return { branch, representativeElement: stemTrait(hidden.mainQi).element,
      score: baseScore, baseScore, role: synthesisRole(baseScore), confidence: main.stemConfidence,
      hiddenComponents, availability: { state: present.length ? "PRESENT" : "ABSENT",
        positions: present, count: present.length }, prospectiveRelations: relations,
      evidence: hiddenComponents.map(row =>
        `${row.qiRole}:${row.stem}: stemScore=${row.stemScore}, weight=${row.weight}, weightedScore=${row.weightedScore}`)
        .concat(`base=${baseScore}; relationDelta=0; availabilityDelta=0; final=${baseScore}`) };
  }).sort((a, b) => b.score - a.score || RULE.canonicalBranchOrder.indexOf(a.branch) -
    RULE.canonicalBranchOrder.indexOf(b.branch));
  const group = (role: SynthesisRole) => branches.filter(row => row.role === role).map(row => row.branch);
  return { status: "implemented", ruleVersion: RULE.ruleVersion,
    synthesisVersion: RULE.synthesisVersion, hiddenStemRuleVersion: HIDDEN_STEMS_V1.rulesetVersion,
    weightRuleVersion: ELEMENT_WEIGHT_V1.rulesetVersion, branches,
    rankedBranches: branches.map(row => row.branch), primaryBranches: group("PRIMARY"),
    secondaryBranches: group("SECONDARY"), favorableBranches: group("FAVORABLE"),
    conditionalBranches: group("CONDITIONAL"), neutralBranches: group("NEUTRAL"),
    unfavorableBranches: group("UNFAVORABLE") };
}
