export interface ChildContribution {evidenceId:string;factor:string;value:number;weight:number;contribution:number;}
export type ChildBondLevel="LOW"|"MODERATE"|"STRONG"|"VERY_STRONG";
export type ChildCountBand="LOW_CONNECTION"|"ONE_CHILD_CENTERED"|"ONE_TO_TWO"|"MULTIPLE_TENDENCY";
export type ChildActivationLevel="LOW"|"MODERATE"|"HIGH"|"VERY_HIGH";
export interface ChildrenFortuneResult {status:"implemented";versions:{childrenFortune:"children-fortune-v1";bond:"children-bond-v1";
  countTendency:"children-count-tendency-v1";genderEnergy:"children-gender-energy-v1";parentingStyle:"parenting-style-v1";periodActivation:"children-period-activation-v1"};
  bond:{score:number;level:ChildBondLevel;contributions:ChildContribution[];evidenceIds:string[]};
  countTendency:{band:ChildCountBand;label:string;score:number;confidence:"LOW"|"MEDIUM"|"HIGH";contributions:ChildContribution[];evidenceIds:string[]};
  genderEnergy:{sonScore:number;daughterScore:number;sonPercent:number;daughterPercent:number;dominant:"SON"|"DAUGHTER"|"BALANCED";margin:number;confidence:"LOW"|"MEDIUM"|"HIGH";scoreEvidence:Array<{evidenceId:string;target:"SON"|"DAUGHTER";value:number}>;evidenceIds:string[]};
  parentingStyle:{expression:"EXPRESSIVE"|"PRACTICAL"|"RESERVED"|"MIXED";guidance:"STRUCTURED"|"AUTONOMY_ORIENTED"|"PROTECTIVE"|"BALANCED";
    expectation:"HIGH_EXPECTATION"|"FLEXIBLE"|"SUPPORTIVE"|"MIXED";conflict:"DIRECT"|"INTERNALIZE"|"NEGOTIATE"|"DISTANCE";sourceProfile:Record<string,number>;evidenceIds:string[]};
  strengths:Array<{text:string;evidenceIds:string[]}>;attentionAreas:Array<{text:string;evidenceIds:string[]}>;
  daeunPeriods:Array<{periodIndex:number;ageRange:string;pillar:string;activationScore:number;activationLevel:ChildActivationLevel;themes:string[];contributions:ChildContribution[];evidenceIds:string[]}>;
  evidence:string[];disclaimer:{tendencyOnly:true;pregnancyProbability:false;exactChildCount:false;fetalSexPrediction:false};}
