import { SPECIAL_STRUCTURE_V1 as C, FOLLOW_STRUCTURE_V1 as F,
  DOMINANT_STRUCTURE_V1 as D, TRANSFORMED_QI_STRUCTURE_V1 as T } from "@/rules/special-structure.v1";
import { DAY_MASTER_SUPPORT_V1 } from "@/rules/strength.v1";
import { SEASONAL_ELEMENT_STATE_V1 } from "@/rules/seasonal-element-state.v1";
import { getTenGod, stemTrait } from "./ten-gods";
import type { AdjustedStrengthResult, Pillar, PillarPosition, RelationsResult, StrengthResult } from "@/types/saju-analysis";
import type { SpecialBlocker, SpecialRequirement, SpecialStructureCandidate, SpecialStructureResult,
  SpecialStructureType, SpecialEvidence } from "@/types/special-structure";

export function emptySpecialStructure(): SpecialStructureResult {
  return { status: "not_implemented", ruleVersion: C.rulesetVersion, selected: null,
    candidates: [], standardStructurePreserved: true };
}

/** Reads upstream factors independently. Never computes a new adjusted strength score or transformation. */
export function evaluateSpecialStructure(pillars: Record<PillarPosition, Pillar>, strength: StrengthResult,
  adjusted: AdjustedStrengthResult, relations: RelationsResult): SpecialStructureResult {
  const day = pillars.day.stem, month = pillars.month.branch;
  const values = adjusted.elements;
  if (!day || !month || strength.score === null || !strength.rooting || !values ||
    strength.status !== "implemented" || adjusted.status !== "implemented" ||
    relations.transformation.status !== "implemented") return emptySpecialStructure();
  const elements = DAY_MASTER_SUPPORT_V1.elements;
  const index = elements.indexOf(stemTrait(day).element);
  const [same, output, wealth, officer, resource] = elements.map((_, distance) => elements[(index + distance) % elements.length]);
  const pct = (element: typeof same) => values[element].percentage;
  // Root-damage-v1 has rows only for damaged roots. Undamaged roots retain their original score.
  const roots = strength.rooting.roots.map((root) => ({ ...root,
    adjustedRootScore: adjusted.rootDamage.find((row) => row.pillar === root.pillar &&
      row.hiddenStem === root.hiddenStem && row.role === root.role)?.remainingRootScore ?? root.score }));
  const adjustedRooting = strength.adjustments.adjustedRootingScore ??
    Math.min(strength.rooting.cap, roots.reduce((sum, root) => sum + root.adjustedRootScore, 0));
  const strongRoots = roots.filter((root) => root.adjustedRootScore >= C.strongRootMinimum);
  const visible = (["year", "month", "hour"] as const).flatMap((pillar) => {
    const stem = pillars[pillar].stem;
    return stem ? [{ pillar, stem, element: stemTrait(stem).element, tenGod: getTenGod(day, stem).korean }] : [];
  });
  const strongVisible = (element: typeof same) => {
    const rows = visible.filter((row) => row.element === element);
    return rows.length > 0 && (pct(element) >= C.visibleSupportPercentageMinimum ||
      rows.length >= C.visibleSupportCountMinimum) ? rows : [];
  };
  const companion = strongVisible(same), resources = strongVisible(resource);
  const support = pct(same) + pct(resource);
  const nativeTotal = elements.reduce((sum, element) => sum + values[element].nativeScore, 0);
  const context: SpecialEvidence = { factor: "UPSTREAM_CONTEXT", delta: 0, details: {
    strengthRuleVersion: strength.ruleVersion, strengthScore: strength.score,
    originalRooting: strength.rooting, adjustedRootingScore: adjustedRooting, roots,
    rootDamageRuleVersion: adjusted.rootDamageRuleVersion,
    adjustedStrength: values,
    nativeStrength: Object.fromEntries(elements.map((element) => [element, {
      score: values[element].nativeScore, percentage: values[element].nativeScore / nativeTotal * 100 }])),
    visible, monthBranch: month, seasonalStates: SEASONAL_ELEMENT_STATE_V1.byMonthBranch[month],
    transformationRuleVersion: relations.transformation.ruleVersion,
    transformations: relations.transformation.evaluations,
  } };
  const req = (requirement: string, value: number | boolean | string | null,
    threshold: number | boolean | string, operator: SpecialRequirement["operator"], critical = true): SpecialRequirement => ({
    requirement, value, threshold, operator, critical,
    passed: operator === "=" ? value === threshold : typeof value === "number" && typeof threshold === "number" &&
      (operator === ">=" ? value >= threshold : value <= threshold),
  });
  const block = (code: string, details: Record<string, unknown>, severity: SpecialBlocker["severity"] = "HARD"): SpecialBlocker =>
    ({ code, details, severity });
  function finish(type: SpecialStructureType, label: string, ruleVersion: string,
    requirements: SpecialRequirement[], blockers: SpecialBlocker[], target: typeof same | null,
    metadata: Record<string, unknown> = {}, applicable = true): SpecialStructureCandidate {
    const failed = requirements.filter((row) => !row.passed);
    const rejected = failed.some((row) => row.critical) || blockers.some((row) => row.severity === "HARD") ||
      failed.length > C.conditionalMaximumFailed;
    const state = !applicable ? "NOT_APPLICABLE" : rejected ? "REJECTED" :
      failed.length || blockers.length ? "CONDITIONAL" : "QUALIFIED_CANDIDATE";
    const season = target ? SEASONAL_ELEMENT_STATE_V1.byMonthBranch[month!][target] : null;
    const evidence: SpecialEvidence[] = [context, { factor: "BASELINE", delta: C.score.baseline, details: {} },
      ...requirements.map((row) => ({ factor: row.requirement,
        delta: row.passed ? C.score.requirementPassed : C.score.requirementFailed, details: { ...row } })),
      ...blockers.map((row) => ({ factor: row.code,
        delta: row.severity === "HARD" ? C.score.hardBlocker : C.score.boundaryBlocker, details: { ...row } })),
      { factor: "MONTH_TARGET_SUPPORT", delta: season && C.seasonalSupportStates.some((item) => item === season)
        ? C.score.monthSupport : 0, details: { target, season } }];
    return { type, label, ruleVersion, state,
      confidence: state === "QUALIFIED_CANDIDATE" ? "HIGH" : state === "CONDITIONAL" ? "MEDIUM" : "LOW",
      score: evidence.reduce((sum, row) => sum + row.delta, 0), requirements,
      requirementsPassed: requirements.filter((row) => row.passed).map((row) => row.requirement),
      requirementsFailed: failed.map((row) => row.requirement), blockers, evidence, metadata };
  }
  const rootBlockers = () => strongRoots.map((root) => block("STRONG_DAYMASTER_ROOT", { ...root }));
  const competing = [wealth, officer, output].filter((element) => pct(element) >= C.competingDominanceMinimum);
  const follow = (type: SpecialStructureType, label: string, target: typeof same) => {
    const blockers = [...rootBlockers(),
      ...companion.map((row) => block("VISIBLE_COMPANION_SUPPORT", { ...row, percentage: pct(same) })),
      ...resources.map((row) => block("VISIBLE_RESOURCE_SUPPORT", { ...row, percentage: pct(resource) }))];
    if (pct(resource) >= C.resourceDominanceMinimum) blockers.push(block("RESOURCE_DOMINANCE", { percentage: pct(resource) }));
    if (adjustedRooting > F.rootingMaximum) blockers.push(block("ADJUSTED_ROOTING_TOO_HIGH", { adjustedRootingScore: adjustedRooting }));
    if (competing.length >= C.competingDominanceCountMinimum) blockers.push(block("MULTIPLE_COMPETING_DOMINANCES", { elements: competing }));
    return finish(type, label, F.rulesetVersion, [
      req("DAYMASTER_EXTREMELY_WEAK", strength.score, F.strengthMaximum, "<="),
      req("ADJUSTED_ROOTING_LIMIT", adjustedRooting, F.rootingMaximum, "<="),
      req("NO_STRONG_DAYMASTER_ROOT", strongRoots.length === 0, true, "="),
      req("NO_STRONG_VISIBLE_SUPPORT", companion.length + resources.length === 0, true, "="),
      req("SUPPORT_LIMIT", support, F.supportMaximum, "<="),
      req("TARGET_DOMINANCE", pct(target), F.targetMinimum, ">=", pct(target) < F.targetBoundaryMinimum),
      req("SINGLE_OPPOSING_DOMINANCE", competing.length < C.competingDominanceCountMinimum, true, "="),
    ], blockers, target, type === "FOLLOW_OFFICER" ? {
      officerMixed: visible.some((row) => row.tenGod === "정관") && visible.some((row) => row.tenGod === "편관"),
      officerMixtureScope: "VISIBLE_STEMS", officerSignals: visible.filter((row) => row.element === officer),
    } : {});
  };
  const candidates = [follow("FOLLOW_WEALTH", "종재 후보", wealth), follow("FOLLOW_OFFICER", "종관살 후보", officer),
    follow("FOLLOW_OUTPUT", "종아·종식상 후보", output)];
  const oppositions = ([ ["OFFICER", officer], ["WEALTH", wealth], ["OUTPUT", output] ] as const);
  const oppositionBlockers = oppositions.flatMap(([category, element]) => pct(element) >= D.boundaryOppositionMinimum
    ? [block(`STRONG_${category}_OPPOSITION`, { element, percentage: pct(element) },
      pct(element) >= D.oppositionMinimum ? "HARD" : "BOUNDARY")] : []);
  if (oppositionBlockers.length >= D.multipleOppositionCountMinimum)
    oppositionBlockers.push(block("MULTIPLE_OPPOSITION_CATEGORIES", { count: oppositionBlockers.length }));
  candidates.push(finish("DOMINANT_SELF", "전왕·전강 계열 후보", D.rulesetVersion, [
    req("DAYMASTER_VERY_STRONG", strength.score, D.strengthMinimum, ">="),
    req("SELF_RESOURCE_DOMINANCE", support, D.supportMinimum, ">="),
    req("EXTREME_OR_ROOTED_SUPPORTED", strength.score >= D.extremeStrengthMinimum ||
      (adjustedRooting >= D.strongRootingMinimum && companion.length + resources.length >= D.strongVisibleSupportMinimum), true, "=", false),
  ], oppositionBlockers, same, { adjustedRootingScore: adjustedRooting, strongVisibleSupportCount: companion.length + resources.length }));

  const combinations = relations.heavenlyStems.combinations.filter((row) => row.positions.includes("day"));
  // Evaluate each detected day-master relationship independently, in upstream order. Never cherry-pick a score.
  for (const combination of combinations.length ? combinations : [null]) {
    const evaluation = combination ? relations.transformation.evaluations.find((row) =>
      row.relationId === combination.id && row.relationType === "STEM_COMBINATION") : undefined;
    const target = evaluation?.targetElement ?? null;
    const targetPercent = target ? pct(target) : 0;
    const second = target ? Math.max(...elements.filter((element) => element !== target).map(pct)) : 0;
    const blockers = rootBlockers();
    if (adjustedRooting > T.rootingMaximum) blockers.push(block("ADJUSTED_ROOTING_TOO_HIGH", { adjustedRootingScore: adjustedRooting }));
    const interactionIds = Array.from(new Set([...(evaluation?.competingRelations ?? []), ...(evaluation?.blockingRelations ?? [])]));
    if (interactionIds.length) blockers.push(block("TRANSFORMATION_COMPETITION_OR_BLOCKING", { relationIds: interactionIds },
      interactionIds.length >= T.severeInteractionCountMinimum ? "HARD" : "BOUNDARY"));
    candidates.push(finish("TRANSFORMED_QI_STRUCTURE", "화기 후보", T.rulesetVersion, [
      req("DAYMASTER_COMBINATION_PARTICIPANT", combination !== null, true, "="),
      req("UPSTREAM_TRANSFORMED", evaluation?.state ?? null, "TRANSFORMED", "="),
      req("TARGET_DOMINANCE", targetPercent, T.targetMinimum, ">=", targetPercent < T.targetBoundaryMinimum),
      req("TARGET_RANKS_FIRST", target !== null && targetPercent > second, true, "="),
      req("TARGET_DOMINANCE_MARGIN", targetPercent - second, T.dominanceMarginMinimum, ">=",
        targetPercent - second < T.dominanceMarginBoundaryMinimum),
      req("ORIGINAL_ELEMENT_ROOT_LIMIT", adjustedRooting, T.rootingMaximum, "<="),
      req("NO_STRONG_ORIGINAL_ROOT", strongRoots.length === 0, true, "="),
      req("NO_SEVERE_INTERACTION", interactionIds.length < T.severeInteractionCountMinimum, true, "="),
    ], blockers, target, { relationId: combination?.id ?? null, transformation: evaluation ?? null }, combination !== null));
  }
  return { status: "implemented", ruleVersion: C.rulesetVersion, selected: null, candidates, standardStructurePreserved: true };
}
