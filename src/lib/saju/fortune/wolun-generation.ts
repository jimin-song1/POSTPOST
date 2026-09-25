import { WOLUN_ACTIVATION_V1 as RULE } from "@/rules/wolun-activation.v1";
import type { Branch, Stem } from "@/types/saju-analysis";
import type { DaeunSegment, SeunActivationPeriod } from "@/types/fortune";
import { calculateMonthPillar,MONTH_JEOL_SEQUENCE } from "../pillars/month";
import type { SolarTermProvider } from "../solarTerms";

export interface WolunSourcePeriod {seunYear:number;indexInSeun:number;solarMonthBranch:Branch;
  period:{startInstant:string;endInstant:string};pillar:{stem:Stem;branch:Branch};
  activeSeunYear:number;activeSeunPillar:{stem:Stem;branch:Branch};activeDaeunIndex:number|null;
  activeDaeunPillar:string|null;daeunSegments:DaeunSegment[];}
export interface WolunSourceResult {status:"implemented";ruleVersion:"wolun-generation-v1";periods:WolunSourcePeriod[];evidence:string[];}

export function generateWolun(seunPeriods:SeunActivationPeriod[],provider:SolarTermProvider):WolunSourceResult{
  const periods:WolunSourcePeriod[]=[];
  for(const seun of seunPeriods){
    const boundaries=MONTH_JEOL_SEQUENCE.map((term,index)=>provider.getSolarTerm(index===11?seun.year+1:seun.year,term).instant);
    boundaries.push(new Date(seun.period.endInstant));
    for(let index=0;index<12;index++){
      const start=boundaries[index],end=boundaries[index+1];
      if(!start||!end||start.getTime()>=end.getTime())continue;
      const monthPillar=calculateMonthPillar(start,seun.pillar.stem,provider);
      const daeunSegments=seun.daeunSegments.flatMap(segment=>{const daeunStart=new Date(segment.startInstant).getTime(),
        daeunEnd=new Date(segment.endInstant).getTime(),segmentStart=Math.max(start.getTime(),daeunStart),segmentEnd=Math.min(end.getTime(),daeunEnd);
        return segmentStart<segmentEnd?[{...segment,startInstant:new Date(segmentStart).toISOString(),endInstant:new Date(segmentEnd).toISOString()}]:[];});
      periods.push({seunYear:seun.year,indexInSeun:index+1,solarMonthBranch:monthPillar.branch!,
        period:{startInstant:start.toISOString(),endInstant:end.toISOString()},pillar:{stem:monthPillar.stem!,branch:monthPillar.branch!},
        activeSeunYear:seun.year,activeSeunPillar:{...seun.pillar},activeDaeunIndex:daeunSegments.length===1?daeunSegments[0].daeunIndex:null,
        activeDaeunPillar:daeunSegments.length===1?daeunSegments[0].daeunPillar:null,daeunSegments});
    }
  }
  return{status:"implemented",ruleVersion:RULE.generationVersion,periods,evidence:[
    "기존 month-pillar의 12절 경계·월지·五虎遁 월간 계산 재사용","14B seun interval 및 daeunSegments와 absolute interval 교차"]};
}
