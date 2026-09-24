import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { calculateStrength } from "@/lib/saju/interpretation/strength";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { evaluateTransformation, transformationState } from "@/lib/saju/interpretation/transformation";
import { BRANCH_COMBINATION_TARGET_V1 } from "@/rules/branch-combination-target.v1";
import { RELATION_INTERACTION_V1 } from "@/rules/relation-interaction.v1";
import { TRANSFORMATION_V1 } from "@/rules/transformation.v1";
import type { Branch, Element, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
function synthetic(stems: [Stem, Stem, Stem, Stem], branches: [Branch, Branch, Branch, Branch]) {
  const pillars = Object.fromEntries(positions.map((position, index) => [position,
    { position, stem: stems[index], branch: branches[index], hanja: null, korean: null }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position, getHiddenStems(pillars[position].branch!, pillars.day.stem!)])) as Parameters<typeof calculateNativeStrength>[1];
  const native = calculateNativeStrength(pillars, hidden);
  const relations = detectRelations(pillars);
  const transformation = evaluateTransformation(relations, pillars, hidden, native.nativeStrength);
  return { pillars, hidden, native, relations, transformation };
}
const candidate = (value: ReturnType<typeof synthetic>, type: string, first: PillarPosition, second: PillarPosition) => {
  const found = value.transformation.evaluations.find((item) => item.relationType === type &&
    value.relations.evidence.find((relation) => relation.relationId === item.relationId)?.positions.join("-") === `${first}-${second}`);
  expect(found).toBeDefined();
  return found!;
};
const factor = (evaluation: ReturnType<typeof candidate>, name: string) => evaluation.factors.find((item) => item.factor === name);

describe("SYNTHETIC_TRANSFORMATION_V1 — configuration and factors", () => {
  it.each([
    ["甲", "己", "earth", "辰", "丙"], ["乙", "庚", "metal", "酉", "戊"],
    ["丙", "辛", "water", "子", "癸"], ["丁", "壬", "wood", "卯", "甲"],
    ["戊", "癸", "fire", "巳", "丙"]
  ] as const)("evaluates strongly supported %s%s into %s as a condition, not element replacement", (a, b, target, branch, filler) => {
    const sample = synthetic([filler, filler, a, b], [branch, branch, branch, branch]);
    const result = candidate(sample, "STEM_COMBINATION", "day", "hour");
    expect(result.targetElement).toBe(target);
    expect(result.state).toBe("TRANSFORMED");
    expect(result.score).toBeGreaterThanOrEqual(TRANSFORMATION_V1.thresholds.transformed);
    expect(result.score).toBe(result.evidence.reduce((sum, item) => sum + item.delta, 0));
    expect(sample.relations.heavenlyStems.combinations.find((item) => item.id === result.relationId)?.transformed).toBeNull();
  });
  it("returns COMBINATION_ONLY when basic support does not reach the partial threshold", () => {
    const result = candidate(synthetic(["甲", "壬", "壬", "己"], ["子", "寅", "子", "子"]),
      "STEM_COMBINATION", "year", "hour");
    expect(result.state).toBe("COMBINATION_ONLY");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThan(TRANSFORMATION_V1.thresholds.partial);
  });
  it("can be WEAK when a clash further obstructs an unsupported combination", () => {
    const result = candidate(synthetic(["甲", "庚", "辛", "己"], ["卯", "卯", "卯", "卯"]),
      "STEM_COMBINATION", "year", "hour");
    expect(result.state).toBe("WEAK");
    expect(factor(result, "blockingClash")?.delta).toBe(RELATION_INTERACTION_V1.blockingClashPenalty);
    expect(result.blockingRelations).toContain("STEM_CLASH:year-month");
  });
  it.each([[-1, "WEAK"], [0, "COMBINATION_ONLY"], [2, "COMBINATION_ONLY"],
    [3, "PARTIAL"], [4, "PARTIAL"], [5, "TRANSFORMED"]] as const)(
    "uses threshold at score %s", (score, state) => expect(transformationState(score)).toBe(state)
  );
  it("caps partial three-character groups at PARTIAL even when score exceeds transformed threshold", () => {
    expect(transformationState(7, true)).toBe("PARTIAL");
    expect(transformationState(-1, true)).toBe("WEAK");
  });
  it.each([["辰", 3], ["巳", 3], ["申", 0], ["子", -1], ["卯", -2]] as const)(
    "applies seasonal earth state at month %s as %s", (month, delta) => {
      const result = candidate(synthetic(["甲", "丙", "己", "甲"], ["卯", month, "卯", "卯"]),
        "STEM_COMBINATION", "year", "day");
      expect(factor(result, "season")?.delta).toBe(delta);
    }
  );
  it("uses hidden stems for target root and records role and branch", () => {
    const root = candidate(synthetic(["甲", "丙", "己", "丙"], ["卯", "寅", "卯", "卯"]),
      "STEM_COMBINATION", "year", "day");
    expect(factor(root, "targetRoot")).toMatchObject({ delta: 2,
      details: { roots: expect.arrayContaining([expect.objectContaining({ branch: "寅", hiddenStem: "戊", role: "residualQi" })]) } });
    const none = candidate(synthetic(["甲", "丙", "己", "丙"], ["卯", "卯", "卯", "卯"]),
      "STEM_COMBINATION", "year", "day");
    expect(factor(none, "targetRoot")).toBeUndefined();
  });
  it("records target exposure with participating and third-party stems separately", () => {
    const result = candidate(synthetic(["甲", "戊", "己", "戊"], ["卯", "辰", "卯", "卯"]),
      "STEM_COMBINATION", "year", "day");
    expect(factor(result, "targetExposure")).toMatchObject({ delta: 1,
      details: { participantPositions: ["day"], thirdPartyPositions: ["month", "hour"] } });
  });
  it("adds one for adjacent pairs, none for distant pairs and none for even contiguous groups", () => {
    const pair = synthetic(["甲", "己", "丙", "丙"], ["辰", "辰", "辰", "辰"]);
    expect(factor(candidate(pair, "STEM_COMBINATION", "year", "month"), "adjacency")?.delta).toBe(1);
    const distant = synthetic(["甲", "丙", "丙", "己"], ["辰", "辰", "辰", "辰"]);
    expect(candidate(distant, "STEM_COMBINATION", "year", "hour").adjacent).toBe(false);
    expect(factor(candidate(distant, "STEM_COMBINATION", "year", "hour"), "adjacency")).toBeUndefined();
    const group = synthetic(["壬", "壬", "壬", "壬"], ["申", "子", "辰", "申"]);
    const harmony = group.transformation.evaluations.find((item) => item.relationType === "THREE_HARMONY" && item.complete)!;
    expect(harmony.adjacent).toBe(true);
    expect(factor(harmony, "adjacency")).toBeUndefined();
  });
  it("uses generator native percentage threshold without adding native score directly", () => {
    const sample = synthetic(["甲", "丙", "己", "丙"], ["卯", "辰", "卯", "卯"]);
    const generator: Element = "fire";
    const nativeLow = { ...sample.native.nativeStrength, [generator]: { score: 1, percentage: 9.99 } };
    const nativeHigh = { ...sample.native.nativeStrength, [generator]: { score: 1, percentage: 10 } };
    const low = evaluateTransformation(sample.relations, sample.pillars, sample.hidden, nativeLow);
    const high = evaluateTransformation(sample.relations, sample.pillars, sample.hidden, nativeHigh);
    const relationId = sample.relations.heavenlyStems.combinations.find((item) => item.positions.join("-") === "year-day")!.id;
    const l = low.evaluations.find((item) => item.relationId === relationId)!;
    const h = high.evaluations.find((item) => item.relationId === relationId)!;
    expect(factor(l, "generatingSupport")).toBeUndefined();
    expect(factor(h, "generatingSupport")?.delta).toBe(1);
    expect(h.score - l.score).toBe(1);
  });
  it("records one competition penalty per other candidate sharing a stem position", () => {
    const sample = synthetic(["甲", "己", "甲", "壬"], ["辰", "辰", "辰", "辰"]);
    const result = candidate(sample, "STEM_COMBINATION", "year", "month");
    expect(result.competingRelations).toEqual(["STEM_COMBINATION:month-day"]);
    expect(factor(result, "competition")?.delta).toBe(-2);
    expect(sample.transformation.interactions).toContainEqual(expect.objectContaining({
      sourceRelationId: result.relationId, interactingRelationId: "STEM_COMBINATION:month-day",
      interactionType: "COMPETING", scoreDelta: -2
    }));
    expect(sample.transformation.evaluations.find((item) => item.relationId === "STEM_COMBINATION:month-day")).toBeDefined();
  });
  it("retains a blocked candidate with -2 rather than deleting it", () => {
    const sample = synthetic(["甲", "己", "庚", "戊"], ["辰", "辰", "辰", "辰"]);
    const result = candidate(sample, "STEM_COMBINATION", "year", "month");
    expect(result.blockingRelations).toContain("STEM_CLASH:year-day");
    expect(factor(result, "blockingClash")?.delta).toBe(-2);
    expect(sample.transformation.interactions).toContainEqual(expect.objectContaining({
      sourceRelationId: result.relationId, interactingRelationId: "STEM_CLASH:year-day",
      interactionType: "BLOCKING", scoreDelta: -2
    }));
  });
  it("records branch clashes as blockers of branch combinations without deleting either relation", () => {
    const sample = synthetic(["甲", "丙", "庚", "壬"], ["卯", "子", "辰", "酉"]);
    const result = candidate(sample, "SIX_COMBINATION", "day", "hour");
    expect(result.blockingRelations).toContain("BRANCH_CLASH:year-hour");
    expect(result.factors).toContainEqual(expect.objectContaining({ factor: "blockingClash", delta: -2,
      relatedRelationId: "BRANCH_CLASH:year-hour" }));
    expect(sample.relations.earthlyBranches.clashes.some((item) => item.id === "BRANCH_CLASH:year-hour")).toBe(true);
  });
  it("penalizes an original mainQi root once, with the stem and original branch recorded", () => {
    const result = candidate(synthetic(["甲", "己", "丙", "丙"], ["寅", "辰", "辰", "辰"]),
      "STEM_COMBINATION", "year", "month");
    expect(factor(result, "originalStrongRoot")).toMatchObject({ delta: -1,
      details: { originalStrongRoots: expect.arrayContaining([expect.objectContaining({ stem: "甲", rootBranch: "寅", role: "mainQi" })]) } });
  });
  it.each(BRANCH_COMBINATION_TARGET_V1.sixCombinations)("uses versioned 육합 target $pair", ({ pair, targetElement }) => {
    const sample = synthetic(["甲", "丙", "庚", "壬"], ["卯", "酉", pair[0], pair[1]]);
    expect(candidate(sample, "SIX_COMBINATION", "day", "hour").targetElement).toBe(targetElement);
  });
  it("evaluates complete harmonies and caps partial harmonies despite a high score", () => {
    const full = synthetic(["壬", "壬", "壬", "壬"], ["申", "子", "辰", "未"]);
    const complete = full.transformation.evaluations.find((item) => item.relationType === "THREE_HARMONY" && item.complete)!;
    expect(complete.state).toBe("TRANSFORMED");
    const partial = synthetic(["壬", "壬", "壬", "壬"], ["申", "子", "未", "未"]);
    const result = partial.transformation.evaluations.find((item) => item.relationType === "THREE_HARMONY" && item.targetElement === "water")!;
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.state).toBe("PARTIAL");
    expect(result.complete).toBe(false);
  });
  it("evaluates complete directional combinations and caps high-score partial ones", () => {
    const full = synthetic(["庚", "庚", "壬", "壬"], ["亥", "子", "丑", "戌"]);
    const complete = full.transformation.evaluations.find((item) => item.relationType === "DIRECTIONAL_COMBINATION" && item.complete)!;
    expect(complete.state).toBe("TRANSFORMED");
    const partial = synthetic(["庚", "庚", "壬", "壬"], ["亥", "子", "戌", "戌"]);
    const result = partial.transformation.evaluations.find((item) => item.relationType === "DIRECTIONAL_COMBINATION" && item.targetElement === "water")!;
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.state).toBe("PARTIAL");
  });
  it.each(["STEM_CLASH", "BRANCH_CLASH", "BRANCH_BREAK", "BRANCH_HARM", "WONJIN",
    "THREE_PUNISHMENT", "MUTUAL_PUNISHMENT", "SELF_PUNISHMENT"])("returns NOT_APPLICABLE for %s", (type) => {
    const sample = synthetic(["甲", "庚", "乙", "辛"], ["寅", "巳", "申", "亥"]);
    const evaluations = sample.transformation.evaluations.filter((item) => item.relationType === type);
    if (!evaluations.length) {
      const branches: [Branch, Branch, Branch, Branch] = type === "WONJIN" ? ["子", "未", "寅", "申"]
        : type === "MUTUAL_PUNISHMENT" ? ["子", "卯", "寅", "申"] : ["辰", "辰", "子", "卯"];
      const extra = synthetic(["甲", "庚", "乙", "辛"], branches);
      evaluations.push(...extra.transformation.evaluations.filter((item) => item.relationType === type));
    }
    expect(evaluations.length).toBeGreaterThan(0);
    expect(evaluations.every((item) => item.state === "NOT_APPLICABLE" && item.score === 0 && item.factors.length === 0)).toBe(true);
  });
  it("is deterministic, retains relation IDs, and balances evidence deltas for every evaluation", () => {
    const first = synthetic(["甲", "己", "庚", "戊"], ["辰", "酉", "卯", "亥"]);
    const again = synthetic(["甲", "己", "庚", "戊"], ["辰", "酉", "卯", "亥"]);
    expect(first.transformation).toEqual(again.transformation);
    expect(first.transformation.evaluations.map((item) => item.relationId).sort())
      .toEqual(first.relations.evidence.map((item) => item.relationId).sort());
    for (const item of first.transformation.evaluations)
      expect(item.evidence.reduce((sum, entry) => sum + entry.delta, 0)).toBe(item.score);
  });
  it("integrates without changing native element scores or strength-v1", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    const hidden = result.hiddenStems.value!.branches;
    const native = calculateNativeStrength(result.pillars, hidden);
    const expected = calculateStrength(result.pillars, hidden, native.evidence);
    expect(result.relations.transformation.status).toBe("implemented");
    expect(result.relations.transformation.ruleVersion).toBe("transformation-v1");
    expect(result.fiveElements.nativeStrength).toEqual(native.nativeStrength);
    expect(result.fiveElements.adjustedStrength.status).toBe("implemented");
    expect(result.strength.score).toBe(expected.score);
    expect(result.relations.strengthAdjustmentApplied).toBe(false);
  });
  it("leaves transformation unavailable when original pillars cannot be calculated", () => {
    const result = calculateSaju({ ...SYNTHETIC_INPUT, calendarType: "lunar" });
    expect(result.relations.transformation).toMatchObject({ status: "not_implemented", evaluations: [], interactions: [] });
  });
});
