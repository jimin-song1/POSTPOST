import { BRANCH_COMBINATION_TARGET_V1 } from "@/rules/branch-combination-target.v1";
import { DAEUN_ACTIVATION_V1 } from "@/rules/daeun-activation.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { FORTUNE_TRANSFORMATION_V1 as RULE } from "@/rules/fortune-transformation.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { RELATION_INTERACTION_V1 } from "@/rules/relation-interaction.v1";
import { SEASONAL_ELEMENT_STATE_V1 } from "@/rules/seasonal-element-state.v1";
import { TRANSFORMATION_TRANSFER_V1 } from "@/rules/transformation-transfer.v1";
import { TRANSFORMATION_V1 } from "@/rules/transformation.v1";
import type { Branch,Element,FiveElementsResult,Pillar,PillarPosition,Stem,TransformationState } from "@/types/saju-analysis";
import type { DaeunActivationPeriod,FortuneInteraction,FortuneResult,LayerParticipant,SeunActivationPeriod,SeunInteraction,WolunActivationPeriod } from "@/types/fortune";
import type { FortuneCombinedProfile,FortuneContribution,FortuneElementProfile,FortuneLayer,
  FortuneTransformationEvaluation,FortuneTransformationFactor,FortuneTransformationResult,
  FortuneTransformationSnapshot,FortuneTransfer } from "@/types/fortune-transformation";
import { transformationState } from "../interpretation/transformation";
import { stemTrait } from "../interpretation/ten-gods";

const elements:Element[]=["wood","fire","earth","metal","water"],positions:PillarPosition[]=["year","month","day","hour"];
const emptyProfile=()=>Object.fromEntries(elements.map(element=>[element,0])) as Record<Element,number>;
const sumProfile=(profile:Record<Element,number>)=>elements.reduce((sum,element)=>sum+profile[element],0);
const uniqueInteractions=(rows:FortuneInteraction[])=>Array.from(new Map(rows.map(row=>[row.id,row])).values());

export function buildFortuneContributions(layer:FortuneLayer,key:string,pillar:{stem:Stem;branch:Branch}){
  const contributions:FortuneContribution[]=[{id:`${key}:STEM:${pillar.stem}`,layer,sourceType:"STEM",character:pillar.stem,
    element:stemTrait(pillar.stem).element,baseAmount:RULE.contribution.stem}];
  const hidden=HIDDEN_STEMS_V1.branches[pillar.branch],items=(["mainQi","middleQi","residualQi"] as const)
    .flatMap(qiRole=>hidden[qiRole]?[{qiRole,stem:hidden[qiRole]!}]:[]),allocation=items.length===1?ELEMENT_WEIGHT_V1.allocations.one:
      items.length===2?ELEMENT_WEIGHT_V1.allocations.two:ELEMENT_WEIGHT_V1.allocations.three;
  const roleName={mainQi:"MAIN",middleQi:"MIDDLE",residualQi:"RESIDUAL"} as const;
  for(const item of items)contributions.push({id:`${key}:BRANCH:${pillar.branch}:${roleName[item.qiRole]}:${item.stem}`,
    layer,sourceType:"HIDDEN_STEM",character:item.stem,branch:pillar.branch,qiRole:item.qiRole,
    element:stemTrait(item.stem).element,baseAmount:RULE.contribution.branch*allocation[item.qiRole]});
  return contributions;
}

function makeLayerProfile(layer:FortuneLayer,key:string,pillar:{stem:Stem;branch:Branch}):FortuneElementProfile{
  const contributions=buildFortuneContributions(layer,key,pillar),base=emptyProfile();
  for(const item of contributions)base[item.element]+=item.baseAmount;const total=sumProfile(base);
  return{layer,key,pillar:`${pillar.stem}${pillar.branch}`,base,adjusted:{...base},baseTotal:total,adjustedTotal:total,
    percentages:Object.fromEntries(elements.map(element=>[element,base[element]/total*100])) as Record<Element,number>,contributions};
}

