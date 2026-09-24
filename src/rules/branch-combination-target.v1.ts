import type { Branch, Element } from "@/types/saju-analysis";

/** POSTPOST v1 target metadata for 육합. 午未 is assigned earth in this version. */
export const BRANCH_COMBINATION_TARGET_V1 = {
  rulesetVersion: "branch-combination-target-v1",
  sixCombinations: [
    { pair: ["子", "丑"], targetElement: "earth" },
    { pair: ["寅", "亥"], targetElement: "wood" },
    { pair: ["卯", "戌"], targetElement: "fire" },
    { pair: ["辰", "酉"], targetElement: "metal" },
    { pair: ["巳", "申"], targetElement: "water" },
    { pair: ["午", "未"], targetElement: "earth" }
  ] satisfies Array<{ pair: readonly [Branch, Branch]; targetElement: Element }>
} as const;
