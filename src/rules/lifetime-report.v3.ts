export type LifetimeBookEvidenceGroup=
  "COVER"|"INTRO"|"CORE"|"PILLARS"|"HIDDEN_STEMS"|"TEN_GODS"|"ELEMENTS"|"STRENGTH"|"STRUCTURE_USEFUL"|"FORTUNE_EXPLAIN"|
  "IDENTITY"|"WORK"|"WEALTH"|"RELATIONSHIP"|"CHILDREN"|"WELLNESS"|"NOBLE"|"STARS_RELATIONS"|"TWELVE_STAGES"|
  "YEARLY_OVERVIEW"|"YEAR_1"|"YEAR_2"|"YEAR_3"|"YEAR_4"|"YEAR_5"|"MONTHLY"|"CHANGE"|"DAEUN_OVERVIEW"|
  "DAEUN_1"|"DAEUN_2"|"DAEUN_3"|"DAEUN_4"|"DAEUN_5"|"DAEUN_6"|"DAEUN_7"|"DAEUN_8"|"DAEUN_9"|"DAEUN_10"|"SYNTHESIS"|"PROFESSIONAL";

export interface LifetimeBookPage {
  id:string;
  pageNumber:number;
  title:string;
  evidenceGroup:LifetimeBookEvidenceGroup;
}
export interface LifetimeBookPart {
  partNumber:string;
  title:string;
  pages:LifetimeBookPage[];
}

/**
 * LIFETIME_BOOK_V1 follows the broad educational → natal → domain → timing → closing
 * progression observed in long-form Korean saju reports, while keeping POSTPOST wording,
 * evidence contracts and safety boundaries independent.
 *
 * The 154 logical pages are a product/layout budget, not 154 unrelated predictions.
 * Explanatory pages may be deterministic/static; personalized claims must remain evidence-grounded.
 */
