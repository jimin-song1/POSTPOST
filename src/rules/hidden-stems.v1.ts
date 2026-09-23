import type { Branch, Stem } from "@/types/saju-analysis";

export interface HiddenStemRule {
  mainQi: Stem;
  middleQi: Stem | null;
  residualQi: Stem | null;
}

// 본기/중기/여기. 학파에 따라 중기와 여기의 구분이 다를 수 있으므로 버전을 고정한다.
export const HIDDEN_STEMS_V1 = {
  rulesetVersion: "hidden-stems-v1",
  branches: {
    子: { mainQi: "癸", middleQi: null, residualQi: null },
    丑: { mainQi: "己", middleQi: "辛", residualQi: "癸" },
    寅: { mainQi: "甲", middleQi: "丙", residualQi: "戊" },
    卯: { mainQi: "乙", middleQi: null, residualQi: null },
    辰: { mainQi: "戊", middleQi: "癸", residualQi: "乙" },
    巳: { mainQi: "丙", middleQi: "庚", residualQi: "戊" },
    午: { mainQi: "丁", middleQi: null, residualQi: "己" },
    未: { mainQi: "己", middleQi: "乙", residualQi: "丁" },
    申: { mainQi: "庚", middleQi: "壬", residualQi: "戊" },
    酉: { mainQi: "辛", middleQi: null, residualQi: null },
    戌: { mainQi: "戊", middleQi: "丁", residualQi: "辛" },
    亥: { mainQi: "壬", middleQi: null, residualQi: "甲" }
  } satisfies Record<Branch, HiddenStemRule>
} as const;
