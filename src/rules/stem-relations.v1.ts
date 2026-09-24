import type { Element, Stem } from "@/types/saju-analysis";

type Pair = readonly [Stem, Stem];
export const STEM_RELATIONS_V1 = {
  rulesetVersion: "stem-relations-v1",
  combinations: [
    { pair: ["甲", "己"], targetElement: "earth", rule: "甲己合土" },
    { pair: ["乙", "庚"], targetElement: "metal", rule: "乙庚合金" },
    { pair: ["丙", "辛"], targetElement: "water", rule: "丙辛合水" },
    { pair: ["丁", "壬"], targetElement: "wood", rule: "丁壬合木" },
    { pair: ["戊", "癸"], targetElement: "fire", rule: "戊癸合火" }
  ] satisfies Array<{ pair: Pair; targetElement: Element; rule: string }>,
  clashes: [
    { pair: ["甲", "庚"], rule: "甲庚沖" }, { pair: ["乙", "辛"], rule: "乙辛沖" },
    { pair: ["丙", "壬"], rule: "丙壬沖" }, { pair: ["丁", "癸"], rule: "丁癸沖" }
  ] satisfies Array<{ pair: Pair; rule: string }>
} as const;
