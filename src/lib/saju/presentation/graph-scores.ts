import { GRAPH_SCORE_V1 as RULE } from "@/rules/graph-score.v1";
import { DAY_MASTER_SUPPORT_V1, type ElementRelation } from "@/rules/strength.v1";
import type { CategoryFortunePeriod, CategoryFortuneResult } from "@/types/category-fortune";
import type { FortuneResult, SeunActivationPeriod } from "@/types/fortune";
import type { Element, PillarPosition, SajuAnalysis } from "@/types/saju-analysis";

/** 점수를 만든 근거. 본문은 이 근거만 사용해 같은 판단 기준을 유지한다. */
export interface GraphFactor { label: string; delta: number }
export interface GraphBar { key: string; label: string; score: number; factors: GraphFactor[] }
export type PeriodCategory = "overall" | "wealth" | "career" | "love" | "study" | "health";
export interface PeriodGraphPoint { label: string; startInstant: string; endInstant: string; scores: Record<PeriodCategory, number> }
export interface GraphScores {
  status: "implemented" | "not_implemented";
  ruleVersion: typeof RULE.ruleVersion;
  natal: { work: GraphBar[]; wealth: GraphBar[]; love: GraphBar[]; lifeStages: GraphBar[] };
  yearly: PeriodGraphPoint[];
  daeun: PeriodGraphPoint[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
const deviation = (values: number[], floor: number) => {
  const center = mean(values);
  return Math.max(floor, Math.sqrt(mean(values.map((value) => (value - center) ** 2))));
};
/** 한 사람의 분포 안에서 표준화한다. 분포가 평평하면 하한을 써서 잡음을 키우지 않는다. */
export function standardize(values: number[], floor: number): number[] {
  const center = mean(values);
  const spread = deviation(values, floor);
  return values.map((value) => (value - center) / spread);
}
export function anchorOf(values: number[]): number {
  const { base, reference, gain, min, max } = RULE.period.anchor;
  return clamp(base + gain * (mean(values) - reference), min, max);
}
/** 분야 고유 성분에서 공통 성분으로 설명되는 부분을 뺀다. 남는 값이 그 분야만의 오르내림이다. */
export function residualOf(specific: number[], core: number[]): number[] {
  const coreMean = mean(core), specificMean = mean(specific);
  const variance = mean(core.map((value) => (value - coreMean) ** 2));
  const slope = variance === 0 ? 0
    : mean(core.map((value, index) => (value - coreMean) * (specific[index] - specificMean))) / variance;
  return specific.map((value, index) => value - specificMean - slope * (core[index] - coreMean));
}
/** 공통 성분과 분야 고유 성분을 섞어 표시 점수 열을 만든다. */
export function displaySeries(core: number[], specific: number[] | null, raw: number[]): number[] {
  const mix = specific ? RULE.period.mix.category : RULE.period.mix.overall;
  const coreZ = standardize(core, RULE.period.sdFloor.core);
  const specificZ = specific ? standardize(residualOf(specific, core), RULE.period.sdFloor.specific) : null;
  const anchor = anchorOf(raw);
  return coreZ.map((value, index) => Math.round(clamp(
    anchor + RULE.period.spread * (mix.core * value + mix.specific * (specificZ ? specificZ[index] : 0)),
    RULE.period.display.min, RULE.period.display.max)));
}

const inGroup = (group: readonly string[], type: string) => group.includes(type);
type NatalInteraction = { domain: string; natalPosition?: PillarPosition; relationType: string };
function palaceAdjustment(interactions: NatalInteraction[], position: string,
  weights: { combine: number; clash: number; friction: number }): number {
  return interactions.filter((item) => item.domain === "branch" && item.natalPosition === position)
    .reduce((sum, item) => sum + (inGroup(RULE.relationGroups.combine, item.relationType) ? weights.combine
      : inGroup(RULE.relationGroups.clash, item.relationType) ? weights.clash
      : inGroup(RULE.relationGroups.friction, item.relationType) ? weights.friction : 0), 0);
}
function healthSpecific(interactions: NatalInteraction[], favorability: number, samjae: boolean): number {
  const rule = RULE.palace.health;
  const branch = interactions.filter((item) => item.domain === "branch");
  return branch.reduce((sum, item) => sum + (inGroup(RULE.relationGroups.clash, item.relationType)
    ? rule.clash + (item.natalPosition === "day" ? rule.dayClash : 0)
    : inGroup(RULE.relationGroups.friction, item.relationType) ? rule.friction : 0), 0)
    + (samjae ? rule.samjae : 0) + rule.favorabilityWeight * favorability;
}

interface PeriodRow {
  label: string; startInstant: string; endInstant: string;
  overall: number; support: Record<"wealth" | "career" | "relationship" | "study", number>;
  flow: Record<"wealth" | "career" | "relationship" | "study", number>;
  interactions: NatalInteraction[]; stars: string[]; stemTenGod: string; samjae: boolean; favorability: number;
}
function toPoints(rows: PeriodRow[]): PeriodGraphPoint[] {
  if (rows.length === 0) return [];
  const core = rows.map((row) => row.overall);
  const palace = RULE.palace;
  const specific = {
    wealth: rows.map((row) => row.flow.wealth + (["정재", "편재"].includes(row.stemTenGod) ? palace.wealth.wealthStem
      : row.stemTenGod === "겁재" ? palace.wealth.robStem : 0)),
    career: rows.map((row) => row.flow.career + palaceAdjustment(row.interactions, palace.career.position, palace.career)
      + (row.stars.includes("NOBLE_STAR_ACTIVATED") ? palace.career.nobleStar : 0)),
    love: rows.map((row) => row.flow.relationship + palaceAdjustment(row.interactions, palace.love.position, palace.love)
      + (row.stars.includes("PEACH_BLOSSOM_ACTIVATED") ? palace.love.peachBlossom : 0)),
    study: rows.map((row) => row.flow.study),
    health: rows.map((row) => healthSpecific(row.interactions, row.favorability, row.samjae)),
  };
  const series: Record<PeriodCategory, number[]> = {
    overall: displaySeries(core, null, core),
    wealth: displaySeries(core, specific.wealth, rows.map((row) => row.support.wealth)),
    career: displaySeries(core, specific.career, rows.map((row) => row.support.career)),
    love: displaySeries(core, specific.love, rows.map((row) => row.support.relationship)),
    study: displaySeries(core, specific.study, rows.map((row) => row.support.study)),
    health: displaySeries(core, specific.health, core),
  };
  return rows.map((row, index) => ({ label: row.label, startInstant: row.startInstant, endInstant: row.endInstant,
    scores: { overall: series.overall[index], wealth: series.wealth[index], career: series.career[index],
      love: series.love[index], study: series.study[index], health: series.health[index] } }));
}

const flowOf = (period: CategoryFortunePeriod) => ({
  wealth: period.wealth.flow.flowQualityScore, career: period.career.flow.flowQualityScore,
  relationship: period.relationship.flow.flowQualityScore, study: period.study.flow.flowQualityScore,
});
function yearlyRows(categories: CategoryFortuneResult, seun: SeunActivationPeriod[]): PeriodRow[] {
  const segments = new Map(categories.seun.map((segment) => [segment.categoryId, segment]));
  const byStart = new Map(seun.map((period) => [period.period.startInstant, period]));
  return categories.seunPeriodSummaries.flatMap((summary): PeriodRow[] => {
    const source = byStart.get(summary.period.startInstant);
    if (!source) return [];
    const flow = { wealth: 0, career: 0, relationship: 0, study: 0 };
    for (const { categoryId, weight } of summary.segmentWeights) {
      const segment = segments.get(categoryId);
      if (!segment) continue;
      const part = flowOf(segment);
      (Object.keys(flow) as Array<keyof typeof flow>).forEach((key) => { flow[key] += part[key] * weight; });
    }
    const { overallFlow, wealth, career, relationship, study } = summary.categories;
    return [{ label: String(source.year), startInstant: summary.period.startInstant, endInstant: summary.period.endInstant,
      overall: overallFlow.supportScore,
      support: { wealth: wealth.supportScore, career: career.supportScore,
        relationship: relationship.supportScore, study: study.supportScore },
      flow, interactions: source.interactions.natal, stars: source.starActivations.map((star) => star.type),
      stemTenGod: source.tenGodProfile.stemTenGod, samjae: source.samjaeActivation !== null,
      favorability: source.preference.baseFavorabilityScore }];
  });
}
function daeunRows(categories: CategoryFortuneResult, fortune: FortuneResult): PeriodRow[] {
  return categories.daeun.flatMap((period, index): PeriodRow[] => {
    const source = fortune.daeun.periods[index];
    if (!source) return [];
    return [{ label: `${source.pillar.stem}${source.pillar.branch}`,
      startInstant: source.sourcePeriod.startInstant ?? "", endInstant: source.sourcePeriod.endInstant ?? "",
      overall: period.overallFlow.supportScore,
      support: { wealth: period.wealth.supportScore, career: period.career.supportScore,
        relationship: period.relationship.supportScore, study: period.study.supportScore },
      flow: flowOf(period), interactions: source.interactions, stars: source.starActivations.map((star) => star.type),
      stemTenGod: source.tenGodProfile.stemTenGod, samjae: false, favorability: source.preference.baseFavorabilityScore }];
  });
}

const RELATION_LABEL: Record<ElementRelation, string> = {
  same: "비겁", resource: "인성", output: "식상", wealth: "재성", officer: "관성" };
const natalScore = (base: number, factors: GraphFactor[]) => Math.round(clamp(
  base + factors.reduce((sum, factor) => sum + factor.delta, 0), RULE.natal.display.min, RULE.natal.display.max));
const bar = (key: string, label: string, factors: GraphFactor[], base: number = RULE.natal.base): GraphBar => ({
  key, label, score: natalScore(base, factors), factors: factors.filter((factor) => Math.abs(factor.delta) >= 0.5)
    .map((factor) => ({ label: factor.label, delta: Math.round(factor.delta * 10) / 10 })) });

function natalGraphs(analysis: SajuAnalysis): GraphScores["natal"] {
  const strength = analysis.strength;
  const totals: Record<ElementRelation, number> = { same: 0, resource: 0, output: 0, wealth: 0, officer: 0 };
  for (const group of [strength.support, strength.drain, strength.control]) {
    for (const source of group?.sources ?? []) totals[source.relation] += source.contribution;
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const share = (relation: ElementRelation, weight: number): GraphFactor => ({
    label: `${RELATION_LABEL[relation]} 비중 ${Math.round(totals[relation] / sum * 100)}%`,
    delta: weight * (totals[relation] / sum * 100 - RULE.natal.averageShare) });
  const strengthScore = strength.adjusted?.score ?? strength.score ?? 50;
  const strengthFactor = (weight: number): GraphFactor => ({
    label: `일간 강약 ${strength.adjusted?.level ?? strength.level ?? ""}`.trim(), delta: weight * (strengthScore - 50) });
  const flag = (condition: boolean, label: string, delta: number): GraphFactor => ({ label, delta: condition ? delta : 0 });

  const structureType = analysis.structure.primary?.type ?? "";
  const groups = RULE.natal.structureGroups;
  const dayElement = strength.dayMaster?.element;
  const cycle = DAY_MASTER_SUPPORT_V1.elements;
  const elementOf = (relation: ElementRelation): Element | null => dayElement
    ? cycle[(cycle.indexOf(dayElement) + DAY_MASTER_SUPPORT_V1.relationByForwardDistance.indexOf(relation)) % cycle.length] : null;
  const synthesis = analysis.usefulGods.synthesis;
  const roleOf = (relation: ElementRelation) => synthesis.status === "implemented"
    ? synthesis.elements.find((item) => item.element === elementOf(relation))?.role ?? null : null;
  const usefulFactor = (relation: ElementRelation, bonus: number): GraphFactor => {
    const role = roleOf(relation);
    const favorable = role !== null && (RULE.natal.favorableRoles as readonly string[]).includes(role);
    const unfavorable = role !== null && (RULE.natal.unfavorableRoles as readonly string[]).includes(role);
    return { label: `${RELATION_LABEL[relation]}이 ${favorable ? "좋은" : "부담되는"} 기운`, delta: favorable ? bonus : unfavorable ? -bonus : 0 };
  };

  const stems = analysis.tenGods.status === "implemented" && analysis.tenGods.value
    ? (["year", "month", "hour"] as const).map((position) => analysis.tenGods.value!.heavenlyStems[position].korean) : [];
  const dayBranchTenGod = analysis.tenGods.status === "implemented" && analysis.tenGods.value
    ? analysis.tenGods.value.hiddenStems.day[0]?.tenGod.korean ?? "" : "";
  const stars = "nobleStars" in analysis.nobleAndSpecialStars ? analysis.nobleAndSpecialStars : null;
  const academic = stars ? stars.nobleStars.filter((star) => star.type === "ACADEMIC").length : 0;
  const peach = stars ? stars.peachBlossom.length : 0;
  const canopy = stars ? stars.flowerCanopy.length : 0;
  const horse = stars ? stars.travelHorse.length : 0;
  const branchPairs = analysis.relations.earthlyBranches as unknown as Record<string, Array<{ positions?: PillarPosition[]; pillars?: PillarPosition[] }>>;
  const dayClash = (branchPairs.clashes ?? []).some((item) => (item.positions ?? item.pillars ?? []).includes("day"));

  const work = RULE.natal.work, wealth = RULE.natal.wealth, love = RULE.natal.love;
  return {
    work: [
      bar("career", "직장운", [share("officer", work.career.officer), share("resource", work.career.resource),
        flag((groups.officer as readonly string[]).includes(structureType), structureType, work.career.structureBonus),
        usefulFactor("officer", work.career.usefulBonus)]),
      bar("business", "사업운", [share("wealth", work.business.wealth), share("output", work.business.output),
        share("same", work.business.companion), strengthFactor(work.business.strengthWeight),
        flag((groups.wealthOutput as readonly string[]).includes(structureType), structureType, work.business.structureBonus)]),
      bar("study", "학업운", [share("resource", work.study.resource), share("output", work.study.output),
        flag(academic > 0, "학당귀인", work.study.academicStar * academic),
        flag((groups.resource as readonly string[]).includes(structureType), structureType, work.study.structureBonus)]),
    ],
    wealth: [
      bar("earn", "버는 힘", [share("wealth", wealth.earn.wealth), share("output", wealth.earn.output)]),
      bar("save", "모으는 힘", [share("wealth", wealth.save.wealth), share("officer", wealth.save.officer),
        share("same", wealth.save.companion), flag(stems.includes("정재"), "천간 정재", wealth.save.directWealthVisible)]),
      bar("keep", "지키는 힘", [strengthFactor(wealth.keep.strengthWeight), share("resource", wealth.keep.resource),
        flag(stems.includes("겁재"), "천간 겁재", wealth.keep.robVisible * stems.filter((name) => name === "겁재").length)]),
      bar("grow", "불리는 힘", [share("output", wealth.grow.output), share("wealth", wealth.grow.wealth),
        flag(stems.includes("편재"), "천간 편재", wealth.grow.indirectWealthVisible)]),
    ],
    love: [
      bar("initiative", "적극성", [share("same", love.initiative.companion), share("output", love.initiative.output),
        strengthFactor(love.initiative.strengthWeight)]),
      bar("sincerity", "진지함", [share("officer", love.sincerity.officer), share("resource", love.sincerity.resource)]),
      bar("charm", "매력", [flag(peach > 0, `도화 ${peach}개`, love.charm.peachBlossom * peach),
        flag(canopy > 0, "화개", love.charm.flowerCanopy * canopy), share("output", love.charm.output)], love.charm.base),
      bar("devotion", "헌신", [share("resource", love.devotion.resource), share("officer", love.devotion.officer),
        flag((RULE.natal.steadyDayTenGods as readonly string[]).includes(dayBranchTenGod), `일지 ${dayBranchTenGod}`, love.devotion.steadyDayBranch)]),
      bar("stability", "안정지향", [share("officer", love.stability.officer), share("resource", love.stability.resource),
        flag(horse > 0, "역마", love.stability.travelHorse * horse), flag(dayClash, "일지 충", love.stability.dayBranchClash)]),
      bar("expression", "표현력", [share("output", love.expression.output)]),
    ],
    lifeStages: analysis.twelveStages.status === "implemented" && analysis.twelveStages.value
      ? ([["year", "초년"], ["month", "청년"], ["day", "중년"], ["hour", "말년"]] as const).map(([position, label]) => {
        const stage = analysis.twelveStages.value!.stages[position].korean;
        return { key: position, label, score: RULE.twelveStageEnergy[stage] ?? RULE.natal.base, factors: [{ label: stage, delta: 0 }] };
      }) : [],
  };
}

/** 고객 그래프용 표시 점수. 엔진 점수를 바꾸지 않고 읽기만 한다. */
export function buildGraphScores(analysis: SajuAnalysis): GraphScores {
  const fortune = analysis.fortune as FortuneResult;
  const empty: GraphScores = { status: "not_implemented", ruleVersion: RULE.ruleVersion,
    natal: { work: [], wealth: [], love: [], lifeStages: [] }, yearly: [], daeun: [] };
  if (analysis.strength.status !== "implemented" || !("categories" in fortune) || fortune.categories.status !== "implemented" ||
    fortune.seun.status !== "implemented" || fortune.daeun.status !== "implemented") return empty;
  return { status: "implemented", ruleVersion: RULE.ruleVersion, natal: natalGraphs(analysis),
    yearly: toPoints(yearlyRows(fortune.categories, fortune.seun.periods ?? [])),
    daeun: toPoints(daeunRows(fortune.categories, fortune)) };
}