function targetElement(interaction:FortuneInteraction):Element{
  if(interaction.targetElement)return interaction.targetElement;
  if(interaction.relationType==="SIX_COMBINATION"){
    const rule=BRANCH_COMBINATION_TARGET_V1.sixCombinations.find(row=>row.pair.every(branch=>interaction.members.includes(branch)));
    if(rule)return rule.targetElement;
  }
  throw new Error(`Missing transformation target: ${interaction.id}`);
}

const isCandidate=(interaction:FortuneInteraction)=>RELATION_INTERACTION_V1.candidateTypes.some(type=>type===interaction.relationType);
const isBlocker=(interaction:FortuneInteraction)=>RELATION_INTERACTION_V1.blockerTypes.some(type=>type===interaction.relationType);
const participantKey=(participant:LayerParticipant)=>`${participant.layer}:${participant.daeunIndex??participant.year??""}:${participant.stem??participant.branch??""}`;
const participantKeys=(interaction:FortuneInteraction)=>new Set(((interaction as SeunInteraction).participants??[]).map(participantKey));

function sourceContributions(interaction:FortuneInteraction,profiles:FortuneElementProfile[]){
  const participants=(interaction as SeunInteraction).participants;
  if(!participants?.length){const daeun=profiles.find(profile=>profile.layer==="DAEUN");
    return daeun?daeun.contributions.filter(item=>interaction.domain==="stem"?item.sourceType==="STEM":item.sourceType==="HIDDEN_STEM"):[];}
  const ids=new Set<string>();
  for(const participant of participants){if(participant.layer==="NATAL")continue;
    for(const profile of profiles.filter(item=>item.layer===participant.layer))for(const contribution of profile.contributions){
      if(interaction.domain==="stem"&&participant.stem&&contribution.sourceType==="STEM"&&contribution.character===participant.stem)ids.add(contribution.id);
      if(interaction.domain==="branch"&&participant.branch&&contribution.sourceType==="HIDDEN_STEM"&&contribution.branch===participant.branch)ids.add(contribution.id);}}
  return profiles.flatMap(profile=>profile.contributions).filter(item=>ids.has(item.id));
}

function contextBranches(pillars:Record<PillarPosition,Pillar>,profiles:FortuneElementProfile[]){return[
  ...positions.map(position=>pillars[position].branch!),...profiles.map(profile=>profile.pillar[1] as Branch)];}
function contextStems(pillars:Record<PillarPosition,Pillar>,profiles:FortuneElementProfile[]){return[
  ...positions.map(position=>pillars[position].stem!),...profiles.map(profile=>profile.pillar[0] as Stem)];}

