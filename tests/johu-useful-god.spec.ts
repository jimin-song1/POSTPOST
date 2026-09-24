import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { calculateAdjustedStrength } from "@/lib/saju/fiveElements/relation-effects";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateStrength } from "@/lib/saju/interpretation/strength";
import { evaluateTransformation } from "@/lib/saju/interpretation/transformation";
import { evaluateJohuUsefulGod, validateJohuRuleTable } from "@/lib/saju/interpretation/johu-useful-god";
import { JOHU_QIONGTONG_V1, JOHU_USEFUL_GOD_V1, type JohuRuleCell } from "@/rules/johu-qiongtong.v1";
import type { Branch, Element, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
function fixture(stems: [Stem, Stem, Stem, Stem] = ["乙", "乙", "甲", "戊"],
  branches: [Branch, Branch, Branch, Branch] = ["亥", "酉", "子", "辰"]) {
  const pillars = Object.fromEntries(positions.map((position, index) => [position,
    { position, stem: stems[index], branch: branches[index], hanja: null, korean: null }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position,
    getHiddenStems(pillars[position].branch!, pillars.day.stem!)])) as Parameters<typeof calculateNativeStrength>[1];
  const native = calculateNativeStrength(pillars, hidden); const relations = detectRelations(pillars);
  relations.transformation = evaluateTransformation(relations, pillars, hidden, native.nativeStrength);
  const strength = calculateStrength(pillars, hidden, native.evidence);
  const adjusted = calculateAdjustedStrength(native, relations, strength);
  const run = () => evaluateJohuUsefulGod(pillars, hidden, adjusted, relations);
  return { pillars, hidden, native, relations, strength, adjusted, run };
}

describe("SYNTHETIC_JOHU_QIONGTONG_V1 — curated 120-cell table", () => {
  it("A: contains exactly 120 cells", () => {
    expect(JOHU_QIONGTONG_V1.cells).toHaveLength(120);
    expect(validateJohuRuleTable(JOHU_QIONGTONG_V1.cells)).toBe(true);
  });
  it.each(["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const)("B: %s has all 12 month branches", (stem) => {
    const cells = JOHU_QIONGTONG_V1.cells.filter((cell) => cell.dayStem === stem);
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map((cell) => cell.monthBranch)).size).toBe(12);
  });
  it("C: rejects duplicate keys, invalid priority stems and duplicate ranks", () => {
    const cells = structuredClone(JOHU_QIONGTONG_V1.cells) as JohuRuleCell[];
    expect(() => validateJohuRuleTable([...cells.slice(0, 119), cells[0]])).toThrow(/Duplicate|12 months/);
    cells[0].priorities[0].stem = "INVALID" as Stem;
    expect(() => validateJohuRuleTable(cells)).toThrow(/Invalid priority stem/);
    const ranks = structuredClone(JOHU_QIONGTONG_V1.cells) as JohuRuleCell[];
    ranks[0].priorities.push({ ...ranks[0].priorities[0] });
    expect(() => validateJohuRuleTable(ranks)).toThrow(/Duplicate priority rank/);
  });
  it("D-E: preserves 甲+酉 stem priorities 丁, 丙, 庚", () => {
    const cell = JOHU_QIONGTONG_V1.cells.find((row) => row.dayStem === "甲" && row.monthBranch === "酉")!;
    expect(cell.priorities).toEqual([
      { stem: "丁", rank: 1, role: "PRIMARY" }, { stem: "丙", rank: 2, role: "SECONDARY" },
      { stem: "庚", rank: 3, role: "SUPPORTING" },
    ]);
    expect(fixture().run().stemPreferences.map(({ stem, preferenceRank, preferenceScore }) =>
      ({ stem, preferenceRank, preferenceScore }))).toEqual([
      { stem: "丁", preferenceRank: 1, preferenceScore: 30 },
      { stem: "丙", preferenceRank: 2, preferenceScore: 20 },
      { stem: "庚", preferenceRank: 3, preferenceScore: 10 },
    ]);
  });
  it("keeps the 十二月甲木 source order 庚 then 丁 without an unsupported 丙", () => {
    const cell = JOHU_QIONGTONG_V1.cells.find((row) => row.dayStem === "甲" && row.monthBranch === "丑")!;
    expect(cell.priorities.map((row) => row.stem)).toEqual(["庚", "丁"]);
    expect(cell.source.sourceNote).toContain("庚 선행");
    expect(fixture(undefined, ["亥", "丑", "子", "辰"]).run().stemPreferences.map((row) => row.stem))
      .toEqual(["庚", "丁"]);
  });
  it("F: aggregates same-element stems with 1.0/0.5 diminishing weights", () => {
    expect(fixture().run().elementPreferences).toEqual([
      { element: "fire", score: 40, contributingStems: ["丁", "丙"] },
      { element: "metal", score: 10, contributingStems: ["庚"] },
    ]);
  });
  it("G: records visible availability without changing preference", () => {
    const result = fixture(["丁", "乙", "甲", "戊"]).run();
    expect(result.stemPreferences[0]).toMatchObject({ stem: "丁", preferenceScore: 30,
      availability: { state: "VISIBLE", visible: true, visiblePositions: ["year"] } });
  });
  it("H: records hidden availability and qi location", () => {
    const result = fixture(["乙", "乙", "甲", "戊"], ["午", "酉", "子", "辰"]).run();
    expect(result.stemPreferences[0]).toMatchObject({ stem: "丁", preferenceScore: 30,
      availability: { state: "HIDDEN", hidden: true,
        hiddenLocations: [expect.objectContaining({ pillar: "year", branch: "午", role: "mainQi" })] } });
  });
  it("I-J: preserves rank and score when the preferred stem is absent", () => {
    expect(fixture().run().stemPreferences[0]).toMatchObject({ stem: "丁", preferenceRank: 1,
      preferenceScore: 30, availability: { state: "ABSENT" } });
  });
  it("K: presence never inflates the curated preference score", () => {
    expect(fixture(["丁", "乙", "甲", "戊"]).run().stemPreferences[0].preferenceScore)
      .toBe(fixture().run().stemPreferences[0].preferenceScore);
  });
  it("L: activates the explicit wood-group and visible-companion override", () => {
    const result = fixture(["乙", "戊", "甲", "壬"], ["亥", "酉", "卯", "未"]).run();
    expect(result.activeConditions).toEqual([{ id: "JIA_YOU_WOOD_GROUP_VISIBLE_COMPANION", effect: "PRIORITY_OVERRIDE" }]);
    expect(result.stemPreferences.map((row) => row.stem)).toEqual(["庚", "丁"]);
  });
  it("M: retains default priorities when only half of the condition is satisfied", () => {
    const result = fixture(["丙", "戊", "甲", "壬"], ["亥", "酉", "卯", "未"]).run();
    expect(result.activeConditions).toEqual([]);
    expect(result.stemPreferences.map((row) => row.stem)).toEqual(["丁", "丙", "庚"]);
  });
  it("N-O: records an explicit excess-water blocker as context without deleting preferences", () => {
    const value = fixture(); value.adjusted.elements!.water.percentage = 40;
    const result = value.run();
    expect(result.activeBlockers).toEqual([{ id: "JIA_YOU_EXCESS_WATER_CONSTRAINS_FIRE",
      targetStems: ["丁", "丙"], effect: "CONTEXT_ONLY" }]);
    expect(result.stemPreferences[0].evidence).toContainEqual(expect.objectContaining({
      factor: "BLOCKING_CONTEXT", delta: 0 }));
    expect(result.stemPreferences.map((row) => row.preferenceScore)).toEqual([30, 20, 10]);
  });
  it("P: reuses transformation context for availability evidence", () => {
    const result = fixture(["丁", "戊", "甲", "壬"]).run();
    const ding = result.stemPreferences.find((row) => row.stem === "丁")!;
    expect(ding.availability.relationContext.some((row) => row.relationId.includes("STEM_COMBINATION"))).toBe(true);
  });
  it("Q-T: leaves eokbu, strength and structure untouched and is deterministic", () => {
    const calculated = calculateSaju(SYNTHETIC_INPUT);
    const before = structuredClone({ eokbu: calculated.usefulGods.eokbu,
      strength: calculated.strength, structure: calculated.structure });
    const again = calculateSaju(SYNTHETIC_INPUT);
    expect({ eokbu: calculated.usefulGods.eokbu, strength: calculated.strength,
      structure: calculated.structure }).toEqual(before);
    expect(calculated.usefulGods.johu).toEqual(again.usefulGods.johu);
  });
  it("U: integrates johu while preserving all pending modules", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.usefulGods).toMatchObject({ status: "implemented", eokbu: { status: "implemented" },
      johu: { status: "implemented" }, tonggwan: { status: "implemented" },
      byeongyak: { status: "implemented" }, structure: { status: "implemented" },
      synthesis: { status: "implemented" } });
    expect(calculateSaju({ ...SYNTHETIC_INPUT, birthTimeKnown: false }).usefulGods.johu.status).toBe("not_implemented");
  });
  it("records source provenance and the declared ambiguous curation notes", () => {
    expect(JOHU_QIONGTONG_V1.cells.every((cell) => cell.source.section && cell.source.sourceNote)).toBe(true);
    expect(JOHU_QIONGTONG_V1.cells.filter((cell) => cell.curationNote)).toHaveLength(11);
    expect(JOHU_USEFUL_GOD_V1.aggregationWeights).toEqual([1, 0.5, 0.25, 0.125]);
  });
});
