import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { emptyRelations } from "@/lib/saju/interpretation/relations";
import { classifyTonggwanConflict, evaluateTonggwanUsefulGod,
  tonggwanRole } from "@/lib/saju/interpretation/tonggwan-useful-god";
import { TONGGWAN_BRIDGE_TABLE, TONGGWAN_USEFUL_GOD_V1 } from "@/rules/tonggwan-useful-god.v1";
import type { AdjustedStrengthResult, Element, RelationsResult } from "@/types/saju-analysis";
import type { SpecialStructureResult } from "@/types/special-structure";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
type Strengths = Record<Element, { score: number; percentage: number }>;
const distribution = (values: Partial<Record<Element, number>>): Strengths => Object.fromEntries(
  elements.map((element) => [element, { score: values[element] ?? 0, percentage: values[element] ?? 0 }])) as Strengths;
const adjusted = (values: Partial<Record<Element, number>>, implemented = true): AdjustedStrengthResult => ({
  status: implemented ? "implemented" : "not_implemented", ruleVersion: "adjusted-strength-v1",
  effectRuleVersion: "relation-effects-v1", transferRuleVersion: "transformation-transfer-v1",
  rootDamageRuleVersion: "root-damage-v1", elements: implemented ? Object.fromEntries(elements.map((element) => {
    const percentage = values[element] ?? 0;
    return [element, { nativeScore: percentage, adjustment: 0, adjustedScore: percentage, percentage }];
  })) as AdjustedStrengthResult["elements"] : null, transferLedger: [], rootDamage: [], evidence: [],
});
const special = (qualified = false): SpecialStructureResult => ({
  status: "implemented", ruleVersion: "special-structure-v1", selected: null,
  standardStructurePreserved: true, candidates: qualified ? [{
    type: "FOLLOW_WEALTH", label: "synthetic", ruleVersion: "special-structure-v1",
    state: "QUALIFIED_CANDIDATE", confidence: "HIGH", score: 100,
    requirements: [], requirementsPassed: [], requirementsFailed: [], blockers: [], evidence: [], metadata: {},
  }] : [],
});
const relations = (withClash = false): RelationsResult => {
  const value = emptyRelations(); value.status = "implemented";
  if (withClash) value.heavenlyStems.clashes.push({ id: "STEM_CLASH:year-month", type: "STEM_CLASH",
    members: ["甲", "庚"], positions: ["year", "month"], ruleVersion: "stem-relations-v1",
    rule: "synthetic context only", exists: true, transformed: null });
  return value;
};
const run = (values: Partial<Record<Element, number>>, options?: {
  native?: Partial<Record<Element, number>>; adjustedImplemented?: boolean;
  withClash?: boolean; qualified?: boolean;
}) => evaluateTonggwanUsefulGod(adjusted(values, options?.adjustedImplemented ?? true),
  distribution(options?.native ?? values), relations(options?.withClash), special(options?.qualified));

