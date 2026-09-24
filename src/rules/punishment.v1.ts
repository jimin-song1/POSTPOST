import type { Branch } from "@/types/saju-analysis";

/** POSTPOST's versioned choice among differing punishment traditions. */
export const PUNISHMENT_V1 = {
  rulesetVersion: "punishment-v1",
  three: [
    { group: ["寅", "巳", "申"], rule: "寅巳申三刑" },
    { group: ["丑", "戌", "未"], rule: "丑戌未三刑" }
  ] satisfies Array<{ group: readonly [Branch, Branch, Branch]; rule: string }>,
  mutual: [{ pair: ["子", "卯"], rule: "子卯相刑" }] satisfies Array<{ pair: readonly [Branch, Branch]; rule: string }>,
  self: [
    { branch: "辰", rule: "辰辰自刑" }, { branch: "午", rule: "午午自刑" },
    { branch: "酉", rule: "酉酉自刑" }, { branch: "亥", rule: "亥亥自刑" }
  ] satisfies Array<{ branch: Branch; rule: string }>
} as const;
