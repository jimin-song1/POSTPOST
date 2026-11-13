import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { anchorOf, buildGraphScores, displaySeries, residualOf, standardize } from "@/lib/saju/presentation/graph-scores";
import { GRAPH_SCORE_V1 } from "@/rules/graph-score.v1";
import type { SajuInput } from "@/types/saju-input";

const input = (overrides: Partial<SajuInput>): SajuInput => ({
  name: "가상인물", gender: "female", calendarType: "solar", birthDate: "1995-09-30", birthTime: "08:30",
  birthTimeKnown: true, birthCountry: "KR", birthCityKnown: true, birthCity: "서울", ...overrides });
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const correlation = (x: number[], y: number[]) => {
  const mx = mean(x), my = mean(y);
  const cov = x.reduce((sum, value, index) => sum + (value - mx) * (y[index] - my), 0);
  const vx = x.reduce((sum, value) => sum + (value - mx) ** 2, 0), vy = y.reduce((sum, value) => sum + (value - my) ** 2, 0);
  return cov / Math.sqrt(vx * vy);
};

describe("GRAPH_SCORE_V1 helpers", () => {
  it("standardizes with a floor so a flat series is not amplified into noise", () => {
    expect(standardize([60, 60.2, 59.8], 2).every((value) => Math.abs(value) < 0.2)).toBe(true);
    const z = standardize([50, 60, 70], 1);
    expect(mean(z)).toBeCloseTo(0, 10);
  });
  it("removes the shared component from a category signal", () => {
    const core = [50, 55, 60, 65, 70, 52, 68];
    const own = [1, -2, 0, 3, -1, 2, -3];
    const specific = core.map((value, index) => value * 0.8 + own[index]);
    const residual = residualOf(specific, core);
    expect(Math.abs(correlation(residual, core))).toBeLessThan(1e-9);
  });
  it("keeps display scores inside the configured range and anchors them to the person's level", () => {
    const series = displaySeries([40, 90, 41, 89], null, [40, 90, 41, 89]);
    for (const value of series) {
      expect(value).toBeGreaterThanOrEqual(GRAPH_SCORE_V1.period.display.min);
      expect(value).toBeLessThanOrEqual(GRAPH_SCORE_V1.period.display.max);
    }
    expect(anchorOf([70, 70])).toBeGreaterThan(anchorOf([55, 55]));
    expect(anchorOf([200])).toBe(GRAPH_SCORE_V1.period.anchor.max);
  });
});

describe("buildGraphScores on the 乙亥/乙酉/甲子/戊辰 regression chart", () => {
  const analysis = calculateSaju(input({}));
  const graph = buildGraphScores(analysis);
  const score = (rows: Array<{ key: string; score: number }>, key: string) => rows.find((row) => row.key === key)!.score;

  it("builds every graph without changing engine scores", () => {
    const before = JSON.stringify(analysis.fortune);
    expect(graph.status).toBe("implemented");
    expect(JSON.stringify(analysis.fortune)).toBe(before);
    expect(graph.natal.work.map((row) => row.key)).toEqual(["career", "business", "study"]);
    expect(graph.natal.wealth.map((row) => row.key)).toEqual(["earn", "save", "keep", "grow"]);
    expect(graph.natal.love.map((row) => row.key)).toEqual(["initiative", "sincerity", "charm", "devotion", "stability", "expression"]);
    expect(graph.natal.lifeStages.map((row) => row.label)).toEqual(["초년", "청년", "중년", "말년"]);
    expect(graph.daeun).toHaveLength(analysis.daeun.periods.length);
  });
  it("reflects the chart: 정관격 with no output stars favors career over business and expression", () => {
    expect(score(graph.natal.work, "career")).toBeGreaterThan(score(graph.natal.work, "business"));
    expect(score(graph.natal.love, "expression")).toBeLessThan(score(graph.natal.love, "sincerity"));
    expect(graph.natal.work.find((row) => row.key === "career")!.factors.map((factor) => factor.label)).toContain("정관격");
  });
  it("spreads yearly scores and lets categories move apart", () => {
    const yearly = graph.yearly;
    const overall = yearly.map((point) => point.scores.overall);
    expect(Math.max(...overall) - Math.min(...overall)).toBeGreaterThanOrEqual(40);
    const wealth = yearly.map((point) => point.scores.wealth), love = yearly.map((point) => point.scores.love);
    const career = yearly.map((point) => point.scores.career);
    expect(correlation(wealth, career)).toBeLessThan(0.8);
    expect(correlation(wealth, love)).toBeLessThan(0.8);
  });
  it("is deterministic", () => {
    expect(buildGraphScores(calculateSaju(input({})))).toEqual(graph);
  });
});
