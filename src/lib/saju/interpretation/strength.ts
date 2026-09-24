import { STRENGTH_V1, DAY_MASTER_SUPPORT_V1, type ElementRelation } from "@/rules/strength.v1";
import { ROOTING_V1 } from "@/rules/rooting.v1";
import { ROOT_DAMAGE_V1 } from "@/rules/root-damage.v1";
import { stemTrait, getTenGod } from "./ten-gods";
import type { BranchHiddenStems } from "./hidden-stems";
import type { Element, ElementContribution, Pillar, PillarPosition, Stem, StrengthBalance, StrengthEvidence, StrengthResult } from "@/types/saju-analysis";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const otherStems: PillarPosition[] = ["year", "month", "hour"];
const deukSeBranches: PillarPosition[] = ["year", "day", "hour"];

export function elementRelation(day: Element, target: Element): ElementRelation {
  const cycle = DAY_MASTER_SUPPORT_V1.elements;
  const distance = (cycle.indexOf(target) - cycle.indexOf(day) + cycle.length) % cycle.length;
  return DAY_MASTER_SUPPORT_V1.relationByForwardDistance[distance];
}

export function strengthLevel(score: number): NonNullable<StrengthResult["level"]> {
  const band = [...STRENGTH_V1.levels].reverse().find(({ minimum }) => score >= minimum);
  if (!band || score > STRENGTH_V1.maximum) throw new Error("Strength score out of bounds");
  return band.level;
}

export function clampStrengthScore(score: number): number {
  return Math.max(STRENGTH_V1.minimum, Math.min(STRENGTH_V1.maximum, score));
}

