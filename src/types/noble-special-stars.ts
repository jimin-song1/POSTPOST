import type { Branch, PillarPosition, Stem } from "./saju-analysis";

export interface StarDetection {
  id:string; type:string; label:string;
  basis:{type:string;value:Stem|Branch|string};
  matched:{pillar:PillarPosition;stem?:Stem;branch?:Branch};
  ruleVersion:string; evidence:string[];
  isDayPillar?:boolean;
}
export interface TwelveSinsalEntry {
  name:string; targetBranch:Branch; basisBranch:Branch;
  matchedPositions:PillarPosition[]; detected:boolean; ruleVersion:"twelve-sinsal-v1";
}
export interface NobleSpecialStarsResult {
  status:"implemented"; ruleVersion:"noble-special-stars-v1";
  nobleStars:StarDetection[]; peachBlossom:StarDetection[]; travelHorse:StarDetection[];
  flowerCanopy:StarDetection[]; ghostGate:StarDetection[]; wonjin:StarDetection[];
  needle:StarDetection[];
  void:{ruleVersion:"void-v1";dayPillar:string;xunStart:string;voidBranches:[Branch,Branch];
    dayBranchPolicy:"EXCLUDED_SELF";matches:Array<{pillar:Exclude<PillarPosition,"day">;branch:Branch}>};
  yangBladeApplicability:"APPLICABLE"|"NOT_APPLICABLE"; yangBlade:StarDetection[];
  goegang:StarDetection[]; whiteTiger:StarDetection[];
  twelveSinsal:{ruleVersion:"twelve-sinsal-v1";yearBasis:TwelveSinsalEntry[];dayBasis:TwelveSinsalEntry[]};
  samjae:{ruleVersion:"samjae-v1";basisYearBranch:Branch;group:Branch[];samjaeBranches:Branch[];
    stages:{들삼재:Branch;눌삼재:Branch;날삼재:Branch}};
  evidence:string[];
}
