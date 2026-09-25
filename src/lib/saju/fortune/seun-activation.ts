import { BRANCH_RELATIONS_V1 } from "@/rules/branch-relations.v1";
import { DAEUN_ACTIVATION_V1 } from "@/rules/daeun-activation.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { MOBILITY_STARS_V1 } from "@/rules/mobility-stars.v1";
import { NOBLE_STARS_V1 } from "@/rules/noble-stars.v1";
import { PUNISHMENT_V1 } from "@/rules/punishment.v1";
import { SEUN_ACTIVATION_V1 as RULE } from "@/rules/seun-activation.v1";
import { STEM_RELATIONS_V1 } from "@/rules/stem-relations.v1";
import { YANG_BLADE_STRUCTURE_V1 } from "@/rules/yang-blade-structure.v1";
import type { Branch, Element, LuckPeriod, Pillar, PillarPosition, Stem } from "@/types/saju-analysis";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { FortuneResult, LayerParticipant, SeunActivationPeriod, SeunInteraction } from "@/types/fortune";
import type { NobleSpecialStarsResult } from "@/types/noble-special-stars";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import { getTenGod } from "../interpretation/ten-gods";
import { activationLevel,capActivationScore,daeunFavorabilityRole } from "./daeun-activation";
import type { SeunSourceResult } from "./seun-generation";

const positions:PillarPosition[]=["year","month","day","hour"];
const points=DAEUN_ACTIVATION_V1.activationPoints;
type PairRule={pair:readonly[Branch,Branch];rule:string};
type GroupRule={group:readonly[Branch,Branch,Branch];targetElement?:Element};

function pairMatches<T extends Stem|Branch>(pair:readonly T[],left:T,right:T){return pair.includes(left)&&pair.includes(right);}
function unique(rows:SeunInteraction[]){return Array.from(new Map(rows.map(row=>[row.id,row])).values());}

function pairInteraction(id:string,domain:"stem"|"branch",relationType:string,members:Array<Stem|Branch>,activationPoints:number,
  ruleVersion:string,layerPair:SeunInteraction["layerPair"],participants:LayerParticipant[],natalPosition?:PillarPosition,
  daeunIndex?:number,targetElement?:Element):SeunInteraction{
  return{id,domain,natalPosition,relationType,state:"ACTIVATED_PAIR",members,targetElement,activationPoints,ruleVersion,
    transformationCandidate:relationType==="STEM_COMBINATION",layerPair,daeunIndex,participants};
}

