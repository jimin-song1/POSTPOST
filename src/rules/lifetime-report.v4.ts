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


const YINYANGWAN_STYLE_PART_TITLES:Record<string,string>={
  "01":"성격과 기본 성향",
  "02":"일주와 오행",
  "03":"직업운·학업운",
  "04":"재물운",
  "05":"연애운·결혼운·자녀운",
  "06":"건강운",
  "07":"귀인운",
  "08":"신살 · 특별하게 드러나는 성향",
  "09":"십이운성 · 시기마다 달라지는 모습",
  "10":"십성 · 내가 일·돈·사람을 다루는 방식",
  "11":"앞으로 5년",
  "12S":"변화가 커지는 시기",
  "13":"대운 · 10년 단위 큰 흐름",
  "14":"총정리"
};
const customerPart=(partNumber:string,fallback:string)=>({partNumber,title:YINYANGWAN_STYLE_PART_TITLES[partNumber]??fallback});

export function buildDynamicLifetimeBook(options:{includeSamjae:boolean;year:number;relationshipStatus?:"SINGLE"|"DATING"|"MARRIED"}):DynamicLifetimeBook{
  const omittedBaseIds=new Set(["book-046","book-060","book-061","book-065","book-066","book-070","book-075","book-076","book-086","book-087","book-088","book-097","book-098","book-099","book-110","book-111","book-133"]);
  const base=LIFETIME_BOOK_PAGES.filter(page=>!omittedBaseIds.has(page.id)).map(page=>{const legacyPart=LIFETIME_BOOK_V1.parts.find(item=>item.partNumber===page.partNumber)!;
    const remappedPartNumber=page.id==="book-015"?"10":
      ["book-016","book-017","book-018"].includes(page.id)?"02":
      page.id==="book-019"?"11":
      legacyPart.partNumber==="12"?"12S":legacyPart.partNumber;
    const part=customerPart(remappedPartNumber,legacyPart.title);
    let title=page.title;
    if(page.id==="book-047"){
      if(options.relationshipStatus==="SINGLE")title="미래 배우자는 어떤 사람일까";
      else if(options.relationshipStatus==="DATING")title="현재 연인에게 끌리는 이유";
      else if(options.relationshipStatus==="MARRIED")title="배우자에게 중요하게 보는 것";
    }
    if(page.id==="book-112")title=`${options.year}년 · 가장 크게 움직이는 것`;
    if(page.id==="book-113")title=`${options.year+1}년 · 달라지는 것`;
    if(page.id==="book-114")title=`${options.year+2}년 · 중요한 선택`;
    if(page.id==="book-115")title=`${options.year+3}년 · 커지는 변화`;
    if(page.id==="book-116")title=`${options.year+4}년 · 남겨야 할 것`;
    return{id:`legacy-${page.id}`,title,partNumber:part.partNumber,partTitle:part.title,evidenceGroup:page.evidenceGroup,density:density(page.evidenceGroup),topic:title,
      contentKind:page.evidenceGroup==="COVER"||page.evidenceGroup==="INTRO"?"FRONT_MATTER" as const:page.evidenceGroup==="PROFESSIONAL"?"PROFESSIONAL" as const:"CONTENT" as const};});
  const additions:Array<Omit<DynamicBookSection,"sequence">>=[];
  const all=[...base,...additions].sort((a,b)=>{
    const order=["00","01","02","03","04","05","06","07","08","09","10","11","12S","13","14"];
    return order.indexOf(a.partNumber)-order.indexOf(b.partNumber);});
  const sections=all.map((row,index)=>({...row,sequence:index+1}));
  const partOrder=Array.from(new Set(sections.map(row=>row.partNumber)));
  const parts=partOrder.map(partNumber=>{const rows=sections.filter(row=>row.partNumber===partNumber);return{partNumber,title:rows[0].partTitle,
    requiredTopics:Array.from(new Set(rows.filter(row=>row.contentKind==="CONTENT").map(row=>row.topic))),sections:rows};});
  return{version:"dynamic-lifetime-book-v4",parts,sections,contentSectionCount:sections.filter(row=>row.contentKind==="CONTENT").length};
}
