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
export interface TemplateRepeatPair{firstSectionId:string;secondSectionId:string;domain:string;similarity:number;}
export interface LifetimeEditorialAudit{
  warnings:EditorialWarning[];
  templateRepeatPairs:TemplateRepeatPair[];
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
const templateDomain=(group:string)=>group.startsWith("YEAR_")||group==="YEARLY_OVERVIEW"||group==="MONTHLY"?"YEARLY":
  group.startsWith("DAEUN")?"DAEUN":
  ["CORE","PILLARS","HIDDEN_STEMS","STRUCTURE_USEFUL","IDENTITY","ELEMENTS","STRENGTH"].includes(group)?"IDENTITY":
  ["NOBLE","STARS_RELATIONS"].includes(group)?"NOBLE":
  ["TEN_GODS","TWELVE_STAGES"].includes(group)?"ROLES":group;
function templateTokens(row:InterpretationSection){
  let value=(row.paragraphs??[row.body]).join(" ");
  for(const removable of [row.title,row.headline??"",row.lead??""])if(removable)value=value.split(removable).join(" ");
  value=value.replace(/(?:19|20|21)\d{2}년/g,"연도").replace(/\d+번째/g,"순번").replace(/\s+/g," ").trim();
  return new Set(value.replace(/[^a-zA-Z0-9가-힣\s]/g," ").split(/\s+/).filter(token=>token.length>1));
}
function templateSimilarity(a:Set<string>,b:Set<string>){
  const left=Array.from(a),intersection=left.filter(token=>b.has(token)).length,union=new Set([...left,...Array.from(b)]).size;
  return union?intersection/union:0;
}
function findTemplateRepeats(content:InterpretationSection[]){
  const rows=content.map(row=>({row,domain:templateDomain(row.evidenceGroup??""),tokens:templateTokens(row)})),pairs:TemplateRepeatPair[]=[];
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const left=rows[i],right=rows[j];if(left.domain!==right.domain||left.tokens.size<20||right.tokens.size<20)continue;
    const similarity=templateSimilarity(left.tokens,right.tokens);if(similarity>=0.72)pairs.push({firstSectionId:left.row.id,secondSectionId:right.row.id,domain:left.domain,similarity:Number(similarity.toFixed(3))});
  }
  return pairs.slice(0,200);
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

  const templateRepeatPairs=findTemplateRepeats(content);
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

  return{warnings,templateRepeatPairs,metrics:{
    aiToneHits:count("AI_TONE"),reportToneHits:count("REPORT_TONE"),technicalLeakageHits:count("TECHNICAL_LEAKAGE"),longSentenceWarnings:count("LONG_SENTENCE"),
    duplicateClaimWarnings:count("DUPLICATE_CLAIM"),duplicateSceneWarnings:count("DUPLICATE_SCENE"),sectionsWithoutConcreteScene:count("MISSING_SCENE"),
    sectionsWithoutUpsideShadowPair:count("MISSING_UPSIDE_SHADOW"),repeatedEndingWarnings:count("REPEATED_ENDING"),characterConsistencyWarnings:count("CHARACTER_CONSISTENCY")
  },coreNine};
}
