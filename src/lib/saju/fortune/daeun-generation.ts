import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import { DAEUN_GENERATION_V1 as RULE } from "@/rules/daeun-generation.v1";
import { stemTrait } from "../interpretation/ten-gods";
import type { Branch, LuckPeriod, Pillar, Stem } from "@/types/saju-analysis";
import type { SajuInput } from "@/types/saju-input";

const DAY_MS=86_400_000,YEAR_MS=365.2425*DAY_MS;
const mod=(value:number,size:number)=>(value%size+size)%size;
export interface DaeunSourceResult {status:"implemented";direction:"forward"|"reverse";
  directionLabel:"순행"|"역행";referenceSolarTerm:"next"|"previous";exactStartAge:number;
  startAgeYears:number;startAgeMonths:number;startDatetime:string;periods:LuckPeriod[];evidence:string[];}

export function generateDaeun(yearStem:Stem,monthPillar:Pillar,gender:SajuInput["gender"],
  birthInstant:Date,previousJeol:Date,nextJeol:Date):DaeunSourceResult{
  if(!monthPillar.stem||!monthPillar.branch)throw new Error("Complete month pillar required");
  const polarity=stemTrait(yearStem).polarity;
  const direction=RULE.direction[polarity][gender],forward=direction==="forward";
  const reference=forward?nextJeol:previousJeol;
  const differenceDays=Math.abs(reference.getTime()-birthInstant.getTime())/DAY_MS;
  const exactStartAge=differenceDays/RULE.daysPerYearOfLuck;
  let startAgeYears=Math.floor(exactStartAge),startAgeMonths=Math.round((exactStartAge-startAgeYears)*12);
  if(startAgeMonths===12){startAgeYears++;startAgeMonths=0;}
  const startDatetime=new Date(birthInstant.getTime()+exactStartAge*YEAR_MS);
  const stemIndex=HEAVENLY_STEMS.indexOf(monthPillar.stem),branchIndex=EARTHLY_BRANCHES.indexOf(monthPillar.branch);
  const step=forward?1:-1;
  const periods=Array.from({length:RULE.periodCount},(_,index):LuckPeriod=>{
    const stem=HEAVENLY_STEMS[mod(stemIndex+step*(index+1),10)];
    const branch=EARTHLY_BRANCHES[mod(branchIndex+step*(index+1),12)];
    const periodStartAge=startAgeYears+index*RULE.periodYears;
    const periodEndAge=periodStartAge+RULE.periodYears;
    const periodStart=new Date(startDatetime.getTime()+index*RULE.periodYears*YEAR_MS);
    const periodEnd=new Date(startDatetime.getTime()+(index+1)*RULE.periodYears*YEAR_MS);
    return{ageRange:`${periodStartAge}세 ${startAgeMonths}개월~${periodEndAge}세 ${startAgeMonths}개월`,pillar:`${stem}${branch}`,
      startAgeYears:periodStartAge,endAgeYears:periodEndAge,startAgeMonths,endAgeMonths:startAgeMonths,
      startDatetime:periodStart.toISOString(),endDatetime:periodEnd.toISOString()};});
  return{status:"implemented",direction,directionLabel:forward?"순행":"역행",referenceSolarTerm:forward?"next":"previous",
    exactStartAge,startAgeYears,startAgeMonths,startDatetime:startDatetime.toISOString(),periods,
    evidence:[`${RULE.directionVersion}: ${yearStem}/${polarity}/${gender} -> ${direction}`,
      `${RULE.startAgeVersion}: 절입 차이 ${differenceDays}일 ÷ ${RULE.daysPerYearOfLuck}`,
      `${RULE.sequenceVersion}: 월주 ${monthPillar.stem}${monthPillar.branch}에서 ${forward?"순":"역"}방향 10개`]};
}
