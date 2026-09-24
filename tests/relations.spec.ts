import { describe, expect, it } from "vitest";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateSaju } from "@/lib/saju/engine";
import { STEM_RELATIONS_V1 } from "@/rules/stem-relations.v1";
import { BRANCH_RELATIONS_V1 } from "@/rules/branch-relations.v1";
import { PUNISHMENT_V1 } from "@/rules/punishment.v1";
import { EARTHLY_BRANCHES } from "@/rules/ganzhi.v1";
import type { Branch, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const synthetic = (stems: [Stem, Stem, Stem, Stem], branches: [Branch, Branch, Branch, Branch]) =>
  detectRelations(Object.fromEntries(positions.map((position, index) => [position,
    { position, stem: stems[index], branch: branches[index], hanja: null, korean: null }])) as Parameters<typeof detectRelations>[0]);
const stemPair = (day: Stem, hour: Stem) => synthetic(["壬", "甲", day, hour], ["子", "寅", "酉", "午"]);
const branchPair = (day: Branch, hour: Branch) => synthetic(["甲", "丙", "庚", "壬"], ["子", "寅", day, hour]);
const forPositions = <T extends { positions: PillarPosition[] }>(rows: T[], a: PillarPosition, b: PillarPosition) =>
  rows.filter((row) => row.positions.join("-") === `${a}-${b}`);

describe("SYNTHETIC_RELATIONS_V1 — versioned pair tables", () => {
  it.each([
    ["甲", "己", "earth"], ["乙", "庚", "metal"], ["丙", "辛", "water"],
    ["丁", "壬", "wood"], ["戊", "癸", "fire"]
  ] as const)("detects stem combination %s%s → %s without transformation", (a, b, targetElement) => {
    const entries = forPositions(stemPair(a, b).heavenlyStems.combinations, "day", "hour");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ members: [a, b], targetElement, exists: true, transformed: null,
      ruleVersion: "stem-relations-v1" });
  });
  it.each([["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]] as const)(
    "detects stem clash %s%s", (a, b) => {
      expect(forPositions(stemPair(a, b).heavenlyStems.clashes, "day", "hour"))
        .toMatchObject([{ members: [a, b], type: "STEM_CLASH" }]);
    }
  );
  it.each([
    ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]
  ] as const)("detects six combination %s%s", (a, b) => {
    expect(forPositions(branchPair(a, b).earthlyBranches.sixCombinations, "day", "hour"))
      .toMatchObject([{ members: [a, b], transformed: null, type: "SIX_COMBINATION" }]);
  });
  it.each([
    ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]
  ] as const)("detects branch clash %s%s", (a, b) => {
    expect(forPositions(branchPair(a, b).earthlyBranches.clashes, "day", "hour"))
      .toMatchObject([{ members: [a, b], type: "BRANCH_CLASH" }]);
  });
  it.each([
    ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]
  ] as const)("detects harm %s%s", (a, b) => {
    expect(forPositions(branchPair(a, b).earthlyBranches.harms, "day", "hour"))
      .toMatchObject([{ members: [a, b], type: "BRANCH_HARM" }]);
  });
  it.each([
    ["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]
  ] as const)("detects break %s%s", (a, b) => {
    expect(forPositions(branchPair(a, b).earthlyBranches.breaks, "day", "hour"))
      .toMatchObject([{ members: [a, b], type: "BRANCH_BREAK" }]);
  });
  it.each([
    ["子", "未"], ["丑", "午"], ["寅", "酉"], ["卯", "申"], ["辰", "亥"], ["巳", "戌"]
  ] as const)("detects wonjin %s%s", (a, b) => {
    expect(forPositions(branchPair(a, b).earthlyBranches.wonjin, "day", "hour"))
      .toMatchObject([{ members: [a, b], type: "WONJIN" }]);
  });
  it("keeps ordered tables explicitly versioned and complete", () => {
    expect(STEM_RELATIONS_V1.combinations).toHaveLength(5);
    expect(STEM_RELATIONS_V1.clashes).toHaveLength(4);
    for (const key of ["sixCombinations", "clashes", "breaks", "harms", "wonjin"] as const)
      expect(BRANCH_RELATIONS_V1[key]).toHaveLength(6);
  });
});

