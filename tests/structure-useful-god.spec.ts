import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { categoryElement } from "@/lib/saju/interpretation/ten-god-category";
import { evaluateStructureUsefulGod, structureAvailabilityAdjustment } from
  "@/lib/saju/interpretation/structure-useful-god";
import { STRUCTURE_CORE_V1 } from "@/rules/structure-useful-god.v1";
import type { AdjustedStrengthResult, Element, Stem, StructureQualitySignal,
  StructureResult, StructureType } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
const baseline = calculateSaju(SYNTHETIC_INPUT);
const adjusted = (values: Partial<Record<Element, number>>): AdjustedStrengthResult => ({
  status: "implemented", ruleVersion: "adjusted-strength-v1", effectRuleVersion: "relation-effects-v1",
  transferRuleVersion: "transformation-transfer-v1", rootDamageRuleVersion: "root-damage-v1",
  elements: Object.fromEntries(elements.map((element) => { const percentage = values[element] ?? 20;
    return [element, { nativeScore: percentage, adjustment: 0, adjustedScore: percentage, percentage }];
  })) as NonNullable<AdjustedStrengthResult["elements"]>, transferLedger: [], rootDamage: [], evidence: [],
});
const signal = (type: "SUPPORT" | "DAMAGE" | "RESCUE", tenGod: string,
  id = `${type.toLowerCase()}:year:丁`, rescuesDamageId?: string): StructureQualitySignal => ({
  id, type, tenGod: tenGod as never, stem: "丁", position: "year", source: "visibleStem",
  ...(type === "DAMAGE" ? { severity: "FULL" as const } : {}), ...(rescuesDamageId ? { rescuesDamageId } : {}) });
const structure = (type: StructureType, options?: { status?: "ESTABLISHED" | "UNEXPOSED" | "MIXED";
  damage?: boolean; rescued?: boolean; supportGod?: string; qualified?: boolean }): StructureResult => {
  const value = structuredClone(baseline.structure);
  value.status = "implemented";
  value.primary = { type, source: { branch: "酉", hiddenStem: "辛", hiddenRole: "mainQi",
    tenGod: "정관", tenGodHanja: "正官" }, exposed: options?.status === "ESTABLISHED",
    exposedPositions: options?.status === "ESTABLISHED" ? ["month"] : [],
    status: options?.status ?? "UNEXPOSED", confidence: "MEDIUM", evidence: [] };
  const damage = signal("DAMAGE", type === "식신격" ? "편인" : type.includes("재격") ? "겁재" :
    type.includes("인격") ? "정재" : type === "상관격" ? "정관" : "상관", "damage:year:丁");
  value.qualityEvaluation = { ...value.qualityEvaluation, status: "implemented",
    integrity: options?.rescued ? "RESCUED" : options?.damage ? "DAMAGED" :
      options?.status === "MIXED" ? "MIXED" : "CLEAN", qualityScore: 50,
    supportSignals: options?.supportGod ? [signal("SUPPORT", options.supportGod)] : [],
    damageSignals: options?.damage ? [damage] : [], rescueSignals: options?.rescued ?
      [signal("RESCUE", "정인", "rescue:month:癸", damage.id)] : [], mixedSignals: [], evidence: [] };
  value.mixedPatterns = options?.status === "MIXED" ?
    [{ candidate: "편관격", sourceRole: "middleQi", exposed: true, positions: ["year"] }] : [];
  if (options?.qualified) value.specialStructure.candidates[0] = {
    ...value.specialStructure.candidates[0], state: "QUALIFIED_CANDIDATE" };
  return value;
};
const run = (type: StructureType, values: Partial<Record<Element, number>> = {}, options?: Parameters<typeof structure>[1]) =>
  evaluateStructureUsefulGod("甲", adjusted(values), structure(type, options));

