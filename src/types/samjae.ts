import type {Branch} from "./saju-analysis";

export type SamjaePhase="DEUL"|"NUL"|"NAL"|"NONE";
export interface SamjaeYearResult{
  year:number;isSamjae:boolean;phase:SamjaePhase;natalYearBranch:Branch;samjaeBranch:Branch|null;cycleIndex:number|null;
  natalRelationHits:number;daeunRelationHits:number;seunRelationHits:number;daeunOverlap:boolean;relationActivation:boolean;
  supportScore:number;activationScore:number;evidence:string[];reasons:string[];
}
export interface SamjaeCycle{
  cycleIndex:number;startYear:number;middleYear:number;endYear:number;
  phases:Array<Pick<SamjaeYearResult,"year"|"phase"|"samjaeBranch"|"supportScore"|"activationScore">>;
  daeunIndexes:number[];
}
export interface SamjaeFortuneResult{
  status:"implemented";ruleVersion:"samjae-fortune-v1";activationRuleVersion:"samjae-activation-v1";
  natalYearBranch:Branch;years:SamjaeYearResult[];samjaeCycles:SamjaeCycle[];evidence:string[];
}
