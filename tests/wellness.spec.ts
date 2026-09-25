import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateConstitutionalBalance, calculateElementWellness, evaluateWellness, wellnessAttentionLevel } from "@/lib/saju/fortune/wellness";
import { WELLNESS_V1 as RULE } from "@/rules/wellness.v1";
import type { FortuneResult } from "@/types/fortune";
import type { WellnessResult } from "@/types/wellness";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const analysis = calculateSaju(SYNTHETIC_INPUT);
if (analysis.wellness.status !== "implemented" || !("elements" in analysis.wellness)) throw new Error("wellness fixture unavailable");
const wellness = analysis.wellness as WellnessResult;
const elementKeys = ["wood", "fire", "earth", "metal", "water"] as const;

describe("SYNTHETIC_WELLNESS_V1", () => {
  it("normalizes element percentages and applies deficiency/excess/attention formulas", () => {
    expect(elementKeys.reduce((sum, key) => sum + wellness.elements[key].percentage, 0)).toBeCloseTo(100, 12);
    expect(calculateElementWellness(10)).toMatchObject({ deficiencyIndex: 50, excessIndex: 0, attentionIndex: 50 });
    expect(calculateElementWellness(30)).toMatchObject({ deficiencyIndex: 0, excessIndex: 50, attentionIndex: 40 });
    expect(calculateElementWellness(20)).toMatchObject({ deficiencyIndex: 0, excessIndex: 0, attentionIndex: 0 });
    for (const key of elementKeys) { const row = wellness.elements[key], expected = calculateElementWellness(row.percentage); expect(row).toMatchObject(expected); }
  });

  it("calculates constitutional balance and exact threshold boundaries", () => {
    expect(calculateConstitutionalBalance({ wood: 20, fire: 20, earth: 20, metal: 20, water: 20 })).toBe(100);
    expect(calculateConstitutionalBalance({ wood: 100, fire: 0, earth: 0, metal: 0, water: 0 })).toBe(0);
    expect([0, 19.999, 20, 39.999, 40, 59.999, 60, 79.999, 80, 100].map(wellnessAttentionLevel)).toEqual([
      "BALANCED", "BALANCED", "WATCH", "WATCH", "NEED_SUPPORT", "NEED_SUPPORT", "HIGH_ATTENTION", "HIGH_ATTENTION", "VERY_HIGH_ATTENTION", "VERY_HIGH_ATTENTION"]);
  });

  it("keeps themes and habits deterministic and treats johu as context only", () => {
    expect(wellness.elements.wood.theme).toBe("유연성 · 긴장 회복"); expect(wellness.elements.fire.theme).toBe("활력 · 체온 · 순환");
    expect(wellness.elements.earth.theme).toBe("소화 리듬 · 생활 균형"); expect(wellness.elements.metal.theme).toBe("호흡 · 피부 · 건조함");
    expect(wellness.elements.water.theme).toBe("휴식 · 회복 · 냉감"); expect(wellness.habits).toHaveLength(3);
    const cloned = structuredClone(analysis.usefulGods); if (cloned.johu.status === "implemented") cloned.johu.urgency = cloned.johu.urgency === "LOW" ? "HIGH" : "LOW";
    const recalculated = evaluateWellness(analysis.fiveElements, cloned, analysis.fortune as FortuneResult);
    for (const key of elementKeys) expect(recalculated.elements[key].attentionIndex).toBe(wellness.elements[key].attentionIndex);
  });

  it("reconstructs every Daeun period attention from versioned factors", () => {
    expect(RULE.periodWeights.elementAttention + RULE.periodWeights.activation + RULE.periodWeights.transformedShare).toBe(1);
    expect(wellness.daeunPeriods).toHaveLength(analysis.daeun.periods.length);
    for (const row of wellness.daeunPeriods) { expect(row.wellnessPeriodAttention).toBeCloseTo(row.evidence.reduce((sum, factor) => sum + factor.value * factor.weight, 0), 12); expect(row.transformedShare).toBeGreaterThanOrEqual(0); expect(row.transformedShare).toBeLessThanOrEqual(100); }
  });

  it("is deterministic, preserves source analysis, and exposes no medical diagnosis", () => {
    const before = { fiveElements: structuredClone(analysis.fiveElements), strength: structuredClone(analysis.strength), usefulGods: structuredClone(analysis.usefulGods), fortune: structuredClone(analysis.fortune) };
    const again = calculateSaju(SYNTHETIC_INPUT).wellness; expect(again).toEqual(wellness);
    expect(analysis.fiveElements).toEqual(before.fiveElements); expect(analysis.strength).toEqual(before.strength); expect(analysis.usefulGods).toEqual(before.usefulGods); expect(analysis.fortune).toEqual(before.fortune);
    expect(wellness.disclaimer).toEqual({ interpretationType: "traditional_wellness", medicalDiagnosis: false });
    const serialized = JSON.stringify(wellness); for (const prohibited of ["질병 확률", "수술 예측", "치료법", "사망", "수명 예측"]) expect(serialized).not.toContain(prohibited);
  });
});
