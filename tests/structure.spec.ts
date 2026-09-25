import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { calculateAdjustedStrength } from "@/lib/saju/fiveElements/relation-effects";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateStrength } from "@/lib/saju/interpretation/strength";
import { emptyStructure, evaluateStructure } from "@/lib/saju/interpretation/structure";
import { getTwelveStage } from "@/lib/saju/interpretation/twelve-stages";
import { evaluateTransformation } from "@/lib/saju/interpretation/transformation";
import { HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import { DEOK_ROK_STRUCTURE_V1 } from "@/rules/deok-rok-structure.v1";
import { YANG_BLADE_STRUCTURE_V1 } from "@/rules/yang-blade-structure.v1";
import { STANDARD_STRUCTURE_V1 } from "@/rules/standard-structure.v1";
import type { Branch, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
function synthetic(stems: [Stem, Stem, Stem, Stem], branches: [Branch, Branch, Branch, Branch]) {
  const pillars = Object.fromEntries(positions.map((position, index) => [position,
    { position, stem: stems[index], branch: branches[index], hanja: null, korean: null }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position,
    getHiddenStems(pillars[position].branch!, pillars.day.stem!)])) as Parameters<typeof calculateNativeStrength>[1];
  const native = calculateNativeStrength(pillars, hidden);
  const relations = detectRelations(pillars);
  relations.transformation = evaluateTransformation(relations, pillars, hidden, native.nativeStrength);
  const strength = calculateStrength(pillars, hidden, native.evidence);
  const adjusted = calculateAdjustedStrength({ nativeStrength: native.nativeStrength, evidence: native.evidence }, relations, strength);
  const structure = () => evaluateStructure(pillars, hidden, strength, adjusted, relations);
  return { pillars, hidden, native, relations, strength, adjusted, structure };
}

describe("SYNTHETIC_STRUCTURE_V1 — month mainQi standard candidates", () => {
  it.each([
    ["酉", "辛", "정관", "정관격"], ["申", "庚", "편관", "편관격"],
    ["丑", "己", "정재", "정재격"], ["辰", "戊", "편재", "편재격"],
    ["巳", "丙", "식신", "식신격"], ["午", "丁", "상관", "상관격"],
    ["子", "癸", "정인", "정인격"], ["亥", "壬", "편인", "편인격"]
  ] as const)("maps 甲 month %s mainQi %s %s to %s", (branch, stem, tenGod, type) => {
    const result = synthetic(["乙", stem, "甲", "甲"], ["卯", branch, "子", "辰"]).structure();
    expect(result.primary).toMatchObject({ type, source: { branch, hiddenStem: stem,
      hiddenRole: "mainQi", tenGod }, exposed: true, exposedPositions: ["month"], status: "ESTABLISHED" });
    expect(result.evidence).toContainEqual(expect.objectContaining({ factor: "MONTH_MAIN_QI", monthBranch: branch,
      hiddenStem: stem, role: "mainQi", dayMaster: "甲", tenGod, result: type }));
    expect(STANDARD_STRUCTURE_V1.byTenGod[tenGod]).toBe(type);
  });
  it("retains an unexposed main-qi primary instead of replacing it with month stem", () => {
    const result = synthetic(["乙", "丁", "甲", "壬"], ["子", "酉", "午", "亥"]).structure();
    expect(result.primary).toMatchObject({ type: "정관격", status: "UNEXPOSED", confidence: "LOW",
      exposed: false, exposedPositions: [] });
    expect(result.exposures).toContainEqual({ stem: "辛", role: "mainQi", exposed: false, positions: [] });
  });
  it("records all matching visible positions but excludes the day stem", () => {
    const exposed = synthetic(["辛", "辛", "甲", "辛"], ["寅", "酉", "子", "午"]).structure();
    expect(exposed.primary?.exposedPositions).toEqual(["year", "month", "hour"]);
    const self = synthetic(["乙", "乙", "甲", "乙"], ["卯", "寅", "子", "午"]).structure();
    expect(self.exposures.find((item) => item.role === "mainQi")).toMatchObject({ stem: "甲", exposed: false, positions: [] });
    expect(self.primary?.type).toBe("건록격");
  });
  it("keeps main primary and records exposed middleQi as secondary plus mixed evidence", () => {
    const result = synthetic(["癸", "戊", "甲", "壬"], ["子", "辰", "子", "午"]).structure();
    expect(result.primary).toMatchObject({ type: "편재격", source: { hiddenStem: "戊" }, status: "MIXED" });
    expect(result.secondary).toContainEqual(expect.objectContaining({ type: "정인격",
      source: expect.objectContaining({ hiddenStem: "癸", hiddenRole: "middleQi" }), exposed: true }));
    expect(result.mixedPatterns).toEqual([{ candidate: "정인격", sourceRole: "middleQi", exposed: true, positions: ["year"] }]);
  });
  it("records exposed residualQi without replacing the main primary", () => {
    const result = synthetic(["戊", "庚", "甲", "丁"], ["子", "申", "子", "午"]).structure();
    expect(result.primary?.type).toBe("편관격");
    expect(result.secondary).toContainEqual(expect.objectContaining({ type: "편재격",
      source: expect.objectContaining({ hiddenStem: "戊", hiddenRole: "residualQi" }) }));
    expect(result.mixedPatterns).toContainEqual(expect.objectContaining({ candidate: "편재격", sourceRole: "residualQi" }));
  });
  it("does not replace unexposed mainQi with exposed middleQi or mark MIXED", () => {
    const result = synthetic(["癸", "乙", "甲", "丁"], ["子", "辰", "子", "午"]).structure();
    expect(result.primary).toMatchObject({ type: "편재격", status: "UNEXPOSED" });
    expect(result.secondary.map((candidate) => candidate.type)).toContain("정인격");
    expect(result.mixedPatterns).toEqual([]);
  });
  it("keeps an unresolved 乙/寅 겁재 month outside the eight standard structures", () => {
    const result = synthetic(["戊", "庚", "乙", "壬"], ["子", "寅", "酉", "辰"]).structure();
    expect(result.primary).toBeNull();
    expect(result.classificationStatus).toBe("UNRESOLVED");
    expect(result.specialCandidates).toEqual([]);
    expect(result.evidence).toContainEqual(expect.objectContaining({ factor: "UNRESOLVED", tenGod: "겁재" }));
  });
});

describe("SYNTHETIC_STRUCTURE_V1 — 建祿, 羊刃, and preserved axes", () => {
  it("aligns the ten-stem 建祿 table with existing twelve-stages-v1", () => {
    expect(Object.keys(DEOK_ROK_STRUCTURE_V1.byDayStem)).toHaveLength(10);
    for (const stem of HEAVENLY_STEMS) {
      const branch = DEOK_ROK_STRUCTURE_V1.byDayStem[stem];
      expect(getTwelveStage(stem, branch).korean).toBe("건록");
      const result = synthetic(["丙", "庚", stem, "壬"], ["子", branch, "酉", "辰"]).structure();
      expect(result.specialCandidates.some((candidate) => candidate.type === "건록격")).toBe(true);
    }
  });
  it.each([
    ["甲", "卯"], ["丙", "午"], ["戊", "午"], ["庚", "酉"], ["壬", "子"]
  ] as const)("detects conservative yang blade %s at %s", (stem, branch) => {
    const result = synthetic(["甲", "乙", stem, "壬"], ["辰", branch, "亥", "巳"]).structure();
    expect(result.specialCandidates.some((candidate) => candidate.type === "양인격")).toBe(true);
    expect(YANG_BLADE_STRUCTURE_V1.byDayStem[stem]).toBe(branch);
  });
  it("selects 比肩 建祿 and 劫財 羊刃 separately from the eight standard types", () => {
    const deokRok = synthetic(["乙", "乙", "甲", "乙"], ["子", "寅", "子", "午"]).structure();
    const yangBlade = synthetic(["甲", "乙", "甲", "壬"], ["子", "卯", "子", "午"]).structure();
    expect(deokRok.primary).toMatchObject({ type: "건록격", status: "SPECIAL_CANDIDATE", source: { tenGod: "비견" } });
    expect(yangBlade.primary).toMatchObject({ type: "양인격", status: "SPECIAL_CANDIDATE", source: { tenGod: "겁재" } });
  });
  it("does not extend yang blade to yin day stems", () => {
    for (const stem of ["乙", "丁", "己", "辛", "癸"] as Stem[]) {
      const result = synthetic(["甲", "庚", stem, "壬"], ["子", "卯", "辰", "戌"]).structure();
      expect(result.specialCandidates.some((candidate) => candidate.type === "양인격")).toBe(false);
    }
  });
  it("keeps a standard main-qi primary if a yang blade branch also matches", () => {
    const result = synthetic(["丙", "丁", "戊", "壬"], ["子", "午", "寅", "亥"]).structure();
    expect(result.primary?.type).toBe("정인격");
    expect(result.specialCandidates.some((candidate) => candidate.type === "양인격")).toBe(true);
  });
  it("preserves original 酉=辛 mainQi and 正官格 even after a transformation is marked TRANSFORMED", () => {
    const value = synthetic(["乙", "辛", "甲", "戊"], ["亥", "酉", "子", "辰"]);
    const before = value.structure();
    value.relations.transformation.evaluations = value.relations.transformation.evaluations.map((item) =>
      value.relations.evidence.some((entry) => entry.relationId === item.relationId && entry.positions.includes("month"))
        ? { ...item, state: "TRANSFORMED" } : item);
    const after = value.structure();
    expect(before.primary).toMatchObject({ type: "정관격", source: { branch: "酉", hiddenStem: "辛",
      hiddenRole: "mainQi", tenGod: "정관" } });
    expect(after.primary).toEqual(before.primary);
    expect(after.transformationContext.length).toBeGreaterThan(0);
    expect(after.transformationContext.some((item) => item.state === "TRANSFORMED")).toBe(true);
    expect(after.dayMasterStrength).toEqual({ score: value.strength.score, level: value.strength.level });
  });
  it("keeps the same primary source when other pillars change the strength score", () => {
    const a = synthetic(["壬", "乙", "甲", "戊"], ["子", "酉", "子", "辰"]);
    const b = synthetic(["庚", "乙", "甲", "丙"], ["寅", "酉", "寅", "午"]);
    expect(a.strength.score).not.toBe(b.strength.score);
    expect(a.structure().primary?.source).toEqual(b.structure().primary?.source);
    expect(a.structure().primary?.type).toBe("정관격");
  });
  it("returns deterministic evidence, separate strength metadata and conservative special candidates", () => {
    const value = synthetic(["乙", "辛", "甲", "戊"], ["亥", "酉", "子", "辰"]);
    const result = value.structure();
    expect(result).toEqual(value.structure());
    expect(result.adjustedElementContext).toMatchObject({ status: "implemented", ruleVersion: "adjusted-strength-v1" });
    expect(result.specialStructure.status).toBe("implemented");
    expect(result.qualityEvaluation.status).toBe("implemented");
    expect(result.evidence).toContainEqual(expect.objectContaining({ factor: "EXPOSURE", stem: "辛", positions: ["month"] }));
  });
  it("integrates actual synthetic calculated pillars without calculating useful gods", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.structure.status).toBe("implemented");
    expect(result.structure.ruleVersion).toBe("structure-v1");
    expect(result.structure.specialStructure.status).toBe("implemented");
    expect(result.structure.qualityEvaluation.status).toBe("implemented");
    expect(result.usefulGods.status).toBe("implemented");
  });
  it("keeps unavailable input explicit and unclassified", () => {
    expect(emptyStructure()).toMatchObject({ status: "not_implemented", primary: null,
      classificationStatus: "UNRESOLVED" });
    const result = calculateSaju({ ...SYNTHETIC_INPUT, calendarType: "lunar" });
    expect(result.structure.status).toBe("not_implemented");
    expect(result.structure.primary).toBeNull();
  });
});