function natalInteractions(year:number,seunStem:Stem,seunBranch:Branch,pillars:Record<PillarPosition,Pillar>){
  const prefix=`SEUN-${year}:NATAL`,rows:SeunInteraction[]=[];
  for(const position of positions){const natalStem=pillars[position].stem!,natalBranch=pillars[position].branch!;
    for(const rule of STEM_RELATIONS_V1.combinations)if(pairMatches(rule.pair,seunStem,natalStem))rows.push(pairInteraction(
      `${prefix}:stem:${position}:STEM_COMBINATION`,"stem","STEM_COMBINATION",[...rule.pair],points.STEM_COMBINATION,
      STEM_RELATIONS_V1.rulesetVersion,"NATAL_SEUN",[{layer:"NATAL",position,stem:natalStem},{layer:"SEUN",year,stem:seunStem}],position,undefined,rule.targetElement));
    for(const rule of STEM_RELATIONS_V1.clashes)if(pairMatches(rule.pair,seunStem,natalStem))rows.push(pairInteraction(
      `${prefix}:stem:${position}:STEM_CLASH`,"stem","STEM_CLASH",[...rule.pair],points.STEM_CLASH,
      STEM_RELATIONS_V1.rulesetVersion,"NATAL_SEUN",[{layer:"NATAL",position,stem:natalStem},{layer:"SEUN",year,stem:seunStem}],position));
    const branchPairs=(rules:readonly PairRule[],type:string,value:number,version:string)=>{
      for(const rule of rules)if(pairMatches(rule.pair,seunBranch,natalBranch))rows.push(pairInteraction(
        `${prefix}:branch:${position}:${type}`,"branch",type,[...rule.pair],value,version,"NATAL_SEUN",
        [{layer:"NATAL",position,branch:natalBranch},{layer:"SEUN",year,branch:seunBranch}],position));};
    branchPairs(BRANCH_RELATIONS_V1.sixCombinations,"SIX_COMBINATION",points.SIX_COMBINATION,BRANCH_RELATIONS_V1.rulesetVersion);
    branchPairs(BRANCH_RELATIONS_V1.clashes,"BRANCH_CLASH",points.BRANCH_CLASH,BRANCH_RELATIONS_V1.rulesetVersion);
    branchPairs(PUNISHMENT_V1.mutual,"MUTUAL_PUNISHMENT",points.MUTUAL_PUNISHMENT,PUNISHMENT_V1.rulesetVersion);
    branchPairs(BRANCH_RELATIONS_V1.harms,"BRANCH_HARM",points.BRANCH_HARM,BRANCH_RELATIONS_V1.rulesetVersion);
    branchPairs(BRANCH_RELATIONS_V1.breaks,"BRANCH_BREAK",points.BRANCH_BREAK,BRANCH_RELATIONS_V1.rulesetVersion);
    branchPairs(BRANCH_RELATIONS_V1.wonjin,"WONJIN",points.WONJIN,BRANCH_RELATIONS_V1.rulesetVersion);
  }
  if(PUNISHMENT_V1.self.some(rule=>rule.branch===seunBranch))for(const position of positions.filter(pos=>pillars[pos].branch===seunBranch))
    rows.push(pairInteraction(`${prefix}:branch:${position}:SELF_PUNISHMENT`,"branch","SELF_PUNISHMENT",[seunBranch,seunBranch],
      points.SELF_PUNISHMENT,PUNISHMENT_V1.rulesetVersion,"NATAL_SEUN",
      [{layer:"NATAL",position,branch:seunBranch},{layer:"SEUN",year,branch:seunBranch}],position));
  const addGroups=(rules:readonly GroupRule[],type:"THREE_HARMONY"|"DIRECTIONAL_COMBINATION"|"THREE_PUNISHMENT",version:string)=>{
    const natalBranches=new Set(positions.map(position=>pillars[position].branch!));
    for(const rule of rules){if(!rule.group.includes(seunBranch))continue;const before=rule.group.filter(branch=>natalBranches.has(branch)).length;
      const after=new Set([...rule.group.filter(branch=>natalBranches.has(branch)),seunBranch]).size;if(after<2)continue;
      const complete=after===3,repeated=natalBranches.has(seunBranch)&&before>=2;
      const key=`${type}_${complete?"COMPLETE":"PARTIAL"}` as keyof typeof points;
      const participants:LayerParticipant[]=rule.group.flatMap(branch=>positions.filter(pos=>pillars[pos].branch===branch)
        .map(position=>({layer:"NATAL" as const,position,branch})));
      participants.push({layer:"SEUN",year,branch:seunBranch});
      rows.push({id:`${prefix}:group:${type}:${rule.group.join("")}`,domain:"branch",relationType:type,
        state:repeated?"REPEATED_EXISTING_CONTEXT":complete?"ACTIVATED_COMPLETE":"ACTIVATED_PARTIAL",members:[...rule.group],
        targetElement:rule.targetElement,activationPoints:points[key],ruleVersion:version,transformationCandidate:false,
        layerPair:"NATAL_SEUN",participants});}}
  addGroups(BRANCH_RELATIONS_V1.threeHarmonies,"THREE_HARMONY",BRANCH_RELATIONS_V1.rulesetVersion);
  addGroups(BRANCH_RELATIONS_V1.directionalCombinations,"DIRECTIONAL_COMBINATION",BRANCH_RELATIONS_V1.rulesetVersion);
  addGroups(PUNISHMENT_V1.three,"THREE_PUNISHMENT",PUNISHMENT_V1.rulesetVersion);
  return unique(rows);
}

