import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { assessRootDamage, calculateAdjustedStrength } from "@/lib/saju/fiveElements/relation-effects";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateStrength } from "@/lib/saju/interpretation/strength";
import { evaluateTransformation } from "@/lib/saju/interpretation/transformation";
import { ROOT_DAMAGE_V1 } from "@/rules/root-damage.v1";
import { TRANSFORMATION_TRANSFER_V1 } from "@/rules/transformation-transfer.v1";
import type { Branch, Element, PillarPosition, Stem, TransformationState } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
function synthetic(stems: [Stem, Stem, Stem, Stem], branches: [Branch, Branch, Branch, Branch]) {
  const pillars = Object.fromEntries(positions.map((position, index) => [position,
    { position, stem: stems[index], branch: branches[index], hanja: null, korean: null }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position,
    getHiddenStems(pillars[position].branch!, pillars.day.stem!)])) as Parameters<typeof calculateNativeStrength>[1];
  const native = calculateNativeStrength(pillars, hidden);
  const relations = detectRelations(pillars);
  relations.transformation = evaluateTransformation(relations, pillars, hidden, native.nativeStrength);
  const strength = calculateStrength(pillars, hidden, native.evidence);
  const adjust = () => calculateAdjustedStrength({ nativeStrength: native.nativeStrength, evidence: native.evidence }, relations, strength);
  return { native, relations, strength, adjust };
}
const stemCase = () => synthetic(["丁", "壬", "庚", "甲"], ["子", "子", "卯", "巳"]);
const setStemState = (value: ReturnType<typeof synthetic>, state: TransformationState) => {
  value.relations.transformation.evaluations = value.relations.transformation.evaluations.map((evaluation) =>
    evaluation.relationType === "STEM_COMBINATION" ? { ...evaluation, state } : evaluation);
};

