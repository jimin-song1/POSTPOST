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
  | { status: "pending" }
  | InterpretationResult;
