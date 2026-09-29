import type { CaseAssessment } from "./calibration-trace";
import type { SajuInput } from "./saju-input";
import type { RelationshipStatus } from "./ai-interpretation";

export type CalibrationCaseStatus = "NEW" | "ANALYZED" | "REVIEWING" | "COMPLETE";
export type FactAssessment = "PASS" | "FAIL" | "UNCERTAIN";
export interface LocalCalibrationInput extends SajuInput { relationshipStatus: RelationshipStatus; alias?: string; preNotes?: string }
export interface LocalCalibrationAudit {
  caseId: string; status: CalibrationCaseStatus; alias?: string; createdAt: string; updatedAt: string;
  stale: boolean; overallNotes?: string; factAssessments: Record<string, FactAssessment>; assessments: CaseAssessment[];
}
export interface CalibrationCaseListItem { caseId: string; alias?: string; status: CalibrationCaseStatus; stale: boolean; updatedAt: string; analyzed: boolean }
