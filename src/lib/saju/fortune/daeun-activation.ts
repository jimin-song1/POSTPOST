import { BRANCH_RELATIONS_V1 } from "@/rules/branch-relations.v1";
import { DAEUN_ACTIVATION_V1 as RULE } from "@/rules/daeun-activation.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { MOBILITY_STARS_V1 } from "@/rules/mobility-stars.v1";
import { NOBLE_STARS_V1 } from "@/rules/noble-stars.v1";
import { PUNISHMENT_V1 } from "@/rules/punishment.v1";
import { STEM_RELATIONS_V1 } from "@/rules/stem-relations.v1";
import { getTenGod, stemTrait } from "../interpretation/ten-gods";
import type { Branch, Element, LuckPeriod, Pillar, PillarPosition, RelationsResult, Stem } from "@/types/saju-analysis";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { DaeunActivationPeriod, FavorabilityRole, FortuneInteraction, FortuneResult } from "@/types/fortune";
import type { NobleSpecialStarsResult } from "@/types/noble-special-stars";
import type { StemPreferencesResult } from "@/types/stem-preferences";

const positions:PillarPosition[]=["year","month","day","hour"];
type DaeunSource={status:string;periods:LuckPeriod[]};
const role=(score:number):FavorabilityRole=>score>=80?"PRIMARY_FAVORABLE":score>=70?"STRONG_FAVORABLE":
  score>=60?"FAVORABLE":score>=45?"CONDITIONAL":score>=35?"NEUTRAL":"UNFAVORABLE";
export const activationLevel=(score:number)=>score>=RULE.activationLevels.veryHigh?"VERY_HIGH" as const:
  score>=RULE.activationLevels.high?"HIGH" as const:score>=RULE.activationLevels.moderate?"MODERATE" as const:"LOW" as const;
export const capActivationScore=(raw:number)=>Math.max(0,Math.min(RULE.cap,raw));

