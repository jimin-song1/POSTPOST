import type { BirthPlaceResolution, SajuInput } from "./saju-input";
import type { TenGod } from "@/lib/saju/interpretation/ten-gods";
import type { BranchHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import type { TwelveStage } from "@/lib/saju/interpretation/twelve-stages";
import type { SeasonalState } from "@/rules/seasonal-element-state.v1";
import type { QiRole } from "@/lib/saju/interpretation/hidden-stems";
import type { ElementRelation, StrengthLevel } from "@/rules/strength.v1";

export type ModuleStatus = "implemented" | "partial" | "not_implemented";
export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Stem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type Branch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";
export type PillarPosition = "year" | "month" | "day" | "hour";

export interface Pillar {
  position: PillarPosition;
  stem: Stem | null;
  branch: Branch | null;
  hanja: string | null;
  korean: string | null;
}

export interface EvidenceResult<T = unknown> {
  status: ModuleStatus;
  value: T | null;
  evidence: string[];
  todo?: string;
}

export interface TenGodsValue {
  ruleVersion: "ten-gods-v1";
  dayMaster: Stem;
  heavenlyStems: Record<PillarPosition, TenGod>;
  hiddenStems: Record<PillarPosition, Array<{ role: "mainQi" | "middleQi" | "residualQi"; stem: Stem; tenGod: TenGod }>>;
}
export interface HiddenStemsValue {
  ruleVersion: "hidden-stems-v1";
  branches: Record<PillarPosition, BranchHiddenStems>;
}
export interface TwelveStagesValue {
  ruleVersion: "twelve-stages-v1";
  stages: Record<PillarPosition, TwelveStage>;
}

export interface ElementContribution {
  id: string;
  sourceType: "VISIBLE_STEM" | "HIDDEN_STEM";
  pillar: PillarPosition;
  character: Stem;
  originalElement: Element;
  nativeContribution: number;
  source: `${PillarPosition}Stem` | `${PillarPosition}Branch`;
  stem?: Stem;
  stemWeight?: number;
  branch?: Branch;
  branchWeight?: number;
  hiddenStem?: Stem;
  hiddenRole?: QiRole;
  allocationRatio?: number;
  baseContribution: number;
  element: Element;
  seasonalState: SeasonalState;
  seasonalMultiplier: number;
  finalContribution: number;
}

export interface TransferLedgerEntry {
  relationId: string;
  sourceContributionId: string;
  sourceType: ElementContribution["sourceType"];
  pillar: PillarPosition;
  character: Stem;
  state: TransformationState;
  transferRatio: number;
  nativeContribution: number;
  requestedAmount: number;
  scale: number;
  actualAmount: number;
  remainingSourceContribution: number;
  fromElement: Element;
  toElement: Element;
  netElementChange: number;
  reason: string;
}

export interface RootDamageEntry {
  rootId: string;
  pillar: PillarPosition;
  branch: Branch;
  hiddenStem: Stem;
  role: QiRole;
  originalRootScore: number;
  damageRatio: number;
  damagedAmount: number;
  remainingRootScore: number;
  causedByRelationIds: string[];
}

export interface AdjustedElementEvidence {
  relationId: string;
  sourceContributionId: string;
  fromElement: Element;
  toElement: Element;
  actualAmount: number;
  deltaFrom: number;
  deltaTo: number;
}

export interface AdjustedStrengthResult {
  status: ModuleStatus;
  ruleVersion: "adjusted-strength-v1";
  effectRuleVersion: "relation-effects-v1";
  transferRuleVersion: "transformation-transfer-v1";
  rootDamageRuleVersion: "root-damage-v1";
  elements: Record<Element, { nativeScore: number; adjustment: number; adjustedScore: number; percentage: number }> | null;
  transferLedger: TransferLedgerEntry[];
  rootDamage: RootDamageEntry[];
  evidence: AdjustedElementEvidence[];
}

export interface FiveElementsResult {
  status: ModuleStatus;
  ruleVersion: "five-elements-v1";
  weightRuleVersion: "element-weight-v1";
  seasonalStateRuleVersion: "seasonal-element-state-v1";
  seasonalStrengthRuleVersion: "seasonal-strength-v1";
  rawCount: Record<Element, number>;
  nativeStrength: Record<Element, { score: number; percentage: number }> | null;
  adjustedStrength: AdjustedStrengthResult;
  evidence: ElementContribution[];
}

export interface StrengthEvidence {
  factor: "baseline" | "monthCommand" | "visibleStem" | "root" | "deukJi" | "deukSe" | "deukSi" | "clamp";
  scoreDelta: number;
  pillar?: PillarPosition;
  branch?: Branch;
  stem?: Stem;
  hiddenStem?: Stem;
  role?: QiRole;
  tenGod?: TenGod;
  relation?: ElementRelation;
  rawScore?: number;
  reason?: string;
}

export interface StrengthSignal {
  isObtained: boolean;
  relation: ElementRelation | null;
  score: number;
  evidence: string[];
}

export interface StrengthBalance {
  count: number;
  weightedContribution: number;
  sources: Array<{ source: ElementContribution["source"]; element: Element; relation: ElementRelation; contribution: number }>;
}

export interface StrengthResult {
  status: ModuleStatus;
  ruleVersion: "strength-v1";
  rootingRuleVersion: "rooting-v1";
  supportRuleVersion: "day-master-support-v1";
  score: number | null;
  level: StrengthLevel | null;
  dayMaster: { stem: Stem; element: Element; yinYang: "yin" | "yang" } | null;
  deukRyeong: StrengthSignal | null;
  deukJi: StrengthSignal | null;
  deukSe: StrengthSignal | null;
  deukSi: StrengthSignal | null;
  rooting: { rawScore: number; score: number; cap: number; roots: Array<{
    pillar: PillarPosition; branch: Branch; hiddenStem: Stem; role: QiRole; score: number; appliedScore: number
  }> } | null;
  support: StrengthBalance | null;
  drain: StrengthBalance | null;
  control: StrengthBalance | null;
  relationAdjustmentApplied: false;
  evidence: StrengthEvidence[];
  adjustments: {
    status: "partial" | "not_implemented";
    ruleVersion: "root-damage-v1";
    originalRootingScore: number | null;
    adjustedRootingScore: number | null;
    rootDamage: RootDamageEntry[];
    adjustedScore: null;
  };
}

export type RelationRuleVersion = "stem-relations-v1" | "branch-relations-v1" | "punishment-v1";
export type RelationPairType = "STEM_COMBINATION" | "STEM_CLASH" | "SIX_COMBINATION" |
  "BRANCH_CLASH" | "BRANCH_BREAK" | "BRANCH_HARM" | "WONJIN" | "MUTUAL_PUNISHMENT" | "SELF_PUNISHMENT";
export interface RelationPair<Character extends Stem | Branch = Stem | Branch> {
  id: string;
  type: RelationPairType;
  members: [Character, Character];
  positions: [PillarPosition, PillarPosition];
  ruleVersion: RelationRuleVersion;
  rule: string;
  exists: true;
  targetElement?: Element;
  transformed: null;
  kind?: "MUTUAL_PUNISHMENT" | "SELF_PUNISHMENT";
  branch?: Branch;
  complete?: true;
}
export interface RelationGroup {
  id: string;
  type: "THREE_HARMONY" | "DIRECTIONAL_COMBINATION" | "THREE_PUNISHMENT";
  kind?: "THREE_PUNISHMENT";
  group: [Branch, Branch, Branch];
  present: Branch[];
  memberPositions: Array<{ branch: Branch; position: PillarPosition }>;
  positions: PillarPosition[];
  complete: boolean;
  partial: boolean;
  targetElement?: Element;
  transformed: null;
  ruleVersion: RelationRuleVersion;
  rule: string;
}
export interface RelationEvidence {
  relationId: string;
  ruleVersion: RelationRuleVersion;
  type: RelationPairType | RelationGroup["type"];
  positions: PillarPosition[];
  characters: Array<Stem | Branch>;
  rule: string;
  targetElement?: Element;
  complete?: boolean;
  partial?: boolean;
}
export type TransformationState = "TRANSFORMED" | "PARTIAL" | "COMBINATION_ONLY" | "WEAK" | "NOT_APPLICABLE";
export interface TransformationFactor {
  factor: "season" | "targetRoot" | "targetExposure" | "adjacency" | "generatingSupport" |
    "blockingClash" | "competition" | "originalStrongRoot";
  delta: number;
  reason: string;
  relatedRelationId?: string;
  details?: Record<string, unknown>;
}
export interface TransformationEvaluation {
  relationId: string;
  relationType: RelationPairType | RelationGroup["type"];
  targetElement: Element | null;
  score: number;
  state: TransformationState;
  factors: TransformationFactor[];
  competingRelations: string[];
  blockingRelations: string[];
  adjacent: boolean | null;
  complete: boolean | null;
  evidence: TransformationFactor[];
}
export interface RelationInteraction {
  sourceRelationId: string;
  interactingRelationId: string;
  interactionType: "COMPETING" | "BLOCKING";
  scoreDelta: number;
  ruleVersion: "relation-interaction-v1";
}
export interface TransformationResult {
  status: ModuleStatus;
  ruleVersion: "transformation-v1";
  interactionRuleVersion: "relation-interaction-v1";
  branchTargetRuleVersion: "branch-combination-target-v1";
  evaluations: TransformationEvaluation[];
  interactions: RelationInteraction[];
}
export interface RelationsResult {
  status: ModuleStatus;
  ruleVersion: "relations-v1";
  heavenlyStems: { combinations: RelationPair<Stem>[]; clashes: RelationPair<Stem>[] };
  earthlyBranches: {
    sixCombinations: RelationPair<Branch>[];
    threeHarmonies: RelationGroup[];
    directionalCombinations: RelationGroup[];
    clashes: RelationPair<Branch>[];
    punishments: Array<RelationPair<Branch> | RelationGroup>;
    breaks: RelationPair<Branch>[];
    harms: RelationPair<Branch>[];
    wonjin: RelationPair<Branch>[];
  };
  transformation: TransformationResult;
  strengthAdjustmentApplied: false;
  evidence: RelationEvidence[];
}

export type StructureType = "정관격" | "편관격" | "정재격" | "편재격" |
  "식신격" | "상관격" | "정인격" | "편인격" | "건록격" | "양인격";
export type StructureStatus = "ESTABLISHED" | "UNEXPOSED" | "MIXED" | "SPECIAL_CANDIDATE" | "UNRESOLVED";
export interface StructureSource {
  branch: Branch;
  hiddenStem: Stem;
  hiddenRole: QiRole;
  tenGod: TenGod["korean"];
  tenGodHanja: TenGod["hanja"];
}
export interface StructureEvidence {
  factor: "MONTH_MAIN_QI" | "EXPOSURE" | "SECONDARY_CANDIDATE" | "MIXED_PATTERN" |
    "SPECIAL_RULE" | "TRANSFORMATION_CONTEXT" | "UNRESOLVED";
  monthBranch: Branch;
  hiddenStem?: Stem;
  role?: QiRole;
  dayMaster?: Stem;
  tenGod?: TenGod["korean"];
  candidate?: StructureType;
  stem?: Stem;
  positions?: PillarPosition[];
  exposed?: boolean;
  result?: StructureType | null;
  ruleVersion?: string;
  relationId?: string;
  transformationState?: TransformationState;
}
export interface StructureCandidate {
  type: StructureType;
  source: StructureSource;
  exposed: boolean;
  exposedPositions: PillarPosition[];
  status: StructureStatus;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: StructureEvidence[];
}
export interface StructureResult {
  status: ModuleStatus;
  ruleVersion: "structure-v1";
  standardRuleVersion: "standard-structure-v1";
  monthCommandRuleVersion: "month-command-v1";
  deokRokRuleVersion: "deok-rok-structure-v1";
  yangBladeRuleVersion: "yang-blade-structure-v1";
  classificationStatus: StructureStatus;
  primary: StructureCandidate | null;
  secondary: StructureCandidate[];
  specialCandidates: StructureCandidate[];
  exposures: Array<{ stem: Stem; role: QiRole; exposed: boolean; positions: PillarPosition[] }>;
  mixedPatterns: Array<{ candidate: StructureType; sourceRole: QiRole; exposed: true; positions: PillarPosition[] }>;
  dayMasterStrength: { score: number; level: StrengthLevel } | null;
  adjustedElementContext: { status: ModuleStatus; ruleVersion: "adjusted-strength-v1" };
  transformationContext: Array<{ relationId: string; state: TransformationState }>;
  specialStructure: EvidenceResult;
  qualityEvaluation: EvidenceResult;
  evidence: StructureEvidence[];
}

export interface LuckPeriod {
  ageRange: string;
  pillar: string;
  startAgeYears: number;
  endAgeYears: number;
}

export interface SajuAnalysis {
  schemaVersion: "saju-analysis-v1";
  rulesetVersion: "saju-time-v1";
  person: { name: string; gender: SajuInput["gender"] };
  birthInput: SajuInput;
  birthNormalized: {
    birthPlace: BirthPlaceResolution;
    absoluteBirthInstant: string | null;
    legalDateTime: string | null;
    adjustedDateTime: string | null;
    offsetMinutes: -30;
    timezone: "Asia/Seoul";
    equationOfTimeApplied: false;
  };
  solarTerms: EvidenceResult;
  pillars: Record<PillarPosition, Pillar>;
  dayMaster: Stem | null;
  tenGods: EvidenceResult<TenGodsValue>;
  hiddenStems: EvidenceResult<HiddenStemsValue>;
  twelveStages: EvidenceResult<TwelveStagesValue>;
  fiveElements: FiveElementsResult;
  relations: RelationsResult;
  strength: StrengthResult;
  structure: StructureResult;
  usefulGods: EvidenceResult;
  stemPreferences: EvidenceResult;
  branchPreferences: EvidenceResult;
  nobleAndSpecialStars: EvidenceResult;
  samjae: EvidenceResult;
  daeun: {
    status: ModuleStatus;
    direction: "forward" | "reverse" | null;
    directionLabel: "순행" | "역행" | null;
    referenceSolarTerm: "next" | "previous" | null;
    exactStartAge: number | null;
    startAgeYears: number | null;
    startAgeMonths: number | null;
    startDatetime: string | null;
    periods: LuckPeriod[];
    evidence: string[];
    todo?: string;
  };
  fortune: EvidenceResult;
  warnings: string[];
  engineMetadata: {
    engineVersion: "1.0.0";
    calculationMode: "algorithmic" | "unsupported_input";
    calculatedAt: string;
    aiCalculationUsed: false;
  };
}
