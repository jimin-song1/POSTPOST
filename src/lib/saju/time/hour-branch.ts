import { EARTHLY_BRANCHES } from "@/rules/ganzhi.v1";
import type { Branch } from "@/types/saju-analysis";

export function getHourBranchIndex(hour: number) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError("hour must be an integer from 0 to 23");
  return Math.floor((hour + 1) / 2) % EARTHLY_BRANCHES.length;
}

export function getHourBranch(hour: number): Branch {
  return EARTHLY_BRANCHES[getHourBranchIndex(hour)];
}
