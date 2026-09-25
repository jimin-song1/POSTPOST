import { HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import type { Pillar, Stem } from "@/types/saju-analysis";
import type { JeolName, SolarTermProvider } from "../solarTerms";
import { makePillar } from "./shared";

export const MONTH_INDEX_BY_JEOL: Record<JeolName, number> = {
  입춘: 0, 경칩: 1, 청명: 2, 입하: 3, 망종: 4, 소서: 5,
  입추: 6, 백로: 7, 한로: 8, 입동: 9, 대설: 10, 소한: 11
};
export const MONTH_JEOL_SEQUENCE=(Object.entries(MONTH_INDEX_BY_JEOL) as Array<[JeolName,number]>)
  .sort((a,b)=>a[1]-b[1]).map(([term])=>term);

export function calculateMonthPillar(datetime: Date, yearStem: Stem, provider: SolarTermProvider): Pillar {
  const monthIndex = MONTH_INDEX_BY_JEOL[provider.getPreviousJeol(datetime).term];
  const yearStemIndex = HEAVENLY_STEMS.indexOf(yearStem);
  const yinMonthStartStemIndex = (yearStemIndex % 5) * 2 + 2;
  return makePillar("month", yinMonthStartStemIndex + monthIndex, monthIndex + 2);
}
