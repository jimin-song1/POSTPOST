import {LIFETIME_CONTENT_CONTRACT_V1 as RULE,type NoveltyElement} from "@/rules/lifetime-report.v4";
import type {InterpretationSection,StructuredInterpretation} from "@/types/ai-interpretation";

export interface LifetimeContentStats{contentSections:number;totalCharacters:number;chapterCharacters:Record<string,number>;}
export class LifetimeContentContractError extends Error{constructor(message:string){super(message);this.name="LifetimeContentContractError";}}
const chapter=(group:string)=>["CORE","PILLARS","HIDDEN_STEMS","STRUCTURE_USEFUL"].includes(group)?"CORE":
  ["IDENTITY","ELEMENTS","STRENGTH"].includes(group)?"IDENTITY":group==="WORK"?"WORK":group==="WEALTH"?"WEALTH":group==="RELATIONSHIP"?"RELATIONSHIP":
  group==="CHILDREN"?"CHILDREN":group==="WELLNESS"?"WELLNESS":["NOBLE","STARS_RELATIONS"].includes(group)?"NOBLE_STARS":
  ["TEN_GODS","TWELVE_STAGES"].includes(group)?"TEN_GODS_STAGES":group.startsWith("YEAR_")||["YEARLY_OVERVIEW","MONTHLY"].includes(group)?"YEARLY":
  group==="SAMJAE"?"SAMJAE":group.startsWith("DAEUN")?"DAEUN":group==="SYNTHESIS"?"SYNTHESIS":"OTHER";
const prose=(row:InterpretationSection)=>[row.headline,row.lead,...(row.paragraphs??[row.body]),...(row.keyPoints??[])].filter(Boolean).join("\n");
const tokens=(value:string)=>new Set(value.toLowerCase().replace(/[^a-z0-9가-힣\s]/g," ").split(/\s+/).filter(token=>token.length>1));
function similarity(a:string,b:string){const left=tokens(a),right=tokens(b),leftValues=Array.from(left),rightValues=Array.from(right),intersection=leftValues.filter(token=>right.has(token)).length,union=new Set([...leftValues,...rightValues]).size;return union?intersection/union:0;}

export function lifetimeContentStats(report:StructuredInterpretation):LifetimeContentStats{
  const content=report.sections.filter(row=>row.contentKind==="CONTENT"),chapterCharacters:Record<string,number>={};
  for(const row of content){const key=chapter(row.evidenceGroup??"");chapterCharacters[key]=(chapterCharacters[key]??0)+prose(row).length;}
  return{contentSections:content.length,totalCharacters:content.reduce((sum,row)=>sum+prose(row).length,0),chapterCharacters};
}
export function validateLifetimeContentContract(report:StructuredInterpretation){
  const stats=lifetimeContentStats(report),ids=new Set<string>(),scenes=new Set<string>(),claimCounts=new Map<string,number>(),fingerprints:Array<{id:string;text:string}>=[];
  if(stats.contentSections<RULE.minimumContentSections)throw new LifetimeContentContractError(`본문 section이 ${RULE.minimumContentSections}개보다 적습니다.`);
  if(stats.totalCharacters<RULE.totalCharacters.minimum)throw new LifetimeContentContractError(`전체 본문이 ${RULE.totalCharacters.minimum}자보다 짧습니다.`);
  for(const required of RULE.requiredChapters)if(!(required in stats.chapterCharacters))throw new LifetimeContentContractError(`필수 chapter가 없습니다: ${required}`);
  for(const [key,minimum] of Object.entries(RULE.chapterMinimumCharacters))if((stats.chapterCharacters[key]??0)<minimum)
    throw new LifetimeContentContractError(`${key} 본문이 최소 ${minimum}자보다 짧습니다.`);
  for(const row of report.sections){
    if(ids.has(row.id))throw new LifetimeContentContractError(`중복 section ID: ${row.id}`);ids.add(row.id);
    if(row.contentKind!=="CONTENT")continue;
    const novelty=new Set(row.noveltyElements as NoveltyElement[]|undefined);if(novelty.size<RULE.novelty.minimumNewElements)throw new LifetimeContentContractError(`${row.id}의 새 정보 요소가 부족합니다.`);
    for(const scene of row.scenesUsed??[]){if(scenes.has(scene))throw new LifetimeContentContractError(`생활 장면이 반복됩니다: ${scene}`);scenes.add(scene);}
    for(const claim of row.claimsUsed??[])claimCounts.set(claim,(claimCounts.get(claim)??0)+1);
    const text=row.domainConsequence??"";for(const previous of fingerprints)if(text&&similarity(text,previous.text)>=RULE.novelty.semanticDuplicateThreshold)
      throw new LifetimeContentContractError(`${row.id}와 ${previous.id}의 의미가 중복됩니다.`);fingerprints.push({id:row.id,text});
  }
  for(const [claim,count] of Array.from(claimCounts.entries()))if(count>RULE.novelty.maxReusedCoreClaim+1)throw new LifetimeContentContractError(`핵심 claim 재사용 초과: ${claim}`);
  return stats;
}
