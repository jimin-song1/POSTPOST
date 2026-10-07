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

const childTopics=["부모가 되었을 때 먼저 나오는 모습","아이에게 안정감을 주는 방식","걱정이 많아질 때 생기는 변화","아이를 챙기는 방식","가족 안에서 내가 맡기 쉬운 역할","부모가 되었을 때 더 강해지는 모습","가족 관계에서 조심할 점","아이와 가까워지는 법","부모로서 잘하는 점","부모 역할이 버겁게 느껴질 때","가족 일이 많아지는 시기","앞으로 가족 관계에서 달라질 수 있는 점"];
const samjaeTopics=["삼재를 너무 무섭게 볼 필요 없는 이유","내게 변화가 크게 느껴지는 주기","변화가 시작되는 때","변화가 한가운데 들어오는 때","변화가 정리되는 때","나는 변화를 얼마나 크게 느끼는 편일까","원래 성향과 변화 시기가 만날 때","10년 흐름과 변화 시기가 겹칠 때","지나온 변화와 다음 변화","변화가 큰 때 기억할 점"];
const yearTopics=["그해의 전체 분위기","대운과 함께 보는 그해의 흐름","직업·재물·관계 중 어디가 많이 움직일까"];
const daeunTopics=["이 대운의 전반부와 후반부"];

const YINYANGWAN_STYLE_PART_TITLES:Record<string,string>={
  "01":"성격과 기본 성향",
  "02":"일주와 오행",
  "03":"직업운·학업운",
  "04":"재물운",
  "05":"연애운·결혼운·자녀운",
  "06":"건강운",
  "07":"좋은 인연과 도움운",
  "08":"눈에 띄는 특별한 성향",
  "09":"나이에 따라 달라지는 모습",
  "10":"내가 일·돈·사람을 다루는 방식",
  "11":"앞으로 5년",
  "12S":"변화가 커지는 시기",
  "13":"10년 단위 큰 흐름",
  "14":"총정리"
};
const customerPart=(partNumber:string,fallback:string)=>({partNumber,title:YINYANGWAN_STYLE_PART_TITLES[partNumber]??fallback});

export function buildDynamicLifetimeBook(options:{includeSamjae:boolean;year:number;relationshipStatus?:"SINGLE"|"DATING"|"MARRIED"}):DynamicLifetimeBook{
  const base=LIFETIME_BOOK_PAGES.map(page=>{const legacyPart=LIFETIME_BOOK_V1.parts.find(item=>item.partNumber===page.partNumber)!;
    const remappedPartNumber=page.id==="book-015"?"10":
      ["book-016","book-017","book-018"].includes(page.id)?"02":
      page.id==="book-019"?"11":
      legacyPart.partNumber==="12"?"12S":legacyPart.partNumber;
    const part=customerPart(remappedPartNumber,legacyPart.title);
    return{id:`legacy-${page.id}`,title:page.title,partNumber:part.partNumber,partTitle:part.title,evidenceGroup:page.evidenceGroup,density:density(page.evidenceGroup),topic:page.title,
      contentKind:page.evidenceGroup==="COVER"||page.evidenceGroup==="INTRO"?"FRONT_MATTER" as const:page.evidenceGroup==="PROFESSIONAL"?"PROFESSIONAL" as const:"CONTENT" as const};});
  const additions:Array<Omit<DynamicBookSection,"sequence">>=[];
  if(options.relationshipStatus==="SINGLE"){
    const spouseTopics=["미래 배우자는 어떤 사람일까","어디에서 인연이 시작되기 쉬울까","결혼하면 잘 맞는 생활 방식"];
    spouseTopics.forEach((title,index)=>additions.push(extra(`relationship-single-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"05",YINYANGWAN_STYLE_PART_TITLES["05"],"RELATIONSHIP","CORE")));
  }
  childTopics.forEach((title,index)=>additions.push(extra(`children-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","TIMING_CORE")));
  if(options.includeSamjae)samjaeTopics.forEach((title,index)=>additions.push(extra(`samjae-${String(index+1).padStart(2,"0")}-${slug(title)}`,title,"12S",YINYANGWAN_STYLE_PART_TITLES["12S"],"SAMJAE","TIMING_CORE")));
  for(let offset=0;offset<5;offset++)yearTopics.forEach((title,index)=>{const yearlyTitle=`${options.year+offset}년 · ${title}`;additions.push(extra(`year-${options.year+offset}-${String(index+1).padStart(2,"0")}`,yearlyTitle,"11",YINYANGWAN_STYLE_PART_TITLES["11"],(`YEAR_${offset+1}` as LifetimeEvidenceGroup),"TIMING_CORE",yearlyTitle));});
  for(let daeun=1;daeun<=10;daeun++)daeunTopics.forEach((title,index)=>{const daeunTitle=`${daeun}번째 10년 · ${title}`;additions.push(extra(`daeun-${daeun}-${String(index+1).padStart(2,"0")}`,daeunTitle,"13",YINYANGWAN_STYLE_PART_TITLES["13"],(`DAEUN_${daeun}` as LifetimeEvidenceGroup),"TIMING_CORE",daeunTitle));});
  const all=[...base,...additions].sort((a,b)=>{
    const order=["00","01","02","03","04","05","06","07","08","09","10","11","12S","13","14"];
    return order.indexOf(a.partNumber)-order.indexOf(b.partNumber);});
  const sections=all.map((row,index)=>({...row,sequence:index+1}));
  const partOrder=Array.from(new Set(sections.map(row=>row.partNumber)));
  const parts=partOrder.map(partNumber=>{const rows=sections.filter(row=>row.partNumber===partNumber);return{partNumber,title:rows[0].partTitle,
    requiredTopics:Array.from(new Set(rows.filter(row=>row.contentKind==="CONTENT").map(row=>row.topic))),sections:rows};});
  return{version:"dynamic-lifetime-book-v4",parts,sections,contentSectionCount:sections.filter(row=>row.contentKind==="CONTENT").length};
}
