import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { countRawElements } from "@/lib/saju/fiveElements/raw-count";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { SEASONAL_ELEMENT_STATE_V1 } from "@/rules/seasonal-element-state.v1";
import { SEASONAL_STRENGTH_V1 } from "@/rules/seasonal-strength.v1";
import type { Branch, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const make = (branches: [Branch, Branch, Branch, Branch]) => {
  const pillars = Object.fromEntries(positions.map((position, index) => [position, {
    position, stem: (["甲", "乙", "庚", "壬"] as Stem[])[index], branch: branches[index], hanja: null, korean: null
  }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position, getHiddenStems(pillars[position].branch!, "甲")])) as Parameters<typeof calculateNativeStrength>[1];
  return { pillars, ...calculateNativeStrength(pillars, hidden) };
};

describe("SYNTHETIC_FIVE_ELEMENTS_v1", () => {
  it("counts just four visible stems and four representative branches", () => {
    const { pillars } = make(["卯", "辰", "未", "子"]);
    expect(Object.values(countRawElements(pillars)).reduce((sum, n) => sum + n, 0)).toBe(8);
    expect(countRawElements(pillars)).toEqual({ wood: 3, fire: 0, earth: 2, metal: 1, water: 2 });
  });
  it.each(["子", "卯", "酉"] as Branch[])("allocates %s fully to its only hidden stem", (branch) => {
    const result = make([branch, branch, branch, branch]);
    const month = result.evidence.filter((item) => item.source === "monthBranch");
    expect(month).toHaveLength(1);
    expect(month[0]).toMatchObject({ branch, branchWeight: 24, allocationRatio: 1, baseContribution: 24, hiddenRole: "mainQi" });
  });
  it("allocates two hidden stems 25/75", () => {
    const result = make(["午", "亥", "午", "亥"]);
    expect(result.evidence.filter((item) => item.source === "monthBranch").map((item) => [item.hiddenRole, item.allocationRatio, item.baseContribution]))
      .toEqual([["mainQi", 0.75, 18], ["residualQi", 0.25, 6]]);
  });
  it.each(["辰", "戌", "丑", "未"] as Branch[])("allocates %s hidden stems 70/20/10", (branch) => {
    const result = make(["子", branch, "卯", "酉"]);
    const items = result.evidence.filter((item) => item.source === "monthBranch");
    expect(items.map((item) => [item.hiddenRole, item.allocationRatio])).toEqual([["mainQi", 0.7], ["middleQi", 0.2], ["residualQi", 0.1]]);
    [16.8, 4.8, 2.4].forEach((expected, index) => expect(items[index].baseContribution).toBeCloseTo(expected));
  });
  it("uses configured 10/12/24 base weights totaling 100", () => {
    const result = make(["子", "卯", "午", "酉"]);
    expect(ELEMENT_WEIGHT_V1.stems).toEqual({ year: 10, month: 10, day: 10, hour: 10 });
    expect(ELEMENT_WEIGHT_V1.branches).toEqual({ year: 12, month: 24, day: 12, hour: 12 });
    expect(result.evidence.reduce((sum, item) => sum + item.baseContribution, 0)).toBeCloseTo(100);
  });
  it.each([["旺", 1.10], ["相", 1.05], ["休", 1.00], ["囚", 0.95], ["死", 0.90]] as const)("applies %s multiplier %s", (state, multiplier) => {
    const result = make(["子", "寅", "午", "酉"]);
    const contribution = result.evidence.find((item) => item.seasonalState === state)!;
    expect(SEASONAL_STRENGTH_V1.multipliers[state]).toBe(multiplier);
    expect(contribution.finalContribution).toBeCloseTo(contribution.baseContribution * multiplier);
  });
  it("has 12 complete monthly rows containing all five states", () => {
    expect(Object.keys(SEASONAL_ELEMENT_STATE_V1.byMonthBranch)).toHaveLength(12);
    for (const row of Object.values(SEASONAL_ELEMENT_STATE_V1.byMonthBranch)) {
      expect(Object.values(row).sort()).toEqual(["旺", "相", "休", "囚", "死"].sort());
    }
  });
  it("normalizes percentages to 100 and returns deterministic evidence", () => {
    const first = make(["辰", "卯", "未", "午"]);
    expect(Object.values(first.nativeStrength).reduce((sum, value) => sum + value.percentage, 0)).toBeCloseTo(100);
    expect(first).toEqual(make(["辰", "卯", "未", "午"]));
  });
  it("integrates with actual calculated pillars while leaving adjustments unimplemented", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.fiveElements.status).toBe("implemented");
    expect(result.fiveElements.ruleVersion).toBe("five-elements-v1");
    expect(result.fiveElements.nativeStrength?.wood.score).toBeGreaterThan(0);
    expect(result.fiveElements.adjustedStrength.status).toBe("not_implemented");
    expect(result.strength.status).toBe("not_implemented");
    expect(result.fiveElements.evidence.some((item) => item.source === "monthBranch" && item.branchWeight === 24)).toBe(true);
  });
});
