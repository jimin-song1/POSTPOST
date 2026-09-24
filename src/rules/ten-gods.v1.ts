import type { Element, Stem } from "@/types/saju-analysis";

export const TEN_GODS_V1 = {
  rulesetVersion: "ten-gods-v1",
  elements: ["wood", "fire", "earth", "metal", "water"] as const satisfies readonly Element[],
  stemTraits: {
    甲: { element: "wood", polarity: "yang" }, 乙: { element: "wood", polarity: "yin" },
    丙: { element: "fire", polarity: "yang" }, 丁: { element: "fire", polarity: "yin" },
    戊: { element: "earth", polarity: "yang" }, 己: { element: "earth", polarity: "yin" },
    庚: { element: "metal", polarity: "yang" }, 辛: { element: "metal", polarity: "yin" },
    壬: { element: "water", polarity: "yang" }, 癸: { element: "water", polarity: "yin" }
  } satisfies Record<Stem, { element: Element; polarity: "yang" | "yin" }>,
  labels: {
    비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官", 편재: "偏財",
    정재: "正財", 편관: "偏官", 정관: "正官", 편인: "偏印", 정인: "正印"
  }
} as const;
