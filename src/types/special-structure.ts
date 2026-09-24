import type { ModuleStatus } from "./saju-analysis";
export type SpecialStructureType = "FOLLOW_WEALTH" | "FOLLOW_OFFICER" | "FOLLOW_OUTPUT" |
  "DOMINANT_SELF" | "TRANSFORMED_QI_STRUCTURE";
export type SpecialStructureState = "QUALIFIED_CANDIDATE" | "CONDITIONAL" | "REJECTED" | "NOT_APPLICABLE";
export interface SpecialRequirement {
  requirement: string; passed: boolean; value: number | boolean | string | null;
  threshold: number | boolean | string; operator: "<=" | ">=" | "=";
  critical: boolean;
}
export interface SpecialBlocker {
  code: string; severity: "HARD" | "BOUNDARY"; details: Record<string, unknown>;
}
export interface SpecialEvidence { factor: string; delta: number; details: Record<string, unknown> }
export interface SpecialStructureCandidate {
  type: SpecialStructureType; label: string; ruleVersion: string;
  state: SpecialStructureState; confidence: "HIGH" | "MEDIUM" | "LOW";
  score: number; requirements: SpecialRequirement[];
  requirementsPassed: string[]; requirementsFailed: string[];
  blockers: SpecialBlocker[]; evidence: SpecialEvidence[]; metadata: Record<string, unknown>;
}
export interface SpecialStructureResult {
  status: ModuleStatus; ruleVersion: "special-structure-v1";
  selected: null; candidates: SpecialStructureCandidate[]; standardStructurePreserved: true;
}