function interactions(index:number,fortuneStem:Stem,fortuneBranch:Branch,pillars:Record<PillarPosition,Pillar>,
  _relations:RelationsResult):FortuneInteraction[]{
  const prefix=`DAEUN-${String(index+1).padStart(2,"0")}`,rows:FortuneInteraction[]=[];
  const add=(row:FortuneInteraction)=>{if(!rows.some(existing=>existing.id===row.id))rows.push(row);};
  for(const position of positions){const natal=pillars[position].stem!;
    for(const rule of STEM_RELATIONS_V1.combinations)if((rule.pair as readonly Stem[]).includes(fortuneStem)&&(rule.pair as readonly Stem[]).includes(natal))
      add({id:`${prefix}:stem:${position}:STEM_COMBINATION`,domain:"stem",natalPosition:position,relationType:"STEM_COMBINATION",
        state:"ACTIVATED_PAIR",members:[...rule.pair],targetElement:rule.targetElement,activationPoints:RULE.activationPoints.STEM_COMBINATION,
        ruleVersion:STEM_RELATIONS_V1.rulesetVersion,transformationCandidate:true});
    for(const rule of STEM_RELATIONS_V1.clashes)if((rule.pair as readonly Stem[]).includes(fortuneStem)&&(rule.pair as readonly Stem[]).includes(natal))
      add({id:`${prefix}:stem:${position}:STEM_CLASH`,domain:"stem",natalPosition:position,relationType:"STEM_CLASH",
        state:"ACTIVATED_PAIR",members:[...rule.pair],activationPoints:RULE.activationPoints.STEM_CLASH,
        ruleVersion:STEM_RELATIONS_V1.rulesetVersion,transformationCandidate:false});}
  const pair=(rules:readonly {pair:readonly[Branch,Branch];rule:string}[],relationType:string,points:number,ruleVersion:string)=>{
    for(const rule of rules){if(!(rule.pair as readonly Branch[]).includes(fortuneBranch))continue;
      const other=rule.pair.find(value=>value!==fortuneBranch)!;
      for(const position of positions.filter(pos=>pillars[pos].branch===other))add({id:`${prefix}:branch:${position}:${relationType}`,
        domain:"branch",natalPosition:position,relationType,state:"ACTIVATED_PAIR",members:[...rule.pair],activationPoints:points,
        ruleVersion,transformationCandidate:false});}};
  pair(BRANCH_RELATIONS_V1.sixCombinations,"SIX_COMBINATION",RULE.activationPoints.SIX_COMBINATION,BRANCH_RELATIONS_V1.rulesetVersion);
  pair(BRANCH_RELATIONS_V1.clashes,"BRANCH_CLASH",RULE.activationPoints.BRANCH_CLASH,BRANCH_RELATIONS_V1.rulesetVersion);
  pair(PUNISHMENT_V1.mutual,"MUTUAL_PUNISHMENT",RULE.activationPoints.MUTUAL_PUNISHMENT,PUNISHMENT_V1.rulesetVersion);
  pair(BRANCH_RELATIONS_V1.harms,"BRANCH_HARM",RULE.activationPoints.BRANCH_HARM,BRANCH_RELATIONS_V1.rulesetVersion);
  pair(BRANCH_RELATIONS_V1.breaks,"BRANCH_BREAK",RULE.activationPoints.BRANCH_BREAK,BRANCH_RELATIONS_V1.rulesetVersion);
  pair(BRANCH_RELATIONS_V1.wonjin,"WONJIN",RULE.activationPoints.WONJIN,BRANCH_RELATIONS_V1.rulesetVersion);
  const groups=(rules:readonly {group:readonly[Branch,Branch,Branch];targetElement?:Element}[],relationType:"THREE_HARMONY"|"DIRECTIONAL_COMBINATION"|"THREE_PUNISHMENT",ruleVersion:string)=>{
    for(const rule of rules){if(!(rule.group as readonly Branch[]).includes(fortuneBranch))continue;
      const natalSet=new Set(positions.map(pos=>pillars[pos].branch!));const before=rule.group.filter(branch=>natalSet.has(branch)).length;
      const after=new Set([...rule.group.filter(branch=>natalSet.has(branch)),fortuneBranch]).size;if(after<2)continue;
      const complete=after===3,repeated=natalSet.has(fortuneBranch)&&before>=2;const key=`${relationType}_${complete?"COMPLETE":"PARTIAL"}` as keyof typeof RULE.activationPoints;
      add({id:`${prefix}:branch:group:${relationType}:${rule.group.join("")}`,domain:"branch",relationType,
        state:repeated?"REPEATED_EXISTING_CONTEXT":complete?"ACTIVATED_COMPLETE":"ACTIVATED_PARTIAL",members:[...rule.group],
        ...(rule.targetElement?{targetElement:rule.targetElement}:{}),activationPoints:RULE.activationPoints[key],ruleVersion,transformationCandidate:false});}};
  groups(BRANCH_RELATIONS_V1.threeHarmonies,"THREE_HARMONY",BRANCH_RELATIONS_V1.rulesetVersion);
  groups(BRANCH_RELATIONS_V1.directionalCombinations,"DIRECTIONAL_COMBINATION",BRANCH_RELATIONS_V1.rulesetVersion);
  groups(PUNISHMENT_V1.three,"THREE_PUNISHMENT",PUNISHMENT_V1.rulesetVersion);
  const self=PUNISHMENT_V1.self.find(rule=>rule.branch===fortuneBranch);
  if(self)for(const position of positions.filter(pos=>pillars[pos].branch===fortuneBranch))add({id:`${prefix}:branch:${position}:SELF_PUNISHMENT`,
    domain:"branch",natalPosition:position,relationType:"SELF_PUNISHMENT",state:"ACTIVATED_PAIR",members:[fortuneBranch,fortuneBranch],
    activationPoints:RULE.activationPoints.SELF_PUNISHMENT,ruleVersion:PUNISHMENT_V1.rulesetVersion,transformationCandidate:false});
  return rows;
}

