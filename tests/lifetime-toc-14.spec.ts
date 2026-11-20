import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { buildGraphScores } from "@/lib/saju/presentation/graph-scores";
import { buildLifetimeTocGraphPlan, pickExtremes, yearlyFocus } from "@/lib/saju/presentation/lifetime-toc-14";
import { LIFETIME_TOC_14_V1 } from "@/rules/lifetime-toc-14.v1";
import type { SajuInput } from "@/types/saju-input";

const input: SajuInput = { name: "가상인물", gender: "female", calendarType: "solar", birthDate: "1995-09-30", birthTime: "08:30",
  birthTimeKnown: true, birthCountry: "KR", birthCityKnown: true, birthCity: "서울" };
const REFERENCE = "2026-06-01T00:00:00.000Z";
const period = (label: string, score: number) => ({ label, startInstant: label, endInstant: label, score });

describe("LIFETIME_TOC_14_V1 helpers", () => {
  it("picks extremes by score, breaks ties by the earlier period, and returns them in time order", () => {
    const series = [period("a", 50), period("b", 70), period("c", 50), period("d", 80)];
    expect(pickExtremes(series, 2, "high").map((row) => row.label)).toEqual(["b", "d"]);
    expect(pickExtremes(series, 1, "low").map((row) => row.label)).toEqual(["a"]);
  });
  it("guards the weakest category in a weak year and uses the strongest one in an even year", () => {
    expect(yearlyFocus({ overall: 60, wealth: 70, love: 55, career: 65, study: 60, health: 58 }))
      .toEqual({ mode: "guard", category: "love", score: 55 });
    expect(yearlyFocus({ overall: 80, wealth: 70, love: 75, career: 88, study: 60, health: 72 }))
      .toEqual({ mode: "use", category: "career", score: 88 });
  });
});

describe("buildLifetimeTocGraphPlan on the 乙亥/乙酉/甲子/戊辰 regression chart", () => {
  const graph = buildGraphScores(calculateSaju(input));
  const plan = buildLifetimeTocGraphPlan(graph, REFERENCE);

  it("only selects values that already exist in the graph scores", () => {
    expect(plan.status).toBe("implemented");
    expect(plan.part4.bars).toBe(graph.natal.work);
    expect(plan.part5.bars).toBe(graph.natal.wealth);
    expect(plan.part6.radar).toBe(graph.natal.love);
    expect(plan.part10.curve).toBe(graph.natal.lifeStages);
    const yearly = new Map(graph.yearly.map((point) => [point.label, point.scores]));
    for (const row of plan.part5.rising.concat(plan.part5.falling)) expect(yearly.get(row.label)!.wealth).toBe(row.score);
    for (const row of plan.part7.caution) expect(yearly.get(row.label)!.health).toBe(row.score);
  });
  it("uses a window starting at the reference year and never marks a year as both rising and caution", () => {
    expect(plan.part4.series.map((row) => row.label)).toEqual(
      Array.from({ length: LIFETIME_TOC_14_V1.periodWindowYears }, (_, index) => String(2026 + index)));
    for (const part of [plan.part4.rising.concat(plan.part4.caution), plan.part5.rising.concat(plan.part5.falling),
      plan.part6.rising.concat(plan.part6.caution)]) expect(new Set(part.map((row) => row.label)).size).toBe(part.length);
    expect(Math.min(...plan.part5.rising.map((row) => row.score)))
      .toBeGreaterThanOrEqual(Math.max(...plan.part5.falling.map((row) => row.score)));
  });
  it("places the current daeun and picks the golden and hardest daeun from now on", () => {
    const { previous, current, next, golden, hardest, series } = plan.part11;
    expect([previous?.label, current?.label, next?.label]).toEqual(["丁亥", "戊子", "己丑"]);
    expect(series.filter((row) => row.relation === "current")).toHaveLength(1);
    expect(golden).toMatchObject({ label: "己丑", score: 76 });
    expect(hardest).toMatchObject({ label: "辛卯", score: 50 });
    expect(golden!.relation).not.toBe("past");
    expect(hardest!.relation).not.toBe("past");
  });
  it("gives five yearly entries, each with one focus taken from that year's scores", () => {
    expect(plan.part12.years.map((row) => row.year)).toEqual(["2026", "2027", "2028", "2029", "2030"]);
    for (const row of plan.part12.years) expect(row.scores[row.focus.category]).toBe(row.focus.score);
  });
  it("is deterministic for a fixed reference instant and refuses an invalid one", () => {
    expect(buildLifetimeTocGraphPlan(buildGraphScores(calculateSaju(input)), REFERENCE)).toEqual(plan);
    expect(buildLifetimeTocGraphPlan(graph, "not-a-date").status).toBe("not_implemented");
  });
});
