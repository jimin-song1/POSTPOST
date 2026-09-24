import { JOHU_QIONGTONG_V1, JOHU_USEFUL_GOD_V1 as RULE,
  type JohuRuleCell } from "@/rules/johu-qiongtong.v1";
import type { BranchHiddenStems } from "./hidden-stems";
import type { AdjustedStrengthResult, Element, Pillar, PillarPosition,
  RelationsResult, Stem } from "@/types/saju-analysis";
import type { JohuAvailability, JohuResult, JohuStemPreference } from "@/types/useful-gods";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const visiblePositions: PillarPosition[] = ["year", "month", "hour"];

export function emptyJohu(): JohuResult {
  return { status: "not_implemented", ruleVersion: RULE.rulesetVersion,
    sourceVersion: JOHU_QIONGTONG_V1.sourceVersion, conditionRuleVersion: RULE.conditionRuleVersion,
    sourceTradition: JOHU_QIONGTONG_V1.tradition, dayStem: null, monthBranch: null,
    urgency: null, climateTags: [], stemPreferences: [], elementPreferences: [],
    activeConditions: [], activeBlockers: [], sourceEvidence: [] };
}

export function validateJohuRuleTable(cells: readonly JohuRuleCell[]) {
  const validStems = new Set<Stem>(RULE.canonicalStemOrder);
  const validBranches = new Set(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]);
  if (cells.length !== 120) throw new Error(`Expected 120 johu cells, received ${cells.length}`);
  const keys = new Set<string>();
  for (const cell of cells) {
    const key = `${cell.dayStem}:${cell.monthBranch}`;
    if (keys.has(key)) throw new Error(`Duplicate johu cell ${key}`);
    keys.add(key);
    if (!validStems.has(cell.dayStem) || !validBranches.has(cell.monthBranch)) throw new Error(`Invalid johu key ${key}`);
    if (!cell.source.section || !cell.source.sourceNote) throw new Error(`Missing source provenance ${key}`);
    const ranks = new Set<number>();
    for (const row of cell.priorities) {
      if (!validStems.has(row.stem)) throw new Error(`Invalid priority stem ${key}`);
      if (ranks.has(row.rank)) throw new Error(`Duplicate priority rank ${key}`);
      ranks.add(row.rank);
    }
    for (const condition of cell.conditions) {
      for (const stem of [...(condition.priorityOverride ?? []), ...Object.keys(condition.scoreDeltas ?? {}) as Stem[]])
        if (!validStems.has(stem)) throw new Error(`Invalid condition stem ${key}`);
    }
    for (const blocker of cell.blockers) for (const stem of blocker.targetStems)
      if (!validStems.has(stem)) throw new Error(`Invalid blocker stem ${key}`);
  }
  for (const stem of Array.from(validStems)) {
    const count = cells.filter((cell) => cell.dayStem === stem).length;
    if (count !== 12) throw new Error(`Expected 12 months for ${stem}, received ${count}`);
  }
  return true;
}

validateJohuRuleTable(JOHU_QIONGTONG_V1.cells);

function availability(stem: Stem, pillars: Record<PillarPosition, Pillar>,
  hidden: Record<PillarPosition, BranchHiddenStems>, relations: RelationsResult): JohuAvailability {
  const visible = visiblePositions.filter((position) => pillars[position].stem === stem);
  const hiddenLocations = positions.flatMap((pillar) => {
    const branch = hidden[pillar];
    return [branch.mainQi, branch.middleQi, branch.residualQi].filter((row) => row?.stem === stem)
      .map((row) => ({ pillar, branch: branch.branch, role: row!.role }));
  });
  const relationContext = relations.transformation.evaluations.filter((evaluation) =>
    relations.heavenlyStems.combinations.some((combination) => combination.id === evaluation.relationId &&
      combination.members.includes(stem))).map(({ relationId, state }) => ({ relationId, state }));
  return { state: visible.length ? "VISIBLE" : hiddenLocations.length ? "HIDDEN" : "ABSENT",
    visible: visible.length > 0, visiblePositions: visible, dayStemSelf: pillars.day.stem === stem,
    hidden: hiddenLocations.length > 0, hiddenLocations,
    rooted: hiddenLocations.length > 0, relationContext };
}

function woodFormationActive(relations: RelationsResult) {
  return [...relations.earthlyBranches.threeHarmonies, ...relations.earthlyBranches.directionalCombinations]
    .some((relation) => relation.complete && relation.targetElement === "wood");
}

