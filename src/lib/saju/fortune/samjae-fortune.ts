import {SAMJAE_FORTUNE_V1 as RULE} from "@/rules/samjae-fortune.v1";
import type {FortuneResult,SeunActivationPeriod} from "@/types/fortune";
import type {NobleSpecialStarsResult} from "@/types/noble-special-stars";
import type {Branch} from "@/types/saju-analysis";
import type {SamjaeCycle,SamjaeFortuneResult,SamjaePhase,SamjaeYearResult} from "@/types/samjae";

const phase=(row:SeunActivationPeriod):SamjaePhase=>row.samjaeActivation?RULE.phaseByLabel[row.samjaeActivation.stage]:"NONE";
export function evaluateSamjaeFortune(natalYearBranch:Branch,stars:NobleSpecialStarsResult,fortune:FortuneResult):SamjaeFortuneResult{
  if(fortune.seun.status!=="implemented"||!fortune.seun.periods||fortune.synthesis.status!=="implemented")throw new Error("implemented seun and fortune synthesis required");
  const summaries=new Map(fortune.synthesis.seunPeriodSummaries.map(row=>[Number(row.periodId.slice(5)),row]));
  let cycleCounter=0,currentCycle:number|null=null;
  const years:SamjaeYearResult[]=fortune.seun.periods.map(row=>{
    const currentPhase=phase(row);if(currentPhase==="DEUL"){cycleCounter+=1;currentCycle=cycleCounter;}else if(currentPhase==="NONE")currentCycle=null;
    const summary=summaries.get(row.year),natalRelationHits=row.interactions.natal.length,daeunRelationHits=row.interactions.daeun.length,
      seunRelationHits=row.interactions.crossLayer.length,relationActivation=natalRelationHits+daeunRelationHits+seunRelationHits>0;
    const isSamjae=currentPhase!=="NONE",samjaeBranch=isSamjae?row.pillar.branch:null;
    return{year:row.year,isSamjae,phase:currentPhase,natalYearBranch,samjaeBranch,cycleIndex:isSamjae?currentCycle:null,
      natalRelationHits,daeunRelationHits,seunRelationHits,daeunOverlap:row.daeunSegments.length>0,relationActivation,
      supportScore:summary?.favorabilityScore??row.preference.baseFavorabilityScore,activationScore:summary?.activationScore??row.activation.score,
      evidence:[`samjae-v1:${natalYearBranch}->${samjaeBranch??"NONE"}`,`SEUN-${row.year}:support`, `SEUN-${row.year}:activation`],
      reasons:[...(isSamjae?[`${currentPhase} 단계 지지 ${samjaeBranch}`]:["삼재 지지와 일치하지 않음"]),
        ...(relationActivation?[`원국 ${natalRelationHits}, 대운 ${daeunRelationHits}, 교차 ${seunRelationHits} 관계 활성`]:["추가 관계 활성 없음"])]};
  });
  const samjaeCycles:SamjaeCycle[]=Array.from(new Set(years.flatMap(row=>row.cycleIndex??[]))).map(cycleIndex=>{
    const rows=years.filter(row=>row.cycleIndex===cycleIndex),byPhase=new Map(rows.map(row=>[row.phase,row]));
    const deul=byPhase.get("DEUL")!,nul=byPhase.get("NUL")!,nal=byPhase.get("NAL")!;
    return{cycleIndex,startYear:deul.year,middleYear:nul.year,endYear:nal.year,
      phases:rows.map(row=>({year:row.year,phase:row.phase,samjaeBranch:row.samjaeBranch,supportScore:row.supportScore,activationScore:row.activationScore})),
      daeunIndexes:Array.from(new Set(fortune.seun.periods!.filter(row=>rows.some(item=>item.year===row.year)).flatMap(row=>row.daeunSegments.map(segment=>segment.daeunIndex)))).sort((a,b)=>a-b)};
  }).filter(row=>row.phases.length===3);
  return{status:"implemented",ruleVersion:RULE.ruleVersion,activationRuleVersion:RULE.activationRuleVersion,natalYearBranch,years,samjaeCycles,
    evidence:["생년지 삼합 그룹의 들·눌·날 지지를 세운 지지와 비교","삼재 여부와 support/activation을 별도 필드로 보존","기존 fortune synthesis 점수를 변경하지 않음"]};
}
