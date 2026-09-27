import type { SajuInput } from "./saju-input";

export type AuditClassification = "MATCH" | "PARTIAL" | "MISMATCH" | "UNKNOWN";
export type AuditDomain = "PERSONALITY" | "WORK" | "MONEY" | "RELATIONSHIP" | "HEALTH_LIFESTYLE" | "FAMILY_CHILDREN" | "MAJOR_LIFE_CHANGES";
export type MismatchType = "FACT_ERROR" | "SCHOOL_DIFFERENCE" | "COEFFICIENT_DIFFERENCE" | "INTERPRETATION_DIFFERENCE" | "USER_EXPERIENCE_MISMATCH" | "TRACE_ERROR";

export interface CaseAssessment {
  domain: AuditDomain;
  classification: AuditClassification;
  mismatchTypes: MismatchType[];
  notes?: string;
}

export interface ExternalComparison {
  service: string;
  sourceLabel?: string;
  facts?: Record<string, unknown>;
  interpretation?: Record<string, unknown>;
  notes?: string;
  automaticErrorConclusion: false;
}

export interface CalibrationCaseFile {
  caseId: `CASE-${string}`;
  input: SajuInput;
  assessments?: CaseAssessment[];
  externalComparisons?: ExternalComparison[];
}

export interface TraceContribution {
  id: string;
  factor: string;
  amount: number | null;
  coefficient: number | null;
  source: unknown;
}

export interface ReconstructionCheck {
  id: string;
  label: string;
  status: "PASS" | "FAIL" | "NOT_APPLICABLE";
  expected: unknown;
  reconstructed: unknown;
  difference: number | null;
  evidenceIds: string[];
}

export interface TraceStep {
  index: number;
  id: string;
  title: string;
  status: string;
  ruleVersions: string[];
  configVersions: string[];
  input: unknown;
  appliedRules: string[];
  coefficients: unknown;
  intermediateValues: unknown;
  contributions: TraceContribution[];
  evidenceIds: string[];
  output: unknown;
  reconstructionChecks: ReconstructionCheck[];
}

export interface CalibrationTrace {
  schemaVersion: "calibration-trace-v1";
  caseId: string;
  synthetic: boolean;
  engineVersion: string;
  analysisSchemaVersion: string;
  privacy: { sensitiveInputIncluded: boolean; repositorySafe: boolean };
  steps: TraceStep[];
  reconstruction: ReconstructionCheck[];
  assessments: CaseAssessment[];
  externalComparisons: ExternalComparison[];
}

export interface CalibrationSummaryRow {
  caseId: string;
  dayMaster: string | null;
  strength: unknown;
  structure: unknown;
  usefulElements: unknown;
  elementDistribution: unknown;
  categoryBaseline: unknown;
  wellness: unknown;
  children: unknown;
  majorDaeun: unknown;
  assessments: CaseAssessment[];
}