export function evaluateJohuUsefulGod(pillars: Record<PillarPosition, Pillar>,
  hidden: Record<PillarPosition, BranchHiddenStems>, adjusted: AdjustedStrengthResult,
  relations: RelationsResult): JohuResult {
  const dayStem = pillars.day.stem, monthBranch = pillars.month.branch;
  if (!dayStem || !monthBranch || adjusted.status !== "implemented" || !adjusted.elements ||
    relations.status !== "implemented") return emptyJohu();
  const cell = JOHU_QIONGTONG_V1.cells.find((row) => row.dayStem === dayStem && row.monthBranch === monthBranch);
  if (!cell) throw new Error(`Missing johu rule cell ${dayStem}:${monthBranch}`);
  const sameElement = RULE.elementByStem[dayStem];
  const hasVisibleCompanion = visiblePositions.some((position) => {
    const stem = pillars[position].stem;
    return stem !== null && RULE.elementByStem[stem] === sameElement;
  });
  const activeConditions = cell.conditions.filter((condition) =>
    (!condition.if.branchFormation || woodFormationActive(relations)) &&
    (!condition.if.visibleCompanion || hasVisibleCompanion));
  let priorities = cell.priorities.map((row) => ({ ...row }));
  for (const condition of activeConditions) {
    if (condition.priorityOverride) priorities = condition.priorityOverride.map((stem, index) => ({
      stem, rank: index + 1, role: index === 0 ? "PRIMARY" as const : index === 1 ? "SECONDARY" as const : "SUPPORTING" as const,
    }));
  }
  const activeBlockers = cell.blockers.filter((blocker) =>
    adjusted.elements![blocker.if.adjustedElement].percentage >= blocker.if.percentageAtLeast);
  const stemPreferences: JohuStemPreference[] = priorities.map((priority) => {
    const base = RULE.scoreByRole[priority.role];
    const conditionDelta = activeConditions.reduce((sum, condition) => sum + (condition.scoreDeltas?.[priority.stem] ?? 0), 0);
    const evidence: JohuStemPreference["evidence"] = [{ factor: "CURATED_STEM_PRIORITY", delta: base,
      details: { rank: priority.rank, role: priority.role, sourceSection: cell.source.section } }];
    if (conditionDelta) evidence.push({ factor: "CONDITION_SCORE_DELTA", delta: conditionDelta,
      details: { conditionIds: activeConditions.map((condition) => condition.id) } });
    const blockers = activeBlockers.filter((blocker) => blocker.targetStems.includes(priority.stem));
    if (blockers.length) evidence.push({ factor: "BLOCKING_CONTEXT", delta: 0,
      details: { blockerIds: blockers.map((blocker) => blocker.id), preferencePreserved: true } });
    return { stem: priority.stem, element: RULE.elementByStem[priority.stem], preferenceRank: priority.rank,
      preferenceScore: base + conditionDelta, role: priority.role,
      availability: availability(priority.stem, pillars, hidden, relations), evidence };
  });
  const byElement = new Map<Element, JohuStemPreference[]>();
  for (const preference of stemPreferences) byElement.set(preference.element,
    [...(byElement.get(preference.element) ?? []), preference]);
  const elementPreferences = Array.from(byElement.entries()).map(([element, rows]) => {
    const sorted = [...rows].sort((a, b) => b.preferenceScore - a.preferenceScore ||
      RULE.canonicalStemOrder.indexOf(a.stem) - RULE.canonicalStemOrder.indexOf(b.stem));
    return { element, score: sorted.reduce((sum, row, index) =>
      sum + row.preferenceScore * (RULE.aggregationWeights[index] ?? 0), 0),
      contributingStems: sorted.map((row) => row.stem) };
  }).sort((a, b) => b.score - a.score || ["wood","fire","earth","metal","water"].indexOf(a.element) -
    ["wood","fire","earth","metal","water"].indexOf(b.element));
  return { status: "implemented", ruleVersion: RULE.rulesetVersion,
    sourceVersion: JOHU_QIONGTONG_V1.sourceVersion, conditionRuleVersion: RULE.conditionRuleVersion,
    sourceTradition: JOHU_QIONGTONG_V1.tradition, dayStem, monthBranch, urgency: cell.urgency,
    climateTags: [...cell.climateTags], stemPreferences, elementPreferences,
    activeConditions: activeConditions.map((condition) => ({ id: condition.id,
      effect: condition.priorityOverride ? "PRIORITY_OVERRIDE" : "SCORE_DELTA" })),
    activeBlockers: activeBlockers.map((blocker) => ({ id: blocker.id,
      targetStems: [...blocker.targetStems], effect: "CONTEXT_ONLY" })),
    sourceEvidence: [{ section: cell.source.section, sourceNote: cell.source.sourceNote,
      curationVersion: cell.source.curationVersion, ...(cell.curationNote ? { curationNote: cell.curationNote } : {}) }] };
}
