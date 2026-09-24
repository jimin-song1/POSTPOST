import type { Branch, Element, ModuleStatus, PillarPosition, Stem } from "./saju-analysis";
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
export interface JohuAvailability {
  state: "VISIBLE" | "HIDDEN" | "ABSENT";
  visible: boolean;
  visiblePositions: PillarPosition[];
  dayStemSelf: boolean;
  hidden: boolean;
  hiddenLocations: Array<{ pillar: PillarPosition; branch: Branch;
    role: "mainQi" | "middleQi" | "residualQi" }>;
  rooted: boolean;
  relationContext: Array<{ relationId: string; state: string }>;
}
export interface JohuStemPreference {
  stem: Stem; element: Element; preferenceRank: number; preferenceScore: number;
  role: "PRIMARY" | "SECONDARY" | "SUPPORTING" | "OPTIONAL" | "AVOID";
  availability: JohuAvailability;
  evidence: Array<{ factor: string; delta: number; details: Record<string, unknown> }>;
}
export interface JohuElementPreference { element: Element; score: number; contributingStems: Stem[] }
export interface JohuResult {
  status: ModuleStatus;
  ruleVersion: "johu-useful-god-v1";
  sourceVersion: "johu-qiongtong-v1";
  conditionRuleVersion: "johu-condition-v1";
  sourceTradition: "QIONG_TONG_BAO_JIAN";
  dayStem: Stem | null;
  monthBranch: Branch | null;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  climateTags: string[];
  stemPreferences: JohuStemPreference[];
  elementPreferences: JohuElementPreference[];
  activeConditions: Array<{ id: string; effect: string }>;
  activeBlockers: Array<{ id: string; targetStems: Stem[]; effect: "CONTEXT_ONLY" }>;
  sourceEvidence: Array<{ section: string; sourceNote: string; curationVersion: string; curationNote?: string }>;
}
export type TonggwanConflictState = "STRONG_CONFLICT" | "CONDITIONAL_CONFLICT" |
  "ONE_SIDED" | "WEAK" | "NOT_APPLICABLE";
export type TonggwanCandidateState = "APPLICABLE" | "CONDITIONAL" |
  "ALREADY_SUFFICIENT" | "NOT_APPLICABLE";
export type TonggwanBridgeRole = "PRIMARY_BRIDGE" | "STRONG_BRIDGE" |
  "CONDITIONAL_BRIDGE" | "LOW_NEED" | "NOT_NEEDED";
export interface TonggwanEvidence {
  factor: "CONFLICT_PAIR" | "BRIDGE_SCARCITY" | "BRIDGE_ALREADY_SUFFICIENT" |
    "EXPLICIT_RELATIONS_CONTEXT" | "SPECIAL_STRUCTURE_CONTEXT";
  delta: number;
  details: Record<string, unknown>;
}
export interface TonggwanConflict {
  controller: Element; controlled: Element; bridge: Element;
  controllerPercentage: number; controlledPercentage: number;
  combinedPercentage: number; balanceRatio: number;
  conflictState: TonggwanConflictState;
}
export interface TonggwanCandidate extends TonggwanConflict {
  bridgePercentage: number;
  bridgeNeed: "HIGH" | "MEDIUM" | "PRESENT" | "ALREADY_SUFFICIENT";
  score: number; state: TonggwanCandidateState; evidence: TonggwanEvidence[];
}
export interface TonggwanElementPreference {
  element: Element; score: number; role: TonggwanBridgeRole;
  candidateIndexes: number[]; evidence: TonggwanEvidence[];
}
export interface TonggwanResult {
  status: ModuleStatus;
  ruleVersion: "tonggwan-useful-god-v1";
  conflictRuleVersion: "tonggwan-conflict-v1";
  bridgeRuleVersion: "tonggwan-bridge-v1";
  strengthSource: "adjusted" | "native" | null;
  applicability: "APPLICABLE" | "CONDITIONAL" | "ALREADY_SUFFICIENT" | "NOT_APPLICABLE";
  applicabilityCaution: boolean;
  confidence: "MEDIUM" | "LOW";
  conflicts: TonggwanConflict[];
  rankedCandidates: TonggwanCandidate[];
  elementPreferences: TonggwanElementPreference[];
  explicitRelations: string[];
  evidence: TonggwanEvidence[];
}
export interface UsefulGodsResult {
  status: "partial" | "not_implemented";
  eokbu: EokbuResult;
  johu: JohuResult;
  tonggwan: TonggwanResult;
  byeongyak: PendingUsefulGodModule;
  structure: PendingUsefulGodModule;
  synthesis: PendingUsefulGodModule;
}