describe("SYNTHETIC_STRUCTURE_USEFUL_GOD_V1", () => {
  it.each(Object.entries(STRUCTURE_CORE_V1) as Array<[StructureType, string]>)
  ("A: maps %s to CORE %s", (type, category) => expect(run(type).core?.tenGodCategory).toBe(category));

  it.each([
    ["甲", ["wood", "fire", "earth", "metal", "water"]],
    ["乙", ["wood", "fire", "earth", "metal", "water"]],
    ["丙", ["fire", "earth", "metal", "water", "wood"]],
    ["丁", ["fire", "earth", "metal", "water", "wood"]],
    ["戊", ["earth", "metal", "water", "wood", "fire"]],
    ["己", ["earth", "metal", "water", "wood", "fire"]],
    ["庚", ["metal", "water", "wood", "fire", "earth"]],
    ["辛", ["metal", "water", "wood", "fire", "earth"]],
    ["壬", ["water", "wood", "fire", "earth", "metal"]],
    ["癸", ["water", "wood", "fire", "earth", "metal"]],
  ] as Array<[Stem, Element[]]>) ("B: maps all categories for %s", (stem, expected) => {
    expect((["companion", "output", "wealth", "officer", "resource"] as const)
      .map((category) => categoryElement(stem, category))).toEqual(expected);
  });

  it.each([
    ["정관격", ["officer", "wealth", "resource"]], ["편관격", ["officer", "output", "resource"]],
    ["정재격", ["wealth", "output"]], ["편재격", ["wealth", "output"]],
    ["식신격", ["output", "wealth"]], ["상관격", ["output", "wealth"]],
    ["정인격", ["resource", "officer"]], ["편인격", ["resource", "officer"]],
  ] as Array<[StructureType, string[]]>) ("C-H: derives %s CORE/SUPPORT from source rules", (type, expected) => {
    expect(run(type).candidates.flatMap((row) => row.tenGodCategories).sort()).toEqual([...expected].sort());
  });

  it("I-K: activates rescue only for actual damage and lowers an existing rescue", () => {
    expect(run("정관격").candidates.flatMap((row) => row.sources).some((row) => row.type === "RESCUE")).toBe(false);
    expect(run("정관격", {}, { damage: true }).candidates.find((row) => row.element === "water")?.sources)
      .toContainEqual(expect.objectContaining({ type: "RESCUE", score: 30, rescueState: "UNRESOLVED" }));
    expect(run("정관격", {}, { damage: true, rescued: true }).candidates.find((row) => row.element === "water")?.sources)
      .toContainEqual(expect.objectContaining({ type: "RESCUE", score: 10, rescueState: "ALREADY_RESCUED" }));
  });

  it("L-M: preserves UNEXPOSED/MIXED primary and treats secondary patterns as context", () => {
    expect(run("정관격", {}, { status: "UNEXPOSED" })).toMatchObject({ confidence: "MEDIUM",
      core: { tenGodCategory: "officer" } });
    expect(run("정관격", {}, { status: "MIXED" })).toMatchObject({ confidence: "LOW",
      core: { tenGodCategory: "officer" }, mixedContext: [{ candidate: "편관격" }] });
  });

  it("N-O: adds special caution without score changes and limits non-standard structures", () => {
    const normal = run("정관격"), caution = run("정관격", {}, { qualified: true });
    expect(caution).toMatchObject({ applicability: "CAUTION_SPECIAL_STRUCTURE", confidence: "LOW",
      specialStructureCaution: true });
    expect(caution.elementPreferences).toEqual(normal.elementPreferences);
    expect(run("건록격")).toMatchObject({ applicability: "LIMITED", candidates: [], elementPreferences: [] });
    expect(run("양인격")).toMatchObject({ applicability: "LIMITED", candidates: [], elementPreferences: [] });
  });

  it.each([[9.999, 5], [10, 2], [20, 0], [35, -5], [45, -10]] as const)
  ("P-Q: applies availability boundary %s", (percentage, delta) =>
    expect(structureAvailabilityAdjustment(percentage)).toBe(delta));

  it("R-S: penalizes excess and uses diminishing multiple-role aggregation", () => {
    expect(run("정관격", { metal: 45 }).candidates.find((row) => row.element === "metal"))
      .toMatchObject({ availabilityAdjustment: -10, structuralScore: 25, finalScore: 15 });
    const rescued = run("정관격", { water: 20 }, { damage: true });
    expect(rescued.candidates.find((row) => row.element === "water"))
      .toMatchObject({ structuralScore: 37.5, finalScore: 37.5, role: "PRIMARY_STRUCTURE" });
  });

  it("T-AA: is deterministic, reconstructible, and does not mutate upstream modules", () => {
    const source = structure("정관격", { damage: true }), distribution = adjusted({ water: 9, metal: 30 });
    const beforeStructure = structuredClone(source), beforeAdjusted = structuredClone(distribution);
    const first = evaluateStructureUsefulGod("甲", distribution, source);
    expect(evaluateStructureUsefulGod("甲", distribution, source)).toEqual(first);
    for (const row of first.candidates) expect(row.evidence.reduce((sum, item) => sum + item.delta, 0))
      .toBe(row.finalScore);
    expect(source).toEqual(beforeStructure); expect(distribution).toEqual(beforeAdjusted);
  });

  it("AB: integrates the fifth independent engine and leaves synthesis pending", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.usefulGods).toMatchObject({ status: "partial", eokbu: { status: "implemented" },
      johu: { status: "implemented" }, tonggwan: { status: "implemented" },
      byeongyak: { status: "implemented" }, structure: { status: "implemented" },
      synthesis: { status: "not_implemented" } });
  });
});
