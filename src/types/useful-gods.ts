import type { Element, ModuleStatus } from "./saju-analysis";
import type { ElementRelation, StrengthLevel } from "@/rules/strength.v1";
import type { SpecialStructureState, SpecialStructureType } from "./special-structure";

export type EokbuElementRole = "PRIMARY" | "SUPPORTIVE" | "CONDITIONAL" | "NEUTRAL" | "UNFAVORABLE";
export interface EokbuEvidence {
  factor: "STRENGTH_RELATION_BASE" | "ELEMENT_SCARCITY" | "ELEMENT_AVAILABILITY_BALANCED" |
    "ELEMENT_EXCESS" | "ELEMENT_SCARCITY_NO_BONUS" | "ELEMENT_PRESENCE_BURDEN" |
    "ELEMENT_SEVERE_EXCESS" | "SPECIAL_STRUCTURE_CONTEXT";
  element?: Element;
  relation?: ElementRelation;
  strengthLevel?: StrengthLevel;
  adjustedPercentage?: number;
  delta: number;
  details?: Record<string, unknown>;
}
export interface EokbuElementPreference {
  element: Element;
  relationToDayMaster: ElementRelation;
  baseScore: number;
  scarcityAdjustment: number;
  excessAdjustment: number;
  specialStructureAdjustment: 0;
  finalScore: number;
  role: EokbuElementRole;
  evidence: EokbuEvidence[];
}
export interface EokbuResult {
  status: ModuleStatus;
  ruleVersion: "eokbu-useful-god-v1";
  elementPreferenceRuleVersion: "eokbu-element-preference-v1";
  strengthSource: "adjusted" | "original" | null;
  strengthScore: number | null;
  strengthLevel: StrengthLevel | null;
  applicability: "STANDARD" | "CAUTION_SPECIAL_STRUCTURE";
  conditional: boolean;
  confidence: "MEDIUM" | "LOW";
  specialCandidates: Array<{ type: SpecialStructureType; state: SpecialStructureState }>;
  elements: EokbuElementPreference[];
  primaryElements: Element[];
  supportiveElements: Element[];
  conditionalElements: Element[];
  neutralElements: Element[];
  unfavorableElements: Element[];
  evidence: EokbuEvidence[];
}
export interface PendingUsefulGodModule { status: "not_implemented" }
export interface UsefulGodsResult {
  status: "partial" | "not_implemented";
  eokbu: EokbuResult;
  johu: PendingUsefulGodModule;
  tonggwan: PendingUsefulGodModule;
  byeongyak: PendingUsefulGodModule;
  structure: PendingUsefulGodModule;
  synthesis: PendingUsefulGodModule;
}
