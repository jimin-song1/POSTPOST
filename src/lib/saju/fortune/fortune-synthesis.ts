import { FORTUNE_SYNTHESIS_V1 as RULE } from "@/rules/fortune-synthesis.v1";
import type { TenGodCategory } from "@/rules/structure-useful-god.v1";
import type { Element,Stem } from "@/types/saju-analysis";
import type { DaeunActivationPeriod,FortuneInteraction,FortuneResult,SeunActivationPeriod,WolunActivationPeriod } from "@/types/fortune";
import type { FortuneElementProfile,FortuneLayer,FortuneTransformationResult,FortuneTransformationSnapshot } from "@/types/fortune-transformation";
import type { AlignmentDirection,AlignmentLevel,FortunePeriodSummary,FortuneSynthesisPeriod,FortuneSynthesisResult,WeightedLayerContribution } from "@/types/fortune-synthesis";
import type { SynthesisResult } from "@/types/useful-gods";
import { categoryElement } from "../interpretation/ten-god-category";
import { activationLevel,daeunFavorabilityRole } from "./daeun-activation";

const layers:FortuneLayer[]=["DAEUN","SEUN","WOLUN"],categories:TenGodCategory[]=["companion","resource","output","wealth","officer"];
const clamp=(score:number)=>Math.max(0,Math.min(100,score));
export function normalizedFortuneLayerWeights(active:FortuneLayer[]){const sum=active.reduce((total,layer)=>total+RULE.layerWeights[layer],0);
  return Object.fromEntries(active.map(layer=>[layer,RULE.layerWeights[layer]/sum])) as Partial<Record<FortuneLayer,number>>;}
export function alignmentDirection(delta:number):AlignmentDirection{return delta>=RULE.alignmentDirections.moreAligned?"MORE_ALIGNED":
  delta>=RULE.alignmentDirections.slightlyMoreAligned?"SLIGHTLY_MORE_ALIGNED":delta>RULE.alignmentDirections.slightlyLessAligned?"UNCHANGED":
  delta>RULE.alignmentDirections.lessAligned?"SLIGHTLY_LESS_ALIGNED":"LESS_ALIGNED";}
export function alignmentLevel(score:number):AlignmentLevel{return score>=RULE.alignmentLevels.veryHigh?"VERY_HIGH_ALIGNMENT":
  score>=RULE.alignmentLevels.high?"HIGH_ALIGNMENT":score>=RULE.alignmentLevels.favorable?"FAVORABLE_ALIGNMENT":
  score>=RULE.alignmentLevels.mixed?"MIXED_ALIGNMENT":score>=RULE.alignmentLevels.low?"LOW_ALIGNMENT":"VERY_LOW_ALIGNMENT";}

const profileAlignment=(profile:Record<string,number>,preferences:Record<Element,number>)=>{const total=Object.values(profile).reduce((a,b)=>a+b,0);
  return total?Object.entries(profile).reduce((sum,[element,value])=>sum+value/total*preferences[element as Element],0):0;};
export function alignLayerProfile(profile:FortuneElementProfile,preferences:Record<Element,number>){const baseAlignment=profileAlignment(profile.base,preferences),
  adjustedAlignment=profileAlignment(profile.adjusted,preferences),delta=adjustedAlignment-baseAlignment;
  return{layer:profile.layer,baseAlignment,adjustedAlignment,delta,direction:alignmentDirection(delta),baseProfile:{...profile.base},adjustedProfile:{...profile.adjusted}};}

function weighted(axis:Array<{layer:FortuneLayer;sourceId:string;score:number}>,weights:Partial<Record<FortuneLayer,number>>){
  const layerContributions:WeightedLayerContribution[]=axis.map(row=>({...row,weight:weights[row.layer]!,weightedScore:row.score*weights[row.layer]!}));
  return{score:clamp(layerContributions.reduce((sum,row)=>sum+row.weightedScore,0)),layerContributions};}
function tenGodFlow(profiles:FortuneElementProfile[],weights:Partial<Record<FortuneLayer,number>>,dayMaster:Stem){
  const flow=Object.fromEntries(categories.map(category=>[category,0])) as Record<TenGodCategory,number>;
  for(const profile of profiles){const total=profile.adjustedTotal;for(const category of categories){const element=categoryElement(dayMaster,category);
      flow[category]+=total?profile.adjusted[element]/total*100*weights[profile.layer]!:0;}}
  return flow;
}
function uniqueTop(rows:FortuneInteraction[]){return Array.from(new Map(rows.map(row=>[row.id,row])).values())
  .sort((a,b)=>b.activationPoints-a.activationPoints||a.id.localeCompare(b.id)).slice(0,10)
  .map(row=>({id:row.id,activationPoints:row.activationPoints,relationType:row.relationType}));}
const tags=(...groups:Array<Array<{type:string}>>)=>Array.from(new Set(groups.flat().map(row=>row.type))).sort();