function evaluateCandidates(interactions:FortuneInteraction[],profiles:FortuneElementProfile[],pillars:Record<PillarPosition,Pillar>,
  native:NonNullable<FiveElementsResult["nativeStrength"]>,seasonBranch:Branch){
  const candidates=interactions.filter(isCandidate),blockers=interactions.filter(isBlocker),allSources=new Map<string,string[]>();
  for(const candidate of candidates)allSources.set(candidate.id,sourceContributions(candidate,profiles).map(item=>item.id));
  return candidates.map((candidate):FortuneTransformationEvaluation=>{const target=targetElement(candidate),factors:FortuneTransformationFactor[]=[],
    add=(factor:FortuneTransformationFactor)=>factors.push(factor),sources=allSources.get(candidate.id)!,branches=contextBranches(pillars,profiles),
    stems=contextStems(pillars,profiles),seasonalState=SEASONAL_ELEMENT_STATE_V1.byMonthBranch[seasonBranch][target];
    add({factor:"season",delta:TRANSFORMATION_V1.seasonal[seasonalState],status:"APPLIED",reason:`${seasonBranch} 목표 ${target}: ${seasonalState}`,
      details:{seasonContextBranch:seasonBranch,seasonalState,target}});
    const roots=branches.filter(branch=>{const hidden=HIDDEN_STEMS_V1.branches[branch];return [hidden.mainQi,hidden.middleQi,hidden.residualQi]
      .some(stem=>stem&&stemTrait(stem).element===target);});
    if(roots.length)add({factor:"targetRoot",delta:TRANSFORMATION_V1.targetRoot,status:"APPLIED",reason:"현재 context에 목표 오행 지장간 뿌리",details:{branches:roots}});
    const exposed=stems.filter(stem=>stemTrait(stem).element===target);
    if(exposed.length)add({factor:"targetExposure",delta:TRANSFORMATION_V1.targetExposure,status:"APPLIED",reason:"현재 context에 목표 오행 천간 노출",details:{stems:exposed}});
    const cycle=["wood","fire","earth","metal","water"] as Element[],generator=cycle[(cycle.indexOf(target)-1+cycle.length)%cycle.length],percentage=native[generator].percentage;
    if(percentage>=TRANSFORMATION_V1.generatingPercentageMinimum)add({factor:"generatingSupport",delta:TRANSFORMATION_V1.generatingSupport,status:"APPLIED",
      reason:"원국 생성 오행 비중 충족",details:{generator,percentage,minimum:TRANSFORMATION_V1.generatingPercentageMinimum}});
    add({factor:"adjacency",delta:0,status:"NOT_APPLICABLE",reason:"fortune layer 사이에 natal positional adjacency를 적용하지 않음"});
    const competing=candidates.filter(other=>other.id!==candidate.id&&allSources.get(other.id)!.some(id=>sources.includes(id)));
    for(const other of competing)add({factor:"competition",delta:RELATION_INTERACTION_V1.competingCandidatePenalty,status:"APPLIED",
      reason:"동일 fortune contribution을 공유하는 변환 후보",relatedRelationId:other.id});
    const keys=participantKeys(candidate),blocking=blockers.filter(blocker=>keys.size?
      Array.from(participantKeys(blocker)).some(key=>keys.has(key)):
      blocker.domain===candidate.domain&&blocker.natalPosition===candidate.natalPosition);
    for(const blocker of blocking)add({factor:"blockingClash",delta:RELATION_INTERACTION_V1.blockingClashPenalty,status:"APPLIED",
      reason:"동일 fortune participant의 합/충 경쟁",relatedRelationId:blocker.id});
    const rootedOriginal=sources.some(id=>{const contribution=profiles.flatMap(profile=>profile.contributions).find(item=>item.id===id)!;
      return branches.some(branch=>stemTrait(HIDDEN_STEMS_V1.branches[branch].mainQi).element===contribution.element);});
    if(candidate.relationType==="STEM_COMBINATION"&&rootedOriginal)add({factor:"originalStrongRoot",delta:TRANSFORMATION_V1.originalStrongRootPenalty,
      status:"APPLIED",reason:"fortune 참여 천간 원래 오행의 본기 뿌리"});
    const score=factors.reduce((sum,factor)=>sum+factor.delta,0),partialGroup=candidate.state==="ACTIVATED_PARTIAL";
    return{relationId:candidate.id,relationType:candidate.relationType,targetElement:target,score,
      state:transformationState(score,partialGroup),partialGroup,factors,sourceContributionIds:sources,
      blockingRelations:blocking.map(item=>item.id),competingRelations:competing.map(item=>item.id)};});
}

