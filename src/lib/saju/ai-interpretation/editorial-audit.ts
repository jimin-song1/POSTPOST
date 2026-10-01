import type {InterpretationSection,StructuredInterpretation} from "@/types/ai-interpretation";
import {NARRATIVE_EDITORIAL_QA_V1 as RULE} from "@/rules/narrative-editorial-qa.v1";
import {customerTechnicalTermHits} from "@/rules/customer-terminology.v1";

export type EditorialWarningCode=
  "AI_TONE"|"REPORT_TONE"|"TECHNICAL_LEAKAGE"|"LONG_SENTENCE"|"DUPLICATE_CLAIM"|"DUPLICATE_SCENE"|
  "MISSING_SCENE"|"MISSING_UPSIDE_SHADOW"|"REPEATED_ENDING"|"CHARACTER_CONSISTENCY";

export interface EditorialWarning{code:EditorialWarningCode;sectionId:string;detail:string;}
export interface CoreNineEditorialResult{
  id:string;label:string;naturalKorean:boolean;concrete:boolean;novel:boolean;grounded:boolean;nonRepetitive:boolean;timing:boolean;pass:boolean;
}
export interface LifetimeEditorialAudit{
  warnings:EditorialWarning[];
  metrics:{
    aiToneHits:number;reportToneHits:number;technicalLeakageHits:number;longSentenceWarnings:number;
    duplicateClaimWarnings:number;duplicateSceneWarnings:number;sectionsWithoutConcreteScene:number;
    sectionsWithoutUpsideShadowPair:number;repeatedEndingWarnings:number;characterConsistencyWarnings:number;
  };
  coreNine:CoreNineEditorialResult[];
}

const sectionText=(row:InterpretationSection)=>[row.title,row.headline,row.lead,...(row.paragraphs??[row.body]),...(row.keyPoints??[]),row.mascotComment].filter(Boolean).join("\n");
const sentenceList=(value:string)=>value.split(/(?<=[.!?])\s+/).map(row=>row.trim()).filter(Boolean);
const endings=(value:string)=>sentenceList(value).map(sentence=>{
  const normalized=sentence.replace(/[.!?]+$/,"").trim();
  const match=normalized.match(/([가-힣]{1,5}(?:해요|돼요|예요|이에요|합니다|됩니다|있어요|없어요|좋아요|커져요|줄어요|봐요|세요|니다))$/);
  return match?.[1]??"";
}).filter(Boolean);

function hasConcreteScene(value:string){
  return sentenceList(value).some(sentence=>{
    const hasContext=RULE.scene.contextWords.some(word=>sentence.includes(word));
    const hasAction=RULE.scene.actionWords.some(word=>sentence.includes(word));
    return Number(hasContext)+Number(hasAction)>=RULE.scene.minimumSignals;
  });
}
function hasUpsideShadow(value:string){
  return RULE.upsideWords.some(word=>value.includes(word))&&RULE.shadowWords.some(word=>value.includes(word));
}
function repeatedEnding(value:string){
  const values=endings(value);if(values.length<5)return false;
  const counts=new Map<string,number>();for(const ending of values)counts.set(ending,(counts.get(ending)??0)+1);
  return Math.max(...Array.from(counts.values()))/values.length>=0.72;
}
const contradictoryPatterns=[
  [/생각 없이|아무 고민 없이|무조건 바로 결정/,"신중한 결정 core와 충돌"],
  [/누구에게나 바로 마음을 열|처음 본 사람에게도 속마음을/,"관계 core와 충돌"],
  [/마무리에는 관심이 없|끝맺음을 피하/,"마무리 core와 충돌"]
] as const;

