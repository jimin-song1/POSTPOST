import {LIFETIME_BOOK_V1,LIFETIME_BOOK_PAGES,type LifetimeBookEvidenceGroup as LegacyEvidenceGroup} from "./lifetime-report.v3";
import type {ChildStatus,RelationshipStatus} from "@/types/ai-interpretation";

export type LifetimeEvidenceGroup=LegacyEvidenceGroup|"SAMJAE";
export type ContentDensity="CONCEPT"|"GENERAL"|"CORE"|"TIMING_CORE";
export type NoveltyElement="NEW_CLAIM"|"NEW_SCENE"|"NEW_EVIDENCE_COMBINATION"|"NEW_TIMING"|"NEW_UPSIDE"|"NEW_SHADOW"|"NEW_ACTION";
export interface DynamicBookSection{
  id:string;sequence:number;title:string;partNumber:string;partTitle:string;evidenceGroup:LifetimeEvidenceGroup;
  contentKind:"FRONT_MATTER"|"CONTENT"|"PROFESSIONAL";density:ContentDensity;topic:string;
}
export interface DynamicBookPart{partNumber:string;title:string;requiredTopics:string[];sections:DynamicBookSection[];}
export interface DynamicLifetimeBook{version:"dynamic-lifetime-book-v4";parts:DynamicBookPart[];sections:DynamicBookSection[];contentSectionCount:number;}

export const LIFETIME_CONTENT_CONTRACT_V1={
  version:"lifetime-content-contract-v1",minimumContentSections:130,recommendedContentSections:{min:140,max:null},
  totalCharacters:{minimum:90_000,recommendedMin:110_000,recommendedMax:140_000},
  sectionCharacters:{CONCEPT:{min:250,recommendedMax:450},GENERAL:{min:550,recommendedMax:900},CORE:{min:900,recommendedMax:1400},TIMING_CORE:{min:1000,recommendedMax:1800}},
  chapterMinimumCharacters:{CORE:8000,IDENTITY:8000,WORK:8000,WEALTH:8000,RELATIONSHIP:8000,CHILDREN:3000,WELLNESS:6000,
    NOBLE_STARS:7000,TEN_GODS_STAGES:8000,YEARLY:12000,SAMJAE:6000,DAEUN:15000,SYNTHESIS:4000},
  novelty:{minimumNewElements:3,maxReusedCoreClaim:1,maxReusedScene:0,semanticDuplicateThreshold:0.9},
  requiredChapters:["CORE","IDENTITY","WORK","WEALTH","RELATIONSHIP","CHILDREN","WELLNESS","NOBLE_STARS","TEN_GODS_STAGES","YEARLY","SAMJAE","DAEUN","SYNTHESIS"]
} as const;

const density=(group:LifetimeEvidenceGroup):ContentDensity=>["COVER","INTRO","FORTUNE_EXPLAIN"].includes(group)?"CONCEPT":
  ["CHILDREN","YEARLY_OVERVIEW","YEAR_1","YEAR_2","YEAR_3","YEAR_4","YEAR_5","MONTHLY","DAEUN_OVERVIEW","DAEUN_1","DAEUN_2","DAEUN_3","DAEUN_4","DAEUN_5","DAEUN_6","DAEUN_7","DAEUN_8","DAEUN_9","DAEUN_10"].includes(group)?"TIMING_CORE":
  ["CORE","IDENTITY","ELEMENTS","STRENGTH","WORK","WEALTH","RELATIONSHIP","SYNTHESIS"].includes(group)?"CORE":"GENERAL";
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9가-힣]+/g,"-").replace(/^-|-$/g,"");
const extra=(id:string,title:string,partNumber:string,partTitle:string,evidenceGroup:LifetimeEvidenceGroup,densityValue:ContentDensity,topic=title)=>
  ({id,title,partNumber,partTitle,evidenceGroup,density:densityValue,topic,contentKind:"CONTENT" as const});

const FAMILY_TOPICS=["원가족과의 관계","가족 안에서 맡는 역할","가족과 건강한 경계를 세우는 방식"];
const CHILD_TOPICS:Record<Exclude<ChildStatus,"NOT_APPLICABLE">,string[]>={
  NO_CHILDREN:["자녀 인연","부모가 되었을 때의 모습","자녀에게 기대하는 것","자녀와 관계 맺는 방식"],
  HAS_CHILDREN:["자녀와 나의 인연","부모로서의 모습","자녀에게 기대하는 것","자녀와 의견이 다를 때","성장에 따른 관계 변화"],
};
const samjaeTopics=["삼재란 무엇인가","내 생년지가 만드는 삼재 주기","들삼재의 시작","눌삼재의 머무름","날삼재의 정리","내 사주에서 삼재가 체감되는 방식","원국 관계와 삼재","10년 흐름과 삼재의 중첩","지나온 삼재와 다음 삼재","삼재를 지나가는 현실적인 방식"];
const yearTopics=["천간·지지와 원국의 만남","10년 흐름 속 도움과 변화","활성 분야의 행동 기준"];
const daeunTopics=["전반부와 후반부, 앞뒤 흐름의 차이"];