export function applyFortuneTransfers(snapshotId:string,profiles:FortuneElementProfile[],evaluations:FortuneTransformationEvaluation[]){
  const sources=new Map(profiles.flatMap(profile=>profile.contributions).map(item=>[item.id,item]));
  const requests=evaluations.flatMap(evaluation=>{const configured=TRANSFORMATION_TRANSFER_V1.ratios[evaluation.state],
    ratio=evaluation.partialGroup?Math.min(configured,TRANSFORMATION_TRANSFER_V1.partialGroupMaximumRatio):configured;
    return ratio===0?[]:evaluation.sourceContributionIds.map(sourceContributionId=>{const source=sources.get(sourceContributionId)!;
      return{evaluation,source,ratio,requestedAmount:source.baseAmount*ratio};});});
  const requestedBySource=new Map<string,number>();for(const request of requests)requestedBySource.set(request.source.id,
    (requestedBySource.get(request.source.id)??0)+request.requestedAmount);
  const actualBySource=new Map<string,number>();const transfers:FortuneTransfer[]=requests.map(request=>{const total=requestedBySource.get(request.source.id)!,
    scale=Math.min(1,request.source.baseAmount/total),actualAmount=request.requestedAmount*scale;
    actualBySource.set(request.source.id,(actualBySource.get(request.source.id)??0)+actualAmount);
    return{id:`${snapshotId}:${request.evaluation.relationId}:${request.source.id}`,relationId:request.evaluation.relationId,
      sourceContributionId:request.source.id,layer:request.source.layer,state:request.evaluation.state,transferRatio:request.ratio,
      fromElement:request.source.element,toElement:request.evaluation.targetElement,baseAmount:request.source.baseAmount,
      requestedAmount:request.requestedAmount,scale,actualAmount,remainingAmount:0,
      netElementChange:request.source.element===request.evaluation.targetElement?0:actualAmount};});
  for(const transfer of transfers)transfer.remainingAmount=Math.max(0,transfer.baseAmount-(actualBySource.get(transfer.sourceContributionId)??0));
  for(const profile of profiles){profile.adjusted={...profile.base};for(const transfer of transfers.filter(item=>item.layer===profile.layer)){
      profile.adjusted[transfer.fromElement]-=transfer.actualAmount;profile.adjusted[transfer.toElement]+=transfer.actualAmount;}
    profile.adjustedTotal=sumProfile(profile.adjusted);profile.percentages=Object.fromEntries(elements.map(element=>[element,
      profile.adjustedTotal?profile.adjusted[element]/profile.adjustedTotal*100:0])) as Record<Element,number>;}
  return transfers;
}

function combined(profiles:FortuneElementProfile[]):FortuneCombinedProfile{const base=emptyProfile(),adjusted=emptyProfile();
  for(const profile of profiles)for(const element of elements){base[element]+=profile.base[element];adjusted[element]+=profile.adjusted[element];}
  return{base,adjusted,baseTotal:sumProfile(base),adjustedTotal:sumProfile(adjusted)};}

function snapshot(snapshotId:string,context:FortuneTransformationSnapshot["context"],seasonSource:FortuneTransformationSnapshot["seasonContext"]["source"],
  seasonBranch:Branch,profiles:FortuneElementProfile[],interactions:FortuneInteraction[],pillars:Record<PillarPosition,Pillar>,native:NonNullable<FiveElementsResult["nativeStrength"]>){
  const rows=uniqueInteractions(interactions),evaluations=evaluateCandidates(rows,profiles,pillars,native,seasonBranch),transfers=applyFortuneTransfers(snapshotId,profiles,evaluations);
  return{snapshotId,context,seasonContext:{source:seasonSource,branch:seasonBranch},candidates:evaluations.map(item=>item.relationId),evaluations,transfers,
    layerProfiles:profiles,combinedProfile:combined(profiles),evidence:["RAW fortune contributions에서 독립 snapshot 생성","NATAL은 context이며 transfer source가 아님"]} satisfies FortuneTransformationSnapshot;
}

const segmentInteractions=(rows:SeunInteraction[],daeunIndex:number)=>rows.filter(row=>row.daeunIndex===undefined||row.daeunIndex===daeunIndex);

