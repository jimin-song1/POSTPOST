import type { BirthPlaceResolution, SajuInput } from "./saju-input";
import type { TenGod } from "@/lib/saju/interpretation/ten-gods";
import type { BranchHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import type { TwelveStage } from "@/lib/saju/interpretation/twelve-stages";

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
  fiveElements: {
    rawCount: Record<Element, number>;
    nativeStrength: EvidenceResult;
    adjustedStrength: EvidenceResult;
  };
  relations: EvidenceResult;
  strength: EvidenceResult<{ score: number; level: string }>;
  structure: EvidenceResult;
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
