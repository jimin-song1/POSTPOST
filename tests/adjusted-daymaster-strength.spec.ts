import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluateAdjustedDayMasterStrength } from "@/lib/saju/interpretation/adjusted-daymaster-strength";
import { STRENGTH_V1 } from "@/rules/strength.v1";
import type { Element } from "@/types/saju-analysis";
import type { StrengthLevel } from "@/rules/strength.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
function level(score: number): StrengthLevel {
  return [...STRENGTH_V1.levels].reverse().find((entry) => score >= entry.minimum)!.level;
}
function fixture(originalScore = 49) {
  const result = calculateSaju(SYNTHETIC_INPUT);
  const strength = structuredClone(result.strength);
  const native = structuredClone(result.fiveElements.nativeStrength)!;
  const adjusted = structuredClone(result.fiveElements.adjustedStrength);
  strength.score = originalScore;
  strength.level = level(originalScore);
  strength.adjustments.originalRootingScore = 8;
  strength.adjustments.adjustedRootingScore = 8;
  const setDistribution = (target: "native" | "adjusted", percentages: Record<Element, number>) => {
    for (const element of elements) {
      if (target === "native") native[element].percentage = percentages[element];
      else adjusted.elements![element].percentage = percentages[element];
    }
  };
  const run = () => evaluateAdjustedDayMasterStrength(strength, native, adjusted);
  return { result, strength, native, adjusted, setDistribution, run };
}
const native50 = { wood: 30, fire: 20, earth: 15, metal: 15, water: 20 } satisfies Record<Element, number>;

