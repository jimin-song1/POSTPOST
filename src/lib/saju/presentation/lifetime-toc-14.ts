import { LIFETIME_TOC_14_V1 as RULE } from "@/rules/lifetime-toc-14.v1";
import type { GraphBar, GraphScores, PeriodCategory, PeriodGraphPoint } from "./graph-scores";

/** 그래프에 찍힌 한 시점과 그 점수. 본문은 이 값을 그대로 인용한다. */
export interface ScoredPeriod { label: string; startInstant: string; endInstant: string; score: number }
export type YearlyFocusCategory = typeof RULE.yearlyFocusCategories[number];
export interface YearlyFocus {
  /** guard: 그해 가장 낮은 분야를 조심한다. use: 모든 분야가 기준 이상이라 가장 높은 분야를 살린다. */
  mode: "guard" | "use";
  category: YearlyFocusCategory;
  score: number;
}
export interface YearlyEntry { year: string; startInstant: string; endInstant: string; scores: Record<PeriodCategory, number>; focus: YearlyFocus }
export interface DaeunEntry extends ScoredPeriod { index: number; relation: "past" | "current" | "future" }

/** 14편 목차의 그래프 항목별 입력값. 그래프가 없는 편(제0~3편, 제8~9편, 제13~14편)은 여기서 다루지 않는다. */
export interface LifetimeTocGraphPlan {
  status: "implemented" | "not_implemented";
  ruleVersion: typeof RULE.ruleVersion;
  graphRuleVersion: GraphScores["ruleVersion"];
  referenceYear: number;
  /** 제4편 직업&학업운 */
  part4: { bars: GraphBar[]; series: ScoredPeriod[]; rising: ScoredPeriod[]; caution: ScoredPeriod[] };
  /** 제5편 재물운: 재물운만 상승, 하락으로 표기한다. */
  part5: { bars: GraphBar[]; series: ScoredPeriod[]; rising: ScoredPeriod[]; falling: ScoredPeriod[] };
  /** 제6편 애정운&자녀운 */
  part6: { radar: GraphBar[]; series: ScoredPeriod[]; rising: ScoredPeriod[]; caution: ScoredPeriod[] };
  /** 제7편 건강운 */
  part7: { series: ScoredPeriod[]; caution: ScoredPeriod[] };
  /** 제10편 십이운성 */
  part10: { curve: GraphBar[] };
  /** 제11편 대운 */
  part11: { series: DaeunEntry[]; previous: DaeunEntry | null; current: DaeunEntry | null; next: DaeunEntry | null;
    golden: DaeunEntry | null; hardest: DaeunEntry | null };
  /** 제12편 연운 */
  part12: { years: YearlyEntry[] };
}

const yearOf = (instant: string) => Number(instant.slice(0, 4));
const scored = (point: PeriodGraphPoint, category: PeriodCategory): ScoredPeriod =>
  ({ label: point.label, startInstant: point.startInstant, endInstant: point.endInstant, score: point.scores[category] });

/** 점수 순으로 고르고, 같은 점수는 이른 시기를 먼저 둔다. 고른 뒤에는 시간순으로 돌려 준다. */
export function pickExtremes(series: ScoredPeriod[], count: number, direction: "high" | "low"): ScoredPeriod[] {
  const sign = direction === "high" ? -1 : 1;
  const ranked = series.map((row, order) => ({ row, order }))
    .sort((a, b) => sign * (a.row.score - b.row.score) || a.order - b.order).slice(0, count);
  return ranked.sort((a, b) => a.order - b.order).map(({ row }) => row);
}
/** 상승 시기와 조심 시기가 같은 해를 가리키지 않도록, 낮은 쪽은 높은 쪽에서 고른 해를 빼고 고른다. */
function risingAndLow(series: ScoredPeriod[]) {
  const rising = pickExtremes(series, RULE.periodPickCount, "high");
  const taken = new Set(rising.map((row) => row.startInstant));
  const low = pickExtremes(series.filter((row) => !taken.has(row.startInstant)), RULE.periodPickCount, "low");
  return { rising, low };
}

