import type { InterpretationResult } from "./ai-interpretation";
import type { SajuAnalysis } from "./saju-analysis";

export interface CurrentPeriodSelection {
  referenceInstant: string;
  daeunIndex: number | null;
  seunYear: number | null;
  wolunIndex: number | null;
}

export interface CustomerResultPayload {
  analysis: SajuAnalysis;
  current: CurrentPeriodSelection;
}

export type InterpretationUiState =
  | { status: "not_requested" }
  | { status: "pending"; stage?: "CHARACTER_CORE" | "PARTS" | "MERGE"; completedParts?: number; totalParts?: number }
  | { status: "failed"; ruleVersion: "ai-interpretation-v1"; error: { code: "NETWORK_ERROR" | "GLOBAL_PLAN_FAILED" | "PART_GENERATION_FAILED"; message: string } }
  | InterpretationResult;
