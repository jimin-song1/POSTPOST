import { BRANCH_RELATIONS_V1 } from "@/rules/branch-relations.v1";
import { DAEUN_ACTIVATION_V1 } from "@/rules/daeun-activation.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { MOBILITY_STARS_V1 } from "@/rules/mobility-stars.v1";
import { NOBLE_STARS_V1 } from "@/rules/noble-stars.v1";
import { PUNISHMENT_V1 } from "@/rules/punishment.v1";
import { STEM_RELATIONS_V1 } from "@/rules/stem-relations.v1";
import { WOLUN_ACTIVATION_V1 as RULE } from "@/rules/wolun-activation.v1";
import { YANG_BLADE_STRUCTURE_V1 } from "@/rules/yang-blade-structure.v1";
import type { Branch,Element,Pillar,PillarPosition,Stem } from "@/types/saju-analysis";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { LayerParticipant,SeunActivationPeriod,SeunInteraction,WolunActivationPeriod } from "@/types/fortune";
import type { NobleSpecialStarsResult } from "@/types/noble-special-stars";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import { getTenGod } from "../interpretation/ten-gods";
import { activationLevel,capActivationScore,daeunFavorabilityRole } from "./daeun-activation";
import type { WolunSourceResult } from "./wolun-generation";

const positions:PillarPosition[]=["year","month","day","hour"],points=DAEUN_ACTIVATION_V1.activationPoints;
type PairRule={pair:readonly[Branch,Branch];rule:string};type GroupRule={group:readonly[Branch,Branch,Branch];targetElement?:Element};
const match=<T extends Stem|Branch>(pair:readonly T[],a:T,b:T)=>pair.includes(a)&&pair.includes(b);
const unique=(rows:SeunInteraction[])=>Array.from(new Map(rows.map(row=>[row.id,row])).values());
const monthKey=(year:number,branch:Branch)=>`WOLUN-${year}-${branch}`;

function interaction(id:string,domain:"stem"|"branch",relationType:string,members:Array<Stem|Branch>,activationPoints:number,
  ruleVersion:string,layerPair:SeunInteraction["layerPair"],participants:LayerParticipant[],natalPosition?:PillarPosition,
  daeunIndex?:number,targetElement?:Element):SeunInteraction{return{id,domain,relationType,state:"ACTIVATED_PAIR",members,
    activationPoints,ruleVersion,layerPair,participants,natalPosition,daeunIndex,targetElement,
    transformationCandidate:relationType==="STEM_COMBINATION"};}

