import type { CurrentPeriodSelection } from "@/types/customer-result";
import type { SajuAnalysis } from "@/types/saju-analysis";
import type { FortuneResult } from "@/types/fortune";

const includes = (instant: number, start?: string, end?: string) => {
  if (!start || !end) return false;
  return Date.parse(start) <= instant && instant < Date.parse(end);
};

/** Server-side deterministic selector. The UI only renders these selected identifiers. */
export function selectCurrentPeriods(analysis: SajuAnalysis, referenceInstant = new Date().toISOString()): CurrentPeriodSelection {
  const instant = Date.parse(referenceInstant);
  const fortune = analysis.fortune as FortuneResult;
  const daeunIndex = analysis.daeun.periods.findIndex((period) => includes(instant, period.startInstant, period.endInstant));
  const seunPeriods = fortune.seun.status === "implemented" ? fortune.seun.periods ?? [] : [];
  const seun = seunPeriods.find((period) => includes(instant, period.period.startInstant, period.period.endInstant));
  const wolunPeriods = fortune.wolun.status === "implemented" ? fortune.wolun.periods ?? [] : [];
  const wolun = wolunPeriods.find((period) => includes(instant, period.period.startInstant, period.period.endInstant));
  return {
    referenceInstant,
    daeunIndex: daeunIndex >= 0 ? daeunIndex : null,
    seunYear: seun?.year ?? null,
    wolunIndex: wolun ? wolun.indexInSeun : null,
  };
}