export function auditLifetimeEditorialQuality(report:StructuredInterpretation):LifetimeEditorialAudit{
  const warnings:EditorialWarning[]=[];
  const content=report.sections.filter(row=>row.contentKind==="CONTENT");
  const claimOwner=new Map<string,string>(),sceneOwner=new Map<string,string>();

  for(const row of content){
    const value=sectionText(row);
    for(const pattern of RULE.aiTonePatterns)if(value.includes(pattern))warnings.push({code:"AI_TONE",sectionId:row.id,detail:pattern});
    for(const pattern of RULE.reportTonePatterns)if(value.includes(pattern))warnings.push({code:"REPORT_TONE",sectionId:row.id,detail:pattern});
    for(const term of customerTechnicalTermHits(value))warnings.push({code:"TECHNICAL_LEAKAGE",sectionId:row.id,detail:term});
    for(const sentence of sentenceList(value))if(sentence.length>RULE.maxSentenceLength)
      warnings.push({code:"LONG_SENTENCE",sectionId:row.id,detail:`${sentence.length}자 문장`});
    for(const claim of row.claimsUsed??[]){
      const owner=claimOwner.get(claim);if(owner&&owner!==row.id)warnings.push({code:"DUPLICATE_CLAIM",sectionId:row.id,detail:`${claim} / first: ${owner}`});
      else claimOwner.set(claim,row.id);
    }
    for(const scene of row.scenesUsed??[]){
      const owner=sceneOwner.get(scene);if(owner&&owner!==row.id)warnings.push({code:"DUPLICATE_SCENE",sectionId:row.id,detail:`${scene} / first: ${owner}`});
      else sceneOwner.set(scene,row.id);
    }
    if(!hasConcreteScene(value))warnings.push({code:"MISSING_SCENE",sectionId:row.id,detail:"상황과 행동 신호가 함께 보이지 않음"});
    if(!hasUpsideShadow(value))warnings.push({code:"MISSING_UPSIDE_SHADOW",sectionId:row.id,detail:"같은 성향의 장점/부담 양면이 함께 보이지 않음"});
    if(repeatedEnding(value))warnings.push({code:"REPEATED_ENDING",sectionId:row.id,detail:"같은 문장 끝맺음이 과도하게 반복됨"});
    for(const [pattern,detail] of contradictoryPatterns)if(pattern.test(value))warnings.push({code:"CHARACTER_CONSISTENCY",sectionId:row.id,detail});
  }

  const count=(code:EditorialWarningCode)=>warnings.filter(row=>row.code===code).length;
  const coreNine=RULE.coreNine.map(domain=>{
    const rows=content.filter(row=>domain.groups.some(group=>group===(row.evidenceGroup??"")));
    const ids=new Set(rows.map(row=>row.id)),domainWarnings=warnings.filter(row=>ids.has(row.sectionId));
    const naturalKorean=!domainWarnings.some(row=>["AI_TONE","REPORT_TONE","TECHNICAL_LEAKAGE","LONG_SENTENCE","REPEATED_ENDING"].includes(row.code));
    const concrete=!domainWarnings.some(row=>row.code==="MISSING_SCENE");
    const novel=!domainWarnings.some(row=>row.code==="DUPLICATE_CLAIM"||row.code==="DUPLICATE_SCENE");
    const grounded=rows.length>0&&rows.every(row=>row.evidenceIds.length>0);
    const nonRepetitive=novel;
    const timing=!domain.timingRequired||rows.some(row=>/(년|시기|흐름|삼재|10년|대운|앞으로|때)/.test(sectionText(row)));
    return{id:domain.id,label:domain.label,naturalKorean,concrete,novel,grounded,nonRepetitive,timing,
      pass:rows.length>0&&naturalKorean&&concrete&&novel&&grounded&&nonRepetitive&&timing};
  });

  return{warnings,metrics:{
    aiToneHits:count("AI_TONE"),reportToneHits:count("REPORT_TONE"),technicalLeakageHits:count("TECHNICAL_LEAKAGE"),longSentenceWarnings:count("LONG_SENTENCE"),
    duplicateClaimWarnings:count("DUPLICATE_CLAIM"),duplicateSceneWarnings:count("DUPLICATE_SCENE"),sectionsWithoutConcreteScene:count("MISSING_SCENE"),
    sectionsWithoutUpsideShadowPair:count("MISSING_UPSIDE_SHADOW"),repeatedEndingWarnings:count("REPEATED_ENDING"),characterConsistencyWarnings:count("CHARACTER_CONSISTENCY")
  },coreNine};
}
