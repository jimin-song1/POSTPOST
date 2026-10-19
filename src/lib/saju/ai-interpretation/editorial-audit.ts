import type {InterpretationSection,StructuredInterpretation} from "@/types/ai-interpretation";
import {LIFETIME_EDITORIAL_QA_V1 as RULE} from "@/rules/lifetime-editorial-qa.v1";

export interface SectionEditorialAudit{sectionId:string;title:string;aiTone:string[];reportTone:string[];technicalLeakage:string[];tooLong:number;awkwardKorean:string[];
  repeatedEnding:boolean;withoutConcreteScene:boolean;withoutUpsideShadowPair:boolean;repeatedClaim:string[];repeatedScene:string[];inconsistentCharacter:string[];}
export interface LifetimeEditorialAudit{sections:SectionEditorialAudit[];metrics:{aiToneHits:number;reportToneHits:number;technicalLeakageHits:number;semanticDuplicateClaims:number;
  duplicateScenes:number;sectionsWithoutConcreteScene:number;sectionsWithoutUpsideShadowPair:number;longSentenceWarnings:number;awkwardKoreanWarnings:number;repeatedEndingWarnings:number;characterConsistencyWarnings:number;};}
const prose=(row:InterpretationSection)=>[row.title,row.headline,row.lead,...(row.paragraphs??[row.body]),...(row.keyPoints??[]),row.mascotComment].filter((value):value is string=>Boolean(value)).join("\n");
const hits=(value:string,phrases:readonly string[])=>phrases.filter(phrase=>value.includes(phrase));
const endings=(value:string)=>Array.from(value.matchAll(/([가-힣]+(?:요|니다|어요|아요|해요|돼요))[.!?]/g),match=>match[1]);
export function auditLifetimeEditorial(report:StructuredInterpretation):LifetimeEditorialAudit{
  const claimOwners=new Map<string,string>(),sceneOwners=new Map<string,string>();
  const sections=report.sections.filter(row=>row.contentKind==="CONTENT").map(row=>{const fields=[row.title,row.headline,row.lead,...(row.paragraphs??[row.body]),...(row.keyPoints??[]),row.mascotComment].filter((item):item is string=>Boolean(item)),value=prose(row),sentences=value.split(/[.!?]\s*/).filter(Boolean),endingCounts=new Map<string,number>();
    for(const ending of endings(value))endingCounts.set(ending,(endingCounts.get(ending)??0)+1);
    const repeatedClaim:string[]=[],repeatedScene:string[]=[];for(const claim of row.claimsUsed??[]){if(claimOwners.has(claim))repeatedClaim.push(claim);else claimOwners.set(claim,row.id);}
    for(const scene of row.scenesUsed??[]){if(sceneOwners.has(scene))repeatedScene.push(scene);else sceneOwners.set(scene,row.id);}
    const inconsistentCharacter=[...(value.includes("항상 판단이 느")&&value.includes("항상 판단이 빠")?["판단 속도 절대 표현 충돌"]:[]),
      ...(value.includes("생각 없이 즉흥")&&value.includes("이유가 분명할 때")?["결정 방식 충돌"]:[])];
    return{sectionId:row.id,title:row.title,aiTone:hits(value,RULE.aiTone),reportTone:hits(value,RULE.reportTone),technicalLeakage:hits(value,RULE.technicalTerms),
      tooLong:sentences.filter(sentence=>sentence.length>RULE.longSentenceCharacters).length,awkwardKorean:[...(/\bsection\b/i.test(value)?["내부 section 표현"]:[]),...(/\b(?:evidence|enum)\b/i.test(value)?["내부 영어 표현"]:[]),...(fields.some(field=>(/([가-힣]{2,})\s+\1/).test(field))?["중복 단어"]:[])],
      repeatedEnding:Array.from(endingCounts.values()).some(count=>count>RULE.maxRepeatedEndingPerSection),withoutConcreteScene:!RULE.concreteSceneWords.some(word=>value.includes(word)),
      withoutUpsideShadowPair:!(value.includes("잘 쓰일 때")&&value.includes("과해질 때")),repeatedClaim,repeatedScene,inconsistentCharacter};});
  const sum=(pick:(row:SectionEditorialAudit)=>number)=>sections.reduce((total,row)=>total+pick(row),0);
  return{sections,metrics:{aiToneHits:sum(row=>row.aiTone.length),reportToneHits:sum(row=>row.reportTone.length),technicalLeakageHits:sum(row=>row.technicalLeakage.length),
    semanticDuplicateClaims:sum(row=>row.repeatedClaim.length),duplicateScenes:sum(row=>row.repeatedScene.length),sectionsWithoutConcreteScene:sum(row=>Number(row.withoutConcreteScene)),
    sectionsWithoutUpsideShadowPair:sum(row=>Number(row.withoutUpsideShadowPair)),longSentenceWarnings:sum(row=>row.tooLong),awkwardKoreanWarnings:sum(row=>row.awkwardKorean.length),
    repeatedEndingWarnings:sum(row=>Number(row.repeatedEnding)),characterConsistencyWarnings:sum(row=>row.inconsistentCharacter.length)}};
}
export function assertLifetimeEditorialAudit(audit:LifetimeEditorialAudit){for(const [key,value] of Object.entries(audit.metrics))if(value>0)throw new Error(`Editorial QA failed: ${key}=${value}`);return true;}