function buildPeriod(id:string,period:{startInstant:string;endInstant:string},context:FortuneSynthesisPeriod["context"],
  layerRows:Array<{layer:FortuneLayer;sourceId:string;favorability:number;activation:number}>,snapshot:FortuneTransformationSnapshot,
  preferences:Record<Element,number>,dayMaster:Stem,tagValues:string[],interactions:FortuneInteraction[]):FortuneSynthesisPeriod{
  const active=layerRows.map(row=>row.layer),weights=normalizedFortuneLayerWeights(active),fav=weighted(layerRows.map(({layer,sourceId,favorability})=>({layer,sourceId,score:favorability})),weights),
    activation=weighted(layerRows.map(({layer,sourceId,activation})=>({layer,sourceId,score:activation})),weights),
    layerAlignments=snapshot.layerProfiles.map(profile=>alignLayerProfile(profile,preferences)),
    baseScore=layerAlignments.reduce((sum,row)=>sum+row.baseAlignment*weights[row.layer]!,0),
    adjustedScore=layerAlignments.reduce((sum,row)=>sum+row.adjustedAlignment*weights[row.layer]!,0),delta=adjustedScore-baseScore;
  return{synthesisId:id,period,context,layers:active,layerWeights:Object.fromEntries(active.map(layer=>[layer.toLowerCase(),weights[layer]!])),
    favorability:{...fav,level:daeunFavorabilityRole(fav.score)},activation:{...activation,level:activationLevel(activation.score)},
    transformationAlignment:{baseScore,adjustedScore,delta,direction:alignmentDirection(delta),level:alignmentLevel(adjustedScore),layerAlignments},
    tenGodFlow:tenGodFlow(snapshot.layerProfiles,weights,dayMaster),tags:Array.from(new Set(tagValues)).sort(),topInteractions:uniqueTop(interactions),
    evidence:["기존 layer favorability/activation score를 재계산 없이 가중","14D layer profile과 Milestone 11 element preference로 alignment 계산"]};
}

export function summarizeFortunePeriod(periodId:string,period:{startInstant:string;endInstant:string},segments:FortuneSynthesisPeriod[]):FortunePeriodSummary{
  if(segments.length===1){const row=segments[0],duration=new Date(row.period.endInstant).getTime()-new Date(row.period.startInstant).getTime();
    return{periodId,period,segmentIds:[row.synthesisId],segmentWeights:[{synthesisId:row.synthesisId,durationMilliseconds:duration,weight:1}],
      favorabilityScore:row.favorability.score,activationScore:row.activation.score,transformationBaseAlignment:row.transformationAlignment.baseScore,
      transformationAdjustedAlignment:row.transformationAlignment.adjustedScore,transformationDelta:row.transformationAlignment.delta,
      peakActivationScore:row.activation.score,peakSegmentId:row.synthesisId,maxPositiveDelta:Math.max(0,row.transformationAlignment.delta),
      maxNegativeDelta:Math.min(0,row.transformationAlignment.delta)};}
  const duration=new Date(period.endInstant).getTime()-new Date(period.startInstant).getTime(),segmentWeights=segments.map(row=>{
    const milliseconds=new Date(row.period.endInstant).getTime()-new Date(row.period.startInstant).getTime();return{synthesisId:row.synthesisId,durationMilliseconds:milliseconds,weight:milliseconds/duration};}),
    average=(get:(row:FortuneSynthesisPeriod)=>number)=>segments.reduce((sum,row,index)=>sum+get(row)*segmentWeights[index].weight,0),
    peak=[...segments].sort((a,b)=>b.activation.score-a.activation.score||a.synthesisId.localeCompare(b.synthesisId))[0];
  return{periodId,period,segmentIds:segments.map(row=>row.synthesisId),segmentWeights,favorabilityScore:average(row=>row.favorability.score),
    activationScore:average(row=>row.activation.score),transformationBaseAlignment:average(row=>row.transformationAlignment.baseScore),
    transformationAdjustedAlignment:average(row=>row.transformationAlignment.adjustedScore),transformationDelta:average(row=>row.transformationAlignment.delta),
    peakActivationScore:peak.activation.score,peakSegmentId:peak.synthesisId,maxPositiveDelta:Math.max(0,...segments.map(row=>row.transformationAlignment.delta)),
    maxNegativeDelta:Math.min(0,...segments.map(row=>row.transformationAlignment.delta))};
}

