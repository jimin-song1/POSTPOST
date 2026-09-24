import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { assessRootDamage, calculateAdjustedStrength } from "@/lib/saju/fiveElements/relation-effects";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateStrength } from "@/lib/saju/interpretation/strength";
import { evaluateStructure } from "@/lib/saju/interpretation/structure";
import { evaluateSpecialStructure } from "@/lib/saju/interpretation/special-structure";
import { evaluateAdjustedDayMasterStrength } from "@/lib/saju/interpretation/adjusted-daymaster-strength";
import { evaluateEokbuUsefulGod } from "@/lib/saju/interpretation/eokbu-useful-god";
import { evaluateJohuUsefulGod } from "@/lib/saju/interpretation/johu-useful-god";
import { evaluateTonggwanUsefulGod } from "@/lib/saju/interpretation/tonggwan-useful-god";
import { evaluateTransformation } from "@/lib/saju/interpretation/transformation";
import type { Branch, Element, PillarPosition, Stem, TransformationState } from "@/types/saju-analysis";
import type { SpecialStructureType } from "@/types/special-structure";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
function fixture(stems: [Stem, Stem, Stem, Stem] = ["庚", "丙", "甲", "戊"],
  branches: [Branch, Branch, Branch, Branch] = ["申", "午", "酉", "丑"]) {
  const pillars = Object.fromEntries(positions.map((position, i) => [position,
    { position, stem: stems[i], branch: branches[i], hanja: null, korean: null }])) as ReturnType<typeof calculateSaju>["pillars"];
  const hidden = Object.fromEntries(positions.map((position) => [position,
    getHiddenStems(pillars[position].branch!, pillars.day.stem!)])) as Parameters<typeof calculateNativeStrength>[1];
  const native = calculateNativeStrength(pillars, hidden);
  const relations = detectRelations(pillars);
  relations.transformation = evaluateTransformation(relations, pillars, hidden, native.nativeStrength);
  const strength = calculateStrength(pillars, hidden, native.evidence);
  const adjusted = calculateAdjustedStrength(native, relations, strength);
  const rootDamage = assessRootDamage(strength, relations);
  strength.adjustments = { ...strength.adjustments, status: "partial",
    originalRootingScore: strength.rooting!.score, ...rootDamage };
  const run = () => evaluateSpecialStructure(pillars, strength, adjusted, relations);
  const candidate = (type: SpecialStructureType) => run().candidates.find((row) => row.type === type)!;
  // Controlled upstream outputs isolate eligibility boundaries; no personal birth data.
  const percentages = (values: [number, number, number, number, number]) => {
    elements.forEach((element, i) => { adjusted.elements![element].percentage = values[i]; });
  };
  const weak = (target: "earth" | "metal" | "fire" = "earth") => {
    strength.score = 22;
    percentages(elements.map((element) => element === target ? 60 : 10) as [number, number, number, number, number]);
  };
  return { pillars, hidden, native, relations, strength, adjusted, run, candidate, percentages, weak };
}
function transformed(state: TransformationState = "TRANSFORMED") {
  const value = fixture(["己", "丙", "甲", "庚"]);
  value.weak();
  const combination = value.relations.heavenlyStems.combinations.find((row) => row.positions.includes("day"))!;
  const evaluation = value.relations.transformation.evaluations.find((row) => row.relationId === combination.id)!;
  Object.assign(evaluation, { state, targetElement: "earth", competingRelations: [], blockingRelations: [], factors: [], evidence: [] });
  return { ...value, evaluation };
}