export function yearlyFocus(scores: Record<PeriodCategory, number>): YearlyFocus {
  const rows = RULE.yearlyFocusCategories.map((category, order) => ({ category, score: scores[category], order }));
  const lowest = [...rows].sort((a, b) => a.score - b.score || a.order - b.order)[0];
  if (lowest.score < RULE.yearlyGuardBelow) return { mode: "guard", category: lowest.category, score: lowest.score };
  const highest = [...rows].sort((a, b) => b.score - a.score || a.order - b.order)[0];
  return { mode: "use", category: highest.category, score: highest.score };
}

function daeunPart(points: PeriodGraphPoint[], reference: number): LifetimeTocGraphPlan["part11"] {
  const series: DaeunEntry[] = points.map((point, index) => {
    const start = Date.parse(point.startInstant), end = Date.parse(point.endInstant);
    const relation = end <= reference ? "past" : start <= reference ? "current" : "future";
    return { ...scored(point, "overall"), index, relation };
  });
  const currentIndex = series.findIndex((row) => row.relation === "current");
  const firstFuture = series.findIndex((row) => row.relation === "future");
  const anchor = currentIndex >= 0 ? currentIndex : firstFuture;
  const pool = anchor >= 0 ? series.slice(anchor) : [];
  const golden = pickExtremes(pool, 1, "high")[0] ?? null;
  const hardest = pickExtremes(pool.filter((row) => row !== golden), 1, "low")[0] ?? null;
  return { series,
    previous: anchor > 0 ? series[anchor - 1] : anchor < 0 && series.length ? series[series.length - 1] : null,
    current: currentIndex >= 0 ? series[currentIndex] : null,
    next: currentIndex >= 0 ? series[currentIndex + 1] ?? null : firstFuture >= 0 ? series[firstFuture] : null,
    golden: golden as DaeunEntry | null, hardest: hardest as DaeunEntry | null };
}

/**
 * 그래프 표시 점수를 14편 목차 항목에 배정한다. 값을 새로 계산하지 않고 고르기만 한다.
 * referenceInstant는 결과를 재현할 수 있도록 호출하는 쪽이 넘긴다.
 */
export function buildLifetimeTocGraphPlan(graph: GraphScores, referenceInstant: string): LifetimeTocGraphPlan {
  const reference = Date.parse(referenceInstant);
  const referenceYear = yearOf(referenceInstant);
  const base = { ruleVersion: RULE.ruleVersion, graphRuleVersion: graph.ruleVersion, referenceYear };
  if (graph.status !== "implemented" || Number.isNaN(reference)) return { ...base, status: "not_implemented",
    part4: { bars: [], series: [], rising: [], caution: [] }, part5: { bars: [], series: [], rising: [], falling: [] },
    part6: { radar: [], series: [], rising: [], caution: [] }, part7: { series: [], caution: [] }, part10: { curve: [] },
    part11: { series: [], previous: null, current: null, next: null, golden: null, hardest: null }, part12: { years: [] } };

  const fromYear = (count: number) => graph.yearly.filter((point) => {
    const year = Number(point.label);
    return year >= referenceYear && year < referenceYear + count;
  });
  const window = fromYear(RULE.periodWindowYears);
  const career = window.map((point) => scored(point, "career"));
  const wealth = window.map((point) => scored(point, "wealth"));
  const love = window.map((point) => scored(point, "love"));
  const health = window.map((point) => scored(point, "health"));
  const careerPick = risingAndLow(career), wealthPick = risingAndLow(wealth), lovePick = risingAndLow(love);

  return { ...base, status: "implemented",
    part4: { bars: graph.natal.work, series: career, rising: careerPick.rising, caution: careerPick.low },
    part5: { bars: graph.natal.wealth, series: wealth, rising: wealthPick.rising, falling: wealthPick.low },
    part6: { radar: graph.natal.love, series: love, rising: lovePick.rising, caution: lovePick.low },
    part7: { series: health, caution: pickExtremes(health, RULE.periodPickCount, "low") },
    part10: { curve: graph.natal.lifeStages },
    part11: daeunPart(graph.daeun, reference),
    part12: { years: fromYear(RULE.yearlyWindowYears).map((point) => ({ year: point.label,
      startInstant: point.startInstant, endInstant: point.endInstant, scores: point.scores, focus: yearlyFocus(point.scores) })) },
  };
}
