import type { Branch, Element, LuckPeriod, PillarPosition, Stem } from "./saju-analysis";
import type { SynthesisRole } from "./useful-gods";
import type { FortuneTransformationResult } from "./fortune-transformation";
import type { FortuneSynthesisResult } from "./fortune-synthesis";

export type FavorabilityRole="PRIMARY_FAVORABLE"|"STRONG_FAVORABLE"|"FAVORABLE"|"CONDITIONAL"|"NEUTRAL"|"UNFAVORABLE";
export interface FortuneInteraction {id:string;domain:"stem"|"branch";natalPosition?:PillarPosition;
  relationType:string;state:"ACTIVATED_PAIR"|"ACTIVATED_PARTIAL"|"ACTIVATED_COMPLETE"|"CROSS_LAYER_COMPLETE"|
    "WOLUN_TRIGGERED_COMPLETE"|"REPEATED_EXISTING_CONTEXT";
  members:Array<Stem|Branch>;targetElement?:Element;activationPoints:number;ruleVersion:string;
  transformationCandidate:boolean;}
export interface DaeunActivationPeriod {index:number;sourcePeriod:LuckPeriod;pillar:{stem:Stem;branch:Branch};
  preference:{stemScore:number;stemRole:SynthesisRole;branchScore:number;branchRole:SynthesisRole;
    baseFavorabilityScore:number;role:FavorabilityRole};
  tenGodProfile:{stemTenGod:string;branchHiddenTenGods:Array<{stem:Stem;tenGod:string;weight:number}>};
  interactions:FortuneInteraction[];activation:{rawScore:number;score:number;level:"LOW"|"MODERATE"|"HIGH"|"VERY_HIGH"};
  starActivations:Array<{type:string;basis:string;target:Stem|Branch;ruleVersion:string}>;evidence:string[];}
export interface FortuneResult {status:"partial"|"not_implemented";daeun:{status:"implemented"|"not_implemented";
  ruleVersion:"daeun-activation-v1";periods:DaeunActivationPeriod[];evidence:string[]};
  seun:{status:"implemented"|"not_implemented";ruleVersion?:"seun-activation-v1";periods?:SeunActivationPeriod[];evidence?:string[]};
  wolun:{status:"implemented"|"not_implemented";ruleVersion?:"wolun-activation-v1";periods?:WolunActivationPeriod[];evidence?:string[]};
  transformation:{status:"not_implemented"}|FortuneTransformationResult;
  synthesis:{status:"not_implemented"}|FortuneSynthesisResult;}

export interface DaeunSegment {daeunIndex:number;daeunPillar:string;startInstant:string;endInstant:string;}
export interface LayerParticipant {layer:"NATAL"|"DAEUN"|"SEUN"|"WOLUN";stem?:Stem;branch?:Branch;
  position?:PillarPosition;daeunIndex?:number;year?:number;}
export interface SeunInteraction extends FortuneInteraction {
  layerPair:"NATAL_SEUN"|"DAEUN_SEUN"|"NATAL_WOLUN"|"DAEUN_WOLUN"|"SEUN_WOLUN"|"CROSS_LAYER";
  daeunIndex?:number;participants:LayerParticipant[];
}
export interface SeunActivationPeriod {year:number;period:{startInstant:string;endInstant:string};
  pillar:{stem:Stem;branch:Branch};activeDaeunIndex:number|null;activeDaeunPillar:string|null;daeunSegments:DaeunSegment[];
  preference:{stemScore:number;stemRole:SynthesisRole;branchScore:number;branchRole:SynthesisRole;
    baseFavorabilityScore:number;role:FavorabilityRole};
  tenGodProfile:{stemTenGod:string;branchHiddenTenGods:Array<{stem:Stem;tenGod:string;weight:number}>};
  interactions:{natal:SeunInteraction[];daeun:SeunInteraction[];crossLayer:SeunInteraction[]};
  activation:{natalRawScore:number;crossLayerRawScore:number;rawScore:number;score:number;
    level:"LOW"|"MODERATE"|"HIGH"|"VERY_HIGH"};
  starActivations:Array<{type:string;basis:string;target:Stem|Branch;ruleVersion:string}>;
  samjaeActivation:{type:"SAMJAE_ACTIVATED";stage:"들삼재"|"눌삼재"|"날삼재";branch:Branch;ruleVersion:"samjae-v1"}|null;
  evidence:string[];}

export interface WolunActivationPeriod {seunYear:number;indexInSeun:number;solarMonthBranch:Branch;
  period:{startInstant:string;endInstant:string};pillar:{stem:Stem;branch:Branch};
  activeSeunYear:number;activeSeunPillar:{stem:Stem;branch:Branch};activeDaeunIndex:number|null;
  activeDaeunPillar:string|null;daeunSegments:DaeunSegment[];
  preference:{stemScore:number;stemRole:SynthesisRole;branchScore:number;branchRole:SynthesisRole;
    baseFavorabilityScore:number;role:FavorabilityRole};
  tenGodProfile:{stemTenGod:string;branchHiddenTenGods:Array<{stem:Stem;tenGod:string;weight:number}>};
  interactions:{natal:SeunInteraction[];daeun:SeunInteraction[];seun:SeunInteraction[];crossLayer:SeunInteraction[]};
  activation:{natalRawScore:number;fortuneLayerRawScore:number;crossLayerRawScore:number;rawScore:number;score:number;
    level:"LOW"|"MODERATE"|"HIGH"|"VERY_HIGH"};
  starActivations:Array<{type:string;basis:string;target:Stem|Branch;ruleVersion:string}>;
  samjaeContext:SeunActivationPeriod["samjaeActivation"];
  evidence:string[];}
