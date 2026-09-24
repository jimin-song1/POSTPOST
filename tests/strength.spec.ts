import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { calculateStrength, clampStrengthScore, elementRelation, strengthLevel } from "@/lib/saju/interpretation/strength";
import { STRENGTH_V1 } from "@/rules/strength.v1";
import type { Branch, ElementContribution, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
function synthetic(stems: [Stem, Stem, Stem, Stem], branches: [Branch, Branch, Branch, Branch],
  customEvidence?: ElementContribution[]) {
  const pillars = Object.fromEntries(positions.map((position, index) => [position, {
    position, stem: stems[index], branch: branches[index], hanja: null, korean: null
  }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position,
    getHiddenStems(pillars[position].branch!, pillars.day.stem!)])) as Parameters<typeof calculateStrength>[1];
  const native = calculateNativeStrength(pillars, hidden);
  return calculateStrength(pillars, hidden, customEvidence ?? native.evidence);
}
const fixture = () => synthetic(["甲", "乙", "甲", "戊"], ["亥", "酉", "子", "辰"]);

describe("SYNTHETIC_STRENGTH_V1", () => {
  it("starts at a configured baseline of 50", () => {
    expect(STRENGTH_V1.baseline).toBe(50);
    expect(fixture().evidence[0]).toMatchObject({ factor: "baseline", scoreDelta: 50 });
  });
  it.each([
    ["卯", "same", 18, true], ["子", "resource", 14, true],
    ["巳", "output", -10, false], ["辰", "wealth", -8, false], ["酉", "officer", -18, false]
  ] as const)("month %s gives %s %s", (branch, relation, score, isObtained) => {
    const result = synthetic(["庚", "辛", "甲", "壬"], ["子", branch, "午", "酉"]);
    expect(result.deukRyeong).toMatchObject({ relation, score, isObtained });
    expect(result.evidence.find((item) => item.factor === "monthCommand")?.scoreDelta).toBe(score);
  });
  it("classifies all five element relations with a cycle", () => {
    expect(["wood", "water", "fire", "earth", "metal"].map((element) =>
      elementRelation("wood", element as "wood" | "water" | "fire" | "earth" | "metal")))
      .toEqual(["same", "resource", "output", "wealth", "officer"]);
  });
  it.each([
    ["乙", "겁재", 5], ["壬", "편인", 5], ["丙", "식신", -4],
    ["戊", "편재", -4], ["庚", "편관", -6]
  ] as const)("visible stem %s %s scores %s", (year, tenGod, score) => {
    const result = synthetic([year, "辛", "甲", "辛"], ["子", "酉", "子", "酉"]);
    expect(result.evidence.find((item) => item.factor === "visibleStem" && item.pillar === "year"))
      .toMatchObject({ stem: year, tenGod: { korean: tenGod }, scoreDelta: score });
    expect(result.evidence.filter((item) => item.factor === "visibleStem")).toHaveLength(3);
    expect(result.evidence.some((item) => item.factor === "visibleStem" && item.pillar === "day")).toBe(false);
  });
  it("records main, middle, residual roots with 8/5/3", () => {
    const result = synthetic(["甲", "甲", "乙", "甲"], ["卯", "未", "辰", "酉"]);
    expect(result.rooting?.roots.map(({ role, score }) => [role, score]))
      .toEqual([["mainQi", 8], ["middleQi", 5], ["residualQi", 3]]);
  });
  it("caps four main roots at 20, while preserving raw points and applied deltas", () => {
    const result = synthetic(["甲", "甲", "甲", "甲"], ["寅", "寅", "寅", "寅"]);
    expect(result.rooting).toMatchObject({ rawScore: 32, score: 20, cap: 20 });
    expect(result.rooting?.roots.map((root) => root.appliedScore)).toEqual([8, 8, 4, 0]);
    expect(result.evidence.filter((item) => item.factor === "root").reduce((sum, item) => sum + item.scoreDelta, 0)).toBe(20);
  });
  it("obtains day-branch root as a small extra factor", () => {
    const yes = synthetic(["庚", "辛", "甲", "庚"], ["酉", "酉", "亥", "酉"]);
    const no = synthetic(["庚", "辛", "甲", "庚"], ["酉", "酉", "子", "酉"]);
    expect(yes.deukJi).toMatchObject({ isObtained: true, score: 5 });
    expect(no.deukJi).toMatchObject({ isObtained: false, score: 0 });
  });
  it.each([["卯", "same", true, 3], ["子", "resource", true, 3], ["酉", "officer", false, 0]] as const)(
    "hour mainQi %s qualifies %s", (hour, relation, isObtained, score) => {
      const result = synthetic(["庚", "辛", "甲", "庚"], ["酉", "酉", "子", hour]);
      expect(result.deukSi).toMatchObject({ relation, isObtained, score });
    }
  );
  it("compares support/opposition contribution weights for deukSe", () => {
    const yes = synthetic(["甲", "壬", "甲", "乙"], ["卯", "酉", "子", "亥"]);
    const no = synthetic(["庚", "辛", "甲", "戊"], ["酉", "卯", "午", "辰"]);
    expect(yes.deukSe).toMatchObject({ isObtained: true, score: 5 });
    expect(no.deukSe).toMatchObject({ isObtained: false, score: -5 });
    const neutralEvidence = [
      { source: "yearStem", element: "wood", finalContribution: 10 },
      { source: "hourStem", element: "metal", finalContribution: 10 }
    ] as ElementContribution[];
    const neutral = synthetic(["甲", "甲", "甲", "庚"], ["卯", "子", "午", "酉"], neutralEvidence);
    expect(neutral.deukSe).toMatchObject({ isObtained: false, score: 0 });
  });
  it("tracks support/drain/control weighted contributions separately from score", () => {
    const result = fixture();
    expect(result.support!.count + result.drain!.count + result.control!.count).toBeGreaterThan(3);
    expect(result.support!.sources.every((item) => ["same", "resource"].includes(item.relation))).toBe(true);
    expect(result.control!.sources.every((item) => item.relation === "officer")).toBe(true);
    expect(result.support!.sources.some((item) => item.source === "dayStem")).toBe(false);
  });
  it("clamps scores and records clamp adjustment when an actual configuration exceeds 100", () => {
    expect(clampStrengthScore(-1)).toBe(0);
    expect(clampStrengthScore(101)).toBe(100);
    const result = synthetic(["甲", "甲", "甲", "甲"], ["寅", "寅", "寅", "寅"]);
    expect(result.score).toBe(100);
    expect(result.evidence.at(-1)?.factor).toBe("clamp");
  });
  it.each([
    [14, "극약"], [15, "태약"], [27, "태약"], [28, "신약"],
    [39, "신약"], [40, "중화신약"], [49, "중화신약"], [50, "중화신강"],
    [59, "중화신강"], [60, "신강"], [72, "신강"], [73, "태강"],
    [85, "태강"], [86, "극왕"], [0, "극약"], [100, "극왕"]
  ] as const)("maps score %d to %s", (score, level) => expect(strengthLevel(score)).toBe(level));
  it("keeps the pure-pillar regression month 酉 adverse without matching external service levels", () => {
    const result = fixture();
    expect(result.dayMaster).toMatchObject({ stem: "甲", element: "wood" });
    expect(result.deukRyeong).toMatchObject({ relation: "officer", score: -18, isObtained: false });
    expect(result.score).toBe(49);
    expect(result.level).toBe("중화신약");
    expect(result.score).toBe(result.evidence.reduce((sum, item) => sum + item.scoreDelta, 0));
    expect(result).toEqual(fixture());
  });
  it("integrates real calculated synthetic pillars and leaves later modules unimplemented", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.strength.status).toBe("implemented");
    expect(typeof result.strength.score).toBe("number");
    expect(STRENGTH_V1.levels.map((row) => row.level)).toContain(result.strength.level);
    expect(result.strength.evidence.length).toBeGreaterThan(0);
    expect(result.strength.evidence.reduce((sum, item) => sum + item.scoreDelta, 0)).toBe(result.strength.score);
    expect(result.strength.relationAdjustmentApplied).toBe(false);
    expect(result.fiveElements.adjustedStrength.status).toBe("not_implemented");
    expect(result.relations.status).toBe("not_implemented");
    expect(result.structure.status).toBe("not_implemented");
    expect(result.usefulGods.status).toBe("not_implemented");
  });
  it("returns an explicit unavailable result when pillars cannot be calculated", () => {
    const result = calculateSaju({ ...SYNTHETIC_INPUT, calendarType: "lunar" });
    expect(result.strength).toMatchObject({ status: "not_implemented", score: null, level: null,
      evidence: [], relationAdjustmentApplied: false });
  });
});