function daeunInteractions(year:number,seunStem:Stem,seunBranch:Branch,daeunIndex:number,daeunPillar:string){
  const daeunStem=daeunPillar[0] as Stem,daeunBranch=daeunPillar[1] as Branch,prefix=`SEUN-${year}:DAEUN-${String(daeunIndex).padStart(2,"0")}`;
  const rows:SeunInteraction[]=[],participants=(domain:"stem"|"branch"):LayerParticipant[]=>domain==="stem"?
    [{layer:"DAEUN",daeunIndex,stem:daeunStem},{layer:"SEUN",year,stem:seunStem}]:
    [{layer:"DAEUN",daeunIndex,branch:daeunBranch},{layer:"SEUN",year,branch:seunBranch}];
  for(const rule of STEM_RELATIONS_V1.combinations)if(pairMatches(rule.pair,seunStem,daeunStem))rows.push(pairInteraction(
    `${prefix}:stem:STEM_COMBINATION`,"stem","STEM_COMBINATION",[...rule.pair],points.STEM_COMBINATION,
    STEM_RELATIONS_V1.rulesetVersion,"DAEUN_SEUN",participants("stem"),undefined,daeunIndex,rule.targetElement));
  for(const rule of STEM_RELATIONS_V1.clashes)if(pairMatches(rule.pair,seunStem,daeunStem))rows.push(pairInteraction(
    `${prefix}:stem:STEM_CLASH`,"stem","STEM_CLASH",[...rule.pair],points.STEM_CLASH,
    STEM_RELATIONS_V1.rulesetVersion,"DAEUN_SEUN",participants("stem"),undefined,daeunIndex));
  const branchPairs=(rules:readonly PairRule[],type:string,value:number,version:string)=>{
    for(const rule of rules)if(pairMatches(rule.pair,seunBranch,daeunBranch))rows.push(pairInteraction(
      `${prefix}:branch:${type}`,"branch",type,[...rule.pair],value,version,"DAEUN_SEUN",participants("branch"),undefined,daeunIndex));};
  branchPairs(BRANCH_RELATIONS_V1.sixCombinations,"SIX_COMBINATION",points.SIX_COMBINATION,BRANCH_RELATIONS_V1.rulesetVersion);
  branchPairs(BRANCH_RELATIONS_V1.clashes,"BRANCH_CLASH",points.BRANCH_CLASH,BRANCH_RELATIONS_V1.rulesetVersion);
  branchPairs(PUNISHMENT_V1.mutual,"MUTUAL_PUNISHMENT",points.MUTUAL_PUNISHMENT,PUNISHMENT_V1.rulesetVersion);
  branchPairs(BRANCH_RELATIONS_V1.harms,"BRANCH_HARM",points.BRANCH_HARM,BRANCH_RELATIONS_V1.rulesetVersion);
  branchPairs(BRANCH_RELATIONS_V1.breaks,"BRANCH_BREAK",points.BRANCH_BREAK,BRANCH_RELATIONS_V1.rulesetVersion);
  branchPairs(BRANCH_RELATIONS_V1.wonjin,"WONJIN",points.WONJIN,BRANCH_RELATIONS_V1.rulesetVersion);
  if(daeunBranch===seunBranch&&PUNISHMENT_V1.self.some(rule=>rule.branch===seunBranch))rows.push(pairInteraction(
    `${prefix}:branch:SELF_PUNISHMENT`,"branch","SELF_PUNISHMENT",[seunBranch,seunBranch],points.SELF_PUNISHMENT,
    PUNISHMENT_V1.rulesetVersion,"DAEUN_SEUN",participants("branch"),undefined,daeunIndex));
  return unique(rows);
}

function crossLayerGroups(year:number,seunBranch:Branch,daeunIndex:number,daeunPillar:string,pillars:Record<PillarPosition,Pillar>){
  const daeunBranch=daeunPillar[1] as Branch,prefix=`SEUN-${year}:CROSS_LAYER`,rows:SeunInteraction[]=[];
  const add=(rules:readonly GroupRule[],type:"THREE_HARMONY"|"DIRECTIONAL_COMBINATION"|"THREE_PUNISHMENT",version:string)=>{
    const natalBranches=new Set(positions.map(position=>pillars[position].branch!));
    for(const rule of rules){if(!rule.group.includes(seunBranch)||!rule.group.includes(daeunBranch))continue;
      const before=new Set([...rule.group.filter(branch=>natalBranches.has(branch)),daeunBranch]);
      const after=new Set([...Array.from(before),seunBranch]);if(after.size<2)continue;const complete=after.size===3,repeated=before.size===3;
      const key=`${type}_${complete?"COMPLETE":"PARTIAL"}` as keyof typeof points;
      const participants:LayerParticipant[]=rule.group.flatMap(branch=>positions.filter(pos=>pillars[pos].branch===branch)
        .map(position=>({layer:"NATAL" as const,position,branch})));
      participants.push({layer:"DAEUN",daeunIndex,branch:daeunBranch},{layer:"SEUN",year,branch:seunBranch});
      rows.push({id:`${prefix}:${type}:${rule.group.join("")}:DAEUN-${String(daeunIndex).padStart(2,"0")}`,domain:"branch",
        relationType:type,state:repeated?"REPEATED_EXISTING_CONTEXT":complete?"CROSS_LAYER_COMPLETE":"ACTIVATED_PARTIAL",
        members:[...rule.group],targetElement:rule.targetElement,activationPoints:points[key],ruleVersion:version,
        transformationCandidate:false,layerPair:"CROSS_LAYER",daeunIndex,participants});}}
  add(BRANCH_RELATIONS_V1.threeHarmonies,"THREE_HARMONY",BRANCH_RELATIONS_V1.rulesetVersion);
  add(BRANCH_RELATIONS_V1.directionalCombinations,"DIRECTIONAL_COMBINATION",BRANCH_RELATIONS_V1.rulesetVersion);
  add(PUNISHMENT_V1.three,"THREE_PUNISHMENT",PUNISHMENT_V1.rulesetVersion);
  return unique(rows);
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
  const blade=YANG_BLADE_STRUCTURE_V1.byDayStem[pillars.day.stem! as keyof typeof YANG_BLADE_STRUCTURE_V1.byDayStem];
  if(blade===branch)tags.push({type:"YANG_BLADE_ACTIVATED",basis:"DAY_STEM",target:branch,ruleVersion:YANG_BLADE_STRUCTURE_V1.rulesetVersion});
  if(stars.void.voidBranches.includes(branch))tags.push({type:"VOID_ACTIVATED",basis:stars.void.xunStart,target:branch,ruleVersion:stars.void.ruleVersion});
  return tags;
}