export const LIFETIME_BOOK_V1={
  reportVersion:"lifetime-report-v3",
  inputVersion:"lifetime-interpretation-input-v3",
  schemaVersion:"lifetime-report-schema-v3",
  promptVersion:"lifetime-report-prompt-v3",
  pageCount:154,
  parts:[
  {partNumber:"00",title:"책을 펼치기 전에",pages:[
    {id:"book-001",pageNumber:1,title:"표지",evidenceGroup:"COVER"},
    {id:"book-002",pageNumber:2,title:"이 책을 읽는 순서",evidenceGroup:"INTRO"},
    {id:"book-003",pageNumber:3,title:"태어난 순간이 남기는 것",evidenceGroup:"INTRO"},
    {id:"book-004",pageNumber:4,title:"POSTPOST가 사주를 읽는 방식",evidenceGroup:"INTRO"},
    {id:"book-005",pageNumber:5,title:"계산과 해석을 나누는 이유",evidenceGroup:"INTRO"},
    {id:"book-006",pageNumber:6,title:"전문용어 없이 먼저 읽는 법",evidenceGroup:"INTRO"}
  ]},
  {partNumber:"01",title:"성격과 기본 성향",pages:[
    {id:"book-007",pageNumber:7,title:"성격과 기본 성향",evidenceGroup:"CORE"},
    {id:"book-008",pageNumber:8,title:"한마디로 보는 나",evidenceGroup:"CORE"},
    {id:"book-009",pageNumber:9,title:"상황에 따라 달라지는 내 모습",evidenceGroup:"PILLARS"},
    {id:"book-010",pageNumber:10,title:"처음 만났을 때의 나",evidenceGroup:"PILLARS"},
    {id:"book-011",pageNumber:11,title:"사회생활에서의 나",evidenceGroup:"PILLARS"},
    {id:"book-012",pageNumber:12,title:"가까운 사람 앞의 나",evidenceGroup:"PILLARS"},
    {id:"book-013",pageNumber:13,title:"혼자 있을 때의 나",evidenceGroup:"PILLARS"},
    {id:"book-014",pageNumber:14,title:"겉으로 넘겨도 마음에 오래 남는 것들",evidenceGroup:"HIDDEN_STEMS"},
    {id:"book-015",pageNumber:15,title:"십성이 보여주는 내 역할",evidenceGroup:"TEN_GODS"},
    {id:"book-016",pageNumber:16,title:"내 오행은 어디에 몰려 있을까",evidenceGroup:"ELEMENTS"},
    {id:"book-017",pageNumber:17,title:"혼자 버티는 힘과 도움받는 방식",evidenceGroup:"STRENGTH"},
    {id:"book-018",pageNumber:18,title:"나에게 도움이 되는 기운",evidenceGroup:"STRUCTURE_USEFUL"},
    {id:"book-019",pageNumber:19,title:"대운·연운·월운은 무엇이 다를까",evidenceGroup:"FORTUNE_EXPLAIN"}
  ]},
  {partNumber:"02",title:"일주와 오행",pages:[
    {id:"book-020",pageNumber:20,title:"오행으로 보는 나",evidenceGroup:"IDENTITY"},
    {id:"book-021",pageNumber:21,title:"나를 대표하는 기운",evidenceGroup:"IDENTITY"},
    {id:"book-022",pageNumber:22,title:"나를 대표하는 두 글자",evidenceGroup:"PILLARS"},
    {id:"book-023",pageNumber:23,title:"겉으로 보이는 나와 속마음",evidenceGroup:"IDENTITY"},
    {id:"book-024",pageNumber:24,title:"오행이 행동에 만드는 차이",evidenceGroup:"ELEMENTS"},
    {id:"book-025",pageNumber:25,title:"부족한 부분을 생활에서 채우는 방법",evidenceGroup:"STRUCTURE_USEFUL"},
    {id:"book-026",pageNumber:26,title:"잘하는 방식이 과해질 때",evidenceGroup:"IDENTITY"}
  ]},
  {partNumber:"03",title:"직업운·학업운",pages:[
    {id:"book-027",pageNumber:27,title:"직업운·학업운",evidenceGroup:"WORK"},
    {id:"book-028",pageNumber:28,title:"나에게 잘 맞는 일",evidenceGroup:"WORK"},
    {id:"book-029",pageNumber:29,title:"직장과 사업 중 어디가 더 잘 맞을까",evidenceGroup:"WORK"},
    {id:"book-030",pageNumber:30,title:"직장에서 잘 풀리는 방식",evidenceGroup:"WORK"},
    {id:"book-031",pageNumber:31,title:"책임이 커질 때의 나",evidenceGroup:"WORK"},
    {id:"book-032",pageNumber:32,title:"직장 인간관계",evidenceGroup:"WORK"},
    {id:"book-033",pageNumber:33,title:"사업운",evidenceGroup:"WORK"},
    {id:"book-034",pageNumber:34,title:"어떤 공부가 잘 맞을까",evidenceGroup:"WORK"}
  ]},
  {partNumber:"04",title:"재물운",pages:[
    {id:"book-035",pageNumber:35,title:"재물운",evidenceGroup:"WEALTH"},
    {id:"book-036",pageNumber:36,title:"돈을 대하는 방식",evidenceGroup:"WEALTH"},
    {id:"book-037",pageNumber:37,title:"돈의 흐름",evidenceGroup:"WEALTH"},
    {id:"book-038",pageNumber:38,title:"돈을 버는 힘",evidenceGroup:"WEALTH"},
    {id:"book-039",pageNumber:39,title:"돈을 모으고 지키는 힘",evidenceGroup:"WEALTH"},
    {id:"book-040",pageNumber:40,title:"돈과 인간관계",evidenceGroup:"WEALTH"},
    {id:"book-041",pageNumber:41,title:"큰 기회 앞에서 조심할 점",evidenceGroup:"WEALTH"},
    {id:"book-042",pageNumber:42,title:"평생 재물운에서 기억할 점",evidenceGroup:"WEALTH"}
  ]},
  {partNumber:"05",title:"연애운·결혼운·자녀운",pages:[
    {id:"book-043",pageNumber:43,title:"연애운·결혼운·자녀운",evidenceGroup:"RELATIONSHIP"},
    {id:"book-044",pageNumber:44,title:"연애 성향",evidenceGroup:"RELATIONSHIP"},
    {id:"book-045",pageNumber:45,title:"연애에서 반복되는 패턴",evidenceGroup:"RELATIONSHIP"},
    {id:"book-046",pageNumber:46,title:"가까운 관계에서의 나",evidenceGroup:"RELATIONSHIP"},
    {id:"book-047",pageNumber:47,title:"마음이 가는 상대",evidenceGroup:"RELATIONSHIP"},
    {id:"book-048",pageNumber:48,title:"애정 표현",evidenceGroup:"RELATIONSHIP"},
    {id:"book-049",pageNumber:49,title:"다툴 때의 나",evidenceGroup:"RELATIONSHIP"},
    {id:"book-050",pageNumber:50,title:"현재 관계와 결혼운",evidenceGroup:"RELATIONSHIP"},
    {id:"book-051",pageNumber:51,title:"자녀운",evidenceGroup:"CHILDREN"},
    {id:"book-052",pageNumber:52,title:"가족운",evidenceGroup:"CHILDREN"}
  ]},
  {partNumber:"06",title:"건강운",pages:[
    {id:"book-053",pageNumber:53,title:"건강운",evidenceGroup:"WELLNESS"},
    {id:"book-054",pageNumber:54,title:"몸이 보내는 신호",evidenceGroup:"WELLNESS"},
    {id:"book-055",pageNumber:55,title:"생활 리듬",evidenceGroup:"WELLNESS"},
    {id:"book-056",pageNumber:56,title:"휴식과 회복",evidenceGroup:"WELLNESS"},
    {id:"book-057",pageNumber:57,title:"긴장과 스트레스",evidenceGroup:"WELLNESS"},
    {id:"book-058",pageNumber:58,title:"활력이 떨어질 때",evidenceGroup:"WELLNESS"},
    {id:"book-059",pageNumber:59,title:"식사와 생활 습관",evidenceGroup:"WELLNESS"},
    {id:"book-060",pageNumber:60,title:"건조함이 강할 때",evidenceGroup:"WELLNESS"},
    {id:"book-061",pageNumber:61,title:"몸이 차고 회복이 느릴 때",evidenceGroup:"WELLNESS"},
    {id:"book-062",pageNumber:62,title:"잘 지키는 습관과 놓치기 쉬운 습관",evidenceGroup:"WELLNESS"},
    {id:"book-063",pageNumber:63,title:"대운에서 건강 리듬이 흔들릴 때",evidenceGroup:"WELLNESS"}
  ]},
  {partNumber:"07",title:"귀인운",pages:[
    {id:"book-064",pageNumber:64,title:"귀인운",evidenceGroup:"NOBLE"},
    {id:"book-065",pageNumber:65,title:"귀인복",evidenceGroup:"NOBLE"},
    {id:"book-066",pageNumber:66,title:"사주에서 말하는 귀인이란",evidenceGroup:"NOBLE"},
    {id:"book-067",pageNumber:67,title:"내 사주에 들어온 귀인",evidenceGroup:"NOBLE"},
    {id:"book-068",pageNumber:68,title:"배움에서 만나는 귀인",evidenceGroup:"NOBLE"},
    {id:"book-069",pageNumber:69,title:"뜻밖의 기회를 주는 귀인",evidenceGroup:"NOBLE"},
    {id:"book-070",pageNumber:70,title:"그 밖의 귀인",evidenceGroup:"NOBLE"},
    {id:"book-071",pageNumber:71,title:"귀인은 어디에서 만날까",evidenceGroup:"NOBLE"},
    {id:"book-072",pageNumber:72,title:"귀인운이 강해지는 때",evidenceGroup:"NOBLE"},
    {id:"book-073",pageNumber:73,title:"귀인을 알아보는 법",evidenceGroup:"NOBLE"}
  ]},
  {partNumber:"08",title:"신살",pages:[
    {id:"book-074",pageNumber:74,title:"신살",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-075",pageNumber:75,title:"눈에 띄는 신살",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-076",pageNumber:76,title:"내 사주에서 강하게 보이는 신살",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-077",pageNumber:77,title:"사람의 시선을 끄는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-078",pageNumber:78,title:"혼자 깊이 파고드는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-079",pageNumber:79,title:"예민하게 감지하는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-080",pageNumber:80,title:"가까울수록 꼬이기 쉬운 관계",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-081",pageNumber:81,title:"날카롭게 몰입하는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-082",pageNumber:82,title:"부딪힘·흔들림·신경 쓰임",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-083",pageNumber:83,title:"서로 끌어당기고 커지는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-084",pageNumber:84,title:"신살은 어떻게 봐야 할까",evidenceGroup:"STARS_RELATIONS"}
  ]},
  {partNumber:"09",title:"십이운성",pages:[
    {id:"book-085",pageNumber:85,title:"십이운성",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-086",pageNumber:86,title:"내 십이운성 한눈에 보기",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-087",pageNumber:87,title:"십이운성 12단계",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-088",pageNumber:88,title:"십이운성이 뜻하는 것",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-089",pageNumber:89,title:"년주의 십이운성",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-090",pageNumber:90,title:"월주의 십이운성",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-091",pageNumber:91,title:"일주의 십이운성",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-092",pageNumber:92,title:"시주의 십이운성",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-093",pageNumber:93,title:"인생 초반의 흐름",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-094",pageNumber:94,title:"인생 중반의 흐름",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-095",pageNumber:95,title:"인생 후반의 흐름",evidenceGroup:"TWELVE_STAGES"}
  ]},
  {partNumber:"10",title:"십성",pages:[
    {id:"book-096",pageNumber:96,title:"십성",evidenceGroup:"TEN_GODS"},
    {id:"book-097",pageNumber:97,title:"내 십성 한눈에 보기",evidenceGroup:"TEN_GODS"},
    {id:"book-098",pageNumber:98,title:"십성 분포",evidenceGroup:"TEN_GODS"},
    {id:"book-099",pageNumber:99,title:"십성 10가지 뜻",evidenceGroup:"TEN_GODS"},
    {id:"book-100",pageNumber:100,title:"비겁 · 경쟁하고 버티는 힘",evidenceGroup:"TEN_GODS"},
    {id:"book-101",pageNumber:101,title:"식상 · 표현하고 만들어내는 힘",evidenceGroup:"TEN_GODS"},
    {id:"book-102",pageNumber:102,title:"재성 · 돈과 결과를 만드는 힘",evidenceGroup:"TEN_GODS"},
    {id:"book-103",pageNumber:103,title:"관성 · 책임과 규칙",evidenceGroup:"TEN_GODS"},
    {id:"book-104",pageNumber:104,title:"인성 · 배우고 받아들이는 힘",evidenceGroup:"TEN_GODS"},
    {id:"book-105",pageNumber:105,title:"겉으로 드러난 십성",evidenceGroup:"TEN_GODS"},
    {id:"book-106",pageNumber:106,title:"속에 숨은 십성",evidenceGroup:"TEN_GODS"},
    {id:"book-107",pageNumber:107,title:"겉으로 보이는 나와 속마음의 차이",evidenceGroup:"TEN_GODS"},
    {id:"book-108",pageNumber:108,title:"상황마다 달라지는 십성",evidenceGroup:"TEN_GODS"}
  ]},
  {partNumber:"11",title:"연운 · 앞으로 5년",pages:[
    {id:"book-109",pageNumber:109,title:"연운 · 앞으로 5년",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-110",pageNumber:110,title:"앞으로 5년 한눈에 보기",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-111",pageNumber:111,title:"5년 전체 흐름",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-112",pageNumber:112,title:"첫 번째 해",evidenceGroup:"YEAR_1"},
    {id:"book-113",pageNumber:113,title:"두 번째 해",evidenceGroup:"YEAR_2"},
    {id:"book-114",pageNumber:114,title:"세 번째 해",evidenceGroup:"YEAR_3"},
    {id:"book-115",pageNumber:115,title:"네 번째 해",evidenceGroup:"YEAR_4"},
    {id:"book-116",pageNumber:116,title:"다섯 번째 해",evidenceGroup:"YEAR_5"},
    {id:"book-117",pageNumber:117,title:"월운 · 변화가 큰 달",evidenceGroup:"MONTHLY"},
    {id:"book-118",pageNumber:118,title:"5년 동안 직업·재물·관계 변화",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-119",pageNumber:119,title:"앞으로 5년에서 기억할 점",evidenceGroup:"YEARLY_OVERVIEW"}
  ]},
  {partNumber:"12",title:"삼재·변화운",pages:[
    {id:"book-120",pageNumber:120,title:"삼재·변화운",evidenceGroup:"CHANGE"},
    {id:"book-121",pageNumber:121,title:"지금 변화운은 어느 정도일까",evidenceGroup:"CHANGE"},
    {id:"book-122",pageNumber:122,title:"변화운이 커진다는 뜻",evidenceGroup:"CHANGE"},
    {id:"book-123",pageNumber:123,title:"부딪힘이 변화를 만드는 때",evidenceGroup:"CHANGE"},
    {id:"book-124",pageNumber:124,title:"서로 모이며 일이 커지는 때",evidenceGroup:"CHANGE"},
    {id:"book-125",pageNumber:125,title:"반복해서 신경 쓰이게 하는 압박",evidenceGroup:"CHANGE"},
    {id:"book-126",pageNumber:126,title:"기운이 실제로 옮겨 가는 관계",evidenceGroup:"CHANGE"},
    {id:"book-127",pageNumber:127,title:"변화가 큰 시기",evidenceGroup:"CHANGE"},
    {id:"book-128",pageNumber:128,title:"변화가 큰 때 기억할 점",evidenceGroup:"CHANGE"}
  ]},
  {partNumber:"13",title:"대운",pages:[
    {id:"book-129",pageNumber:129,title:"대운",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-130",pageNumber:130,title:"현재 대운",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-131",pageNumber:131,title:"평생 대운",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-132",pageNumber:132,title:"대운은 어떻게 바뀔까",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-133",pageNumber:133,title:"대운표",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-134",pageNumber:134,title:"첫 번째 10년",evidenceGroup:"DAEUN_1"},
    {id:"book-135",pageNumber:135,title:"두 번째 10년",evidenceGroup:"DAEUN_2"},
    {id:"book-136",pageNumber:136,title:"세 번째 10년",evidenceGroup:"DAEUN_3"},
    {id:"book-137",pageNumber:137,title:"네 번째 10년",evidenceGroup:"DAEUN_4"},
    {id:"book-138",pageNumber:138,title:"다섯 번째 10년",evidenceGroup:"DAEUN_5"},
    {id:"book-139",pageNumber:139,title:"여섯 번째 10년",evidenceGroup:"DAEUN_6"},
    {id:"book-140",pageNumber:140,title:"일곱 번째 10년",evidenceGroup:"DAEUN_7"},
    {id:"book-141",pageNumber:141,title:"여덟 번째 10년",evidenceGroup:"DAEUN_8"},
    {id:"book-142",pageNumber:142,title:"아홉 번째 10년",evidenceGroup:"DAEUN_9"},
    {id:"book-143",pageNumber:143,title:"열 번째 10년",evidenceGroup:"DAEUN_10"},
    {id:"book-144",pageNumber:144,title:"초·중·후반 대운 요약",evidenceGroup:"DAEUN_OVERVIEW"}
  ]},
  {partNumber:"14",title:"총정리",pages:[
    {id:"book-145",pageNumber:145,title:"총정리",evidenceGroup:"SYNTHESIS"},
    {id:"book-146",pageNumber:146,title:"결국 나는 어떤 사람인가",evidenceGroup:"SYNTHESIS"},
    {id:"book-147",pageNumber:147,title:"내 강점이 가장 잘 살아나는 때",evidenceGroup:"SYNTHESIS"},
    {id:"book-148",pageNumber:148,title:"강점이 부담으로 바뀌는 순간",evidenceGroup:"SYNTHESIS"},
    {id:"book-149",pageNumber:149,title:"직업운·재물운 핵심",evidenceGroup:"SYNTHESIS"},
    {id:"book-150",pageNumber:150,title:"연애·가족운 핵심",evidenceGroup:"SYNTHESIS"},
    {id:"book-151",pageNumber:151,title:"건강운 핵심",evidenceGroup:"SYNTHESIS"},
    {id:"book-152",pageNumber:152,title:"나에게 도움이 되는 선택",evidenceGroup:"SYNTHESIS"},
    {id:"book-153",pageNumber:153,title:"평생 기억할 다섯 가지",evidenceGroup:"SYNTHESIS"},
    {id:"book-154",pageNumber:154,title:"전문 분석",evidenceGroup:"PROFESSIONAL"}
  ]}
  ] as LifetimeBookPart[],
  relationship:{
    SINGLE:{label:"솔로",focus:["사람을 고르는 기준","관계 시작 방식","새로운 만남에서 보이는 성향","장기 관계에서 중요한 요소"]},
    DATING:{label:"연애 중",focus:["현재 관계에서 나타나는 성향","표현과 소통 방식","갈등 패턴","장기 관계로 갈 때 중요한 부분"]},
    MARRIED:{label:"기혼",focus:["배우자와 생활할 때의 성향","역할과 책임","소통 방식","오래 함께할수록 중요한 요소"]}
  },
  prohibitedChildrenClaims:["자녀는 두 명입니다","아들을 낳습니다","딸을 낳습니다","첫째는","둘째는","몇 살에 출산","임신이 됩니다","임신이 어렵습니다","현재 아이와"],
  prohibitedWellnessClaims:["심장이 약합니다","폐가 나쁩니다","신장이 약합니다","질병 확률","수술합니다","수명이","치료해야","약을 먹"],
  prohibitedAxisConfusion:["변화 움직임이 높아 좋은 운","활성도가 높아 좋은 운","지원과 활성을 합친 운 점수"]
} as const;

export const LIFETIME_BOOK_PAGES=LIFETIME_BOOK_V1.parts.flatMap(part=>part.pages.map(page=>({...page,partNumber:part.partNumber})));
