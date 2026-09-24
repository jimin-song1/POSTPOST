import type { Branch, Element, ModuleStatus, PillarPosition, Stem,
  StructureIntegrity, StructureType } from "./saju-analysis";
import type { ElementRelation, StrengthLevel } from "@/rules/strength.v1";
import type { SpecialStructureState, SpecialStructureType } from "./special-structure";
import type { TenGodCategory } from "@/rules/structure-useful-god.v1";

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
export type ByeongyakDiseaseType = "STRUCTURE_DAMAGE" | "DOMINANT_ELEMENT_EXCESS";
export type ByeongyakMedicineRole = "PRIMARY_MEDICINE" | "STRONG_MEDICINE" |
  "SUPPORTING_MEDICINE" | "CONDITIONAL_MEDICINE" | "LOW_NEED" | "NOT_NEEDED";
export interface ByeongyakEvidence {
  factor: "STRUCTURE_DAMAGE_SEVERITY" | "DOMINANT_EXCESS_SEVERITY" |
    "MEDICINE_STRATEGY" | "MEDICINE_AVAILABILITY" | "EXISTING_RESCUE" |
    "RELATION_CONTEXT" | "TRANSFORMATION_CONTEXT" | "ROOT_DAMAGE_CONTEXT" |
    "TONGGWAN_CONTEXT";
  delta: number;
  details: Record<string, unknown>;
}
export interface ByeongyakDisease {
  id: string; type: ByeongyakDiseaseType;
  state: "ACTIVE" | "ALREADY_RESCUED";
  severityLevel: "MODERATE" | "HIGH" | "SEVERE" | "STRUCTURAL";
  severityScore: number;
  sourceDamageId?: string;
  structureType?: StructureType;
  damagingTenGod?: string;
  dominantElement?: Element;
  dominantPercentage?: number;
  secondHighestPercentage?: number;
  gapPercentagePoints?: number;
  existingRescue?: { id: string; tenGod: string; stem: Stem; position: PillarPosition };
  evidence: ByeongyakEvidence[];
}
export interface ByeongyakMedicineCandidate {
  element: Element; treatsDiseaseId: string;
  strategy: "STRUCTURE_RESCUE" | "CONTROL" | "DRAIN";
  diseaseScore: number; strategyScore: number; availabilityAdjustment: number;
  medicinePercentage: number; finalScore: number; role: ByeongyakMedicineRole;
  state: "NEEDED" | "ALREADY_RESCUED" | "NOT_NEEDED";
  evidence: ByeongyakEvidence[];
}
export interface ByeongyakElementPreference {
  element: Element; score: number; role: ByeongyakMedicineRole;
  candidateIndexes: number[]; evidence: ByeongyakEvidence[];
}
export interface ByeongyakResult {
  status: ModuleStatus;
  ruleVersion: "byeongyak-useful-god-v1";
  diseaseRuleVersion: "byeongyak-disease-v1";
  medicineRuleVersion: "byeongyak-medicine-v1";
  applicability: "APPLICABLE" | "PARTIALLY_APPLICABLE" | "ALREADY_TREATED" | "NOT_APPLICABLE";
  diseases: ByeongyakDisease[];
  medicineCandidates: ByeongyakMedicineCandidate[];
  elementPreferences: ByeongyakElementPreference[];
  context: {
    strength: { originalScore: number | null; originalLevel: StrengthLevel | null;
      adjustedScore: number | null; adjustedLevel: StrengthLevel | null };
    structure: { type: StructureType | null; integrity: StructureIntegrity; qualityScore: number | null };
    tonggwan: { applicability: TonggwanResult["applicability"]; candidateElements: Element[] };
    relationIds: string[]; transformedRelationIds: string[]; rootDamageIds: string[];
  };
  evidence: ByeongyakEvidence[];
}
export type StructureUsefulRole = "PRIMARY_STRUCTURE" | "STRONG_STRUCTURE" |
  "SUPPORTING_STRUCTURE" | "CONDITIONAL_STRUCTURE" | "NOT_NEEDED";
export interface StructureUsefulSource {
  type: "CORE" | "SUPPORT" | "RESCUE";
  score: number;
  structure: StructureType;
  tenGodCategory: TenGodCategory;
  currentlyActive: boolean;
  damageId?: string;
  rescueState?: "UNRESOLVED" | "ALREADY_RESCUED";
}
export interface StructureUsefulEvidence {
  factor: "STRUCTURE_CORE" | "STRUCTURE_SUPPORT" | "STRUCTURE_RESCUE" |
    "ELEMENT_AVAILABILITY" | "PRIMARY_STATUS" | "MIXED_CONTEXT" | "SPECIAL_STRUCTURE_CONTEXT";
  delta: number;
  details: Record<string, unknown>;
}
export interface StructureUsefulCandidate {
  element: Element;
  tenGodCategories: TenGodCategory[];
  sources: StructureUsefulSource[];
  availabilityPercentage: number;
  availabilityAdjustment: number;
  structuralScore: number;
  finalScore: number;
  role: StructureUsefulRole;
  evidence: StructureUsefulEvidence[];
}
export interface StructureUsefulResult {
  status: ModuleStatus;
  ruleVersion: "structure-useful-god-v1";
  coreRuleVersion: "structure-core-v1";
  preferenceRuleVersion: "structure-useful-preference-v1";
  interactionRuleVersion: "structure-interactions-v1";
  rescueRuleVersion: "structure-rescue-v1";
  structureType: StructureType | null;
  applicability: "STANDARD" | "CAUTION_SPECIAL_STRUCTURE" | "LIMITED" | "NOT_APPLICABLE";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  core: { tenGodCategory: TenGodCategory; element: Element } | null;
  candidates: StructureUsefulCandidate[];
  elementPreferences: Array<{ element: Element; score: number; role: StructureUsefulRole }>;
  damageContext: Array<{ id: string; tenGod: string }>;
  rescueContext: Array<{ id: string; tenGod: string; rescuesDamageId: string }>;
  mixedContext: Array<{ candidate: StructureType; positions: PillarPosition[] }>;
  specialStructureCaution: boolean;
  evidence: StructureUsefulEvidence[];
}
export interface UsefulGodsResult {
  status: "partial" | "not_implemented";
  eokbu: EokbuResult;
  johu: JohuResult;
  tonggwan: TonggwanResult;
  byeongyak: ByeongyakResult;
  structure: StructureUsefulResult;
  synthesis: PendingUsefulGodModule;
}
