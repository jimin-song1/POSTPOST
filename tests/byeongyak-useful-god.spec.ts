import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluateByeongyakUsefulGod, medicineAvailabilityAdjustment,
  medicineElement } from "@/lib/saju/interpretation/byeongyak-useful-god";
import { emptyRelations } from "@/lib/saju/interpretation/relations";
import { emptyTonggwan } from "@/lib/saju/interpretation/tonggwan-useful-god";
import { BYEONGYAK_EXCESS_MEDICINE_TABLE } from "@/rules/byeongyak-useful-god.v1";
import type { AdjustedStrengthResult, Element, Stem, StructureQualitySignal,
  StructureResult, StructureType } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
const baseline = calculateSaju(SYNTHETIC_INPUT);
const adjusted = (values: Partial<Record<Element, number>>): AdjustedStrengthResult => ({
  status: "implemented", ruleVersion: "adjusted-strength-v1", effectRuleVersion: "relation-effects-v1",
  transferRuleVersion: "transformation-transfer-v1", rootDamageRuleVersion: "root-damage-v1",
  elements: Object.fromEntries(elements.map((element) => {
    const percentage = values[element] ?? 0;
    return [element, { nativeScore: percentage, adjustment: 0, adjustedScore: percentage, percentage }];
  })) as NonNullable<AdjustedStrengthResult["elements"]>, transferLedger: [], rootDamage: [], evidence: [],
});
const damage = (): StructureQualitySignal => ({ id: "damage:year:丁", type: "DAMAGE", tenGod: "상관",
  stem: "丁", position: "year", source: "visibleStem", severity: "FULL" });
const rescue = (): StructureQualitySignal => ({ id: "rescue:month:癸", type: "RESCUE", tenGod: "정인",
  stem: "癸", position: "month", source: "visibleStem", rescuesDamageId: damage().id });
const structure = (options?: { type?: StructureType; damage?: boolean; rescued?: boolean }): StructureResult => {
  const value = structuredClone(baseline.structure);
  const type = options?.type ?? "정관격";
  value.status = "implemented";
  value.primary = { type, source: { branch: "酉", hiddenStem: "辛", hiddenRole: "mainQi",
    tenGod: "정관", tenGodHanja: "正官" }, exposed: false, exposedPositions: [],
    status: "UNEXPOSED", confidence: "LOW", evidence: [] };
  value.qualityEvaluation = { ...value.qualityEvaluation, status: "implemented",
    integrity: options?.rescued ? "RESCUED" : options?.damage ? "DAMAGED" : "CLEAN",
    qualityScore: 50, damageSignals: options?.damage ? [damage()] : [],
    rescueSignals: options?.rescued ? [rescue()] : [], supportSignals: [], mixedSignals: [], evidence: [] };
  return value;
};
const relations = () => { const value = emptyRelations(); value.status = "implemented"; return value; };
const tonggwan = (applicable = false) => { const value = emptyTonggwan(); value.status = "implemented";
  value.applicability = applicable ? "APPLICABLE" : "NOT_APPLICABLE"; return value; };
const run = (values: Partial<Record<Element, number>>, options?: {
  dayStem?: Stem; damage?: boolean; rescued?: boolean; type?: StructureType;
  relation?: boolean; transformed?: boolean; tonggwan?: boolean;
}) => {
  const rel = relations();
  if (options?.relation) rel.heavenlyStems.clashes.push({ id: "STEM_CLASH:year-month", type: "STEM_CLASH",
    members: ["甲", "庚"], positions: ["year", "month"], ruleVersion: "stem-relations-v1",
    rule: "synthetic", exists: true, transformed: null });
  if (options?.transformed) {
    rel.transformation.status = "implemented";
    rel.transformation.evaluations.push({ relationId: "synthetic-transform", relationType: "STEM_COMBINATION",
      state: "TRANSFORMED", targetElement: "earth", factors: [], evidence: [], competingRelations: [],
      blockingRelations: [] } as never);
  }
  return evaluateByeongyakUsefulGod(options?.dayStem ?? "甲", adjusted(values),
    structuredClone(baseline.strength), structure(options), rel, tonggwan(options?.tonggwan));
};

