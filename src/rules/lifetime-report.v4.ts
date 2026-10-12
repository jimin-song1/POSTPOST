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
  version:"lifetime-content-contract-v1",minimumContentSections:90,recommendedContentSections:{min:100,max:140},
  totalCharacters:{minimum:30_000,recommendedMin:38_000,recommendedMax:75_000},
  sectionCharacters:{CONCEPT:{min:100,recommendedMax:420},GENERAL:{min:180,recommendedMax:700},CORE:{min:240,recommendedMax:900},TIMING_CORE:{min:240,recommendedMax:950}},
  chapterMinimumCharacters:{CORE:1600,IDENTITY:1200,WORK:1400,WEALTH:1500,RELATIONSHIP:1400,CHILDREN:1200,WELLNESS:1500,
    NOBLE_STARS:1800,TEN_GODS_STAGES:1900,YEARLY:1700,SAMJAE:350,DAEUN:2500,SYNTHESIS:1400},
  novelty:{minimumNewElements:3,maxReusedCoreClaim:1,maxReusedScene:0,semanticDuplicateThreshold:0.9},
  requiredChapters:["CORE","IDENTITY","WORK","WEALTH","RELATIONSHIP","CHILDREN","WELLNESS","NOBLE_STARS","TEN_GODS_STAGES","YEARLY","SAMJAE","DAEUN","SYNTHESIS"]
} as const;

const density=(group:LifetimeEvidenceGroup):ContentDensity=>["COVER","INTRO","FORTUNE_EXPLAIN"].includes(group)?"CONCEPT":
  ["CHILDREN","YEARLY_OVERVIEW","YEAR_1","YEAR_2","YEAR_3","YEAR_4","YEAR_5","MONTHLY","DAEUN_OVERVIEW","DAEUN_1","DAEUN_2","DAEUN_3","DAEUN_4","DAEUN_5","DAEUN_6","DAEUN_7","DAEUN_8","DAEUN_9","DAEUN_10"].includes(group)?"TIMING_CORE":
  ["CORE","IDENTITY","ELEMENTS","STRENGTH","WORK","WEALTH","RELATIONSHIP","SYNTHESIS"].includes(group)?"CORE":"GENERAL";
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