function natalInteractions(year:number,wolunStem:Stem,wolunBranch:Branch,pillars:Record<PillarPosition,Pillar>){
  const prefix=`${monthKey(year,wolunBranch)}:NATAL`,rows:SeunInteraction[]=[];
  for(const position of positions){const natalStem=pillars[position].stem!,natalBranch=pillars[position].branch!;
    for(const rule of STEM_RELATIONS_V1.combinations)if(match(rule.pair,wolunStem,natalStem))rows.push(interaction(
      `${prefix}:stem:${position}:STEM_COMBINATION`,"stem","STEM_COMBINATION",[...rule.pair],points.STEM_COMBINATION,
      STEM_RELATIONS_V1.rulesetVersion,"NATAL_WOLUN",[{layer:"NATAL",position,stem:natalStem},{layer:"WOLUN",year,stem:wolunStem}],position,undefined,rule.targetElement));
    for(const rule of STEM_RELATIONS_V1.clashes)if(match(rule.pair,wolunStem,natalStem))rows.push(interaction(
      `${prefix}:stem:${position}:STEM_CLASH`,"stem","STEM_CLASH",[...rule.pair],points.STEM_CLASH,
      STEM_RELATIONS_V1.rulesetVersion,"NATAL_WOLUN",[{layer:"NATAL",position,stem:natalStem},{layer:"WOLUN",year,stem:wolunStem}],position));
    const pairs=(rules:readonly PairRule[],type:string,value:number,version:string)=>{for(const rule of rules)if(match(rule.pair,wolunBranch,natalBranch))
      rows.push(interaction(`${prefix}:branch:${position}:${type}`,"branch",type,[...rule.pair],value,version,"NATAL_WOLUN",
        [{layer:"NATAL",position,branch:natalBranch},{layer:"WOLUN",year,branch:wolunBranch}],position));};
    pairs(BRANCH_RELATIONS_V1.sixCombinations,"SIX_COMBINATION",points.SIX_COMBINATION,BRANCH_RELATIONS_V1.rulesetVersion);
    pairs(BRANCH_RELATIONS_V1.clashes,"BRANCH_CLASH",points.BRANCH_CLASH,BRANCH_RELATIONS_V1.rulesetVersion);
    pairs(PUNISHMENT_V1.mutual,"MUTUAL_PUNISHMENT",points.MUTUAL_PUNISHMENT,PUNISHMENT_V1.rulesetVersion);
    pairs(BRANCH_RELATIONS_V1.harms,"BRANCH_HARM",points.BRANCH_HARM,BRANCH_RELATIONS_V1.rulesetVersion);
    pairs(BRANCH_RELATIONS_V1.breaks,"BRANCH_BREAK",points.BRANCH_BREAK,BRANCH_RELATIONS_V1.rulesetVersion);
    pairs(BRANCH_RELATIONS_V1.wonjin,"WONJIN",points.WONJIN,BRANCH_RELATIONS_V1.rulesetVersion);}
  if(PUNISHMENT_V1.self.some(rule=>rule.branch===wolunBranch))for(const position of positions.filter(pos=>pillars[pos].branch===wolunBranch))
    rows.push(interaction(`${prefix}:branch:${position}:SELF_PUNISHMENT`,"branch","SELF_PUNISHMENT",[wolunBranch,wolunBranch],
      points.SELF_PUNISHMENT,PUNISHMENT_V1.rulesetVersion,"NATAL_WOLUN",
      [{layer:"NATAL",position,branch:wolunBranch},{layer:"WOLUN",year,branch:wolunBranch}],position));
  const groups=(rules:readonly GroupRule[],type:"THREE_HARMONY"|"DIRECTIONAL_COMBINATION"|"THREE_PUNISHMENT",version:string)=>{
    const natalSet=new Set(positions.map(pos=>pillars[pos].branch!));for(const rule of rules){if(!rule.group.includes(wolunBranch))continue;
      const before=rule.group.filter(branch=>natalSet.has(branch)).length,after=new Set([...rule.group.filter(branch=>natalSet.has(branch)),wolunBranch]).size;
      if(after<2)continue;const complete=after===3,repeated=natalSet.has(wolunBranch)&&before>=2,key=`${type}_${complete?"COMPLETE":"PARTIAL"}` as keyof typeof points;
      const participants:LayerParticipant[]=rule.group.flatMap(branch=>positions.filter(pos=>pillars[pos].branch===branch)
        .map(position=>({layer:"NATAL" as const,position,branch})));participants.push({layer:"WOLUN",year,branch:wolunBranch});
      rows.push({id:`${prefix}:group:${type}:${rule.group.join("")}`,domain:"branch",relationType:type,
        state:repeated?"REPEATED_EXISTING_CONTEXT":complete?"ACTIVATED_COMPLETE":"ACTIVATED_PARTIAL",members:[...rule.group],
        targetElement:rule.targetElement,activationPoints:points[key],ruleVersion:version,transformationCandidate:false,
        layerPair:"NATAL_WOLUN",participants});}}
  groups(BRANCH_RELATIONS_V1.threeHarmonies,"THREE_HARMONY",BRANCH_RELATIONS_V1.rulesetVersion);
  groups(BRANCH_RELATIONS_V1.directionalCombinations,"DIRECTIONAL_COMBINATION",BRANCH_RELATIONS_V1.rulesetVersion);
  groups(PUNISHMENT_V1.three,"THREE_PUNISHMENT",PUNISHMENT_V1.rulesetVersion);return unique(rows);
}

