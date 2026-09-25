import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { normalizeSignal, synthesisRole, synthesizeUsefulGods } from "@/lib/saju/interpretation/useful-god-synthesis";
import { USEFUL_GOD_SYNTHESIS_V1 as RULE } from "@/rules/useful-god-synthesis.v1";
import type { Element } from "@/types/saju-analysis";
import type { SynthesisEngine, UsefulGodsResult } from "@/types/useful-gods";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const fixture = (): UsefulGodsResult => structuredClone(calculateSaju(SYNTHETIC_INPUT).usefulGods);
const set = (input: UsefulGodsResult, element: Element, scores: Partial<Record<SynthesisEngine, number>>) => {
  input.eokbu.elements = scores.eokbu === undefined ? [] : [{ ...input.eokbu.elements[0], element, finalScore: scores.eokbu }];
  input.structure.elementPreferences = scores.structure === undefined ? [] : [{ element, score: scores.structure, role: "STRONG_STRUCTURE" }];
  input.johu.elementPreferences = scores.johu === undefined ? [] : [{ element, score: scores.johu, contributingStems: [] }];
  input.tonggwan.elementPreferences = scores.tonggwan === undefined ? [] : [{ element, score: scores.tonggwan, role: "STRONG_BRIDGE", candidateIndexes: [], evidence: [] }];
  input.byeongyak.elementPreferences = scores.byeongyak === undefined ? [] : [{ element, score: scores.byeongyak, role: "STRONG_MEDICINE", candidateIndexes: [], evidence: [] }];
  input.structure.applicability = "STANDARD"; input.tonggwan.applicability = "APPLICABLE";
  input.byeongyak.applicability = "APPLICABLE";
};
const water = (input: UsefulGodsResult) => synthesizeUsefulGods(input).elements.find(row => row.element === "water")!;

