import type { Branch, Stem } from "@/types/saju-analysis";

/** Conservative POSTPOST yang-only blade definition. Yin stems have no v1 entry. */
export const YANG_BLADE_STRUCTURE_V1 = {
  rulesetVersion: "yang-blade-structure-v1",
  byDayStem: {
    甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子"
  } satisfies Partial<Record<Stem, Branch>>
} as const;
