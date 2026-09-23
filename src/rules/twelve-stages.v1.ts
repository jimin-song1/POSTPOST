import type { Branch, Stem } from "@/types/saju-analysis";

export const TWELVE_STAGES_V1 = {
  rulesetVersion: "twelve-stages-v1",
  stages: [
    { korean: "장생", hanja: "長生" }, { korean: "목욕", hanja: "沐浴" },
    { korean: "관대", hanja: "冠帶" }, { korean: "건록", hanja: "建祿" },
    { korean: "제왕", hanja: "帝旺" }, { korean: "쇠", hanja: "衰" },
    { korean: "병", hanja: "病" }, { korean: "사", hanja: "死" },
    { korean: "묘", hanja: "墓" }, { korean: "절", hanja: "絶" },
    { korean: "태", hanja: "胎" }, { korean: "양", hanja: "養" }
  ],
  // 양간 순행, 음간 역행. 戊/己는 丙/丁의 장생 위치를 따른다.
  birthBranch: {
    甲: "亥", 乙: "午", 丙: "寅", 丁: "酉", 戊: "寅",
    己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯"
  } satisfies Record<Stem, Branch>
} as const;