describe("SYNTHETIC_USEFUL_GOD_SYNTHESIS_V1", () => {
  it("A-L: keeps versioned weights and normalizes each engine at its boundaries", () => {
    expect(Object.values(RULE.baseWeights).reduce((a, b) => a + b, 0)).toBe(1);
    for (const [engine, points] of Object.entries({
      eokbu: [[-40, 0], [-20, 25], [0, 50], [20, 75], [40, 100]],
      johu: [[-15, 0], [0, 50], [10, 60], [20, 70], [40, 90], [50, 100]],
      tonggwan: [[0, 50], [17.5, 75], [35, 100]],
      byeongyak: [[0, 50], [60, 100]], structure: [[0, 50], [15, 65], [50, 100]]
    }) as Array<[SynthesisEngine, number[][]]>)
      for (const [raw, normalized] of points) expect(normalizeSignal(engine, raw)).toBeCloseTo(normalized);
  });
  it("B-D, M-N, X-Y: excludes inapplicable engines and missing element signals", () => {
    const input = fixture(); set(input, "water", { eokbu: 20, johu: 20, tonggwan: 35 });
    input.byeongyak.applicability = "NOT_APPLICABLE";
    const result = synthesizeUsefulGods(input), row = result.elements.find(r => r.element === "water")!;
    expect(result.effectiveEngineWeights.byeongyak).toBe(0);
    expect(row.coverage.engines).toEqual(["eokbu", "johu", "tonggwan"]);
    const expected = row.engineSignals.reduce((sum, signal) => sum + signal.normalizedScore * signal.effectiveWeight, 0) /
      row.coverage.effectiveWeight;
    expect(row.baseSynthesisScore).toBeCloseTo(expected);
    expect(result.elements.find(r => r.element === "fire")?.engineSignals).toEqual([]);
    expect(result.elements.find(r => r.element === "fire")?.score).toBe(50);
  });
  it("E-G: applies confidence, four urgency factors, and both special structure cautions", () => {
    const input = fixture(); set(input, "water", { eokbu: 10, structure: 20, johu: 20, tonggwan: 20 });
    for (const level of ["HIGH", "MEDIUM", "LOW"] as const) {
      input.structure.confidence = level; if (level !== "HIGH") input.tonggwan.confidence = level;
      expect(synthesizeUsefulGods(input).effectiveEngineWeights.structure).toBeCloseTo(0.25 * RULE.confidenceFactors[level]);
      if (level !== "HIGH") expect(synthesizeUsefulGods(input).effectiveEngineWeights.tonggwan).toBeCloseTo(0.10 * RULE.confidenceFactors[level]);
    }
    for (const urgency of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
      input.johu.urgency = urgency;
      expect(synthesizeUsefulGods(input).effectiveEngineWeights.johu).toBeCloseTo(0.20 * RULE.johuUrgencyFactors[urgency]);
    }
    input.eokbu.specialCandidates = [{ type: input.eokbu.specialCandidates[0].type, state: "QUALIFIED_CANDIDATE" }];
    expect(synthesizeUsefulGods(input).effectiveEngineWeights.eokbu).toBeCloseTo(0.30 * 0.85 * 0.60);
    input.eokbu.specialCandidates[0].state = "CONDITIONAL";
    expect(synthesizeUsefulGods(input).effectiveEngineWeights.eokbu).toBeCloseTo(0.30 * 0.85 * 0.80);
    input.eokbu.specialCandidates[0].state = "REJECTED";
    expect(synthesizeUsefulGods(input).effectiveEngineWeights.eokbu).toBeCloseTo(0.30 * 0.85);
  });
  it("O: coverage thresholds use the original full weight budget", () => {
    const input = fixture(); set(input, "water", { eokbu: 0 });
    expect(water(input).confidence).toBe("LOW");
    set(input, "water", { eokbu: 0, structure: 0 });
    expect(water(input).confidence).toBe("MEDIUM");
    set(input, "water", { eokbu: 0, structure: 0, johu: 0 });
    input.eokbu.confidence = "MEDIUM"; input.structure.confidence = "HIGH";
    expect(water(input).confidence).toBe("HIGH");
  });
  it("P-S: consensus and conflict preserve both directions and all deltas", () => {
    const input = fixture(); set(input, "water", { eokbu: 20, structure: 25 });
    expect(water(input).consensusBonus).toBe(3);
    set(input, "water", { eokbu: 20, structure: 25, johu: 20 });
    expect(water(input).consensusBonus).toBe(5);
    set(input, "water", { eokbu: -20, structure: 25, johu: 20 });
    const row = water(input);
    expect(row.conflictPenalty).toBe(-3); expect(row.conflictingSignals).toBe(true);
    expect(row.engineSignals.map(s => [s.engine, s.rawScore])).toContainEqual(["eokbu", -20]);
    expect(row.engineSignals.map(s => [s.engine, s.rawScore])).toContainEqual(["structure", 25]);
    expect(row.score).toBeCloseTo(row.baseSynthesisScore + row.consensusBonus + row.conflictPenalty);
  });
  it("T-W, V: role boundaries, no forced primary, multiple primaries and highest below primary", () => {
    for (const [score, role] of [[34.999,"UNFAVORABLE"],[35,"NEUTRAL"],[44.999,"NEUTRAL"],
      [45,"CONDITIONAL"],[59.999,"CONDITIONAL"],[60,"FAVORABLE"],[69.999,"FAVORABLE"],
      [70,"SECONDARY"],[79.999,"SECONDARY"],[80,"PRIMARY"]] as const)
      expect(synthesisRole(score)).toBe(role);
    const input = fixture(); set(input, "water", { eokbu: 20 });
    expect(synthesizeUsefulGods(input).primaryElements).toEqual([]);
    expect(synthesizeUsefulGods(input).highestElement).toBe("water");
    input.johu.elementPreferences.push({ element: "fire", score: 50, contributingStems: [] });
    input.tonggwan.elementPreferences.push({ element: "fire", score: 35, role: "STRONG_BRIDGE", candidateIndexes: [], evidence: [] });
    input.eokbu.elements.push({ ...input.eokbu.elements[0], element: "fire", finalScore: 40 });
    input.eokbu.elements[0].finalScore = 40;
    input.structure.elementPreferences = [{ element: "water", score: 50, role: "PRIMARY_STRUCTURE" },
      { element: "fire", score: 50, role: "PRIMARY_STRUCTURE" }];
    input.johu.elementPreferences.push({ element: "water", score: 50, contributingStems: [] });
    input.tonggwan.elementPreferences.push({ element: "water", score: 35, role: "STRONG_BRIDGE", candidateIndexes: [], evidence: [] });
    expect(synthesizeUsefulGods(input).primaryElements).toEqual(["fire", "water"]);
  });
  it("Z-AH, AJ: is deterministic, immutable, traceable, integrated", () => {
    const input = fixture(), before = structuredClone(input);
    const first = synthesizeUsefulGods(input);
    expect(synthesizeUsefulGods(input)).toEqual(first); expect(input).toEqual(before);
    expect(input.status).toBe("implemented"); expect(first.status).toBe("implemented");
    for (const row of first.elements) {
      const weight = row.engineSignals.reduce((sum, s) => sum + s.effectiveWeight, 0);
      expect(row.baseSynthesisScore).toBeCloseTo(weight ? row.engineSignals.reduce((sum, s) => sum + s.normalizedScore * s.effectiveWeight, 0) / weight : 50);
      expect(row.score).toBeCloseTo(Math.max(0, Math.min(100, row.baseSynthesisScore + row.consensusBonus + row.conflictPenalty)));
    }
    expect(first.stemPreferences).toEqual(input.johu.stemPreferences);
  });
});
