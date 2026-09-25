import type { TenGodCategory } from "@/rules/structure-useful-god.v1";
import type { FortuneLayer } from "./fortune-transformation";
import type { FavorabilityRole } from "./fortune";

export type AlignmentDirection="MORE_ALIGNED"|"SLIGHTLY_MORE_ALIGNED"|"UNCHANGED"|
  "SLIGHTLY_LESS_ALIGNED"|"LESS_ALIGNED";
export type AlignmentLevel="VERY_HIGH_ALIGNMENT"|"HIGH_ALIGNMENT"|"FAVORABLE_ALIGNMENT"|
  "MIXED_ALIGNMENT"|"LOW_ALIGNMENT"|"VERY_LOW_ALIGNMENT";
export type ActivationLevel="LOW"|"MODERATE"|"HIGH"|"VERY_HIGH";
export interface WeightedLayerContribution {layer:FortuneLayer;sourceId:string;score:number;weight:number;weightedScore:number;}
export interface LayerAlignment {layer:FortuneLayer;baseAlignment:number;adjustedAlignment:number;delta:number;
  direction:AlignmentDirection;baseProfile:Record<string,number>;adjustedProfile:Record<string,number>;}
export interface FortuneSynthesisPeriod {synthesisId:string;period:{startInstant:string;endInstant:string};
  context:{daeunIndex:number;seunYear?:number;wolunBranch?:string};layers:FortuneLayer[];
  layerWeights:Partial<Record<Lowercase<FortuneLayer>,number>>;
  favorability:{score:number;level:FavorabilityRole;layerContributions:WeightedLayerContribution[]};
  activation:{score:number;level:ActivationLevel;layerContributions:WeightedLayerContribution[]};
  transformationAlignment:{baseScore:number;adjustedScore:number;delta:number;direction:AlignmentDirection;
    level:AlignmentLevel;layerAlignments:LayerAlignment[]};
  tenGodFlow:Record<TenGodCategory,number>;tags:string[];topInteractions:Array<{id:string;activationPoints:number;relationType:string}>;
  evidence:string[];}
export interface FortunePeriodSummary {periodId:string;period:{startInstant:string;endInstant:string};segmentIds:string[];
  segmentWeights:Array<{synthesisId:string;durationMilliseconds:number;weight:number}>;
  favorabilityScore:number;activationScore:number;transformationBaseAlignment:number;
  transformationAdjustedAlignment:number;transformationDelta:number;peakActivationScore:number;peakSegmentId:string;
  maxPositiveDelta:number;maxNegativeDelta:number;}
export interface FortuneSynthesisResult {status:"implemented";ruleVersion:"fortune-synthesis-v1";
  layerWeightVersion:"fortune-layer-weight-v1";transformationAlignmentVersion:"fortune-transformation-alignment-v1";
  periodSummaryVersion:"fortune-period-summary-v1";daeun:FortuneSynthesisPeriod[];seun:FortuneSynthesisPeriod[];
  wolun:FortuneSynthesisPeriod[];seunPeriodSummaries:FortunePeriodSummary[];wolunPeriodSummaries:FortunePeriodSummary[];evidence:string[];}
