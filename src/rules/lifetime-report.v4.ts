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
  "01":"나는 어떤 존재인가",
  "02":"일주와 오행",
  "03":"직업운 · 학업운",
  "04":"재물운",
  "05":"연애운 · 결혼운 · 자녀운",
  "06":"건강운",
  "07":"귀인운",
  "08":"신살",
  "09":"십이운성",
  "10":"십성",
  "11":"연운 · 앞으로 5년",
  "12S":"삼재 · 변화운",
  "13":"대운",
  "14":"총정리"
};
const customerPart=(partNumber:string,fallback:string)=>({partNumber,title:YINYANGWAN_STYLE_PART_TITLES[partNumber]??fallback});

const CUSTOMER_SECTION_TITLES:Record<string,string>={
  "book-002":"이 책을 읽기 전에",
  "book-003":"사주는 무엇을 보고 읽을까",
  "book-004":"이 책이 사주를 풀어가는 순서",
  "book-005":"계산된 값이 해설이 되는 과정",
  "book-006":"어려운 용어는 이렇게 풀어봅니다",

  "book-008":"나를 한 문장으로 말하면",
  "book-009":"낯선 곳·일·가까운 사람 앞에서",
  "book-010":"첫인상 뒤에 숨은 기준",
  "book-011":"일이 생겼을 때 먼저 보는 것",
  "book-012":"가까워질수록 달라지는 모습",
  "book-013":"혼자 있을 때 드러나는 본모습",
  "book-014":"쉽게 지나치지 못하는 감정",

  "book-015":"내가 자주 쓰는 역할",
  "book-016":"오행의 균형과 치우침",
  "book-017":"혼자 버티는 힘",
  "book-018":"나에게 힘을 보태는 기운",
  "book-019":"운의 흐름은 이렇게 읽어요",
  "book-020":"내 사주의 중심은 어디에 있을까",
  "book-021":"나를 이루는 중심 기운",
  "book-022":"나를 대표하는 두 글자",
  "book-023":"겉으로 보이는 모습과 속마음",
  "book-024":"강점과 약점이 갈리는 지점",
  "book-025":"부족한 기운을 채우는 방향",
  "book-026":"강점이 과해지는 순간",

  "book-027":"일과 배움의 큰 방향",
  "book-028":"재능이 가장 잘 살아나는 일",
  "book-029":"직장과 사업, 더 맞는 자리",
  "book-030":"직장에서 강점이 살아나는 조건",
  "book-031":"책임이 커질수록 달라지는 점",
  "book-032":"함께 일하기 좋은 사람",
  "book-033":"사업에서 강점이 살아나는 구조",
  "book-034":"배움이 성과로 이어지는 분야",

  "book-035":"재물운의 큰 흐름",
  "book-036":"돈 앞에서 드러나는 기준",
  "book-037":"돈이 움직이는 방향",
  "book-038":"수입이 만들어지는 경로",
  "book-039":"번 돈이 남는 조건",
  "book-040":"사람과 돈의 경계",
  "book-041":"큰돈이 움직일 때",
  "book-042":"평생 재물운의 핵심",

  "book-043":"관계운의 큰 흐름",
  "book-045":"관계에서 반복되는 패턴",
  "book-048":"사랑을 표현하는 모습",
  "book-049":"갈등이 생겼을 때",
  "book-052":"가족 안에서 맡는 역할",

  "book-053":"몸의 균형과 타고난 리듬",
  "book-054":"먼저 살펴야 할 약한 지점",
  "book-055":"생활에서 보완할 부분",
  "book-056":"회복이 필요한 신호",
  "book-057":"스트레스가 쌓이는 패턴",
  "book-058":"기운을 회복하는 순서",
  "book-059":"수면·식사·움직임의 균형",
  "book-062":"잘 챙기는 것과 놓치는 것",
  "book-063":"생활 리듬이 흔들리는 시기",

  "book-064":"귀인운의 큰 흐름",
  "book-067":"내게 귀인이 되는 사람",
  "book-068":"배움과 성장에서 만나는 인연",
  "book-069":"기회를 연결하는 사람",
  "book-071":"좋은 인연이 들어오는 자리",
  "book-072":"귀인운이 강해지는 시기",
  "book-073":"좋은 인연을 알아보는 기준",

  "book-074":"사주에서 두드러지는 신살",
  "book-077":"도화 · 사람들에게 남는 인상",
  "book-078":"화개 · 혼자 깊이 파고드는 힘",
  "book-079":"귀문 · 남들보다 예민하게 감지하는 것",
  "book-080":"원진 · 가까울수록 예민해지는 이유",
  "book-081":"현침 · 세밀하게 보고 정확히 짚는 힘",
  "book-082":"충·형·파·해 · 부딪힘이 만드는 변화",
  "book-083":"합 · 사람과 일이 모이는 힘",
  "book-084":"신살을 삶에서 쓰는 법",

  "book-085":"십이운성으로 보는 삶의 힘",
  "book-089":"어린 시절에 형성된 힘",
  "book-090":"사회생활에서 드러나는 힘",
  "book-091":"가까운 관계에서 드러나는 힘",
  "book-092":"후반의 삶과 부모 역할",
  "book-093":"인생 초반",
  "book-094":"인생 중반",
  "book-095":"인생 후반",

  "book-096":"십성으로 보는 나의 중심 역할",
  "book-100":"비겁 · 스스로 밀고 가는 힘",
  "book-101":"식상 · 표현하고 만들어내는 힘",
  "book-102":"재성 · 돈과 현실을 다루는 힘",
  "book-103":"관성 · 책임과 기준을 세우는 힘",
  "book-104":"인성 · 배우고 이해하는 힘",
  "book-105":"처음 보이는 모습",
  "book-106":"가까워진 뒤 드러나는 모습",
  "book-107":"겉과 속에서 다른 역할",
  "book-108":"일·돈·관계에서 달라지는 역할",

  "book-109":"앞으로 5년의 큰 흐름",
  "book-117":"올해 움직임이 큰 달",
  "book-118":"5년 동안 달라지는 일·돈·관계",
  "book-119":"5년을 지나며 남는 핵심",

  "book-120":"변화운의 큰 흐름",
  "book-121":"지금은 변화가 큰 시기인가",
  "book-122":"변화가 커질 때 먼저 생기는 일",
  "book-123":"부딪힘이 방향을 바꾸는 순간",
  "book-124":"사람과 일이 한쪽으로 몰릴 때",
  "book-125":"반복해서 신경 쓰이는 문제",
  "book-126":"사람과 환경이 방향을 바꿀 때",
  "book-127":"큰 변화가 들어오는 시기",
  "book-128":"변화가 클수록 지켜야 할 기준",

  "book-129":"평생 대운의 큰 흐름",
  "book-130":"지금 지나고 있는 대운",
  "book-131":"대운 한눈에 보기",
  "book-132":"대운이 바뀌는 경계",
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
  "book-144":"인생 초반·중반·후반의 흐름",

  "book-145":"한 권으로 정리한 내 사주",
  "book-146":"결국 나는 어떤 사람인가",
  "book-147":"강점이 가장 잘 살아나는 순간",
  "book-148":"강점이 부담으로 바뀌는 순간",
  "book-149":"일과 돈에서 기억할 기준",
  "book-150":"사랑과 가족에서 기억할 기준",
  "book-151":"몸과 생활에서 기억할 기준",
  "book-152":"앞으로 선택할 때 도움이 되는 기준",
  "book-153":"평생 기억할 다섯 가지",
  "book-154":"계산 근거 · 자세히 보기"
};

