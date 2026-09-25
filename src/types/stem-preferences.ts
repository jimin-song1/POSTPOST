import type { Branch, Element, PillarPosition, Stem, TransformationState } from "./saju-analysis";
import type { SynthesisRole, SynthesisSignal } from "./useful-gods";

export interface StemAvailability {
  state: "VISIBLE" | "HIDDEN" | "ABSENT";
  visiblePositions: Array<Exclude<PillarPosition, "day">>;
  hiddenOccurrences: Array<{ pillar: PillarPosition; branch: Branch; hiddenStem: Stem;
    qiRole: "mainQi" | "middleQi" | "residualQi" }>;
  dayStemSelf: boolean;
}
export interface StemPreference {
  stem: Stem; element: Element; yinYang: "yin" | "yang";
  score: number; baseStemScore: number; role: SynthesisRole;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  parentElementScore: number; parentElementRole: SynthesisRole;
  engineSignals: SynthesisSignal[];
  coverage: { engineCount: number; effectiveWeight: number; engines: SynthesisSignal["engine"][] };
  availability: StemAvailability;
  relationContext: Array<{ relationId: string; relationType: string; state: TransformationState }>;
  consensusBonus: number; conflictPenalty: number; conflictingSignals: boolean;
  evidence: string[];
}
export interface StemPreferencesResult {
  status: "implemented";
  ruleVersion: "stem-preferences-v1";
  synthesisVersion: "stem-preference-synthesis-v1";
  stems: StemPreference[]; rankedStems: Stem[];
  primaryStems: Stem[]; secondaryStems: Stem[]; favorableStems: Stem[];
  conditionalStems: Stem[]; neutralStems: Stem[]; unfavorableStems: Stem[];
}