/** Evaluate the original pillars without adding relation damage or five-element scores to the score. */
export function calculateStrength(
  pillars: Record<PillarPosition, Pillar>,
  hiddenBranches: Record<PillarPosition, BranchHiddenStems>,
  nativeEvidence: ElementContribution[]
): StrengthResult {
  const dayStem = pillars.day.stem;
  if (!dayStem) throw new Error("Day stem required");
  const day = stemTrait(dayStem);
  const evidence: StrengthEvidence[] = [{ factor: "baseline", scoreDelta: STRENGTH_V1.baseline }];
  const monthBranch = hiddenBranches.month;
  const monthRelation = elementRelation(day.element, monthBranch.mainQi.element);
  const monthScore = STRENGTH_V1.monthCommand[monthRelation];
  evidence.push({ factor: "monthCommand", pillar: "month", branch: monthBranch.branch,
    relation: monthRelation, scoreDelta: monthScore });
  const deukRyeong = { isObtained: monthScore > STRENGTH_V1.deukRyeongMinimumExclusive,
    relation: monthRelation, score: monthScore,
    evidence: [`월지 ${monthBranch.branch} 본기 ${monthBranch.mainQi.stem}의 ${monthRelation} 관계: ${monthScore}`] };

  for (const position of otherStems) {
    const stem = pillars[position].stem as Stem;
    const tenGod = getTenGod(dayStem, stem);
    evidence.push({ factor: "visibleStem", pillar: position, stem, tenGod,
      relation: elementRelation(day.element, stemTrait(stem).element), scoreDelta: STRENGTH_V1.visibleStem[tenGod.korean] });
  }

  const roots: NonNullable<StrengthResult["rooting"]>["roots"] = [];
  let rawRootScore = 0;
  let appliedRootScore = 0;
  for (const position of positions) {
    const branch = hiddenBranches[position];
    for (const detail of [branch.mainQi, branch.middleQi, branch.residualQi]) {
      if (!detail || detail.element !== day.element) continue;
      const score = ROOTING_V1.points[detail.role];
      const appliedScore = Math.min(score, Math.max(ROOTING_V1.cap - appliedRootScore, STRENGTH_V1.minimum));
      rawRootScore += score;
      appliedRootScore += appliedScore;
      roots.push({ pillar: position, branch: branch.branch, hiddenStem: detail.stem, role: detail.role, score, appliedScore });
      evidence.push({ factor: "root", pillar: position, branch: branch.branch, hiddenStem: detail.stem,
        role: detail.role, rawScore: score, scoreDelta: appliedScore });
    }
  }
  const rooting = { rawScore: rawRootScore, score: appliedRootScore, cap: ROOTING_V1.cap, roots };
  const dayRoot = roots.some(({ pillar }) => pillar === "day");
  const deukJi = { isObtained: dayRoot, relation: dayRoot ? "same" as const : null,
    score: dayRoot ? STRENGTH_V1.deukJiBonus : STRENGTH_V1.minimum,
    evidence: [`일지 ${hiddenBranches.day.branch}의 동일 오행 지장간: ${dayRoot ? "있음" : "없음"}`] };
  evidence.push({ factor: "deukJi", pillar: "day", branch: hiddenBranches.day.branch, scoreDelta: deukJi.score });

  const hour = hiddenBranches.hour;
  const hourRelation = elementRelation(day.element, hour.mainQi.element);
  const hourObtained = DAY_MASTER_SUPPORT_V1.categories[hourRelation] === "support";
  const deukSi = { isObtained: hourObtained, relation: hourRelation,
    score: hourObtained ? STRENGTH_V1.deukSiBonus : STRENGTH_V1.minimum,
    evidence: [`시지 ${hour.branch} 본기 ${hour.mainQi.stem}의 ${hourRelation} 관계`] };
  evidence.push({ factor: "deukSi", pillar: "hour", branch: hour.branch,
    relation: hourRelation, scoreDelta: deukSi.score });

  const summaries = { support: [] as StrengthBalance["sources"], drain: [] as StrengthBalance["sources"],
    control: [] as StrengthBalance["sources"] };
  let supportWeight = 0;
  let oppositionWeight = 0;
  for (const item of nativeEvidence) {
    if (item.source === "dayStem") continue;
    const relation = elementRelation(day.element, item.element);
    const category = DAY_MASTER_SUPPORT_V1.categories[relation];
    summaries[category].push({ source: item.source, element: item.element, relation, contribution: item.finalContribution });
    if (item.source === "monthBranch") continue;
    if (item.source.endsWith("Branch") && !deukSeBranches.some((position) => item.source === `${position}Branch`)) continue;
    if (category === "support") supportWeight += item.finalContribution;
    else oppositionWeight += item.finalContribution;
  }
  const difference = supportWeight - oppositionWeight;
  const deukSeScore = Math.abs(difference) <= STRENGTH_V1.deukSe.neutralDifferenceInclusive ? STRENGTH_V1.minimum
    : difference > 0 ? STRENGTH_V1.deukSe.bonus : STRENGTH_V1.deukSe.penalty;
  const deukSe = { isObtained: deukSeScore > STRENGTH_V1.minimum, relation: null,
    score: deukSeScore, evidence: [`월지·일간 제외 기여도: support ${supportWeight}, opposition ${oppositionWeight}; 차이 ${difference}`] };
  evidence.push({ factor: "deukSe", scoreDelta: deukSeScore,
    reason: `supportWeight=${supportWeight}; oppositionWeight=${oppositionWeight}; neutralThreshold=${STRENGTH_V1.deukSe.neutralDifferenceInclusive}` });

  const unbounded = evidence.reduce((sum, item) => sum + item.scoreDelta, 0);
  const score = clampStrengthScore(unbounded);
  if (score !== unbounded) evidence.push({ factor: "clamp", scoreDelta: score - unbounded });
  const balance = (sources: StrengthBalance["sources"]): StrengthBalance => ({
    count: sources.length, weightedContribution: sources.reduce((sum, item) => sum + item.contribution, 0), sources
  });
  return {
    status: "implemented", ruleVersion: STRENGTH_V1.rulesetVersion,
    rootingRuleVersion: ROOTING_V1.rulesetVersion, supportRuleVersion: DAY_MASTER_SUPPORT_V1.rulesetVersion,
    score, level: strengthLevel(score), dayMaster: { stem: dayStem, element: day.element, yinYang: day.polarity },
    deukRyeong, deukJi, deukSe, deukSi, rooting,
    support: balance(summaries.support), drain: balance(summaries.drain), control: balance(summaries.control),
    relationAdjustmentApplied: false, evidence,
    adjustments: { status: "not_implemented", ruleVersion: ROOT_DAMAGE_V1.rulesetVersion,
      originalRootingScore: null, adjustedRootingScore: null, rootDamage: [], adjustedScore: null }
  };
}