export function evaluateFortuneTransformation(fortune:FortuneResult,pillars:Record<PillarPosition,Pillar>,native:NonNullable<FiveElementsResult["nativeStrength"]>){
  if(fortune.daeun.status!=="implemented"||fortune.seun.status!=="implemented"||!fortune.seun.periods||fortune.wolun.status!=="implemented"||!fortune.wolun.periods)
    throw new Error("Implemented Daeun, Seun, and Wolun results required");
  const natalMonth=pillars.month.branch!,daeunByIndex=new Map(fortune.daeun.periods.map(period=>[period.index,period])),
    seunByYear=new Map(fortune.seun.periods.map(period=>[period.year,period]));
  const daeunSnapshots=fortune.daeun.periods.map(period=>snapshot(`DAEUN-${String(period.index).padStart(2,"0")}`,
    {natal:true,daeunIndex:period.index},"NATAL_MONTH_BASELINE",natalMonth,
    [makeLayerProfile("DAEUN",`DAEUN-${String(period.index).padStart(2,"0")}`,period.pillar)],period.interactions,pillars,native));
  const seunSnapshots=fortune.seun.periods.flatMap(period=>period.daeunSegments.map(segment=>{const daeun=daeunByIndex.get(segment.daeunIndex)!;
    const interactions=[...daeun.interactions,...period.interactions.natal,...segmentInteractions(period.interactions.daeun,segment.daeunIndex),
      ...segmentInteractions(period.interactions.crossLayer,segment.daeunIndex)];
    return snapshot(`SEUN-${period.year}:DAEUN-${String(segment.daeunIndex).padStart(2,"0")}`,
      {natal:true,daeunIndex:segment.daeunIndex,seunYear:period.year},"NATAL_MONTH_BASELINE",natalMonth,
      [makeLayerProfile("DAEUN",`DAEUN-${String(segment.daeunIndex).padStart(2,"0")}`,daeun.pillar),
        makeLayerProfile("SEUN",`SEUN-${period.year}`,period.pillar)],interactions,pillars,native);}));
  const wolunSnapshots=fortune.wolun.periods.flatMap(period=>period.daeunSegments.map(segment=>{const daeun=daeunByIndex.get(segment.daeunIndex)!,seun=seunByYear.get(period.seunYear)!;
    const interactions=[...daeun.interactions,...seun.interactions.natal,...segmentInteractions(seun.interactions.daeun,segment.daeunIndex),
      ...segmentInteractions(seun.interactions.crossLayer,segment.daeunIndex),...period.interactions.natal,
      ...segmentInteractions(period.interactions.daeun,segment.daeunIndex),...period.interactions.seun,...segmentInteractions(period.interactions.crossLayer,segment.daeunIndex)];
    return snapshot(`WOLUN-${period.seunYear}-${period.solarMonthBranch}:DAEUN-${String(segment.daeunIndex).padStart(2,"0")}`,
      {natal:true,daeunIndex:segment.daeunIndex,seunYear:period.seunYear,wolun:{seunYear:period.seunYear,
        monthBranch:period.solarMonthBranch,indexInSeun:period.indexInSeun}},"ACTIVE_WOLUN_BRANCH",period.solarMonthBranch,
      [makeLayerProfile("DAEUN",`DAEUN-${String(segment.daeunIndex).padStart(2,"0")}`,daeun.pillar),
        makeLayerProfile("SEUN",`SEUN-${period.seunYear}`,seun.pillar),
        makeLayerProfile("WOLUN",`WOLUN-${period.seunYear}-${period.solarMonthBranch}`,period.pillar)],interactions,pillars,native);}));
  return{status:"implemented",ruleVersion:RULE.ruleVersion,evaluationVersion:RULE.evaluationVersion,
    contributionVersion:RULE.contributionVersion,transferVersion:RULE.transferVersion,daeunSnapshots,seunSnapshots,wolunSnapshots,
    evidence:["natal adjustedStrength/read-only","snapshot별 raw contribution 재생성","activation/favorability/신살 점수 미사용"]} satisfies FortuneTransformationResult;
}

export const fortuneTransformationState=transformationState;
export const fortuneTransferRatio=(state:TransformationState,partial=false)=>partial?Math.min(TRANSFORMATION_TRANSFER_V1.ratios[state],
  TRANSFORMATION_TRANSFER_V1.partialGroupMaximumRatio):TRANSFORMATION_TRANSFER_V1.ratios[state];
