import type { Branch,Element,Stem,TransformationState } from "./saju-analysis";

export type FortuneLayer="DAEUN"|"SEUN"|"WOLUN";
export interface FortuneContribution {id:string;layer:FortuneLayer;sourceType:"STEM"|"HIDDEN_STEM";
  character:Stem;branch?:Branch;qiRole?:"mainQi"|"middleQi"|"residualQi";element:Element;baseAmount:number;}
export interface FortuneElementProfile {layer:FortuneLayer;key:string;pillar:string;base:Record<Element,number>;
  adjusted:Record<Element,number>;baseTotal:number;adjustedTotal:number;percentages:Record<Element,number>;contributions:FortuneContribution[];}
export interface FortuneTransformationFactor {factor:string;delta:number;status:"APPLIED"|"NOT_APPLICABLE";
  reason:string;details?:Record<string,unknown>;relatedRelationId?:string;}
export interface FortuneTransformationEvaluation {relationId:string;relationType:string;targetElement:Element;
  score:number;state:TransformationState;partialGroup:boolean;factors:FortuneTransformationFactor[];
  sourceContributionIds:string[];blockingRelations:string[];competingRelations:string[];}
export interface FortuneTransfer {id:string;relationId:string;sourceContributionId:string;layer:FortuneLayer;
  state:TransformationState;transferRatio:number;fromElement:Element;toElement:Element;baseAmount:number;
  requestedAmount:number;scale:number;actualAmount:number;remainingAmount:number;netElementChange:number;}
export interface FortuneCombinedProfile {base:Record<Element,number>;adjusted:Record<Element,number>;baseTotal:number;adjustedTotal:number;}
export interface FortuneTransformationSnapshot {snapshotId:string;context:{natal:true;daeunIndex:number;
  seunYear?:number;wolun?:{seunYear:number;monthBranch:Branch;indexInSeun:number}};
  seasonContext:{source:"NATAL_MONTH_BASELINE"|"ACTIVE_WOLUN_BRANCH";branch:Branch};
  candidates:string[];evaluations:FortuneTransformationEvaluation[];transfers:FortuneTransfer[];
  layerProfiles:FortuneElementProfile[];combinedProfile:FortuneCombinedProfile;evidence:string[];}
export interface FortuneTransformationResult {status:"implemented";ruleVersion:"fortune-transformation-v1";
  evaluationVersion:"fortune-transformation-evaluation-v1";contributionVersion:"fortune-contribution-v1";
  transferVersion:"fortune-transformation-transfer-v1";daeunSnapshots:FortuneTransformationSnapshot[];
  seunSnapshots:FortuneTransformationSnapshot[];wolunSnapshots:FortuneTransformationSnapshot[];evidence:string[];}
