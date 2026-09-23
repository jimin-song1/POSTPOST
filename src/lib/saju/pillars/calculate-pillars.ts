import type { SajuAnalysis } from "@/types/saju-analysis";
import type { NormalizedBirthTime } from "../time/normalize-birth-time";
import { solarTermProvider, type SolarTermProvider } from "../solarTerms";
import { calculateDayPillar } from "./day";
import { calculateHourPillar } from "./hour";
import { calculateMonthPillar } from "./month";
import { calculateYearPillar } from "./year";

export function calculatePillars(normalized: NormalizedBirthTime, provider: SolarTermProvider = solarTermProvider): SajuAnalysis["pillars"] {
  if (!normalized.absoluteBirthInstant || !normalized.adjustedFields) throw new Error("네 기둥 계산에는 출생시간이 필요합니다.");
  const year = calculateYearPillar(normalized.absoluteBirthInstant, Number(normalized.legalDateTime!.slice(0, 4)), provider);
  const month = calculateMonthPillar(normalized.absoluteBirthInstant, year.stem!, provider);
  const day = calculateDayPillar(normalized.adjustedFields);
  const hour = calculateHourPillar(normalized.adjustedFields.hour, day.stem!);
  return { year, month, day, hour };
}
