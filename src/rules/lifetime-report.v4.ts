import {LIFETIME_BOOK_V1,LIFETIME_BOOK_PAGES,type LifetimeBookEvidenceGroup as LegacyEvidenceGroup} from "./lifetime-report.v3";

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
  chapterMinimumCharacters:{CORE:8000,IDENTITY:8000,WORK:8000,WEALTH:8000,RELATIONSHIP:8000,CHILDREN:6000,WELLNESS:6000,
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

const childTopics=["자녀와 돌봄을 뜻하는 기운","아이와 돌봄의 기운이 겉으로 드러나는 자리","겉으로 보이지 않는 자녀와 돌봄의 기운","태어난 시간의 두 글자","태어난 시간 자리가 보여주는 가족 역할","태어난 시간 자리의 에너지 단계","태어난 시간 자리와 다른 자리의 관계","부모 역할을 맡는 방식","아이와 가까워지는 방식","부모가 되었을 때의 장점","부모 역할이 짐이 되는 순간","가족 역할이 커지는 10년 흐름","가까운 몇 년의 자녀와 가족 테마"];
const samjaeTopics=["삼재란 무엇인가","내 생년지가 만드는 삼재 주기","들삼재의 시작","눌삼재의 머무름","날삼재의 정리","내 사주에서 삼재가 체감되는 방식","타고난 관계 패턴과 삼재","10년 흐름과 삼재의 중첩","지나온 삼재와 다음 삼재","삼재를 지나가는 현실적인 방식"];
const yearTopics=["그 해의 두 기운과 내 기본 흐름의 만남","10년 흐름 속 도움과 변화","움직임이 커지는 분야의 행동 기준"];
const daeunTopics=["전반부와 후반부, 앞뒤 흐름의 차이"];

export function buildDynamicLifetimeBook(options:{includeSamjae:boolean;year:number}):DynamicLifetimeBook{
  const base=LIFETIME_BOOK_PAGES.map(page=>{const part=LIFETIME_BOOK_V1.parts.find(item=>item.partNumber===page.partNumber)!;
    return{id:`legacy-${page.id}`,title:page.title,partNumber:part.partNumber,partTitle:part.title,evidenceGroup:page.evidenceGroup,density:density(page.evidenceGroup),topic:page.title,
      contentKind:page.evidenceGroup==="COVER"||page.evidenceGroup==="INTRO"?"FRONT_MATTER" as const:page.evidenceGroup==="PROFESSIONAL"?"PROFESSIONAL" as const:"CONTENT" as const};});
  const additions:Array<Omit<DynamicBookSection,"sequence">>=[];
  childTopics.forEach((title,index)=>additions.push(extra(`children-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"09","아이와 가족 역할","CHILDREN","TIMING_CORE")));
  if(options.includeSamjae)samjaeTopics.forEach((title,index)=>additions.push(extra(`samjae-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"12S","삼재와 인생의 큰 변화","SAMJAE","TIMING_CORE")));
  for(let offset=0;offset<5;offset++)yearTopics.forEach((title,index)=>{const yearlyTitle=`${options.year+offset}년 · ${title}`;additions.push(extra(`year-${options.year+offset}-${String(index+1).padStart(2,"0")}`,yearlyTitle,"11","앞으로 5년",(`YEAR_${offset+1}` as LifetimeEvidenceGroup),"TIMING_CORE",yearlyTitle));});
  for(let daeun=1;daeun<=10;daeun++)daeunTopics.forEach((title,index)=>{const daeunTitle=`${daeun}번째 10년 · ${title}`;additions.push(extra(`daeun-${daeun}-${String(index+1).padStart(2,"0")}`,daeunTitle,"13","10년마다 바뀌는 큰 흐름",(`DAEUN_${daeun}` as LifetimeEvidenceGroup),"TIMING_CORE",daeunTitle));});
  const all=[...base,...additions].sort((a,b)=>{
    const original=LIFETIME_BOOK_V1.parts.map(row=>row.partNumber),insertAt=original.indexOf("13"),order=[...original.slice(0,insertAt),"12S",...original.slice(insertAt)];
    return order.indexOf(a.partNumber)-order.indexOf(b.partNumber);});
  const sections=all.map((row,index)=>({...row,sequence:index+1}));
  const partOrder=Array.from(new Set(sections.map(row=>row.partNumber)));
  const parts=partOrder.map(partNumber=>{const rows=sections.filter(row=>row.partNumber===partNumber);return{partNumber,title:rows[0].partTitle,
    requiredTopics:Array.from(new Set(rows.filter(row=>row.contentKind==="CONTENT").map(row=>row.topic))),sections:rows};});
  return{version:"dynamic-lifetime-book-v4",parts,sections,contentSectionCount:sections.filter(row=>row.contentKind==="CONTENT").length};
}
