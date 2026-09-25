import type { FortuneSynthesisPeriod } from "./fortune-synthesis";
export type SupportLevel="VERY_SUPPORTIVE"|"SUPPORTIVE"|"MODERATELY_SUPPORTIVE"|"MIXED"|"LOW_SUPPORT"|"PRESSURED";
export type ActivityLevel="LOW"|"MODERATE"|"HIGH"|"VERY_HIGH";
export type PressureLevel="LOW"|"MODERATE"|"HIGH"|"VERY_HIGH";
export interface ScoreEvidence {factor:string;value:number;weight:number;contribution:number;}
export interface FlowCalculation {signedFlow:number;flowQualityScore:number;flowActivityScore:number;}
export interface SupportMetric extends FlowCalculation {semanticType:"SUPPORT";score:number;level:SupportLevel;evidence:ScoreEvidence[];}
export interface PressureMetric {semanticType:"PRESSURE";score:number;level:PressureLevel;flowPressureScore:number;evidence:ScoreEvidence[];}
export interface ActivityMetric {semanticType:"ACTIVITY";score:number;level:ActivityLevel;flowActivityScore:number;evidence:ScoreEvidence[];}
export interface CategoryAxis {supportScore:number;supportLevel:SupportLevel;activityScore:number;activityLevel:ActivityLevel;
  flow:FlowCalculation;supportEvidence:ScoreEvidence[];activityEvidence:ScoreEvidence[];}
export interface CategoryFortunePeriod {categoryId:string;synthesisId:string;period:FortuneSynthesisPeriod["period"];
  overallFlow:CategoryAxis;wealth:CategoryAxis&{incomeOpportunity:SupportMetric;businessRevenue:SupportMetric;
    stableCashflow:SupportMetric;expensePressure:PressureMetric;expansionInvestment:ActivityMetric;assetAccumulation:SupportMetric};
  business:CategoryAxis;career:CategoryAxis;relationship:CategoryAxis&{opportunity:SupportMetric;stability:SupportMetric;
    formalizationSupport:SupportMetric;traditionalPartnerCategory:"wealth"|"officer"|"GENERIC"};study:CategoryAxis;change:CategoryAxis;
  tags:string[];context:{transformationDelta:number;structureType:string|null;usefulGodHighestElement:string|null};evidence:string[];}
export interface CategoryPeriodSummary {periodId:string;period:FortuneSynthesisPeriod["period"];segmentIds:string[];
  segmentWeights:Array<{categoryId:string;durationMilliseconds:number;weight:number}>;
  categories:Record<"overallFlow"|"wealth"|"business"|"career"|"relationship"|"study"|"change",{supportScore:number;activityScore:number}>;
  wealth:{expensePressureScore:number;expansionInvestmentScore:number};peakActivityScore:number;peakActivityCategory:string;
  peakActivitySegmentId:string;peakPressureScore:number;peakPressureSegmentId:string;}
export interface CategoryFortuneResult {status:"implemented";ruleVersion:"category-fortune-v1";scoreVersion:"category-score-v1";
  flowMatrixVersion:"category-flow-matrix-v1";wealthVersion:"wealth-category-v1";relationshipVersion:"relationship-category-v1";
  daeun:CategoryFortunePeriod[];seun:CategoryFortunePeriod[];wolun:CategoryFortunePeriod[];
  seunPeriodSummaries:CategoryPeriodSummary[];wolunPeriodSummaries:CategoryPeriodSummary[];evidence:string[];}