describe("SYNTHETIC_SPECIAL_STRUCTURE_V1 — independent upstream factors", () => {
  it.each([
    ["FOLLOW_WEALTH", "earth"], ["FOLLOW_OFFICER", "metal"], ["FOLLOW_OUTPUT", "fire"],
  ] as const)("qualifies %s with extreme weakness, no roots or visible support, 60%% target", (type, target) => {
    const value = fixture(); value.weak(target);
    expect(value.candidate(type)).toMatchObject({ state: "QUALIFIED_CANDIDATE", requirementsFailed: [], blockers: [] });
  });
  it("A: rejects extreme weakness with a strong surviving root and retains every blocker", () => {
    const value = fixture(["乙", "壬", "甲", "戊"], ["寅", "午", "卯", "丑"]); value.weak();
    value.percentages([10, 0, 60, 10, 20]);
    const result = value.candidate("FOLLOW_WEALTH");
    expect(result.state).toBe("REJECTED");
    expect(result.blockers.map((row) => row.code)).toEqual(expect.arrayContaining([
      "STRONG_DAYMASTER_ROOT", "VISIBLE_COMPANION_SUPPORT", "VISIBLE_RESOURCE_SUPPORT",
      "RESOURCE_DOMINANCE", "ADJUSTED_ROOTING_TOO_HIGH",
    ]));
    expect(result.blockers.find((row) => row.code === "STRONG_DAYMASTER_ROOT")?.details)
      .toMatchObject({ pillar: "year", branch: "寅", adjustedRootScore: 8 });
  });
  it("E: rejects score 35 even with strong target dominance", () => {
    const value = fixture(); value.weak(); value.strength.score = 35;
    expect(value.candidate("FOLLOW_WEALTH")).toMatchObject({ state: "REJECTED", requirementsFailed: ["DAYMASTER_EXTREMELY_WEAK"] });
  });
  it("F: rejects 30% same/resource support", () => {
    const value = fixture(); value.weak(); value.percentages([15, 5, 60, 5, 15]);
    expect(value.candidate("FOLLOW_WEALTH").state).toBe("REJECTED");
  });
  it.each([27, 28])("enforces the exact strength boundary at %s", (score) => {
    const value = fixture(); value.weak(); value.strength.score = score;
    expect(value.candidate("FOLLOW_WEALTH").state).toBe(score === 27 ? "QUALIFIED_CANDIDATE" : "REJECTED");
  });
  it.each([44.99, 45, 49.99, 50])("separates target boundary and eligibility at %s%%", (percentage) => {
    const value = fixture(); value.weak(); value.percentages([10, (80 - percentage) / 2, percentage, (80 - percentage) / 2, 10]);
    expect(value.candidate("FOLLOW_WEALTH").state).toBe(percentage >= 50 ? "QUALIFIED_CANDIDATE" : percentage >= 45 ? "CONDITIONAL" : "REJECTED");
  });
  it("records competing opposing dominances", () => {
    const value = fixture(); value.weak(); value.percentages([0, 0, 50, 50, 0]);
    expect(value.candidate("FOLLOW_WEALTH").blockers.map((row) => row.code)).toContain("MULTIPLE_COMPETING_DOMINANCES");
  });
  it("visible companion and resource support each prevent qualification", () => {
    for (const stem of ["乙", "壬", "癸"] as const) {
      const value = fixture([stem, "丙", "甲", "戊"]); value.weak("fire");
      expect(value.candidate("FOLLOW_OUTPUT").state).toBe("REJECTED");
    }
  });
  it("records officer mixture without rejecting solely for mixture", () => {
    const value = fixture(["庚", "辛", "甲", "戊"]); value.weak("metal");
    expect(value.candidate("FOLLOW_OFFICER")).toMatchObject({ state: "QUALIFIED_CANDIDATE", metadata: { officerMixed: true } });
  });
  it("G: qualifies extreme strength with 80% self/resource and no substantial opposition", () => {
    const value = fixture(); value.strength.score = 90; value.percentages([60, 7, 7, 6, 20]);
    expect(value.candidate("DOMINANT_SELF").state).toBe("QUALIFIED_CANDIDATE");
  });
  it("H: rejects strong multiple opposition categories despite extreme strength", () => {
    const value = fixture(); value.strength.score = 90; value.percentages([40, 0, 25, 25, 10]);
    expect(value.candidate("DOMINANT_SELF").state).toBe("REJECTED");
    expect(value.candidate("DOMINANT_SELF").blockers.map((row) => row.code)).toEqual([
      "STRONG_OFFICER_OPPOSITION", "STRONG_WEALTH_OPPOSITION", "MULTIPLE_OPPOSITION_CATEGORIES",
    ]);
  });
  it("uses rooted visible support for 73-85 strength and keeps a borderline opposition conditional", () => {
    const value = fixture(["乙", "壬", "甲", "癸"], ["寅", "卯", "子", "丑"]);
    value.strength.score = 73; value.percentages([60, 7, 7, 6, 20]);
    expect(value.candidate("DOMINANT_SELF").state).toBe("QUALIFIED_CANDIDATE");
    value.percentages([60, 10, 5, 5, 20]);
    expect(value.candidate("DOMINANT_SELF").state).toBe("CONDITIONAL");
    value.strength.score = 72;
    expect(value.candidate("DOMINANT_SELF").state).toBe("REJECTED");
  });
  it("cannot qualify score 73 without both strong rooting and visible support", () => {
    const value = fixture(); value.strength.score = 73; value.percentages([60, 7, 7, 6, 20]);
    expect(value.candidate("DOMINANT_SELF").state).toBe("CONDITIONAL");
  });
  it.each(["COMBINATION_ONLY", "PARTIAL", "WEAK"] as const)("I: rejects upstream %s regardless of target strength", (state) => {
    expect(transformed(state).candidate("TRANSFORMED_QI_STRUCTURE").state).toBe("REJECTED");
  });
  it("J: qualifies only an upstream TRANSFORMED day-master relation", () => {
    expect(transformed().candidate("TRANSFORMED_QI_STRUCTURE")).toMatchObject({ state: "QUALIFIED_CANDIDATE", requirementsFailed: [] });
  });
  it("K: rejects TRANSFORMED with strong original-element roots", () => {
    const value = transformed();
    value.strength.adjustments.adjustedRootingScore = 8;
    value.strength.rooting!.roots.push({ pillar: "day", branch: "寅", hiddenStem: "甲", role: "mainQi", score: 8, appliedScore: 8 });
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe("REJECTED");
  });
  it("L: makes one interaction conditional, multiple severe interactions rejected", () => {
    const value = transformed(); value.evaluation.competingRelations = ["synthetic:competition"];
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe("CONDITIONAL");
    value.evaluation.blockingRelations = ["synthetic:blocking"];
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe("REJECTED");
  });
  it.each([
    [45, 35, "QUALIFIED_CANDIDATE"], [45, 36, "CONDITIONAL"], [45, 45, "REJECTED"],
    [40, 30, "CONDITIONAL"], [39, 30, "REJECTED"],
  ] as const)("enforces transformed target %s and runner-up %s", (target, second, state) => {
    const value = transformed(); value.percentages([0, second, target, 100 - target - second, 0]);
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe(state);
  });
  it("uses surviving adjusted roots, not the original root score", () => {
    const value = transformed();
    value.strength.rooting!.roots = [{ pillar: "day", branch: "亥", hiddenStem: "甲", role: "middleQi", score: 5, appliedScore: 5 }];
    value.strength.rooting!.rawScore = 5; value.strength.rooting!.score = 5;
    value.strength.adjustments.adjustedRootingScore = 2.5;
    value.adjusted.rootDamage = [{ rootId: "root:day:middleQi:甲", pillar: "day", branch: "亥", hiddenStem: "甲", role: "middleQi",
      originalRootScore: 5, damageRatio: 0.5, damagedAmount: 2.5, remainingRootScore: 2.5, causedByRelationIds: ["synthetic:clash"] }];
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe("QUALIFIED_CANDIDATE");
  });
  it.each([3, 3.01])("uses upstream adjusted rooting independently at %s", (score) => {
    const value = transformed(); value.strength.adjustments.adjustedRootingScore = score;
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe(score === 3 ? "QUALIFIED_CANDIDATE" : "REJECTED");
  });
  it("does not replace adjusted dominance with native dominance", () => {
    const value = fixture(); value.weak();
    value.adjusted.elements!.earth.nativeScore = 0;
    value.adjusted.elements!.water.nativeScore = 1000;
    expect(value.candidate("FOLLOW_WEALTH").state).toBe("QUALIFIED_CANDIDATE");
  });
  it("does not reuse a transformed relation that excludes the day master", () => {
    const value = fixture(["乙", "庚", "甲", "戊"]);
    value.relations.transformation.evaluations.forEach((row) => { row.state = "TRANSFORMED"; });
    expect(value.candidate("TRANSFORMED_QI_STRUCTURE").state).toBe("NOT_APPLICABLE");
  });
  it("retains separate candidates for competing day-master combinations", () => {
    const value = fixture(["己", "己", "甲", "庚"]);
    const result = value.run().candidates.filter((row) => row.type === "TRANSFORMED_QI_STRUCTURE");
    expect(result).toHaveLength(2);
    expect(new Set(result.map((row) => row.metadata.relationId)).size).toBe(2);
  });
  it("M-Q: preserves primary and every upstream input, and is deterministic", () => {
    const value = transformed();
    const before = structuredClone({ pillars: value.pillars, native: value.native, strength: value.strength,
      adjusted: value.adjusted, relations: value.relations });
    const result = evaluateStructure(value.pillars, value.hidden, value.strength, value.adjusted, value.relations);
    expect(result.specialStructure.selected).toBeNull();
    expect(result.specialStructure.standardStructurePreserved).toBe(true);
    expect(result.primary?.type).toBe("상관격");
    const expectedPrimary = structuredClone(result.primary);
    value.evaluation.state = "COMBINATION_ONLY";
    expect(evaluateStructure(value.pillars, value.hidden, value.strength, value.adjusted, value.relations).primary).toEqual(expectedPrimary);
    value.evaluation.state = "TRANSFORMED";
    expect({ pillars: value.pillars, native: value.native, strength: value.strength,
      adjusted: value.adjusted, relations: value.relations }).toEqual(before);
    expect(value.run()).toEqual(value.run());
    expect(value.strength.adjustments.adjustedScore).toBeNull();
  });
  it("R: reconstructs every candidate's score and decision from emitted requirements and blockers", () => {
    for (const value of [fixture(), transformed(), transformed("COMBINATION_ONLY")]) {
      for (const row of value.run().candidates) {
        expect(row.score).toBe(row.evidence.reduce((sum, evidence) => sum + evidence.delta, 0));
        expect(row.requirementsPassed).toEqual(row.requirements.filter((r) => r.passed).map((r) => r.requirement));
        expect(row.requirementsFailed).toEqual(row.requirements.filter((r) => !r.passed).map((r) => r.requirement));
        const failed = row.requirements.filter((r) => !r.passed);
        const applicable = row.type !== "TRANSFORMED_QI_STRUCTURE" || row.metadata.relationId !== null;
        const reconstructed = !applicable ? "NOT_APPLICABLE" : failed.some((r) => r.critical) ||
          row.blockers.some((b) => b.severity === "HARD") || failed.length > 1 ? "REJECTED" :
          failed.length || row.blockers.length ? "CONDITIONAL" : "QUALIFIED_CANDIDATE";
        expect(row.state).toBe(reconstructed);
        expect(row.evidence[0].details).toHaveProperty("nativeStrength");
      }
    }
  });
  it("S: integrates special structures and leaves useful gods unimplemented", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.structure.specialStructure.status).toBe("implemented");
    expect(result.usefulGods.status).toBe("partial");
    expect(calculateSaju({ ...SYNTHETIC_INPUT, birthTimeKnown: false }).structure.specialStructure.status).toBe("not_implemented");
  });
  it("preserves the pure 乙亥/乙酉/甲子/戊辰 regression end to end", () => {
    const value = fixture(["乙", "乙", "甲", "戊"], ["亥", "酉", "子", "辰"]);
    const result = evaluateStructure(value.pillars, value.hidden, value.strength, value.adjusted, value.relations);
    expect(value.strength).toMatchObject({ score: 49, level: "중화신약" });
    expect(result.primary).toMatchObject({ type: "정관격", status: "UNEXPOSED" });
    expect(result.qualityEvaluation).toMatchObject({ integrity: "SUPPORTED", qualityScore: 58 });
    expect(result.specialStructure.candidates.map((row) => row.state)).toEqual([
      "REJECTED", "REJECTED", "REJECTED", "REJECTED", "NOT_APPLICABLE",
    ]);
    value.strength.adjusted = evaluateAdjustedDayMasterStrength(value.strength, value.native.nativeStrength, value.adjusted);
    expect(value.strength.adjusted)
      .toMatchObject({ originalScore: 49, originalLevel: "중화신약",
        score: 48.56864702945582, level: "중화신약" });
    expect(evaluateEokbuUsefulGod(value.strength, value.adjusted, result.specialStructure).eokbu)
      .toMatchObject({ strengthSource: "adjusted", applicability: "STANDARD",
        primaryElements: [], supportiveElements: ["water"], conditionalElements: ["wood"],
        neutralElements: ["fire"], unfavorableElements: ["earth", "metal"],
        elements: [
          { element: "water", finalScore: 15, role: "SUPPORTIVE" },
          { element: "wood", finalScore: 12, role: "CONDITIONAL" },
          { element: "fire", finalScore: -3, role: "NEUTRAL" },
          { element: "earth", finalScore: -7, role: "UNFAVORABLE" },
          { element: "metal", finalScore: -12, role: "UNFAVORABLE" },
        ] });
    expect(evaluateJohuUsefulGod(value.pillars, value.hidden, value.adjusted, value.relations))
      .toMatchObject({ status: "implemented", dayStem: "甲", monthBranch: "酉",
        stemPreferences: [
          { stem: "丁", preferenceRank: 1, preferenceScore: 30 },
          { stem: "丙", preferenceRank: 2, preferenceScore: 20 },
          { stem: "庚", preferenceRank: 3, preferenceScore: 10 },
        ],
        elementPreferences: [
          { element: "fire", score: 40, contributingStems: ["丁", "丙"] },
          { element: "metal", score: 10, contributingStems: ["庚"] },
        ] });
    expect(evaluateTonggwanUsefulGod(value.adjusted, value.native.nativeStrength,
      value.relations, result.specialStructure)).toMatchObject({
        status: "implemented", strengthSource: "adjusted", applicability: "APPLICABLE",
        conflicts: [{ controller: "metal", controlled: "wood", bridge: "water",
          conflictState: "STRONG_CONFLICT" }],
        rankedCandidates: [{ controller: "metal", controlled: "wood", bridge: "water",
          conflictState: "STRONG_CONFLICT", bridgeNeed: "PRESENT", score: 25, state: "APPLICABLE" }],
        elementPreferences: [{ element: "water", score: 25, role: "STRONG_BRIDGE" }],
      });
  });
});
