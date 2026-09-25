import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import { MOBILITY_STARS_V1 } from "@/rules/mobility-stars.v1";
import { NOBLE_SPECIAL_STARS_V1 } from "@/rules/noble-special-stars.v1";
import { NOBLE_STARS_V1 } from "@/rules/noble-stars.v1";
import { SAMJAE_V1 } from "@/rules/samjae.v1";
import { SPECIAL_STARS_V1 } from "@/rules/special-stars.v1";
import { TWELVE_SINSAL_V1 } from "@/rules/twelve-sinsal.v1";
import { VOID_V1 } from "@/rules/void.v1";
import { YANG_BLADE_STRUCTURE_V1 } from "@/rules/yang-blade-structure.v1";
import type { Branch, Pillar, PillarPosition, RelationsResult, Stem } from "@/types/saju-analysis";
import type { NobleSpecialStarsResult, StarDetection, TwelveSinsalEntry } from "@/types/noble-special-stars";

const positions:PillarPosition[]=["year","month","day","hour"];
const branchMatches=(target:Branch,pillars:Record<PillarPosition,Pillar>)=>
  positions.filter(position=>pillars[position].branch===target);
const detection=(type:string,label:string,basis:StarDetection["basis"],position:PillarPosition,
  pillars:Record<PillarPosition,Pillar>,ruleVersion:string,suffix=""):StarDetection=>({
    id:`${type}:${basis.type}:${basis.value}:${position}${suffix}`,type,label,basis,
    matched:{pillar:position,stem:pillars[position].stem!,branch:pillars[position].branch!},ruleVersion,
    evidence:[`${basis.type}=${basis.value}; matched=${position}:${pillars[position].stem}${pillars[position].branch}`]});

export function voidFromDayPillar(dayStem:Stem,dayBranch:Branch,pillars:Record<PillarPosition,Pillar>) {
  const startIndex=(EARTHLY_BRANCHES.indexOf(dayBranch)-HEAVENLY_STEMS.indexOf(dayStem)+12)%12;
  const xunStart=`甲${EARTHLY_BRANCHES[startIndex]}`;
  const rule=VOID_V1.xun.find(row=>row.start===xunStart);
  if(!rule) throw new Error(`Invalid sexagenary day pillar ${dayStem}${dayBranch}`);
  const nonDay=["year","month","hour"] as const;
  return {ruleVersion:VOID_V1.ruleVersion,dayPillar:`${dayStem}${dayBranch}`,xunStart,
    voidBranches:rule.voidBranches,dayBranchPolicy:VOID_V1.dayBranchPolicy,
    matches:nonDay.filter(position=>(rule.voidBranches as readonly Branch[]).includes(pillars[position].branch!))
      .map(position=>({pillar:position,branch:pillars[position].branch!}))};
}

function mobility(kind:"peach"|"travel"|"canopy",label:string,type:string,
  pillars:Record<PillarPosition,Pillar>):StarDetection[]{
  return (["year","day"] as const).flatMap(basisPosition=>{
    const basisBranch=pillars[basisPosition].branch!;
    const group=MOBILITY_STARS_V1.groups.find(row=>(row.members as readonly Branch[]).includes(basisBranch))!;
    return branchMatches(group[kind],pillars).map(position=>detection(type,label,
      {type:basisPosition==="year"?"YEAR_BRANCH":"DAY_BRANCH",value:basisBranch},position,pillars,MOBILITY_STARS_V1.ruleVersion));
  });
}

function twelve(basisBranch:Branch,pillars:Record<PillarPosition,Pillar>):TwelveSinsalEntry[]{
  const group=TWELVE_SINSAL_V1.groups.find(row=>(row.members as readonly Branch[]).includes(basisBranch))!;
  return TWELVE_SINSAL_V1.names.map((name,index)=>{const targetBranch=group.targets[index];
    const matchedPositions=branchMatches(targetBranch,pillars);return{name,targetBranch,basisBranch,
      matchedPositions,detected:matchedPositions.length>0,ruleVersion:TWELVE_SINSAL_V1.ruleVersion};});
}

