import type { Branch, Element } from "@/types/saju-analysis";

type Pair = readonly [Branch, Branch];
type Triple = readonly [Branch, Branch, Branch];

/** Presence rules only. The target element is metadata, never a transformed result. */
export const BRANCH_RELATIONS_V1 = {
  rulesetVersion: "branch-relations-v1",
  sixCombinations: [
    { pair: ["子", "丑"], rule: "子丑六合" }, { pair: ["寅", "亥"], rule: "寅亥六合" },
    { pair: ["卯", "戌"], rule: "卯戌六合" }, { pair: ["辰", "酉"], rule: "辰酉六合" },
    { pair: ["巳", "申"], rule: "巳申六合" }, { pair: ["午", "未"], rule: "午未六合" }
  ] satisfies Array<{ pair: Pair; rule: string }>,
  threeHarmonies: [
    { group: ["申", "子", "辰"], targetElement: "water", rule: "申子辰三合水" },
    { group: ["亥", "卯", "未"], targetElement: "wood", rule: "亥卯未三合木" },
    { group: ["寅", "午", "戌"], targetElement: "fire", rule: "寅午戌三合火" },
    { group: ["巳", "酉", "丑"], targetElement: "metal", rule: "巳酉丑三合金" }
  ] satisfies Array<{ group: Triple; targetElement: Element; rule: string }>,
  directionalCombinations: [
    { group: ["亥", "子", "丑"], targetElement: "water", rule: "亥子丑方合水" },
    { group: ["寅", "卯", "辰"], targetElement: "wood", rule: "寅卯辰方合木" },
    { group: ["巳", "午", "未"], targetElement: "fire", rule: "巳午未方合火" },
    { group: ["申", "酉", "戌"], targetElement: "metal", rule: "申酉戌方合金" }
  ] satisfies Array<{ group: Triple; targetElement: Element; rule: string }>,
  clashes: [
    { pair: ["子", "午"], rule: "子午沖" }, { pair: ["丑", "未"], rule: "丑未沖" },
    { pair: ["寅", "申"], rule: "寅申沖" }, { pair: ["卯", "酉"], rule: "卯酉沖" },
    { pair: ["辰", "戌"], rule: "辰戌沖" }, { pair: ["巳", "亥"], rule: "巳亥沖" }
  ] satisfies Array<{ pair: Pair; rule: string }>,
  breaks: [
    { pair: ["子", "酉"], rule: "子酉破" }, { pair: ["丑", "辰"], rule: "丑辰破" },
    { pair: ["寅", "亥"], rule: "寅亥破" }, { pair: ["卯", "午"], rule: "卯午破" },
    { pair: ["巳", "申"], rule: "巳申破" }, { pair: ["未", "戌"], rule: "未戌破" }
  ] satisfies Array<{ pair: Pair; rule: string }>,
  harms: [
    { pair: ["子", "未"], rule: "子未害" }, { pair: ["丑", "午"], rule: "丑午害" },
    { pair: ["寅", "巳"], rule: "寅巳害" }, { pair: ["卯", "辰"], rule: "卯辰害" },
    { pair: ["申", "亥"], rule: "申亥害" }, { pair: ["酉", "戌"], rule: "酉戌害" }
  ] satisfies Array<{ pair: Pair; rule: string }>,
  wonjin: [
    { pair: ["子", "未"], rule: "子未怨嗔" }, { pair: ["丑", "午"], rule: "丑午怨嗔" },
    { pair: ["寅", "酉"], rule: "寅酉怨嗔" }, { pair: ["卯", "申"], rule: "卯申怨嗔" },
    { pair: ["辰", "亥"], rule: "辰亥怨嗔" }, { pair: ["巳", "戌"], rule: "巳戌怨嗔" }
  ] satisfies Array<{ pair: Pair; rule: string }>
} as const;