describe("SYNTHETIC_RELATION_EFFECTS_V1 — contribution ledger", () => {
  it("assigns unique, stable IDs to all visible stems and hidden-stem contributions", () => {
    const first = stemCase().native.evidence;
    expect(first.slice(0, 4).map((item) => item.id)).toEqual(["stem:year", "stem:month", "stem:day", "stem:hour"]);
    expect(first).toContainEqual(expect.objectContaining({ id: "branch:year:hidden:mainQi", sourceType: "HIDDEN_STEM",
      pillar: "year", character: "癸", originalElement: "water" }));
    expect(new Set(first.map((item) => item.id)).size).toBe(first.length);
    expect(first.every((item) => item.nativeContribution === item.finalContribution)).toBe(true);
    expect(first).toEqual(stemCase().native.evidence);
  });
  it.each([["TRANSFORMED", 0.60], ["PARTIAL", 0.30]] as const)(
    "moves %s fraction %s of two stem sources and preserves original characters", (state, expectedRatio) => {
      const value = stemCase();
      setStemState(value, state);
      const adjusted = value.adjust();
      const relation = value.relations.heavenlyStems.combinations.find((item) => item.members.join("") === "丁壬")!;
      const ledger = adjusted.transferLedger.filter((item) => item.relationId === relation.id);
      expect(ledger.map((item) => item.sourceContributionId)).toEqual(["stem:year", "stem:month"]);
      for (const item of ledger) {
        expect(item.transferRatio).toBe(expectedRatio);
        expect(item.requestedAmount).toBeCloseTo(item.nativeContribution * expectedRatio);
        expect(item.actualAmount).toBeCloseTo(item.requestedAmount);
        expect(item.toElement).toBe("wood");
      }
      expect(value.native.evidence.find((item) => item.id === "stem:year")?.character).toBe("丁");
      expect(adjusted.elements?.wood.adjustedScore).toBeGreaterThan(value.native.nativeStrength.wood.score);
    }
  );
  it.each(["COMBINATION_ONLY", "WEAK", "NOT_APPLICABLE"] as const)(
    "moves no original energy in state %s", (state) => {
      const value = stemCase();
      value.relations.transformation.evaluations = value.relations.transformation.evaluations.map((item) =>
        ({ ...item, state }));
      const adjusted = value.adjust();
      expect(adjusted.transferLedger).toEqual([]);
      for (const element of elements) {
        expect(adjusted.elements?.[element].adjustment).toBe(0);
        expect(adjusted.elements?.[element].adjustedScore).toBe(value.native.nativeStrength[element].score);
      }
    }
  );
  it("keeps same-element transfers visible with zero net element change", () => {
    const value = synthetic(["甲", "己", "壬", "壬"], ["辰", "辰", "辰", "辰"]);
    setStemState(value, "PARTIAL");
    const same = value.adjust().transferLedger.find((item) => item.sourceContributionId === "stem:month" &&
      item.toElement === "earth")!;
    expect(same).toMatchObject({ character: "己", fromElement: "earth", toElement: "earth", transferRatio: 0.30,
      netElementChange: 0 });
    expect(same.actualAmount).toBeGreaterThan(0);
    expect(value.adjust().elements?.earth.adjustment).toBeGreaterThan(0);
  });
  it("proportionally scales concurrent requests without prioritizing a relation", () => {
    const value = synthetic(["甲", "甲", "甲", "己"], ["辰", "辰", "辰", "辰"]);
    setStemState(value, "TRANSFORMED");
    const adjusted = value.adjust();
    const entries = adjusted.transferLedger.filter((item) => item.sourceContributionId === "stem:hour");
    expect(entries).toHaveLength(3);
    const source = entries[0].nativeContribution;
    const requestedTotal = entries.reduce((sum, item) => sum + item.requestedAmount, 0);
    expect(requestedTotal).toBeCloseTo(source * 1.8);
    for (const item of entries) {
      expect(item.scale).toBeCloseTo(source / requestedTotal);
      expect(item.actualAmount).toBeCloseTo(item.requestedAmount * source / requestedTotal);
      expect(item.remainingSourceContribution).toBeGreaterThanOrEqual(0);
    }
    expect(entries.reduce((sum, item) => sum + item.actualAmount, 0)).toBeCloseTo(source);
    const bySource = Map.groupBy(adjusted.transferLedger, (item) => item.sourceContributionId);
    for (const group of Array.from(bySource.values())) {
      const amount = group.reduce((sum, item) => sum + item.actualAmount, 0);
      expect(amount).toBeLessThanOrEqual(group[0].nativeContribution + 1e-9);
      expect(group[0].remainingSourceContribution).toBeGreaterThanOrEqual(0);
    }
  });
  it("moves every participating branch hidden-stem source, not the representative branch alone", () => {
    const value = synthetic(["甲", "乙", "丙", "丁"], ["子", "丑", "辰", "酉"]);
    const relation = value.relations.earthlyBranches.sixCombinations.find((item) => item.positions.join("-") === "year-month")!;
    value.relations.transformation.evaluations = value.relations.transformation.evaluations.map((item) =>
      item.relationId === relation.id ? { ...item, state: "TRANSFORMED" } : { ...item, state: "COMBINATION_ONLY" });
    const ledger = value.adjust().transferLedger;
    expect(ledger.map((item) => item.sourceContributionId)).toEqual([
      "branch:year:hidden:mainQi", "branch:month:hidden:mainQi", "branch:month:hidden:middleQi", "branch:month:hidden:residualQi"
    ]);
    for (const item of ledger) expect(item.actualAmount).toBeCloseTo(item.nativeContribution * 0.60);
  });
  it.each(["THREE_HARMONY", "DIRECTIONAL_COMBINATION"] as const)(
    "limits forced high-state partial %s transfers to 30 percent", (type) => {
      const branches: [Branch, Branch, Branch, Branch] = type === "THREE_HARMONY"
        ? ["申", "子", "未", "未"] : ["亥", "子", "戌", "戌"];
      const value = synthetic(["壬", "壬", "庚", "庚"], branches);
      const partial = value.relations.transformation.evaluations.find((item) => item.relationType === type && item.complete === false)!;
      value.relations.transformation.evaluations = value.relations.transformation.evaluations.map((item) =>
        item.relationId === partial.relationId ? { ...item, state: "TRANSFORMED" } : { ...item, state: "COMBINATION_ONLY" });
      const ledger = value.adjust().transferLedger.filter((item) => item.relationId === partial.relationId);
      expect(ledger.length).toBeGreaterThanOrEqual(2);
      expect(ledger.every((item) => item.transferRatio === TRANSFORMATION_TRANSFER_V1.partialGroupMaximumRatio)).toBe(true);
      expect(ledger.every((item) => item.actualAmount <= item.nativeContribution * 0.30 + 1e-9)).toBe(true);
    }
  );
  it("conserves total elemental energy, normalizes percentages, and reconstructs every adjusted score from ledger evidence", () => {
    const value = synthetic(["甲", "甲", "甲", "己"], ["辰", "辰", "辰", "辰"]);
    setStemState(value, "TRANSFORMED");
    const original = structuredClone(value.native.nativeStrength);
    const adjusted = value.adjust();
    const nativeTotal = elements.reduce((sum, element) => sum + original[element].score, 0);
    const adjustedTotal = elements.reduce((sum, element) => sum + adjusted.elements![element].adjustedScore, 0);
    expect(adjustedTotal).toBeCloseTo(nativeTotal, 10);
    expect(elements.reduce((sum, element) => sum + adjusted.elements![element].percentage, 0)).toBeCloseTo(100, 10);
    expect(value.native.nativeStrength).toEqual(original);
    for (const element of elements) {
      const recomputed = adjusted.evidence.reduce((sum, entry) => sum +
        (entry.fromElement === element ? entry.deltaFrom : 0) + (entry.toElement === element ? entry.deltaTo : 0),
      original[element].score);
      expect(adjusted.elements![element].adjustedScore).toBeCloseTo(recomputed, 10);
      expect(adjusted.elements![element].adjustedScore).toBeGreaterThanOrEqual(-1e-9);
    }
  });
  it("is deterministic for the same pure pillar input", () => {
    expect(stemCase().adjust()).toEqual(stemCase().adjust());
  });
});