describe("SYNTHETIC_TONGGWAN_USEFUL_GOD_V1", () => {
  it("stores the five controlling pairs and bridge elements in one versioned table", () => {
    expect(TONGGWAN_BRIDGE_TABLE).toEqual([
      { controller: "wood", controlled: "earth", bridge: "fire" },
      { controller: "earth", controlled: "water", bridge: "metal" },
      { controller: "water", controlled: "fire", bridge: "wood" },
      { controller: "fire", controlled: "metal", bridge: "earth" },
      { controller: "metal", controlled: "wood", bridge: "water" },
    ]);
    expect(TONGGWAN_USEFUL_GOD_V1).toMatchObject({ rulesetVersion: "tonggwan-useful-god-v1",
      conflictRuleVersion: "tonggwan-conflict-v1", bridgeRuleVersion: "tonggwan-bridge-v1" });
  });

  it.each([
    ["A", { wood: 30, earth: 30, fire: 5 }, "fire"],
    ["B", { earth: 30, water: 30, metal: 5 }, "metal"],
    ["C", { water: 30, fire: 30, wood: 5 }, "wood"],
    ["D", { fire: 30, metal: 30, earth: 5 }, "earth"],
    ["E", { metal: 30, wood: 30, water: 5 }, "water"],
  ] as const)("%s: maps a 30/30 conflict to %s bridge", (_label, values, bridge) => {
    const result = run(values);
    expect(result.rankedCandidates[0]).toMatchObject({ bridge, conflictState: "STRONG_CONFLICT",
      bridgeNeed: "HIGH", score: 35, state: "APPLICABLE" });
    expect(result.elementPreferences[0]).toMatchObject({ element: bridge, score: 35, role: "PRIMARY_BRIDGE" });
  });

  it("F/O: lowers an already sufficient or excessive bridge instead of making it primary", () => {
    expect(run({ metal: 30, wood: 30, water: 35 }).rankedCandidates[0]).toMatchObject({
      bridge: "water", bridgePercentage: 35, bridgeNeed: "ALREADY_SUFFICIENT",
      score: 10, state: "ALREADY_SUFFICIENT" });
  });

  it("G: treats 50/8 as one-sided and does not emit a candidate", () => {
    expect(classifyTonggwanConflict(50, 8)).toBe("ONE_SIDED");
    expect(run({ metal: 50, wood: 8, water: 5 })).toMatchObject({
      applicability: "NOT_APPLICABLE", conflicts: [], rankedCandidates: [], elementPreferences: [] });
  });

  it("H: rejects 20/20 when the combined percentage is below 50", () => {
    expect(classifyTonggwanConflict(20, 20)).toBe("NOT_APPLICABLE");
  });

  it("I-J: applies exact balance-ratio boundaries deterministically", () => {
    expect(classifyTonggwanConflict(25, 50)).toBe("STRONG_CONFLICT");
    expect(classifyTonggwanConflict(21, 60)).toBe("CONDITIONAL_CONFLICT");
    expect(classifyTonggwanConflict(20.999, 60)).toBe("ONE_SIDED");
  });

  it.each([
    [9.999, "HIGH", 35, "APPLICABLE"],
    [10, "MEDIUM", 30, "APPLICABLE"],
    [20, "PRESENT", 25, "APPLICABLE"],
    [30, "ALREADY_SUFFICIENT", 10, "ALREADY_SUFFICIENT"],
  ] as const)("K-N: classifies bridge percentage %s", (bridgePercentage, bridgeNeed, score, state) => {
    expect(run({ metal: 30, wood: 30, water: bridgePercentage }).rankedCandidates[0])
      .toMatchObject({ bridgeNeed, score, state });
  });

  it("P: retains multiple simultaneous strong conflicts", () => {
    const result = run({ wood: 25, fire: 5, earth: 25, metal: 20, water: 25 });
    expect(result.rankedCandidates).toHaveLength(2);
    expect(result.rankedCandidates.map((row) => `${row.controller}->${row.controlled}:${row.bridge}`))
      .toEqual(["wood->earth:fire", "earth->water:metal"]);
  });

  it("Q: ranks by score, combined strength, balance, then canonical bridge order", () => {
    const result = run({ wood: 26, fire: 4, earth: 25, metal: 20, water: 25 });
    expect(result.rankedCandidates.map((row) => row.bridge)).toEqual(["fire", "metal"]);
    expect(run({ wood: 25, fire: 5, earth: 25, metal: 20, water: 25 }).rankedCandidates
      .map((row) => row.bridge)).toEqual(["fire", "metal"]);
  });

  it("R-S: relations are zero-delta context and never create applicability", () => {
    expect(run({ metal: 30, wood: 30, water: 5 }).applicability).toBe("APPLICABLE");
    const noStrengthConflict = run({ metal: 50, wood: 8, water: 5 }, { withClash: true });
    expect(noStrengthConflict.applicability).toBe("NOT_APPLICABLE");
    expect(noStrengthConflict.explicitRelations).toEqual(["STEM_CLASH:year-month"]);
  });

  it("T: prefers adjusted strength over a contradictory native distribution", () => {
    const result = run({ metal: 30, wood: 30, water: 5 },
      { native: { wood: 5, fire: 5, earth: 5, metal: 80, water: 5 } });
    expect(result.strengthSource).toBe("adjusted");
    expect(result.rankedCandidates[0].bridge).toBe("water");
  });

  it("U: falls back to native strength when adjusted strength is unavailable", () => {
    const result = run({}, { adjustedImplemented: false,
      native: { metal: 30, wood: 30, water: 5 } });
    expect(result.strengthSource).toBe("native");
    expect(result.rankedCandidates[0]).toMatchObject({ bridge: "water", score: 35 });
  });

  it("V-X: does not mutate eokbu, johu, strength, or structure", () => {
    const calculated = calculateSaju(SYNTHETIC_INPUT);
    const before = structuredClone({ eokbu: calculated.usefulGods.eokbu,
      johu: calculated.usefulGods.johu, strength: calculated.strength, structure: calculated.structure });
    evaluateTonggwanUsefulGod(calculated.fiveElements.adjustedStrength,
      calculated.fiveElements.nativeStrength, calculated.relations, calculated.structure.specialStructure);
    expect({ eokbu: calculated.usefulGods.eokbu, johu: calculated.usefulGods.johu,
      strength: calculated.strength, structure: calculated.structure }).toEqual(before);
  });

  it("Y: qualified special structure adds caution without changing the score", () => {
    const normal = run({ metal: 30, wood: 30, water: 5 });
    const caution = run({ metal: 30, wood: 30, water: 5 }, { qualified: true });
    expect(caution).toMatchObject({ applicabilityCaution: true, confidence: "LOW" });
    expect(caution.rankedCandidates[0].score).toBe(normal.rankedCandidates[0].score);
  });

  it("Z: reconstructs every candidate score from evidence deltas", () => {
    const candidate = run({ metal: 30, wood: 30, water: 5 }, { withClash: true }).rankedCandidates[0];
    expect(candidate.evidence.reduce((sum, item) => sum + item.delta, 0)).toBe(candidate.score);
  });

  it("AA: returns identical output for identical input", () => {
    const first = run({ wood: 25, fire: 5, earth: 25, metal: 20, water: 25 }, { withClash: true });
    expect(run({ wood: 25, fire: 5, earth: 25, metal: 20, water: 25 }, { withClash: true })).toEqual(first);
  });

  it("AB: integrates only tonggwan while later useful-god modules remain pending", () => {
    expect(calculateSaju(SYNTHETIC_INPUT).usefulGods).toMatchObject({ status: "partial",
      eokbu: { status: "implemented" }, johu: { status: "implemented" },
      tonggwan: { status: "implemented" }, byeongyak: { status: "not_implemented" },
      structure: { status: "not_implemented" }, synthesis: { status: "not_implemented" } });
  });

  it.each([[30, "PRIMARY_BRIDGE"], [29, "STRONG_BRIDGE"], [19, "CONDITIONAL_BRIDGE"],
    [9, "LOW_NEED"], [0, "NOT_NEEDED"]] as const)("maps score %s to %s", (score, role) => {
    expect(tonggwanRole(score)).toBe(role);
  });
});
