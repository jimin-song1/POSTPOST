import { SEUN_ACTIVATION_V1 as RULE } from "@/rules/seun-activation.v1";
import type { Branch, LuckPeriod, Stem } from "@/types/saju-analysis";
import type { DaeunSegment } from "@/types/fortune";
import { calculateYearPillar } from "../pillars/year";
import type { SolarTermProvider } from "../solarTerms";

export interface SeunSourcePeriod {year:number;period:{startInstant:string;endInstant:string};
  pillar:{stem:Stem;branch:Branch};activeDaeunIndex:number|null;activeDaeunPillar:string|null;daeunSegments:DaeunSegment[];}
export interface SeunSourceResult {status:"implemented";ruleVersion:"seun-generation-v1";periods:SeunSourcePeriod[];evidence:string[];}

export function generateSeun(daeunPeriods:LuckPeriod[],provider:SolarTermProvider):SeunSourceResult{
  const bounded=daeunPeriods.map((period,index)=>({period,index:index+1,start:period.startInstant&&new Date(period.startInstant),
    end:period.endInstant&&new Date(period.endInstant)})).filter((row):row is typeof row&{start:Date;end:Date}=>
      row.start instanceof Date&&row.end instanceof Date&&!Number.isNaN(row.start.getTime())&&!Number.isNaN(row.end.getTime()));
  if(!bounded.length)return{status:"implemented",ruleVersion:RULE.generationVersion,periods:[],evidence:["No exact daeun intervals"]};
  const rangeStart=Math.min(...bounded.map(row=>row.start.getTime())),rangeEnd=Math.max(...bounded.map(row=>row.end.getTime()));
  const firstYear=Math.max(provider.supportedRange[0],new Date(rangeStart).getUTCFullYear()-1);
  const lastYear=Math.min(provider.supportedRange[1]-1,new Date(rangeEnd).getUTCFullYear()+1);
  const periods:SeunSourcePeriod[]=[];
  for(let year=firstYear;year<=lastYear;year++){
    const start=provider.getSolarTerm(year,"입춘").instant,end=provider.getSolarTerm(year+1,"입춘").instant;
    if(start.getTime()>=rangeEnd||end.getTime()<=rangeStart)continue;
    const daeunSegments=bounded.flatMap(({period,index,start:daeunStart,end:daeunEnd})=>{
      const segmentStart=Math.max(start.getTime(),daeunStart.getTime()),segmentEnd=Math.min(end.getTime(),daeunEnd.getTime());
      return segmentStart<segmentEnd?[{daeunIndex:index,daeunPillar:period.pillar,startInstant:new Date(segmentStart).toISOString(),
        endInstant:new Date(segmentEnd).toISOString()}]:[];});
    if(!daeunSegments.length)continue;
    const yearPillar=calculateYearPillar(start,year,provider);
    periods.push({year,period:{startInstant:start.toISOString(),endInstant:end.toISOString()},
      pillar:{stem:yearPillar.stem!,branch:yearPillar.branch!},
      activeDaeunIndex:daeunSegments.length===1?daeunSegments[0].daeunIndex:null,
      activeDaeunPillar:daeunSegments.length===1?daeunSegments[0].daeunPillar:null,daeunSegments});
  }
  return{status:"implemented",ruleVersion:RULE.generationVersion,periods,
    evidence:["Solar Term Provider의 입춘 absolute instant로 경계 생성","정확한 daeun startInstant/endInstant와 interval 교차"]};
}