export function evaluateNobleSpecialStars(pillars:Record<PillarPosition,Pillar>,
  relations:RelationsResult):NobleSpecialStarsResult{
  const dayStem=pillars.day.stem!,dayBranch=pillars.day.branch!,yearBranch=pillars.year.branch!;
  const nobleStars:StarDetection[]=[];
  for(const [type,table] of Object.entries(NOBLE_STARS_V1.byDayStem)){
    const targets=table[dayStem];
    for(const target of targets) for(const position of branchMatches(target,pillars))
      nobleStars.push(detection(type,NOBLE_STARS_V1.labels[type as keyof typeof NOBLE_STARS_V1.labels],
        {type:"DAY_STEM",value:dayStem},position,pillars,NOBLE_STARS_V1.ruleVersion));
  }
  const ghostGate:StarDetection[]=[];
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
    const a=pillars[positions[i]].branch!,b=pillars[positions[j]].branch!;
    if(SPECIAL_STARS_V1.ghostGatePairs.some(pair=>(pair as readonly Branch[]).includes(a)&&(pair as readonly Branch[]).includes(b)))
      ghostGate.push(detection("GHOST_GATE","귀문관",{type:"BRANCH_PAIR",value:`${a}${b}`},positions[j],pillars,
        SPECIAL_STARS_V1.ruleVersion,`:with-${positions[i]}`));
  }
  const wonjin=relations.earthlyBranches.wonjin.map(row=>detection("WONJIN","원진",
    {type:"RELATIONS_RESULT",value:row.id},row.positions[1],pillars,row.ruleVersion,`:with-${row.positions[0]}`));
  const needle:StarDetection[]=[];
  for(const position of positions){
    if(SPECIAL_STARS_V1.needle.stems.includes(pillars[position].stem!))
      needle.push(detection("NEEDLE","현침",{type:"CUSTOM_STEM_TABLE",value:pillars[position].stem!},position,pillars,SPECIAL_STARS_V1.ruleVersion));
    if(SPECIAL_STARS_V1.needle.branches.includes(pillars[position].branch!))
      needle.push(detection("NEEDLE","현침",{type:"CUSTOM_BRANCH_TABLE",value:pillars[position].branch!},position,pillars,SPECIAL_STARS_V1.ruleVersion));
  }
  const bladeTarget=YANG_BLADE_STRUCTURE_V1.byDayStem[dayStem as keyof typeof YANG_BLADE_STRUCTURE_V1.byDayStem];
  const yangBlade=bladeTarget?branchMatches(bladeTarget,pillars).map(position=>detection("YANG_BLADE","양인",
    {type:"DAY_STEM",value:dayStem},position,pillars,YANG_BLADE_STRUCTURE_V1.rulesetVersion)):[];
  const pillarStars=(table:readonly string[],type:string,label:string)=>positions.flatMap(position=>{
    const value=`${pillars[position].stem}${pillars[position].branch}`;
    return table.includes(value)?[{...detection(type,label,{type:"PILLAR",value},position,pillars,SPECIAL_STARS_V1.ruleVersion),
      isDayPillar:position==="day"}]:[];});
  const samjaeRule=SAMJAE_V1.groups.find(row=>(row.members as readonly Branch[]).includes(yearBranch))!;
  return{status:"implemented",ruleVersion:NOBLE_SPECIAL_STARS_V1.ruleVersion,nobleStars,
    peachBlossom:mobility("peach","도화","PEACH_BLOSSOM",pillars),
    travelHorse:mobility("travel","역마","TRAVEL_HORSE",pillars),
    flowerCanopy:mobility("canopy","화개","FLOWER_CANOPY",pillars),ghostGate,wonjin,needle,
    void:voidFromDayPillar(dayStem,dayBranch,pillars),
    yangBladeApplicability:bladeTarget?"APPLICABLE":"NOT_APPLICABLE",yangBlade,
    goegang:pillarStars(SPECIAL_STARS_V1.goegang,"GOEGANG","괴강"),
    whiteTiger:pillarStars(SPECIAL_STARS_V1.whiteTiger,"WHITE_TIGER","백호"),
    twelveSinsal:{ruleVersion:TWELVE_SINSAL_V1.ruleVersion,yearBasis:twelve(yearBranch,pillars),dayBasis:twelve(dayBranch,pillars)},
    samjae:{ruleVersion:SAMJAE_V1.ruleVersion,basisYearBranch:yearBranch,group:[...samjaeRule.members],
      samjaeBranches:Object.values(samjaeRule.stages),stages:{...samjaeRule.stages}},
    evidence:["신살은 위치·근거 tag이며 strength, structure, preference 점수를 변경하지 않는다."]};
}