const CUSTOMER_SECTION_TITLES:Record<string,string>={
  "book-002":"이 책을 읽기 전에",
  "book-003":"사주는 무엇을 보고 읽을까",
  "book-004":"이 책이 사주를 풀어가는 순서",
  "book-005":"계산된 값이 해설이 되는 과정",
  "book-006":"어려운 용어는 이렇게 풀어봅니다",

  "book-008":"한마디로 보면 이런 사람",
  "book-009":"낯선 곳·일·가까운 사람 앞에서",
  "book-010":"사람을 처음 만났을 때",
  "book-011":"일이 생겼을 때 먼저 보는 것",
  "book-012":"마음이 가까워진 뒤 달라지는 것",
  "book-013":"혼자 있을 때 머릿속에서 도는 생각",
  "book-014":"쉽게 넘기지 못하고 오래 남는 것",

  "book-015":"내가 자주 쓰는 역할",
  "book-016":"강하게 쓰는 기운과 덜 익숙한 기운",
  "book-017":"혼자 해결하려는 힘",
  "book-018":"나에게 힘을 보태는 기운",
  "book-019":"운의 흐름은 이렇게 읽어요",
  "book-020":"내 사주의 중심은 어디에 있을까",
  "book-021":"나를 대표하는 기운",
  "book-022":"나를 대표하는 두 글자",
  "book-023":"겉으로 보이는 모습과 속마음",
  "book-024":"잘되는 건 빠르고, 막히는 건 느린 이유",
  "book-025":"부족한 기운을 생활에서 채우는 법",
  "book-026":"강점이 과해지면 생기는 일",

  "book-027":"내 일의 큰 흐름",
  "book-028":"어떤 일을 할 때 힘이 살아날까",
  "book-029":"직장과 사업, 어느 쪽이 더 맞을까",
  "book-030":"직장에서 일이 잘 풀리는 조건",
  "book-031":"책임이 커지면 어떻게 달라질까",
  "book-032":"상사·동료와 잘 맞는 기준",
  "book-033":"사업을 한다면 잘 맞는 형태",
  "book-034":"어떤 공부가 오래 남을까",

  "book-035":"내 돈의 큰 흐름",
  "book-036":"돈을 쓸 때 가장 먼저 보는 것",
  "book-037":"돈은 어디에서 움직일까",
  "book-038":"돈이 들어오기 쉬운 경로",
  "book-039":"번 돈이 실제로 남는 조건",
  "book-040":"가까운 사람과 돈이 섞일 때",
  "book-041":"큰돈이 움직일 때 조심할 것",
  "book-042":"평생 재물운의 핵심",

  "book-043":"내 관계운의 큰 흐름",
  "book-045":"관계에서 자꾸 반복되는 장면",
  "book-048":"좋아하는 마음을 표현할 때",
  "book-049":"서운하거나 다툴 때",
  "book-052":"가족 안에서 자연스럽게 맡는 역할",

  "book-053":"내 몸의 균형부터 보면",
  "book-054":"먼저 챙겨야 하는 부분",
  "book-055":"평소 생활에서 먼저 바꿀 것",
  "book-056":"쉬어도 피곤할 때 필요한 것",
  "book-057":"스트레스가 쌓이면 먼저 나타나는 변화",
  "book-058":"기운이 떨어졌을 때 회복 순서",
  "book-059":"수면·식사·움직임에서 먼저 챙길 것",
  "book-062":"잘 챙기는 것과 자꾸 놓치는 것",
  "book-063":"생활 리듬이 크게 흔들리는 시기",

  "book-064":"내게 들어오는 도움의 흐름",
  "book-067":"내게 귀인이 되는 사람",
  "book-068":"배우는 자리에서 만나는 좋은 인연",
  "book-069":"기회를 연결해주는 사람",
  "book-071":"좋은 인연은 어디에서 만나기 쉬울까",
  "book-072":"도움을 받기 쉬운 시기",
  "book-073":"좋은 인연을 알아보는 기준",

  "book-074":"내 사주에서 눈에 띄는 특별한 기운",
  "book-077":"도화 · 사람들이 나를 기억하는 이유",
  "book-078":"화개 · 혼자 깊이 빠져드는 힘",
  "book-079":"귀문·원진 · 남들보다 예민하게 느끼는 것",
  "book-080":"원진 · 가까울수록 신경 쓰이는 이유",
  "book-081":"현침 · 세밀하게 보고 날카롭게 짚는 힘",
  "book-082":"충·형·파·해 · 관계와 환경이 흔들릴 때",
  "book-083":"합 · 사람과 일이 자연스럽게 모일 때",
  "book-084":"이 기운들을 생활에서 어떻게 쓰면 좋을까",

  "book-085":"내 삶의 힘은 어디에서 강해질까",
  "book-089":"어린 시절에 만들어진 힘",
  "book-090":"사회에서 힘을 쓰는 모습",
  "book-091":"가까운 관계에서 힘이 움직이는 모습",
  "book-092":"후반 삶과 부모 역할에서 보이는 힘",
  "book-093":"인생 초반",
  "book-094":"인생 중반",
  "book-095":"인생 후반",

  "book-096":"내 안에서 가장 자주 쓰는 힘",
  "book-100":"혼자 결정해야 편한 순간",
  "book-101":"생각을 밖으로 꺼낼 때",
  "book-102":"돈과 현실 문제 앞에서",
  "book-103":"책임이 생겼을 때",
  "book-104":"배우고 익힐 때",
  "book-105":"처음 보이는 모습",
  "book-106":"가까워진 뒤 드러나는 모습",
  "book-107":"겉과 속에서 다른 역할",
  "book-108":"일·돈·관계에서 달라지는 역할",

  "book-109":"앞으로 5년의 흐름",
  "book-117":"올해 변화가 큰 달",
  "book-118":"5년 동안 일·돈·관계는 어떻게 바뀔까",
  "book-119":"앞으로 5년, 가장 중요한 선택",

  "book-120":"변화운의 큰 흐름",
  "book-121":"지금 변화가 많은 때일까",
  "book-122":"변화가 커질 때 먼저 생기는 일",
  "book-123":"부딪힘이 방향을 바꾸는 순간",
  "book-124":"사람과 일이 한쪽으로 몰릴 때",
  "book-125":"같은 문제가 반복해서 신경 쓰일 때",
  "book-126":"사람·환경 때문에 방향이 바뀔 때",
  "book-127":"큰 변화가 들어오는 구간",
  "book-128":"변화가 클 때 놓치지 말아야 할 것",

  "book-129":"평생 대운의 큰 흐름",
  "book-130":"지금 내가 지나고 있는 10년",
  "book-131":"내 10년 흐름 한눈에 보기",
  "book-132":"대운이 바뀔 때 무엇이 달라질까",
  "book-134":"첫 번째 대운",
  "book-135":"두 번째 대운",
  "book-136":"세 번째 대운",
  "book-137":"네 번째 대운",
  "book-138":"다섯 번째 대운",
  "book-139":"여섯 번째 대운",
  "book-140":"일곱 번째 대운",
  "book-141":"여덟 번째 대운",
  "book-142":"아홉 번째 대운",
  "book-143":"열 번째 대운",
  "book-144":"인생 초반·중반·후반",

  "book-145":"내 사주를 한 번에 정리하면",
  "book-146":"결국 나는 어떤 사람인가",
  "book-147":"내 강점이 가장 잘 살아나는 때",
  "book-148":"강점이 오히려 부담이 되는 순간",
  "book-149":"일과 돈에서 기억할 것",
  "book-150":"사랑과 가족에서 기억할 것",
  "book-151":"몸과 생활에서 기억할 것",
  "book-152":"앞으로 선택할 때 도움이 되는 기준",
  "book-153":"평생 기억할 다섯 가지",
  "book-154":"계산 근거 · 자세히 보기"
};