describe("SYNTHETIC_BYEONGYAK_USEFUL_GOD_V1", () => {
  it("A: does not turn a zero-percent element into a disease or medicine", () => {
    expect(run({ wood: 25, fire: 0, earth: 25, metal: 25, water: 25 })).toMatchObject({
      applicability: "NOT_APPLICABLE", diseases: [], medicineCandidates: [], elementPreferences: [] });
  });

  it("B-C: creates an unresolved structure disease and uses the existing rescue category", () => {
    const result = run({ wood: 20, fire: 20, earth: 20, metal: 20, water: 5 }, { damage: true });
    expect(result.diseases[0]).toMatchObject({ type: "STRUCTURE_DAMAGE", state: "ACTIVE",
      structureType: "정관격", damagingTenGod: "상관", severityScore: 30 });
    expect(result.medicineCandidates[0]).toMatchObject({ element: "water", strategy: "STRUCTURE_RESCUE",
      diseaseScore: 30, strategyScore: 10, availabilityAdjustment: 8,
      finalScore: 48, role: "PRIMARY_MEDICINE", state: "NEEDED" });
  });

  it("D: retains a linked rescued disease and lowers unresolved severity", () => {
    const result = run({ wood: 20, fire: 20, earth: 20, metal: 20, water: 5 },
      { damage: true, rescued: true });
    expect(result).toMatchObject({ applicability: "ALREADY_TREATED",
      diseases: [{ state: "ALREADY_RESCUED", severityScore: 10,
        existingRescue: { id: "rescue:month:癸", tenGod: "정인" } }],
      medicineCandidates: [{ finalScore: 28, state: "ALREADY_RESCUED" }] });
  });

  it.each([
    ["정관격", "water"], ["정재격", "metal"], ["편재격", "metal"],
    ["식신격", "earth"], ["상관격", "water"], ["정인격", "wood"], ["편인격", "wood"],
  ] as const)("reuses the structure-rescue source for %s medicine", (type, element) => {
    expect(run({ wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
      { damage: true, type }).medicineCandidates[0].element).toBe(element);
  });

  it("E-G: enforces both 40% dominance and a 15-point gap", () => {
    expect(run({ wood: 40, fire: 25, earth: 15, metal: 10, water: 10 }).diseases[0])
      .toMatchObject({ type: "DOMINANT_ELEMENT_EXCESS", dominantElement: "wood",
        severityLevel: "MODERATE", severityScore: 15, gapPercentagePoints: 15 });
    expect(run({ wood: 39.99, fire: 24.99, earth: 15, metal: 10, water: 10 }).diseases).toEqual([]);
    expect(run({ wood: 45, fire: 35, earth: 10, metal: 5, water: 5 }).diseases).toEqual([]);
  });

  it("H-I: maps 50% to HIGH and 60% to SEVERE", () => {
    expect(run({ wood: 50, fire: 30, earth: 10, metal: 5, water: 5 }).diseases[0])
      .toMatchObject({ severityLevel: "HIGH", severityScore: 25 });
    expect(run({ wood: 60, fire: 30, earth: 5, metal: 3, water: 2 }).diseases[0])
      .toMatchObject({ severityLevel: "SEVERE", severityScore: 35 });
  });

  it.each([
    ["wood", "metal", "fire"], ["fire", "water", "earth"],
    ["earth", "wood", "metal"], ["metal", "fire", "water"],
    ["water", "earth", "wood"],
  ] as const)("J: maps %s excess to CONTROL %s and DRAIN %s", (dominant, control, drain) => {
    expect(BYEONGYAK_EXCESS_MEDICINE_TABLE[dominant]).toEqual({ control, drain });
    const values = Object.fromEntries(elements.map((element) => [element, element === dominant ? 60 :
      element === control ? 5 : element === drain ? 10 : 2.5])) as Record<Element, number>;
    expect(run(values).medicineCandidates.map((row) => ({ strategy: row.strategy, element: row.element })))
      .toEqual([{ strategy: "CONTROL", element: control }, { strategy: "DRAIN", element: drain }]);
  });

  it.each([[9.999, 8], [10, 4], [20, 0], [35, -8], [45, -15]] as const)(
    "K-L: applies medicine availability boundary %s", (percentage, delta) => {
      expect(medicineAvailabilityAdjustment(percentage)).toBe(delta);
    });

  it("M: penalizes an already excessive matched medicine", () => {
    const result = run({ wood: 15, fire: 15, earth: 15, metal: 10, water: 45 }, { damage: true });
    expect(result.medicineCandidates.find((row) => row.strategy === "STRUCTURE_RESCUE"))
      .toMatchObject({ element: "water", availabilityAdjustment: -15 });
  });

  it("N: aggregates the same medicine across diseases with diminishing weights", () => {
    const result = run({ wood: 10, fire: 10, earth: 10, metal: 50, water: 5 }, { damage: true });
    const water = result.elementPreferences.find((row) => row.element === "water")!;
    expect(result.medicineCandidates.filter((row) => row.element === "water")).toHaveLength(2);
    expect(water).toMatchObject({ score: 72, role: "PRIMARY_MEDICINE" });
  });

  it("O-S: relation, tonggwan, strength, johu urgency, and transformation context are not diseases", () => {
    const values = { wood: 25, fire: 0, earth: 25, metal: 25, water: 25 };
    expect(run(values, { relation: true }).diseases).toEqual([]);
    expect(run(values, { tonggwan: true }).diseases).toEqual([]);
    const weak = structuredClone(baseline.strength); weak.score = 5; weak.level = "극약";
    expect(evaluateByeongyakUsefulGod("甲", adjusted(values), weak, structure(), relations(), tonggwan()).diseases)
      .toEqual([]);
    expect(run(values).diseases).toEqual([]); // No johu input is consumed, regardless of urgency.
    expect(run(values, { transformed: true }).diseases).toEqual([]);
  });

  it("T: can detect actual adjusted excess after transformation context", () => {
    const result = run({ wood: 10, fire: 10, earth: 60, metal: 10, water: 10 }, { transformed: true });
    expect(result.diseases[0]).toMatchObject({ type: "DOMINANT_ELEMENT_EXCESS", dominantElement: "earth" });
    expect(result.context.transformedRelationIds).toEqual(["synthetic-transform"]);
  });

  it("supports ten-god category to element conversion for all day-master elements", () => {
    expect(medicineElement("甲", "resource")).toBe("water");
    expect(medicineElement("丙", "resource")).toBe("wood");
    expect(medicineElement("戊", "companion")).toBe("earth");
    expect(medicineElement("庚", "output")).toBe("water");
    expect(medicineElement("壬", "officer")).toBe("earth");
  });

  it("U-Y: leaves prior modules, structure, and strength unchanged", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    const before = structuredClone({ eokbu: result.usefulGods.eokbu, johu: result.usefulGods.johu,
      tonggwan: result.usefulGods.tonggwan, structure: result.structure, strength: result.strength });
    evaluateByeongyakUsefulGod(result.dayMaster, result.fiveElements.adjustedStrength,
      result.strength, result.structure, result.relations, result.usefulGods.tonggwan);
    expect({ eokbu: result.usefulGods.eokbu, johu: result.usefulGods.johu,
      tonggwan: result.usefulGods.tonggwan, structure: result.structure, strength: result.strength }).toEqual(before);
  });

  it("Z: reconstructs every medicine score from evidence deltas", () => {
    for (const candidate of run({ wood: 55, fire: 15, earth: 10, metal: 8, water: 12 }).medicineCandidates)
      expect(candidate.evidence.reduce((sum, row) => sum + row.delta, 0)).toBe(candidate.finalScore);
  });

  it("AA: is deterministic", () => {
    const values = { wood: 55, fire: 15, earth: 10, metal: 8, water: 12 };
    expect(run(values, { damage: true, relation: true })).toEqual(run(values, { damage: true, relation: true }));
  });

  it("AB: integrates byeongyak and leaves structure-useful-god and synthesis pending", () => {
    expect(calculateSaju(SYNTHETIC_INPUT).usefulGods).toMatchObject({
      eokbu: { status: "implemented" }, johu: { status: "implemented" },
      tonggwan: { status: "implemented" }, byeongyak: { status: "implemented" },
      structure: { status: "implemented" }, synthesis: { status: "not_implemented" } });
  });
});
