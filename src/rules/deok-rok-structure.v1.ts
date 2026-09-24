import type { Branch, Stem } from "@/types/saju-analysis";

/** Aligned with the 建祿 row of twelve-stages-v1, including reverse progression of yin stems. */
export const DEOK_ROK_STRUCTURE_V1 = {
  rulesetVersion: "deok-rok-structure-v1",
  byDayStem: {
    甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳",
    己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子"
  } satisfies Record<Stem, Branch>
} as const;