export function evaluateSeunActivation(source:SeunSourceResult,daeunPeriods:LuckPeriod[],pillars:Record<PillarPosition,Pillar>,
  stemPreferences:StemPreferencesResult,branchPreferences:BranchPreferencesResult,stars:NobleSpecialStarsResult,
  daeunResult:FortuneResult["daeun"]):FortuneResult["seun"]{
  const dayMaster=pillars.day.stem!;
  const periods:SeunActivationPeriod[]=source.periods.map(seun=>{
    const stemPreference=stemPreferences.stems.find(row=>row.stem===seun.pillar.stem)!;
    const branchPreference=branchPreferences.branches.find(row=>row.branch===seun.pillar.branch)!;
    const baseFavorabilityScore=stemPreference.score*RULE.preferenceWeights.stem+branchPreference.score*RULE.preferenceWeights.branch;
    const hidden=HIDDEN_STEMS_V1.branches[seun.pillar.branch],items=(["mainQi","middleQi","residualQi"] as const)
      .flatMap(qiRole=>hidden[qiRole]?[{qiRole,stem:hidden[qiRole]}]:[]);
    const allocation=items.length===1?ELEMENT_WEIGHT_V1.allocations.one:items.length===2?ELEMENT_WEIGHT_V1.allocations.two:ELEMENT_WEIGHT_V1.allocations.three;
    const natal=natalInteractions(seun.year,seun.pillar.stem,seun.pillar.branch,pillars);
    const daeun=unique(seun.daeunSegments.flatMap(segment=>daeunInteractions(seun.year,seun.pillar.stem,seun.pillar.branch,
      segment.daeunIndex,segment.daeunPillar)));
    const crossLayer=unique(seun.daeunSegments.flatMap(segment=>crossLayerGroups(seun.year,seun.pillar.branch,
      segment.daeunIndex,segment.daeunPillar,pillars)));
    const natalRawScore=natal.reduce((sum,row)=>sum+row.activationPoints,0);
    const crossLayerRawScore=[...daeun,...crossLayer].reduce((sum,row)=>sum+row.activationPoints,0);
    const rawScore=natalRawScore+crossLayerRawScore,score=capActivationScore(rawScore);
    const samjaeEntry=Object.entries(stars.samjae.stages).find(([,target])=>target===seun.pillar.branch) as
      ["들삼재"|"눌삼재"|"날삼재",Branch]|undefined;
    return{...seun,preference:{stemScore:stemPreference.score,stemRole:stemPreference.role,branchScore:branchPreference.score,
      branchRole:branchPreference.role,baseFavorabilityScore,role:daeunFavorabilityRole(baseFavorabilityScore)},
      tenGodProfile:{stemTenGod:getTenGod(dayMaster,seun.pillar.stem).korean,branchHiddenTenGods:items.map(item=>({stem:item.stem!,
        tenGod:getTenGod(dayMaster,item.stem!).korean,weight:allocation[item.qiRole]}))},interactions:{natal,daeun,crossLayer},
      activation:{natalRawScore,crossLayerRawScore,rawScore,score,level:activationLevel(score)},
      starActivations:starActivations(seun.pillar.stem,seun.pillar.branch,pillars,stars),
      samjaeActivation:samjaeEntry?{type:"SAMJAE_ACTIVATED",stage:samjaeEntry[0],branch:samjaeEntry[1],ruleVersion:stars.samjae.ruleVersion}:null,
      evidence:[`${RULE.preferenceVersion}: ${stemPreference.score}×0.45+${branchPreference.score}×0.55=${baseFavorabilityScore}`,
        `activation=natal ${natalRawScore}+cross-layer ${crossLayerRawScore}=${rawScore}; cap=${score}`,
        `14A daeun↔natal interactions not rescored; source periods=${daeunPeriods.length}; analysis periods=${daeunResult.periods.length}`]};});
  return{status:"implemented",ruleVersion:RULE.ruleVersion,periods,
    evidence:[`${RULE.generationVersion}: 입춘 absolute instant periods`,`${RULE.layerInteractionVersion}: NATAL_SEUN/DAEUN_SEUN/CROSS_LAYER`]};
}
