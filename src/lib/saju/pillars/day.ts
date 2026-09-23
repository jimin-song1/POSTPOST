import { GANZHI_RULES_V1 } from "@/rules/ganzhi.v1";
import type { Pillar } from "@/types/saju-analysis";
import { makeSexagenaryPillar } from "./shared";

export interface AdjustedDateFields {
  year: number;
  month: number;
  day: number;
}

const [anchorYear, anchorMonth, anchorDay] = GANZHI_RULES_V1.dayCycleAnchor.date.split("-").map(Number);
const anchorEpoch = Date.UTC(anchorYear, anchorMonth - 1, anchorDay);

export function calculateDayPillar(fields: AdjustedDateFields): Pillar {
  const epoch = Date.UTC(fields.year, fields.month - 1, fields.day);
  const dayOffset = Math.round((epoch - anchorEpoch) / GANZHI_RULES_V1.millisecondsPerDay);
  return makeSexagenaryPillar("day", GANZHI_RULES_V1.dayCycleAnchor.index + dayOffset);
}
