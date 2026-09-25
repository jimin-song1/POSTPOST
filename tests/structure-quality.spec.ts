import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { clampStructureQualityScore, evaluateStructureQuality } from "@/lib/saju/interpretation/structure-quality";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { STRUCTURE_QUALITY_V1 } from "@/rules/structure-quality.v1";
import { STRUCTURE_INTERACTIONS_V1 } from "@/rules/structure-interactions.v1";
import type { Branch, PillarPosition, Stem, StructureCandidate, StructureType } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const month: Record<Exclude<StructureType, "건록격" | "양인격">, Branch> = {
  정관격: "酉", 편관격: "申", 정재격: "丑", 편재격: "辰",
  식신격: "巳", 상관격: "午", 정인격: "子", 편인격: "亥"
};
function synthetic(type: StructureType, year: Stem, monthStem: Stem, hour: Stem,
  branches: [Branch, Branch, Branch, Branch] = ["卯", month[type as keyof typeof month] ?? "寅", "子", "戌"],
  exposed = false) {
  const positions: PillarPosition[] = ["year", "month", "day", "hour"];
  const stems = [year, monthStem, "甲", hour] as const;
  const pillars = Object.fromEntries(positions.map((position, index) => [position,
    { position, stem: stems[index], branch: branches[index], hanja: null, korean: null }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = getHiddenStems(branches[1], "甲").mainQi;
  const primary: StructureCandidate = { type, source: { branch: branches[1], hiddenStem: hidden.stem,
    hiddenRole: "mainQi", tenGod: hidden.tenGod.korean, tenGodHanja: hidden.tenGod.hanja },
  exposed, exposedPositions: exposed ? ["month"] : [], status: exposed ? "ESTABLISHED" : "UNEXPOSED",
  confidence: "LOW", evidence: [] };
  const relations = detectRelations(pillars);
  const run = (strengthScore?: number) => {
    void strengthScore; // Quality is independent of strength-v1 scores.
    return evaluateStructureQuality(pillars, { primary, secondary: [], mixedPatterns: [] }, relations);
  };
  return { pillars, primary, relations, run };
}

describe("SYNTHETIC_STRUCTURE_QUALITY_V1 — explicit interactions", () => {
  it.each([
    ["정관격", "丁", "甲", "甲", "DAMAGED", "상관"],
    ["정재격", "乙", "甲", "甲", "DAMAGED", "겁재"],
    ["편재격", "甲", "甲", "甲", "DAMAGED", "비견"],
    ["식신격", "壬", "甲", "甲", "DAMAGED", "편인"],
    ["상관격", "辛", "甲", "甲", "DAMAGED", "정관"],
    ["정인격", "己", "丁", "丁", "DAMAGED", "정재"],
    ["편인격", "戊", "丁", "丁", "DAMAGED", "편재"]
  ] as const)("%s damage from %s", (type, year, middle, hour, integrity, god) => {
    const result = synthetic(type, year, middle, hour).run();
    expect(result.integrity).toBe(integrity);
    expect(result.damageSignals[0]).toMatchObject({ tenGod: god, position: "year" });
  });
  it.each([
    ["정관격", "丁", "癸", "甲"], ["정재격", "乙", "庚", "甲"],
    ["편재격", "甲", "庚", "甲"], ["식신격", "壬", "戊", "甲"],
    ["상관격", "辛", "壬", "甲"], ["정인격", "己", "乙", "丁"],
    ["편인격", "戊", "丁", "乙"]
  ] as const)("%s rescue is linked to actual damage", (type, year, middle, hour) => {
    const result = synthetic(type, year, middle, hour).run();
    expect(result.integrity).toBe("RESCUED");
    expect(result.rescueSignals).toHaveLength(1);
    expect(result.rescueSignals[0].rescuesDamageId).toBe(result.damageSignals[0].id);
    expect(result.evidence).toContainEqual(expect.objectContaining({ factor: "STRUCTURE_RESCUE",
      rescuesDamageId: result.damageSignals[0].id, delta: 8 }));
  });
  it.each([
    ["편관격", "丙", "甲", "甲", "식신"], ["편관격", "壬", "甲", "甲", "편인"],
    ["정재격", "丙", "壬", "壬", "식신"], ["편재격", "丁", "壬", "壬", "상관"],
    ["식신격", "戊", "甲", "甲", "편재"], ["상관격", "己", "甲", "甲", "정재"],
    ["정인격", "庚", "甲", "甲", "편관"], ["편인격", "辛", "甲", "甲", "정관"]
  ] as const)("%s support from %s", (type, year, middle, hour, god) => {
    const result = synthetic(type, year, middle, hour).run();
    expect(result.supportSignals[0].tenGod).toBe(god);
    expect(result.integrity).toBe("SUPPORTED");
  });
  it("records 官殺混雜 and leaves original primary unchanged", () => {
    const value = synthetic("정관격", "庚", "甲", "甲");
    const before = structuredClone(value.primary);
    const result = value.run();
    expect(result.mixedSignals[0].tenGod).toBe("편관");
    expect(result.integrity).toBe("MIXED");
    expect(value.primary).toEqual(before);
  });
  it("requires damage before rescue and does not confuse UNEXPOSED with damage", () => {
    const result = synthetic("정관격", "癸", "壬", "甲").run();
    expect(result.integrity).toBe("SUPPORTED");
    expect(result.rescueSignals).toEqual([]);
    expect(result.damageSignals).toEqual([]);
    expect(result.evidence.some((item) => item.factor === "SOURCE_EXPOSED")).toBe(false);
  });
  it("counts exposed hidden-stem secondary only once per visible position", () => {
    const value = synthetic("편재격", "癸", "戊", "甲");
    const row: StructureCandidate = { ...value.primary, type: "정인격", source: {
      ...value.primary.source, hiddenStem: "癸", hiddenRole: "middleQi" },
    exposed: true, exposedPositions: ["year"] };
    const result = evaluateStructureQuality(value.pillars,
      { primary: value.primary, secondary: [row], mixedPatterns: [] }, value.relations);
    expect(result.supportSignals.filter((entry) => entry.position === "year")).toHaveLength(0);
    expect(result.supportSignals.length + result.damageSignals.length + result.mixedSignals.length).toBeLessThanOrEqual(3);
  });
  it("keeps month clash as context without an automatic penalty", () => {
    const value = synthetic("정관격", "甲", "甲", "甲", ["卯", "酉", "子", "辰"]);
    const result = value.run();
    expect(result.relationContext.some((row) => row.relationType === "BRANCH_CLASH")).toBe(true);
    expect(result.qualityScore).toBe(50);
    expect(result.integrity).toBe("CLEAN");
  });
  it("classifies the pure pillar regression 乙亥 / 乙酉 / 甲子 / 戊辰 without treating unexposed as damaged", () => {
    const value = synthetic("정관격", "乙", "乙", "戊", ["亥", "酉", "子", "辰"]);
    expect(value.primary.type).toBe("정관격");
    expect(value.primary.status).toBe("UNEXPOSED");
    expect(value.run()).toMatchObject({ integrity: "SUPPORTED", qualityScore: 58,
      damageSignals: [], rescueSignals: [] });
  });
  it("applies caps and reconstructs score from evidence without using strength", () => {
    const result = synthetic("정재격", "乙", "乙", "乙", undefined, true).run();
    expect(result.damageSignals).toHaveLength(3);
    expect(result.evidence.filter((item) => item.factor === "STRUCTURE_DAMAGE")
      .reduce((sum, item) => sum + item.delta, 0)).toBe(-24);
    expect(result.qualityScore).toBe(result.evidence.reduce((sum, item) => sum + item.delta, 0));
    const value = synthetic("정관격", "壬", "癸", "己");
    expect(value.run(0)).toEqual(value.run(100));
  });
  it("clamps hypothetical out-of-range totals at 0 and 100", () => {
    expect(clampStructureQualityScore(-5)).toBe(0);
    expect(clampStructureQualityScore(105)).toBe(100);
    expect(clampStructureQualityScore(46)).toBe(46);
  });
  it("is deterministic and evaluates special candidates with LIMITED scope", () => {
    const value = synthetic("건록격", "丁", "辛", "乙");
    expect(value.run()).toEqual(value.run());
    expect(value.run()).toMatchObject({ evaluationScope: "LIMITED", integrity: "UNRESOLVED", qualityScore: null });
    expect(STRUCTURE_QUALITY_V1.baseline).toBe(50);
    expect(STRUCTURE_INTERACTIONS_V1.standard.식신격.damage).toEqual(["편인"]);
  });
  it("integrates real calculated synthetic pillars with special candidates and without implementing useful gods", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.structure.qualityEvaluation.status).toBe("implemented");
    expect(result.structure.specialStructure.status).toBe("implemented");
    expect(result.usefulGods.status).toBe("implemented");
  });
});
