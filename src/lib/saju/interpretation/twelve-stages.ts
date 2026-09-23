import { TWELVE_STAGES_V1 } from "@/rules/twelve-stages.v1";
import { EARTHLY_BRANCHES } from "@/rules/ganzhi.v1";
import type { Branch, Stem } from "@/types/saju-analysis";

export interface TwelveStage { korean: string; hanja: string }
export function getTwelveStage(dayStem: Stem, branch: Branch): TwelveStage {
  const start = EARTHLY_BRANCHES.indexOf(TWELVE_STAGES_V1.birthBranch[dayStem]);
  const current = EARTHLY_BRANCHES.indexOf(branch);
  const direction = dayStem === "甲" || dayStem === "丙" || dayStem === "戊" || dayStem === "庚" || dayStem === "壬" ? 1 : -1;
  const index = ((current - start) * direction + 12) % 12;
  return TWELVE_STAGES_V1.stages[index];
}
