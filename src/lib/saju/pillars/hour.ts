import { HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import type { Pillar, Stem } from "@/types/saju-analysis";
import { getHourBranchIndex } from "../time/hour-branch";
import { makePillar } from "./shared";

export function calculateHourPillar(hour: number, dayStem: Stem): Pillar {
  const branchIndex = getHourBranchIndex(hour);
  const dayStemIndex = HEAVENLY_STEMS.indexOf(dayStem);
  const ratHourStartStemIndex = (dayStemIndex % 5) * 2;
  return makePillar("hour", ratHourStartStemIndex + branchIndex, branchIndex);
}
