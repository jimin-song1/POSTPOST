import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { eokbuRole, evaluateEokbuUsefulGod } from "@/lib/saju/interpretation/eokbu-useful-god";
import { EOKBU_USEFUL_GOD_V1 } from "@/rules/eokbu-useful-god.v1";
import type { Element } from "@/types/saju-analysis";
import type { StrengthLevel } from "@/rules/strength.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
function fixture(level: StrengthLevel = "중화신약", percentages: [number, number, number, number, number] = [20, 20, 20, 20, 20]) {
  const calculated = calculateSaju(SYNTHETIC_INPUT);
  const strength = structuredClone(calculated.strength);
  const adjusted = structuredClone(calculated.fiveElements.adjustedStrength);
  const special = structuredClone(calculated.structure.specialStructure);
  strength.adjusted.status = "implemented";
  strength.adjusted.score = EOKBU_USEFUL_GOD_V1.baseByLevel[level].same >= 0 ? 35 : 65;
  strength.adjusted.level = level;
  elements.forEach((element, index) => { adjusted.elements![element].percentage = percentages[index]; });
  special.candidates.forEach((candidate) => { candidate.state = "REJECTED"; });
  const run = () => evaluateEokbuUsefulGod(strength, adjusted, special).eokbu;
  return { calculated, strength, adjusted, special, run };
}

describe("SYNTHETIC_EOKBU_USEFUL_GOD_V1", () => {
  it.each([
    ["극약", true], ["태약", true], ["신약", true], ["중화신약", true],
    ["중화신강", false], ["신강", false], ["태강", false], ["극왕", false],
  ] as const)("A-H: applies the configured direction for %s", (level, weakDirection) => {
    const result = fixture(level).run();
    const byRelation = Object.fromEntries(result.elements.map((row) => [row.relationToDayMaster, row.finalScore]));
    expect(byRelation.same > 0).toBe(weakDirection);
    expect(byRelation.resource > 0).toBe(weakDirection);
    expect(byRelation.output > 0).toBe(!weakDirection);
    expect(byRelation.wealth > 0).toBe(!weakDirection);
    expect(byRelation.officer > 0).toBe(!weakDirection);
  });
  it.each(elements)("I: maps all five relations from %s day-master element", (dayElement) => {
    const value = fixture(); value.strength.dayMaster!.element = dayElement;
    const relationByElement = Object.fromEntries(value.run().elements.map((row) => [row.element, row.relationToDayMaster]));
    const index = elements.indexOf(dayElement);
    expect([0, 1, 2, 3, 4].map((distance) => relationByElement[elements[(index + distance) % 5]]))
      .toEqual(["same", "output", "wealth", "officer", "resource"]);
  });
  it("J: adds scarcity only when the relation is favorable", () => {
    const result = fixture("신약", [20, 35, 20, 20, 5]).run();
    expect(result.elements.find((row) => row.element === "water")).toMatchObject({
      relationToDayMaster: "resource", scarcityAdjustment: 8 });
  });
  it("K: penalizes excess in both favorable and unfavorable directions", () => {
    const weak = fixture("신약", [30, 10, 10, 10, 40]).run();
    expect(weak.elements.find((row) => row.element === "water")?.excessAdjustment).toBe(-4);
    const strong = fixture("신강", [10, 10, 10, 30, 40]).run();
    expect(strong.elements.find((row) => row.element === "water")?.excessAdjustment).toBe(-8);
    expect(strong.elements.find((row) => row.element === "metal")?.excessAdjustment).toBe(0);
  });
  it("L: an absent unfavorable element does not become PRIMARY", () => {
    const result = fixture("신약", [20, 0, 20, 30, 30]).run();
    expect(result.elements.find((row) => row.element === "fire")).toMatchObject({
      relationToDayMaster: "output", role: "UNFAVORABLE", scarcityAdjustment: 0 });
  });
  it("M: an abundant needed element remains usable with only the configured moderation", () => {
    const result = fixture("태약", [30, 10, 10, 10, 40]).run();
    expect(result.elements.find((row) => row.element === "water")).toMatchObject({
      relationToDayMaster: "resource", finalScore: 26, role: "PRIMARY" });
  });
  it("N: qualified special structure makes eokbu conditional without changing element scores", () => {
    const value = fixture("극약"); const standard = value.run();
    value.special.candidates[0].state = "QUALIFIED_CANDIDATE";
    const caution = value.run();
    expect(caution).toMatchObject({ applicability: "CAUTION_SPECIAL_STRUCTURE", conditional: true, confidence: "LOW" });
    expect(caution.elements).toEqual(standard.elements);
    expect(caution.evidence).toContainEqual(expect.objectContaining({ factor: "SPECIAL_STRUCTURE_CONTEXT", delta: 0 }));
  });
  it("O: rejected candidates retain standard applicability", () => {
    expect(fixture("극왕").run()).toMatchObject({ applicability: "STANDARD", conditional: false, confidence: "MEDIUM" });
  });
  it.each([
    [25, "PRIMARY"], [24.999, "SUPPORTIVE"], [15, "SUPPORTIVE"], [14.999, "CONDITIONAL"],
    [5, "CONDITIONAL"], [4.999, "NEUTRAL"], [-4, "NEUTRAL"], [-4.001, "UNFAVORABLE"],
  ] as const)("P: maps score %s to %s", (score, role) => expect(eokbuRole(score)).toBe(role));
  it("Q: uses canonical 木火土金水 order for equal scores", () => {
    const result = fixture("중화신강", [40, 5, 30, 15, 10]).run();
    const tied = result.elements.filter((row) => row.finalScore === 16).map((row) => row.element);
    expect(tied).toEqual(["fire", "metal"]);
    expect(result).toEqual(fixture("중화신강", [40, 5, 30, 15, 10]).run());
  });
  it("R: prefers adjusted score and level", () => {
    const value = fixture("태강"); value.strength.score = 22; value.strength.level = "태약";
    expect(value.run()).toMatchObject({ strengthSource: "adjusted", strengthLevel: "태강" });
  });
  it("S: falls back to original strength only when adjusted is unavailable", () => {
    const value = fixture(); value.strength.score = 22; value.strength.level = "태약";
    value.strength.adjusted.status = "not_implemented"; value.strength.adjusted.score = null; value.strength.adjusted.level = null;
    expect(value.run()).toMatchObject({ strengthSource: "original", strengthScore: 22, strengthLevel: "태약" });
  });
  it("T-U: evidence reconstructs every score and evaluation is deterministic", () => {
    const value = fixture("신약", [5, 15, 20, 25, 35]); const result = value.run();
    for (const row of result.elements) {
      expect(row.finalScore).toBe(row.evidence.reduce((sum, evidence) => sum + evidence.delta, 0));
      expect(row.specialStructureAdjustment).toBe(0);
    }
    expect(result).toEqual(value.run());
  });
  it("V: exposes only eokbu as implemented and preserves pending modules", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.usefulGods).toMatchObject({ status: "partial", eokbu: { status: "implemented" },
      johu: { status: "implemented" }, tonggwan: { status: "implemented" },
      byeongyak: { status: "implemented" }, structure: { status: "not_implemented" },
      synthesis: { status: "not_implemented" } });
    expect(calculateSaju({ ...SYNTHETIC_INPUT, birthTimeKnown: false }).usefulGods.status).toBe("not_implemented");
  });
});