export function buildDynamicLifetimeBook(options:{includeSamjae:boolean;year:number;relationshipStatus?:"SINGLE"|"DATING"|"MARRIED";childStatus?:"NONE"|"EXPECTING"|"HAS_CHILDREN"}):DynamicLifetimeBook{
  const omittedBaseIds=new Set(["book-046","book-060","book-061","book-065","book-066","book-070","book-075","book-076","book-086","book-087","book-088","book-097","book-098","book-099","book-110","book-111","book-133"]);
  const base=LIFETIME_BOOK_PAGES.filter(page=>!omittedBaseIds.has(page.id)).map(page=>{const legacyPart=LIFETIME_BOOK_V1.parts.find(item=>item.partNumber===page.partNumber)!;
    const remappedPartNumber=page.id==="book-011"?"03":
      page.id==="book-015"?"10":
      ["book-016","book-017","book-018"].includes(page.id)?"02":
      page.id==="book-019"?"11":
      legacyPart.partNumber==="12"?"12S":legacyPart.partNumber;
    const part=customerPart(remappedPartNumber,legacyPart.title);
    let title=CUSTOMER_SECTION_TITLES[page.id]??page.title;
    if(page.id==="book-007")title="내가 마음을 정하는 순서";
    if(page.id==="book-044"){
      if(options.relationshipStatus==="DATING")title="연애할 때의 나";
      else if(options.relationshipStatus==="MARRIED")title="부부 관계에서의 나";
    }
    if(page.id==="book-047"){
      if(options.relationshipStatus==="SINGLE")title="미래 배우자는 어떤 사람일까";
      else if(options.relationshipStatus==="DATING")title="현재 연인에게 끌리는 이유";
      else if(options.relationshipStatus==="MARRIED")title="배우자에게 중요하게 보는 것";
    }
    if(page.id==="book-050"){
      if(options.relationshipStatus==="DATING")title="이 관계를 결혼으로 이어갈 때";
      else if(options.relationshipStatus==="MARRIED")title="결혼생활에서 중요한 것";
    }
    if(page.id==="book-051"){
      if(options.childStatus==="HAS_CHILDREN")title="현재 부모 역할에서의 나";
      else if(options.childStatus==="EXPECTING")title="곧 부모가 되는 시기의 나";
      else title="부모가 된다면 먼저 나오는 모습";
    }
    if(page.id==="book-112")title=`${options.year}년 · 무엇이 시작될까`;
    if(page.id==="book-113")title=`${options.year+1}년 · 무엇이 이어지고 달라질까`;
    if(page.id==="book-114")title=`${options.year+2}년 · 중요한 선택이 생기는 곳`;
    if(page.id==="book-115")title=`${options.year+3}년 · 무엇이 커질까`;
    if(page.id==="book-116")title=`${options.year+4}년 · 무엇을 남기게 될까`;
    const topic=page.id==="book-047"?title:page.title;
    return{id:`legacy-${page.id}`,title,partNumber:part.partNumber,partTitle:part.title,evidenceGroup:page.evidenceGroup,density:density(page.evidenceGroup),topic,
      contentKind:page.evidenceGroup==="COVER"||page.evidenceGroup==="INTRO"?"FRONT_MATTER" as const:page.evidenceGroup==="PROFESSIONAL"?"PROFESSIONAL" as const:"CONTENT" as const};});
  const additions:Array<Omit<DynamicBookSection,"sequence">>=[];
  additions.push(
    extra("children-overview","자녀운 한눈에 보기","05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","CORE"),
    extra("children-bond","아이와 맺는 관계","05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","CORE"),
    extra("children-timing","자녀운의 현재와 앞으로","05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","TIMING_CORE")
  );
  if(options.includeSamjae)additions.push(extra("samjae-summary","삼재 · 실제 연도와 변화 포인트","12S",YINYANGWAN_STYLE_PART_TITLES["12S"],"SAMJAE","TIMING_CORE"));
  const all=[...base,...additions].sort((a,b)=>{
    const order=["00","01","02","03","04","05","06","07","08","09","10","11","12S","13","14"];
    const partDiff=order.indexOf(a.partNumber)-order.indexOf(b.partNumber);
    if(partDiff!==0)return partDiff;
    if(a.partNumber==="05"){
      const childOrder=(id:string)=>{
        const legacy=id.match(/^legacy-book-(\d+)$/);
        if(legacy)return Number(legacy[1])-43;
        if(id==="children-overview")return 7.5;
        if(id==="children-bond")return 8.5;
        if(id==="children-timing")return 8.7;
        return 99;
      };
      return childOrder(a.id)-childOrder(b.id);
    }
    return 0;});
  const sections=all.map((row,index)=>({...row,sequence:index+1}));
  const partOrder=Array.from(new Set(sections.map(row=>row.partNumber)));
  const parts=partOrder.map(partNumber=>{const rows=sections.filter(row=>row.partNumber===partNumber);return{partNumber,title:rows[0].partTitle,
    requiredTopics:Array.from(new Set(rows.filter(row=>row.contentKind==="CONTENT").map(row=>row.topic))),sections:rows};});
  return{version:"dynamic-lifetime-book-v4",parts,sections,contentSectionCount:sections.filter(row=>row.contentKind==="CONTENT").length};
}