export function synthesizeFortune(fortune:FortuneResult,useful:SynthesisResult,dayMaster:Stem):FortuneSynthesisResult{
  if(fortune.daeun.status!=="implemented"||fortune.seun.status!=="implemented"||!fortune.seun.periods||fortune.wolun.status!=="implemented"||!fortune.wolun.periods||fortune.transformation.status!=="implemented")
    throw new Error("Implemented 14A-14D results required");
  const transformation=fortune.transformation as FortuneTransformationResult,preferences=Object.fromEntries(useful.elements.map(row=>[row.element,row.score])) as Record<Element,number>,
    daeunByIndex=new Map(fortune.daeun.periods.map(row=>[row.index,row])),seunByYear=new Map(fortune.seun.periods.map(row=>[row.year,row]));
  const daeun=transformation.daeunSnapshots.map(snapshot=>{const row=daeunByIndex.get(snapshot.context.daeunIndex)!,start=row.sourcePeriod.startInstant!,end=row.sourcePeriod.endInstant!;
    return buildPeriod(snapshot.snapshotId,{startInstant:start,endInstant:end},{daeunIndex:row.index},[{layer:"DAEUN",sourceId:`DAEUN-${String(row.index).padStart(2,"0")}`,favorability:row.preference.baseFavorabilityScore,activation:row.activation.score}],snapshot,preferences,dayMaster,
      tags(row.starActivations),row.interactions);});
  const seun=transformation.seunSnapshots.map(snapshot=>{const row=seunByYear.get(snapshot.context.seunYear!)!,segment=row.daeunSegments.find(item=>item.daeunIndex===snapshot.context.daeunIndex)!,daeunRow=daeunByIndex.get(segment.daeunIndex)!;
    return buildPeriod(snapshot.snapshotId,{startInstant:segment.startInstant,endInstant:segment.endInstant},{daeunIndex:segment.daeunIndex,seunYear:row.year},
      [{layer:"DAEUN",sourceId:`DAEUN-${String(segment.daeunIndex).padStart(2,"0")}`,favorability:daeunRow.preference.baseFavorabilityScore,activation:daeunRow.activation.score},
       {layer:"SEUN",sourceId:`SEUN-${row.year}`,favorability:row.preference.baseFavorabilityScore,activation:row.activation.score}],snapshot,preferences,dayMaster,
      [...tags(daeunRow.starActivations,row.starActivations),...(row.samjaeActivation?["SAMJAE_ACTIVATED"]:[])],
      [...daeunRow.interactions,...row.interactions.natal,...row.interactions.daeun,...row.interactions.crossLayer]);});
  const wolun=transformation.wolunSnapshots.map(snapshot=>{const context=snapshot.context.wolun!,row=fortune.wolun.periods!.find(item=>item.seunYear===context.seunYear&&item.indexInSeun===context.indexInSeun)!,
    segment=row.daeunSegments.find(item=>item.daeunIndex===snapshot.context.daeunIndex)!,daeunRow=daeunByIndex.get(segment.daeunIndex)!,seunRow=seunByYear.get(row.seunYear)!;
    return buildPeriod(snapshot.snapshotId,{startInstant:segment.startInstant,endInstant:segment.endInstant},{daeunIndex:segment.daeunIndex,seunYear:row.seunYear,wolunBranch:row.solarMonthBranch},
      [{layer:"DAEUN",sourceId:`DAEUN-${String(segment.daeunIndex).padStart(2,"0")}`,favorability:daeunRow.preference.baseFavorabilityScore,activation:daeunRow.activation.score},
       {layer:"SEUN",sourceId:`SEUN-${row.seunYear}`,favorability:seunRow.preference.baseFavorabilityScore,activation:seunRow.activation.score},
       {layer:"WOLUN",sourceId:`WOLUN-${row.seunYear}-${row.solarMonthBranch}`,favorability:row.preference.baseFavorabilityScore,activation:row.activation.score}],snapshot,preferences,dayMaster,
      [...tags(daeunRow.starActivations,seunRow.starActivations,row.starActivations),...(seunRow.samjaeActivation?["SAMJAE_ACTIVATED"]:[])],
      [...daeunRow.interactions,...seunRow.interactions.natal,...seunRow.interactions.daeun,...seunRow.interactions.crossLayer,
       ...row.interactions.natal,...row.interactions.daeun,...row.interactions.seun,...row.interactions.crossLayer]);});
  daeun.sort((a,b)=>a.context.daeunIndex-b.context.daeunIndex||a.synthesisId.localeCompare(b.synthesisId));
  seun.sort((a,b)=>new Date(a.period.startInstant).getTime()-new Date(b.period.startInstant).getTime()||a.synthesisId.localeCompare(b.synthesisId));
  wolun.sort((a,b)=>new Date(a.period.startInstant).getTime()-new Date(b.period.startInstant).getTime()||a.synthesisId.localeCompare(b.synthesisId));
  const seunPeriodSummaries=fortune.seun.periods.flatMap(row=>{const segments=seun.filter(item=>item.context.seunYear===row.year);
      return segments.length?[summarizeFortunePeriod(`SEUN-${row.year}`,row.period,segments)]:[];}),
    wolunPeriodSummaries=fortune.wolun.periods.flatMap(row=>{const segments=wolun.filter(item=>item.context.seunYear===row.seunYear&&item.context.wolunBranch===row.solarMonthBranch);
      return segments.length?[summarizeFortunePeriod(`WOLUN-${row.seunYear}-${row.solarMonthBranch}`,row.period,segments)]:[];});
  return{status:"implemented",ruleVersion:RULE.ruleVersion,layerWeightVersion:RULE.layerWeightVersion,
    transformationAlignmentVersion:RULE.transformationAlignmentVersion,periodSummaryVersion:RULE.periodSummaryVersion,
    daeun,seun,wolun,seunPeriodSummaries,wolunPeriodSummaries,evidence:["favorability/activation/transformation alignment 세 축 분리",
      "combinedProfile 대신 layer profile과 45/35/20 weight 사용","신살·삼재·공망은 tag context only"]};
}