describe("SYNTHETIC_RELATIONS_V1 — groups and position identity", () => {
  it.each(BRANCH_RELATIONS_V1.threeHarmonies)("three harmony $rule detects complete and partial", ({ group, targetElement }) => {
    const outsider = EARTHLY_BRANCHES.find((branch) => !group.includes(branch as never))!;
    const full = synthetic(["甲", "丙", "庚", "壬"], [...group, outsider]).earthlyBranches.threeHarmonies
      .filter((item) => item.group.join("") === group.join(""));
    expect(full).toMatchObject([{ complete: true, partial: false, targetElement,
      present: group, positions: ["year", "month", "day"], transformed: null }]);
    const partial = synthetic(["甲", "丙", "庚", "壬"], [group[0], group[1], outsider, outsider])
      .earthlyBranches.threeHarmonies.filter((item) => item.group.join("") === group.join(""));
    expect(partial).toMatchObject([{ complete: false, partial: true, present: group.slice(0, 2),
      positions: ["year", "month"], transformed: null }]);
  });
  it.each(BRANCH_RELATIONS_V1.directionalCombinations)("directional group $rule detects complete and partial", ({ group, targetElement }) => {
    const outsider = EARTHLY_BRANCHES.find((branch) => !group.includes(branch as never))!;
    const full = synthetic(["甲", "丙", "庚", "壬"], [...group, outsider]).earthlyBranches.directionalCombinations
      .filter((item) => item.group.join("") === group.join(""));
    expect(full).toMatchObject([{ complete: true, partial: false, targetElement, present: group }]);
    const partial = synthetic(["甲", "丙", "庚", "壬"], [group[0], group[1], outsider, outsider])
      .earthlyBranches.directionalCombinations.filter((item) => item.group.join("") === group.join(""));
    expect(partial).toMatchObject([{ complete: false, partial: true, present: group.slice(0, 2) }]);
  });
  it.each(PUNISHMENT_V1.three)("POSTPOST punishment $rule distinguishes partial and complete", ({ group }) => {
    const outsider = EARTHLY_BRANCHES.find((branch) => !group.includes(branch as never))!;
    const complete = synthetic(["甲", "丙", "庚", "壬"], [...group, outsider]).earthlyBranches.punishments
      .filter((item) => item.type === "THREE_PUNISHMENT" && item.group.join("") === group.join(""));
    expect(complete).toMatchObject([{ kind: "THREE_PUNISHMENT", complete: true, partial: false }]);
    const partial = synthetic(["甲", "丙", "庚", "壬"], [group[0], group[1], outsider, outsider])
      .earthlyBranches.punishments.filter((item) => item.type === "THREE_PUNISHMENT" && item.group.join("") === group.join(""));
    expect(partial).toMatchObject([{ kind: "THREE_PUNISHMENT", complete: false, partial: true }]);
  });
  it("detects 子卯 mutual punishment", () => {
    const punishments = branchPair("子", "卯").earthlyBranches.punishments;
    expect(forPositions(punishments, "day", "hour")).toContainEqual(expect.objectContaining({
      kind: "MUTUAL_PUNISHMENT", members: ["子", "卯"], complete: true
    }));
  });
  it.each(PUNISHMENT_V1.self)("self punishment $branch requires different pillars", ({ branch }) => {
    const outsider = EARTHLY_BRANCHES.find((value) => value !== branch)!;
    const pair = synthetic(["甲", "丙", "庚", "壬"], [branch, outsider, branch, outsider]);
    expect(pair.earthlyBranches.punishments.filter((item) => item.type === "SELF_PUNISHMENT"))
      .toMatchObject([{ kind: "SELF_PUNISHMENT", branch, positions: ["year", "day"], complete: true }]);
    const single = synthetic(["甲", "丙", "庚", "壬"], [branch, outsider, outsider, outsider]);
    expect(single.earthlyBranches.punishments.filter((item) => item.type === "SELF_PUNISHMENT" && item.branch === branch)).toHaveLength(0);
  });
  it("emits one occurrence per position pair and never reverses the same pair", () => {
    const stem = synthetic(["甲", "己", "甲", "庚"], ["子", "丑", "子", "午"]);
    const combos = stem.heavenlyStems.combinations.filter((item) => item.members.includes("己"));
    expect(combos.map((item) => item.positions)).toEqual([["year", "month"], ["month", "day"]]);
    expect(new Set(combos.map((item) => item.id)).size).toBe(combos.length);
    expect(stem.earthlyBranches.sixCombinations.filter((item) => item.members.includes("丑")).map((item) => item.positions))
      .toEqual([["year", "month"], ["month", "day"]]);
  });
  it("emits distinct assignments when a three-character group contains a duplicated position choice", () => {
    const group = synthetic(["甲", "丙", "庚", "壬"], ["寅", "寅", "巳", "申"])
      .earthlyBranches.punishments.filter((item) => item.type === "THREE_PUNISHMENT" && item.complete);
    expect(group.map((item) => item.positions)).toEqual([["year", "day", "hour"], ["month", "day", "hour"]]);
    expect(new Set(group.map((item) => item.id)).size).toBe(group.length);
  });
  it("retains combination and break, and harm and wonjin simultaneously", () => {
    const combinationBreak = branchPair("寅", "亥").earthlyBranches;
    expect(forPositions(combinationBreak.sixCombinations, "day", "hour")).toHaveLength(1);
    expect(forPositions(combinationBreak.breaks, "day", "hour")).toHaveLength(1);
    const harmWonjin = branchPair("子", "未").earthlyBranches;
    expect(forPositions(harmWonjin.harms, "day", "hour")).toHaveLength(1);
    expect(forPositions(harmWonjin.wonjin, "day", "hour")).toHaveLength(1);
    const concurrent = synthetic(["甲", "己", "庚", "壬"], ["辰", "酉", "卯", "亥"]);
    expect(concurrent.heavenlyStems.combinations).toHaveLength(1);
    expect(concurrent.earthlyBranches.sixCombinations.some((item) => item.members.includes("辰"))).toBe(true);
    expect(concurrent.earthlyBranches.clashes.some((item) => item.members.includes("酉"))).toBe(true);
  });
  it("has one traceable evidence entry for every detected relation", () => {
    const result = synthetic(["甲", "己", "甲", "庚"], ["寅", "亥", "巳", "申"]);
    const total = Object.values(result.heavenlyStems).reduce((sum, rows) => sum + rows.length, 0) +
      Object.values(result.earthlyBranches).reduce((sum, rows) => sum + rows.length, 0);
    expect(result.evidence).toHaveLength(total);
    for (const evidence of result.evidence) {
      expect(evidence.ruleVersion).toMatch(/-v1$/);
      expect(evidence.rule).toBeTruthy();
      expect(evidence.positions).toHaveLength(evidence.characters.length);
      expect(result.evidence.filter((item) => item.relationId === evidence.relationId)).toHaveLength(1);
    }
  });
  it("maps grouped characters to evidence positions even when pillar order differs from rule order", () => {
    const result = synthetic(["甲", "丙", "庚", "壬"], ["子", "辰", "申", "酉"]);
    const group = result.earthlyBranches.threeHarmonies.find((item) => item.group.join("") === "申子辰")!;
    expect(group.present).toEqual(["申", "子", "辰"]);
    expect(result.evidence.find((entry) => entry.relationId === group.id)).toMatchObject({
      positions: ["year", "month", "day"], characters: ["子", "辰", "申"]
    });
  });
  it("integrates synthetic birth input without changing strength, native elements or transformations", () => {
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(result.relations.status).toBe("implemented");
    expect(result.relations.ruleVersion).toBe("relations-v1");
    expect(result.relations.transformation.status).toBe("not_implemented");
    expect(result.relations.strengthAdjustmentApplied).toBe(false);
    expect(result.fiveElements.adjustedStrength.status).toBe("not_implemented");
    expect(result.strength.ruleVersion).toBe("strength-v1");
    expect(result.strength.relationAdjustmentApplied).toBe(false);
  });
  it("leaves unavailable pillars explicitly unimplemented", () => {
    const result = calculateSaju({ ...SYNTHETIC_INPUT, calendarType: "lunar" });
    expect(result.relations.status).toBe("not_implemented");
    expect(result.relations.evidence).toEqual([]);
    expect(result.relations.transformation.status).toBe("not_implemented");
  });
});