describe("SYNTHETIC_ROOT_DAMAGE_V1 — clashes only", () => {
  it.each([["卯", "酉", "mainQi", 0.25, 8], ["未", "丑", "middleQi", 0.20, 5],
    ["辰", "戌", "residualQi", 0.15, 3]] as const)(
    "weakens %s %s root by configured %s", (branch, opponent, role, ratio, score) => {
      const value = synthetic(["甲", "丙", "乙", "壬"], [branch, opponent, "子", "子"]);
      const damage = assessRootDamage(value.strength, value.relations).rootDamage.find((entry) => entry.pillar === "year")!;
      expect(damage).toMatchObject({ branch, role, originalRootScore: score,
        damageRatio: ratio, damagedAmount: score * ratio, remainingRootScore: score * (1 - ratio) });
      expect(damage.causedByRelationIds).toContain("BRANCH_CLASH:year-month");
      expect(value.adjust().rootDamage).toContainEqual(damage);
    }
  );
  it("caps three clashes against the same root at 50 percent, retaining the root", () => {
    const value = synthetic(["甲", "丙", "乙", "壬"], ["卯", "酉", "酉", "酉"]);
    const damage = value.adjust().rootDamage.find((entry) => entry.pillar === "year")!;
    expect(damage.causedByRelationIds).toHaveLength(3);
    expect(damage.damageRatio).toBe(ROOT_DAMAGE_V1.cumulativeDamageRatioCap);
    expect(damage.damagedAmount).toBe(4);
    expect(damage.remainingRootScore).toBe(4);
  });
  it("does not damage roots for combinations, punishments, breaks, harms or wonjin alone", () => {
    const value = synthetic(["甲", "丙", "乙", "壬"], ["卯", "戌", "子", "未"]);
    expect(value.relations.earthlyBranches.sixCombinations.length).toBeGreaterThan(0);
    expect(value.relations.earthlyBranches.harms.length).toBeGreaterThan(0);
    expect(value.relations.earthlyBranches.wonjin.length).toBeGreaterThan(0);
    expect(value.relations.earthlyBranches.clashes).toEqual([]);
    expect(value.adjust().rootDamage).toEqual([]);
  });
  it.each([
    ["MUTUAL_PUNISHMENT", "乙", "子", "卯"],
    ["BRANCH_BREAK", "甲", "寅", "亥"],
    ["BRANCH_HARM", "乙", "子", "未"],
    ["WONJIN", "甲", "寅", "酉"]
  ] as const)("does not treat %s alone as root damage", (type, dayStem, a, b) => {
    const value = synthetic(["丙", "庚", dayStem, "壬"], [a, b, "子", "子"]);
    expect(value.relations.evidence.some((item) => item.type === type)).toBe(true);
    expect(value.relations.earthlyBranches.clashes).toEqual([]);
    expect(value.adjust().rootDamage).toEqual([]);
  });
  it("reapplies the rooting cap to remaining raw roots without changing original strength score", () => {
    const value = synthetic(["甲", "甲", "乙", "甲"], ["卯", "卯", "卯", "酉"]);
    const originalScore = value.strength.score;
    const assessed = assessRootDamage(value.strength, value.relations);
    expect(assessed.rootDamage).toHaveLength(3);
    expect(assessed.adjustedRootingScore).toBeLessThanOrEqual(value.strength.rooting!.score);
    expect(value.strength.score).toBe(originalScore);
    expect(value.adjust().elements).toBeTruthy();
  });
  it("integrates SYNTHETIC_CORE_001 with preserved native scores and original strength score", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    const native = calculateNativeStrength(result.pillars, result.hiddenStems.value!.branches);
    const originalStrength = calculateStrength(result.pillars, result.hiddenStems.value!.branches, native.evidence);
    expect(result.fiveElements.rawCount).toEqual({ wood: 3, fire: 2, earth: 2, metal: 0, water: 1 });
    expect(result.fiveElements.nativeStrength).toEqual(native.nativeStrength);
    expect(result.fiveElements.adjustedStrength).toMatchObject({ status: "implemented", ruleVersion: "adjusted-strength-v1" });
    expect(result.fiveElements.adjustedStrength.transferLedger.some((item) => item.reason === "丁壬合木" &&
      item.sourceContributionId === "stem:month" && item.transferRatio === 0.60)).toBe(true);
    expect(result.fiveElements.adjustedStrength.transferLedger.some((item) => item.reason === "丁壬合木" &&
      item.sourceContributionId === "stem:hour" && item.transferRatio === 0.60)).toBe(true);
    expect(result.strength.score).toBe(originalStrength.score);
    expect(result.strength.adjustments).toMatchObject({ status: "partial", adjustedScore: null });
    expect(result.fiveElements.adjustedStrength.rootDamage).toEqual(result.strength.adjustments.rootDamage);
  });
  it("returns an explicit unavailable result if the original pillars are not calculated", () => {
    const result = calculateSaju({ ...SYNTHETIC_INPUT, calendarType: "lunar" });
    expect(result.fiveElements.adjustedStrength).toMatchObject({ status: "not_implemented", elements: null,
      transferLedger: [], rootDamage: [] });
    expect(result.strength.adjustments).toMatchObject({ status: "not_implemented", adjustedScore: null });
  });
});