function starActivations(stem:Stem,branch:Branch,pillars:Record<PillarPosition,Pillar>,stars:NobleSpecialStarsResult){
  const tags:Array<{type:string;basis:string;target:Stem|Branch;ruleVersion:string}>=[];
  for(const [type,table] of Object.entries(NOBLE_STARS_V1.byDayStem))if((table[pillars.day.stem!] as readonly Branch[]).includes(branch))
    tags.push({type:"NOBLE_STAR_ACTIVATED",basis:type,target:branch,ruleVersion:NOBLE_STARS_V1.ruleVersion});
  for(const [basisName,basis] of [["YEAR_BRANCH",pillars.year.branch!],["DAY_BRANCH",pillars.day.branch!]] as const){
    const group=MOBILITY_STARS_V1.groups.find(row=>(row.members as readonly Branch[]).includes(basis))!;
    if(branch===group.peach)tags.push({type:"PEACH_BLOSSOM_ACTIVATED",basis:basisName,target:branch,ruleVersion:MOBILITY_STARS_V1.ruleVersion});
    if(branch===group.travel)tags.push({type:"TRAVEL_HORSE_ACTIVATED",basis:basisName,target:branch,ruleVersion:MOBILITY_STARS_V1.ruleVersion});
    if(branch===group.canopy)tags.push({type:"FLOWER_CANOPY_ACTIVATED",basis:basisName,target:branch,ruleVersion:MOBILITY_STARS_V1.ruleVersion});}
  if(stars.void.voidBranches.includes(branch))tags.push({type:"VOID_ACTIVATED",basis:stars.void.xunStart,target:branch,ruleVersion:stars.void.ruleVersion});
  return tags;
}

export function evaluateDaeunActivation(source:DaeunSource,pillars:Record<PillarPosition,Pillar>,relations:RelationsResult,
  stemPreferences:StemPreferencesResult,branchPreferences:BranchPreferencesResult,stars:NobleSpecialStarsResult):FortuneResult{
  if(source.status!=="implemented")return{status:"not_implemented",daeun:{status:"not_implemented",ruleVersion:RULE.ruleVersion,periods:[],
    evidence:["implemented daeun source required"]},seun:{status:"not_implemented"},wolun:{status:"not_implemented"},synthesis:{status:"not_implemented"}};
  const dayMaster=pillars.day.stem!;
  const periods:DaeunActivationPeriod[]=source.periods.map((sourcePeriod,index)=>{
    const fortuneStem=sourcePeriod.pillar[0] as Stem,fortuneBranch=sourcePeriod.pillar[1] as Branch;
    const stemPreference=stemPreferences.stems.find(row=>row.stem===fortuneStem)!;
    const branchPreference=branchPreferences.branches.find(row=>row.branch===fortuneBranch)!;
    const baseFavorabilityScore=stemPreference.score*RULE.preferenceWeights.stem+branchPreference.score*RULE.preferenceWeights.branch;
    const hidden=HIDDEN_STEMS_V1.branches[fortuneBranch],items=(["mainQi","middleQi","residualQi"] as const).flatMap(qiRole=>hidden[qiRole]?[{qiRole,stem:hidden[qiRole]}]:[]);
    const allocation=items.length===1?ELEMENT_WEIGHT_V1.allocations.one:items.length===2?ELEMENT_WEIGHT_V1.allocations.two:ELEMENT_WEIGHT_V1.allocations.three;
    const detected=interactions(index,fortuneStem,fortuneBranch,pillars,relations);
    const rawScore=detected.reduce((sum,row)=>sum+row.activationPoints,0),score=capActivationScore(rawScore);
    return{index:index+1,sourcePeriod:structuredClone(sourcePeriod),pillar:{stem:fortuneStem,branch:fortuneBranch},
      preference:{stemScore:stemPreference.score,stemRole:stemPreference.role,branchScore:branchPreference.score,
        branchRole:branchPreference.role,baseFavorabilityScore,role:role(baseFavorabilityScore)},
      tenGodProfile:{stemTenGod:getTenGod(dayMaster,fortuneStem).korean,branchHiddenTenGods:items.map(item=>({stem:item.stem!,
        tenGod:getTenGod(dayMaster,item.stem!).korean,weight:allocation[item.qiRole]}))},interactions:detected,
      activation:{rawScore,score,level:activationLevel(score)},starActivations:starActivations(fortuneStem,fortuneBranch,pillars,stars),
      evidence:[`favorability=${stemPreference.score}×0.45+${branchPreference.score}×0.55=${baseFavorabilityScore}`,
        `activation=${detected.map(row=>row.activationPoints).join("+")||"0"}=${rawScore}; cap=${score}`]};});
  return{status:"partial",daeun:{status:"implemented",ruleVersion:RULE.ruleVersion,periods,
    evidence:["기존 daeun periods를 순서·기간 변경 없이 분석"]},seun:{status:"not_implemented"},wolun:{status:"not_implemented"},synthesis:{status:"not_implemented"}};
}

export const daeunFavorabilityRole=role;