export function buildDynamicLifetimeBook(options:{includeSamjae:boolean;year:number;relationshipStatus?:"SINGLE"|"DATING"|"MARRIED";childStatus?:"NONE"|"EXPECTING"|"HAS_CHILDREN"}):DynamicLifetimeBook{
  const omittedBaseIds=new Set([
    "book-009","book-011","book-015","book-019","book-020","book-023",
    "book-046","book-060","book-061","book-065","book-066","book-070","book-075","book-076",
    "book-086","book-087","book-088","book-093","book-094","book-095",
    "book-097","book-098","book-099","book-105","book-106","book-107","book-108",
    "book-110","book-111","book-120","book-122","book-133","book-146","book-152"
  ]);
  const base=LIFETIME_BOOK_PAGES.filter(page=>!omittedBaseIds.has(page.id)).map(page=>{const legacyPart=LIFETIME_BOOK_V1.parts.find(item=>item.partNumber===page.partNumber)!;
    const remappedPartNumber=page.id==="book-011"?"03":
      page.id==="book-015"?"10":
      ["book-016","book-017","book-018"].includes(page.id)?"02":
      page.id==="book-019"?"11":
      legacyPart.partNumber==="12"?"12S":legacyPart.partNumber;
    const part=customerPart(remappedPartNumber,legacyPart.title);
    let title=CUSTOMER_SECTION_TITLES[page.id]??page.title;
    if(page.id==="book-007")title="선택 앞에서 드러나는 기준";
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
      if(options.childStatus==="HAS_CHILDREN")title="현재 부모 역할";
      else if(options.childStatus==="EXPECTING")title="출산을 앞둔 지금";
      else title="부모가 된다면 드러나는 모습";
    }
    if(page.id==="book-112")title=`${options.year}년 · 시작점이 되는 해`;
    if(page.id==="book-113")title=`${options.year+1}년 · 이어지는 흐름과 변화`;
    if(page.id==="book-114")title=`${options.year+2}년 · 선택이 중요해지는 해`;
    if(page.id==="book-115")title=`${options.year+3}년 · 변화가 커지는 해`;
    if(page.id==="book-116")title=`${options.year+4}년 · 남는 것을 정하는 해`;
    const topic=page.id==="book-047"?title:page.title;
    return{id:`legacy-${page.id}`,title,partNumber:part.partNumber,partTitle:part.title,evidenceGroup:page.evidenceGroup,density:density(page.evidenceGroup),topic,
      contentKind:page.evidenceGroup==="COVER"||page.evidenceGroup==="INTRO"?"FRONT_MATTER" as const:page.evidenceGroup==="PROFESSIONAL"?"PROFESSIONAL" as const:"CONTENT" as const};});
  const additions:Array<Omit<DynamicBookSection,"sequence">>=[];
  additions.push(
    extra("children-overview","자녀운의 큰 흐름","05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","CORE"),
    extra("children-bond","아이와 맺게 되는 관계","05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","CORE"),
    extra("children-timing","자녀운의 현재와 다음 흐름","05",YINYANGWAN_STYLE_PART_TITLES["05"],"CHILDREN","TIMING_CORE")
  );
  if(options.includeSamjae)additions.push(extra("samjae-summary","삼재의 실제 연도와 흐름","12S",YINYANGWAN_STYLE_PART_TITLES["12S"],"SAMJAE","TIMING_CORE"));
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
