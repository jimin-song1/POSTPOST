import { GANZHI_RULES_V1 } from "@/rules/ganzhi.v1";
import type { Pillar } from "@/types/saju-analysis";
import type { SolarTermProvider } from "../solarTerms";
import { makeSexagenaryPillar, positiveModulo } from "./shared";

export function calculateYearPillar(datetime: Date, adjustedYear: number, provider: SolarTermProvider): Pillar {
  const ipchun = provider.getSolarTerm(adjustedYear, "입춘").instant;
  const ganzhiYear = datetime < ipchun ? adjustedYear - 1 : adjustedYear;
  const index = positiveModulo(ganzhiYear - GANZHI_RULES_V1.yearCycleAnchor.year, 60);
  return makeSexagenaryPillar("year", index);
}