describe("SYNTHETIC_ADJUSTED_DAYMASTER_STRENGTH_V1", () => {
  it("A: preserves 49 when roots and element balance do not change", () => {
    const value = fixture(); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    expect(value.run()).toMatchObject({ status: "implemented", originalScore: 49, score: 49,
      originalLevel: "중화신약", level: "중화신약" });
  });
  it("B: subtracts the exact 8 to 6 rooting loss once", () => {
    const value = fixture(); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    value.strength.adjustments.adjustedRootingScore = 6;
    expect(value.run().score).toBe(47);
    expect(value.run().evidence[1]).toEqual({ factor: "ROOTING_ADJUSTMENT",
      originalRootingScore: 8, adjustedRootingScore: 6, delta: -2 });
  });
  it.each([
    [55, 45, 2], [45, 55, -2],
  ] as const)("C-D: converts support/opposition %s/%s balance movement with divisor 5", (support, opposition, delta) => {
    const value = fixture(); value.setDistribution("native", native50);
    value.setDistribution("adjusted", { wood: support - 20, water: 20,
      fire: opposition / 3, earth: opposition / 3, metal: opposition / 3 });
    expect(value.run().score).toBe(49 + delta);
  });
  it("E: combines root and element deltas without rounding", () => {
    const value = fixture(); value.setDistribution("native", native50);
    value.setDistribution("adjusted", { wood: 32.5, water: 20, fire: 15.833333333333334,
      earth: 15.833333333333334, metal: 15.833333333333334 });
    value.strength.adjustments.adjustedRootingScore = 6.5;
    expect(value.run().score).toBeCloseTo(48.5, 12);
  });
  it.each([[100, 10], [0, -10]] as const)("F: caps element delta for support %s at %s", (support, delta) => {
    const value = fixture(); value.setDistribution("native", native50);
    value.setDistribution("adjusted", { wood: support, water: 0, fire: (100 - support) / 3,
      earth: (100 - support) / 3, metal: (100 - support) / 3 });
    const evidence = value.run().evidence.find((row) => row.factor === "ELEMENT_BALANCE_ADJUSTMENT")!;
    expect(evidence.scoreDelta).toBe(delta);
  });
  it.each([[2, 0], [98, 100]] as const)("G-H: clamps original %s beyond the range to %s", (score, expected) => {
    const value = fixture(score); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    value.strength.adjustments.adjustedRootingScore = score === 2 ? -8 : 18;
    expect(value.run().score).toBe(expected);
    expect(value.run().evidence.at(-1)?.factor).toBe("CLAMP");
  });
  it.each([
    [49, 0.5, "중화신약"], [49, 1, "중화신강"], [60, 0.5, "신강"], [60, -1, "중화신강"],
  ] as const)("I-J: classifies raw score from %s with delta %s as %s", (score, delta, expected) => {
    const value = fixture(score); value.setDistribution("native", native50);
    const support = 50 + delta * 2.5;
    value.setDistribution("adjusted", { wood: support - 20, water: 20,
      fire: (100 - support) / 3, earth: (100 - support) / 3, metal: (100 - support) / 3 });
    expect(value.run()).toMatchObject({ score: score + delta, level: expected });
  });
  it.each([
    [0, "극약"], [14.999, "극약"], [15, "태약"], [27.999, "태약"],
    [28, "신약"], [39.999, "신약"], [40, "중화신약"], [49.999, "중화신약"],
    [50, "중화신강"], [59.999, "중화신강"], [60, "신강"], [72.999, "신강"],
    [73, "태강"], [85.999, "태강"], [86, "극왕"], [100, "극왕"],
  ] as const)("K: reuses strength-v1 boundary %s => %s", (score, expected) => {
    const value = fixture(score); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    expect(value.run().level).toBe(expected);
  });
  it("L-M: relation labels do not change strength when actual distributions are unchanged", () => {
    const value = fixture(); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    value.adjusted.transferLedger = [{ ...value.adjusted.transferLedger[0], state: "TRANSFORMED" }];
    expect(value.run().score).toBe(49);
    value.adjusted.transferLedger = [{ ...value.adjusted.transferLedger[0], state: "COMBINATION_ONLY" }];
    expect(value.run().score).toBe(49);
  });
  it("N-O: a clash contributes only the upstream rooting difference", () => {
    const value = fixture(); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    value.strength.adjustments.adjustedRootingScore = 5;
    value.strength.adjustments.rootDamage = [{ rootId: "synthetic", pillar: "day", branch: "卯",
      hiddenStem: "乙", role: "mainQi", originalRootScore: 8, damageRatio: 0.375,
      damagedAmount: 3, remainingRootScore: 5, causedByRelationIds: ["synthetic:clash"] }];
    expect(value.run().score).toBe(46);
  });
  it("P: special-structure output is not an evaluator input", () => {
    const value = fixture(); value.setDistribution("native", native50); value.setDistribution("adjusted", native50);
    const before = value.run();
    value.result.structure.specialStructure.candidates.forEach((candidate) => { candidate.state = "QUALIFIED_CANDIDATE"; });
    expect(value.run()).toEqual(before);
  });
  it("Q-R: evidence reconstructs the score and repeated evaluation is deterministic", () => {
    const value = fixture(); value.setDistribution("native", native50);
    value.setDistribution("adjusted", { wood: 35, water: 20, fire: 15, earth: 15, metal: 15 });
    value.strength.adjustments.adjustedRootingScore = 7;
    const upstream = structuredClone({ strength: value.strength, native: value.native, adjusted: value.adjusted });
    const result = value.run();
    expect(result.score).toBe(result.originalScore! + result.evidence.reduce((sum, row) => sum + row.delta, 0));
    expect(result).toEqual(value.run());
    expect({ strength: value.strength, native: value.native, adjusted: value.adjusted }).toEqual(upstream);
  });
  it("S: integrates into the engine while preserving every upstream axis", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.strength.adjusted.status).toBe("implemented");
    expect(result.strength.score).toBe(result.strength.adjusted.originalScore);
    expect(result.strength.level).toBe(result.strength.adjusted.originalLevel);
    expect(result.strength.adjustments.adjustedScore).toBeNull();
    expect(result.usefulGods.status).toBe("implemented");
    expect(calculateSaju({ ...SYNTHETIC_INPUT, birthTimeKnown: false }).strength.adjusted.status)
      .toBe("not_implemented");
  });
});