const V56_PARTS=[
  ["PROLOGUE","사주원국"],["PART01","성격"],["PART02","직업운·학업운"],["PART03","직장운"],["PART04","사업운"],["PART05","재물운"],
  ["PART06","연애운·결혼운"],["PART07","가족운"],["PART08","귀인운"],["PART09","건강운"],["PART10","사주 심층풀이"],
  ["SPECIAL","신살·삼재"],["PART11","연운"],["PART12","평생 대운"],["EPILOGUE","에필로그"],
] as const;
const partTitle=(number:string,relationshipStatus:RelationshipStatus)=>number==="PART07"&&relationshipStatus==="MARRIED"?"가족운·자녀운":V56_PARTS.find(row=>row[0]===number)?.[1]??number;
function v56Part(page:(typeof LIFETIME_BOOK_PAGES)[number]){
  if(page.partNumber==="00")return "PROLOGUE";
  if(page.partNumber==="01")return "PART10";
  if(page.partNumber==="02")return "PART01";
  if(page.partNumber==="03"){
    if(page.title.includes("사업"))return "PART04";
    if(["직장에서 힘을 쓰는 방식","책임과 결정권을 다루는 방식","사람과 함께 일할 때의 패턴"].includes(page.title))return "PART03";
    return "PART02";
  }
  if(page.partNumber==="04")return "PART05";
  if(page.partNumber==="05")return page.evidenceGroup==="CHILDREN"?"PART07":"PART06";
  if(page.partNumber==="06")return "PART09";
  if(page.partNumber==="07")return "PART08";
  if(["08","12","12S"].includes(page.partNumber))return "SPECIAL";
  if(["09","10"].includes(page.partNumber))return "PART10";
  if(page.partNumber==="11")return "PART11";
  if(page.partNumber==="13")return "PART12";
  return "EPILOGUE";
}

export function buildDynamicLifetimeBook(options:{includeSamjae:boolean;year:number;relationshipStatus?:RelationshipStatus;childStatus?:ChildStatus}):DynamicLifetimeBook{
  const relationshipStatus=options.relationshipStatus??"SINGLE";
  const childStatus:ChildStatus=relationshipStatus==="MARRIED"?(options.childStatus??"NO_CHILDREN"):"NOT_APPLICABLE";
  const base=LIFETIME_BOOK_PAGES.filter(page=>relationshipStatus==="MARRIED"||page.evidenceGroup!=="CHILDREN").map(page=>{
    const number=v56Part(page),familyRole=page.title==="가족 안에서 역할이 커지는 시기";
    const evidenceGroup=familyRole&&relationshipStatus!=="MARRIED"?"RELATIONSHIP":page.evidenceGroup;
    return{id:`legacy-${page.id}`,title:familyRole?"가족 안에서 맡는 역할":page.title,partNumber:number,partTitle:partTitle(number,relationshipStatus),evidenceGroup,density:density(evidenceGroup),topic:page.title,
      contentKind:page.evidenceGroup==="COVER"||page.evidenceGroup==="INTRO"?"FRONT_MATTER" as const:page.evidenceGroup==="PROFESSIONAL"?"PROFESSIONAL" as const:"CONTENT" as const};});
  const additions:Array<Omit<DynamicBookSection,"sequence">>=[];
  FAMILY_TOPICS.forEach((title,index)=>additions.push(extra(`family-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"PART07",partTitle("PART07",relationshipStatus),"RELATIONSHIP","CORE")));
  if(relationshipStatus==="MARRIED")CHILD_TOPICS[childStatus as Exclude<ChildStatus,"NOT_APPLICABLE">].forEach((title,index)=>additions.push(extra(`children-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"PART07",partTitle("PART07",relationshipStatus),"CHILDREN","TIMING_CORE")));
  if(options.includeSamjae)samjaeTopics.forEach((title,index)=>additions.push(extra(`samjae-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"SPECIAL",partTitle("SPECIAL",relationshipStatus),"SAMJAE","TIMING_CORE")));
  for(let offset=0;offset<5;offset++)yearTopics.forEach((title,index)=>additions.push(extra(`year-${options.year+offset}-${String(index+1).padStart(2,"0")}` ,`${options.year+offset}년 · ${title}`,"PART11",partTitle("PART11",relationshipStatus),(`YEAR_${offset+1}` as LifetimeEvidenceGroup),"TIMING_CORE",title)));
  for(let daeun=1;daeun<=10;daeun++)daeunTopics.forEach((title,index)=>additions.push(extra(`daeun-${daeun}-${String(index+1).padStart(2,"0")}`,`${daeun}번째 10년 · ${title}`,"PART12",partTitle("PART12",relationshipStatus),(`DAEUN_${daeun}` as LifetimeEvidenceGroup),"TIMING_CORE",title)));
  const order=V56_PARTS.map(row=>row[0]);
  const all=[...base,...additions].sort((a,b)=>order.indexOf(a.partNumber as typeof order[number])-order.indexOf(b.partNumber as typeof order[number]));
  const sections=all.map((row,index)=>({...row,sequence:index+1}));
  const partOrder=Array.from(new Set(sections.map(row=>row.partNumber)));
  const parts=partOrder.map(partNumber=>{const rows=sections.filter(row=>row.partNumber===partNumber);return{partNumber,title:rows[0].partTitle,
    requiredTopics:Array.from(new Set(rows.filter(row=>row.contentKind==="CONTENT").map(row=>row.topic))),sections:rows};});
  return{version:"dynamic-lifetime-book-v4",parts,sections,contentSectionCount:sections.filter(row=>row.contentKind==="CONTENT").length};
}