function fortunePair(year:number,wolunStem:Stem,wolunBranch:Branch,targetStem:Stem,targetBranch:Branch,
  targetLayer:"DAEUN"|"SEUN",daeunIndex?:number){
  const label=targetLayer==="DAEUN"?`DAEUN-${String(daeunIndex).padStart(2,"0")}`:"SEUN",prefix=`${monthKey(year,wolunBranch)}:${label}`;
  const layerPair=targetLayer==="DAEUN"?"DAEUN_WOLUN":"SEUN_WOLUN",rows:SeunInteraction[]=[];
  const participants=(domain:"stem"|"branch"):LayerParticipant[]=>domain==="stem"?
    [{layer:targetLayer,daeunIndex,year:targetLayer==="SEUN"?year:undefined,stem:targetStem},{layer:"WOLUN",year,stem:wolunStem}]:
    [{layer:targetLayer,daeunIndex,year:targetLayer==="SEUN"?year:undefined,branch:targetBranch},{layer:"WOLUN",year,branch:wolunBranch}];
  for(const rule of STEM_RELATIONS_V1.combinations)if(match(rule.pair,wolunStem,targetStem))rows.push(interaction(
    `${prefix}:stem:STEM_COMBINATION`,"stem","STEM_COMBINATION",[...rule.pair],points.STEM_COMBINATION,
    STEM_RELATIONS_V1.rulesetVersion,layerPair,participants("stem"),undefined,daeunIndex,rule.targetElement));
  for(const rule of STEM_RELATIONS_V1.clashes)if(match(rule.pair,wolunStem,targetStem))rows.push(interaction(
    `${prefix}:stem:STEM_CLASH`,"stem","STEM_CLASH",[...rule.pair],points.STEM_CLASH,
    STEM_RELATIONS_V1.rulesetVersion,layerPair,participants("stem"),undefined,daeunIndex));
  const pairs=(rules:readonly PairRule[],type:string,value:number,version:string)=>{for(const rule of rules)if(match(rule.pair,wolunBranch,targetBranch))
    rows.push(interaction(`${prefix}:branch:${type}`,"branch",type,[...rule.pair],value,version,layerPair,participants("branch"),undefined,daeunIndex));};
  pairs(BRANCH_RELATIONS_V1.sixCombinations,"SIX_COMBINATION",points.SIX_COMBINATION,BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.clashes,"BRANCH_CLASH",points.BRANCH_CLASH,BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(PUNISHMENT_V1.mutual,"MUTUAL_PUNISHMENT",points.MUTUAL_PUNISHMENT,PUNISHMENT_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.harms,"BRANCH_HARM",points.BRANCH_HARM,BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.breaks,"BRANCH_BREAK",points.BRANCH_BREAK,BRANCH_RELATIONS_V1.rulesetVersion);
  pairs(BRANCH_RELATIONS_V1.wonjin,"WONJIN",points.WONJIN,BRANCH_RELATIONS_V1.rulesetVersion);
  if(targetBranch===wolunBranch&&PUNISHMENT_V1.self.some(rule=>rule.branch===wolunBranch))rows.push(interaction(
    `${prefix}:branch:SELF_PUNISHMENT`,"branch","SELF_PUNISHMENT",[wolunBranch,wolunBranch],points.SELF_PUNISHMENT,
    PUNISHMENT_V1.rulesetVersion,layerPair,participants("branch"),undefined,daeunIndex));return unique(rows);
}

function crossGroups(year:number,wolunBranch:Branch,daeunIndex:number|undefined,daeunPillar:string|undefined,seunBranch:Branch,pillars:Record<PillarPosition,Pillar>){
  const daeunBranch=daeunPillar?.[1] as Branch|undefined,prefix=`${monthKey(year,wolunBranch)}:CROSS_LAYER`,rows:SeunInteraction[]=[];
  const groups=(rules:readonly GroupRule[],type:"THREE_HARMONY"|"DIRECTIONAL_COMBINATION"|"THREE_PUNISHMENT",version:string)=>{
    const natalSet=new Set(positions.map(pos=>pillars[pos].branch!));for(const rule of rules){if(!rule.group.includes(wolunBranch))continue;
      const daeunNecessary=Boolean(daeunBranch&&rule.group.includes(daeunBranch)&&!natalSet.has(daeunBranch)&&daeunBranch!==wolunBranch);
      const seunNecessary=rule.group.includes(seunBranch)&&!natalSet.has(seunBranch)&&seunBranch!==wolunBranch;
      if(!daeunNecessary&&!seunNecessary)continue;const before=new Set([...rule.group.filter(branch=>natalSet.has(branch)),
        ...(daeunBranch?[daeunBranch]:[]),seunBranch].filter(branch=>rule.group.includes(branch)));
      const after=new Set([...Array.from(before),wolunBranch]);if(after.size<2)continue;
      const complete=after.size===3,repeated=before.size===3,key=`${type}_${complete?"COMPLETE":"PARTIAL"}` as keyof typeof points;
      const participants:LayerParticipant[]=rule.group.flatMap(branch=>positions.filter(pos=>pillars[pos].branch===branch)
        .map(position=>({layer:"NATAL" as const,position,branch})));
      if(daeunNecessary&&daeunBranch)participants.push({layer:"DAEUN",daeunIndex,branch:daeunBranch});
      if(rule.group.includes(seunBranch))participants.push({layer:"SEUN",year,branch:seunBranch});participants.push({layer:"WOLUN",year,branch:wolunBranch});
      rows.push({id:`${prefix}:${type}:${rule.group.join("")}${daeunNecessary?`:DAEUN-${String(daeunIndex).padStart(2,"0")}`:""}`,domain:"branch",relationType:type,
        state:repeated?"REPEATED_EXISTING_CONTEXT":complete?"WOLUN_TRIGGERED_COMPLETE":"ACTIVATED_PARTIAL",members:[...rule.group],
        targetElement:rule.targetElement,activationPoints:points[key],ruleVersion:version,transformationCandidate:false,
        layerPair:"CROSS_LAYER",daeunIndex,participants});}}
  groups(BRANCH_RELATIONS_V1.threeHarmonies,"THREE_HARMONY",BRANCH_RELATIONS_V1.rulesetVersion);
  groups(BRANCH_RELATIONS_V1.directionalCombinations,"DIRECTIONAL_COMBINATION",BRANCH_RELATIONS_V1.rulesetVersion);
  groups(PUNISHMENT_V1.three,"THREE_PUNISHMENT",PUNISHMENT_V1.rulesetVersion);return unique(rows);
}

function stars(branch:Branch,pillars:Record<PillarPosition,Pillar>,result:NobleSpecialStarsResult){
  const tags:Array<{type:string;basis:string;target:Stem|Branch;ruleVersion:string}>=[];
  for(const [type,table] of Object.entries(NOBLE_STARS_V1.byDayStem))if((table[pillars.day.stem!] as readonly Branch[]).includes(branch))
    tags.push({type:"NOBLE_STAR_ACTIVATED",basis:type,target:branch,ruleVersion:NOBLE_STARS_V1.ruleVersion});
  for(const [basisName,basis] of [["YEAR_BRANCH",pillars.year.branch!],["DAY_BRANCH",pillars.day.branch!]] as const){const group=MOBILITY_STARS_V1.groups.find(row=>(row.members as readonly Branch[]).includes(basis))!;
    if(branch===group.peach)tags.push({type:"PEACH_BLOSSOM_ACTIVATED",basis:basisName,target:branch,ruleVersion:MOBILITY_STARS_V1.ruleVersion});
    if(branch===group.travel)tags.push({type:"TRAVEL_HORSE_ACTIVATED",basis:basisName,target:branch,ruleVersion:MOBILITY_STARS_V1.ruleVersion});
    if(branch===group.canopy)tags.push({type:"FLOWER_CANOPY_ACTIVATED",basis:basisName,target:branch,ruleVersion:MOBILITY_STARS_V1.ruleVersion});}
  const blade=YANG_BLADE_STRUCTURE_V1.byDayStem[pillars.day.stem! as keyof typeof YANG_BLADE_STRUCTURE_V1.byDayStem];
  if(blade===branch)tags.push({type:"YANG_BLADE_ACTIVATED",basis:"DAY_STEM",target:branch,ruleVersion:YANG_BLADE_STRUCTURE_V1.rulesetVersion});
  if(result.void.voidBranches.includes(branch))tags.push({type:"VOID_ACTIVATED",basis:result.void.xunStart,target:branch,ruleVersion:result.void.ruleVersion});return tags;
}

export function evaluateWolunActivation(source:WolunSourceResult,seunPeriods:SeunActivationPeriod[],pillars:Record<PillarPosition,Pillar>,
  stemPreferences:StemPreferencesResult,branchPreferences:BranchPreferencesResult,starResult:NobleSpecialStarsResult){
  const dayMaster=pillars.day.stem!,seunByYear=new Map(seunPeriods.map(period=>[period.year,period]));
  const periods:WolunActivationPeriod[]=source.periods.map(wolun=>{const seun=seunByYear.get(wolun.seunYear)!;
    const stemPreference=stemPreferences.stems.find(row=>row.stem===wolun.pillar.stem)!,branchPreference=branchPreferences.branches.find(row=>row.branch===wolun.pillar.branch)!;
    const baseFavorabilityScore=stemPreference.score*RULE.preferenceWeights.stem+branchPreference.score*RULE.preferenceWeights.branch;
    const hidden=HIDDEN_STEMS_V1.branches[wolun.pillar.branch],items=(["mainQi","middleQi","residualQi"] as const).flatMap(qiRole=>hidden[qiRole]?[{qiRole,stem:hidden[qiRole]}]:[]);
    const allocation=items.length===1?ELEMENT_WEIGHT_V1.allocations.one:items.length===2?ELEMENT_WEIGHT_V1.allocations.two:ELEMENT_WEIGHT_V1.allocations.three;
    const natal=natalInteractions(wolun.seunYear,wolun.pillar.stem,wolun.pillar.branch,pillars);
    const daeun=unique(wolun.daeunSegments.flatMap(segment=>fortunePair(wolun.seunYear,wolun.pillar.stem,wolun.pillar.branch,
      segment.daeunPillar[0] as Stem,segment.daeunPillar[1] as Branch,"DAEUN",segment.daeunIndex)));
    const seunRows=fortunePair(wolun.seunYear,wolun.pillar.stem,wolun.pillar.branch,seun.pillar.stem,seun.pillar.branch,"SEUN");
    const crossLayer=unique((wolun.daeunSegments.length?wolun.daeunSegments:[undefined]).flatMap(segment=>crossGroups(wolun.seunYear,
      wolun.pillar.branch,segment?.daeunIndex,segment?.daeunPillar,seun.pillar.branch,pillars)));
    const natalRawScore=natal.reduce((sum,row)=>sum+row.activationPoints,0),fortuneLayerRawScore=[...daeun,...seunRows].reduce((sum,row)=>sum+row.activationPoints,0),
      crossLayerRawScore=crossLayer.reduce((sum,row)=>sum+row.activationPoints,0),rawScore=natalRawScore+fortuneLayerRawScore+crossLayerRawScore,score=capActivationScore(rawScore);
    return{...wolun,preference:{stemScore:stemPreference.score,stemRole:stemPreference.role,branchScore:branchPreference.score,branchRole:branchPreference.role,
      baseFavorabilityScore,role:daeunFavorabilityRole(baseFavorabilityScore)},tenGodProfile:{stemTenGod:getTenGod(dayMaster,wolun.pillar.stem).korean,
      branchHiddenTenGods:items.map(item=>({stem:item.stem!,tenGod:getTenGod(dayMaster,item.stem!).korean,weight:allocation[item.qiRole]}))},
      interactions:{natal,daeun,seun:seunRows,crossLayer},activation:{natalRawScore,fortuneLayerRawScore,crossLayerRawScore,rawScore,score,level:activationLevel(score)},
      starActivations:stars(wolun.pillar.branch,pillars,starResult),samjaeContext:seun.samjaeActivation,
      evidence:[`${RULE.preferenceVersion}: ${stemPreference.score}×0.45+${branchPreference.score}×0.55=${baseFavorabilityScore}`,
        `activation=${natalRawScore}+${fortuneLayerRawScore}+${crossLayerRawScore}=${rawScore}; cap=${score}`,
        "14A/14B interactions without WOLUN participant are not rescored"]};});
  return{status:"implemented" as const,ruleVersion:RULE.ruleVersion,periods,evidence:[`${RULE.generationVersion}: 12절 absolute intervals`,
    `${RULE.fourLayerVersion}: NATAL/DAEUN/SEUN/WOLUN participants`]};
}
