import type { Branch, Stem } from "@/types/saju-analysis";

export const HEAVENLY_STEMS: readonly Stem[] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const EARTHLY_BRANCHES: readonly Branch[] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

export const STEM_KOREAN: Record<Stem, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계"
};

export const BRANCH_KOREAN: Record<Branch, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해"
};

export const GANZHI_RULES_V1 = {
  /** 4 CE is the conventional 甲子 year used to index the sexagenary year cycle. */
  yearCycleAnchor: { year: 4, index: 0 },
  /** Hong Kong Observatory 2024 Almanac: 2024-04-01 is 乙未 (index 31). */
  dayCycleAnchor: { date: "2024-04-01", index: 31 },
  millisecondsPerDay: 86_400_000
} as const;
