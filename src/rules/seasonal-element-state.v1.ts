import type { Branch, Element } from "@/types/saju-analysis";

export type SeasonalState = "旺" | "相" | "休" | "囚" | "死";
type SeasonalRow = Record<Element, SeasonalState>;

const woodSeason: SeasonalRow = { wood: "旺", fire: "相", earth: "死", metal: "囚", water: "休" };
const fireSeason: SeasonalRow = { wood: "休", fire: "旺", earth: "相", metal: "死", water: "囚" };
const earthSeason: SeasonalRow = { wood: "囚", fire: "休", earth: "旺", metal: "相", water: "死" };
const metalSeason: SeasonalRow = { wood: "死", fire: "囚", earth: "休", metal: "旺", water: "相" };
const waterSeason: SeasonalRow = { wood: "相", fire: "死", earth: "囚", metal: "休", water: "旺" };

/** POSTPOST v1 convention: four storage branches 辰未戌丑 use the earth season. */
export const SEASONAL_ELEMENT_STATE_V1 = {
  rulesetVersion: "seasonal-element-state-v1",
  byMonthBranch: {
    子: waterSeason, 丑: earthSeason, 寅: woodSeason, 卯: woodSeason,
    辰: earthSeason, 巳: fireSeason, 午: fireSeason, 未: earthSeason,
    申: metalSeason, 酉: metalSeason, 戌: earthSeason, 亥: waterSeason
  } satisfies Record<Branch, SeasonalRow>
} as const;
