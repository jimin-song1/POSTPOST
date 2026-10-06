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
  {partNumber:"01",title:"내 사주의 기본 설계",pages:[
    {id:"book-007",pageNumber:7,title:"내 사주의 기본 설계",evidenceGroup:"CORE"},
    {id:"book-008",pageNumber:8,title:"한 문장으로 보는 나",evidenceGroup:"CORE"},
    {id:"book-009",pageNumber:9,title:"네 기둥이 만드는 기본 지도",evidenceGroup:"PILLARS"},
    {id:"book-010",pageNumber:10,title:"태어난 해가 보여주는 바깥자리",evidenceGroup:"PILLARS"},
    {id:"book-011",pageNumber:11,title:"태어난 달이 보여주는 사회의 자리",evidenceGroup:"PILLARS"},
    {id:"book-012",pageNumber:12,title:"태어난 날이 보여주는 나와 가까운 자리",evidenceGroup:"PILLARS"},
    {id:"book-013",pageNumber:13,title:"태어난 시간이 보여주는 깊은 자리",evidenceGroup:"PILLARS"},
    {id:"book-014",pageNumber:14,title:"겉으로 보이지 않는 속기운",evidenceGroup:"HIDDEN_STEMS"},
    {id:"book-015",pageNumber:15,title:"네 기둥 위에 놓인 역할들",evidenceGroup:"TEN_GODS"},
    {id:"book-016",pageNumber:16,title:"다섯 기운의 기본 분포",evidenceGroup:"ELEMENTS"},
    {id:"book-017",pageNumber:17,title:"내가 힘을 쓰는 크기",evidenceGroup:"STRENGTH"},
    {id:"book-018",pageNumber:18,title:"타고난 삶의 틀과 필요한 기운",evidenceGroup:"STRUCTURE_USEFUL"},
    {id:"book-019",pageNumber:19,title:"운은 언제 어떻게 바뀔까?",evidenceGroup:"FORTUNE_EXPLAIN"}
  ]},
  {partNumber:"02",title:"나를 대표하는 기운과 다섯 기운",pages:[
    {id:"book-020",pageNumber:20,title:"나를 대표하는 기운과 다섯 기운",evidenceGroup:"IDENTITY"},
    {id:"book-021",pageNumber:21,title:"나를 대표하는 기운은 무엇인가",evidenceGroup:"IDENTITY"},
    {id:"book-022",pageNumber:22,title:"나를 대표하는 두 글자",evidenceGroup:"PILLARS"},
    {id:"book-023",pageNumber:23,title:"겉과 속이 다르게 움직이는 지점",evidenceGroup:"IDENTITY"},
    {id:"book-024",pageNumber:24,title:"다섯 기운의 균형",evidenceGroup:"ELEMENTS"},
    {id:"book-025",pageNumber:25,title:"도움이 되는 기운과 부담이 되는 기운",evidenceGroup:"STRUCTURE_USEFUL"},
    {id:"book-026",pageNumber:26,title:"다섯 기운이 내 생활에서 보이는 모습",evidenceGroup:"IDENTITY"}
  ]},
  {partNumber:"03",title:"일과 배움",pages:[
    {id:"book-027",pageNumber:27,title:"일과 배움",evidenceGroup:"WORK"},
    {id:"book-028",pageNumber:28,title:"일하는 스타일을 한 문장으로",evidenceGroup:"WORK"},
    {id:"book-029",pageNumber:29,title:"직장·사업·배움의 큰 그림",evidenceGroup:"WORK"},
    {id:"book-030",pageNumber:30,title:"직장에서 나는 어떻게 일할까",evidenceGroup:"WORK"},
    {id:"book-031",pageNumber:31,title:"책임과 결정권을 다루는 방식",evidenceGroup:"WORK"},
    {id:"book-032",pageNumber:32,title:"사업을 한다면 보이는 운영 방식",evidenceGroup:"WORK"},
    {id:"book-033",pageNumber:33,title:"사람과 함께 일할 때의 패턴",evidenceGroup:"WORK"},
    {id:"book-034",pageNumber:34,title:"배우고 시험을 준비하는 방식",evidenceGroup:"WORK"}
  ]},
  {partNumber:"04",title:"돈과 선택",pages:[
    {id:"book-035",pageNumber:35,title:"돈과 선택",evidenceGroup:"WEALTH"},
    {id:"book-036",pageNumber:36,title:"돈을 대하는 방식을 한 문장으로",evidenceGroup:"WEALTH"},
    {id:"book-037",pageNumber:37,title:"돈이 들어오고 나가는 기본 구조",evidenceGroup:"WEALTH"},
    {id:"book-038",pageNumber:38,title:"돈을 버는 방식",evidenceGroup:"WEALTH"},
    {id:"book-039",pageNumber:39,title:"돈을 쓰고 지키는 방식",evidenceGroup:"WEALTH"},
    {id:"book-040",pageNumber:40,title:"돈 때문에 생기는 인간관계",evidenceGroup:"WEALTH"},
    {id:"book-041",pageNumber:41,title:"기회 앞에서 커지는 욕심과 경계",evidenceGroup:"WEALTH"},
    {id:"book-042",pageNumber:42,title:"평생 돈을 관리할 때 기억할 것",evidenceGroup:"WEALTH"}
  ]},
  {partNumber:"05",title:"사랑과 가족",pages:[
    {id:"book-043",pageNumber:43,title:"사랑과 가족",evidenceGroup:"RELATIONSHIP"},
    {id:"book-044",pageNumber:44,title:"연애 스타일을 한 문장으로",evidenceGroup:"RELATIONSHIP"},
    {id:"book-045",pageNumber:45,title:"관계에서 반복되는 기본 패턴",evidenceGroup:"RELATIONSHIP"},
    {id:"book-046",pageNumber:46,title:"가까운 관계의 자리",evidenceGroup:"RELATIONSHIP"},
    {id:"book-047",pageNumber:47,title:"마음이 가는 상대의 특징",evidenceGroup:"RELATIONSHIP"},
    {id:"book-048",pageNumber:48,title:"좋아할 때 표현하는 방식",evidenceGroup:"RELATIONSHIP"},
    {id:"book-049",pageNumber:49,title:"관계가 어긋날 때 반복되는 장면",evidenceGroup:"RELATIONSHIP"},
    {id:"book-050",pageNumber:50,title:"지금 관계 상태에서 봐야 할 것",evidenceGroup:"RELATIONSHIP"},
    {id:"book-051",pageNumber:51,title:"아이와 맺는 인연과 부모 역할",evidenceGroup:"CHILDREN"},
    {id:"book-052",pageNumber:52,title:"가족 안에서 역할이 커지는 시기",evidenceGroup:"CHILDREN"}
  ]},
  {partNumber:"06",title:"몸과 생활 리듬",pages:[
    {id:"book-053",pageNumber:53,title:"몸과 생활 리듬",evidenceGroup:"WELLNESS"},
    {id:"book-054",pageNumber:54,title:"컨디션을 한 문장으로",evidenceGroup:"WELLNESS"},
    {id:"book-055",pageNumber:55,title:"내 생활 리듬은 어떤 편일까",evidenceGroup:"WELLNESS"},
    {id:"book-056",pageNumber:56,title:"쉬고 회복하는 방식",evidenceGroup:"WELLNESS"},
    {id:"book-057",pageNumber:57,title:"긴장과 유연함을 다루는 방식",evidenceGroup:"WELLNESS"},
    {id:"book-058",pageNumber:58,title:"나는 언제 기운이 나고 언제 쉽게 지칠까",evidenceGroup:"WELLNESS"},
    {id:"book-059",pageNumber:59,title:"식사와 생활 리듬을 지키는 방식",evidenceGroup:"WELLNESS"},
    {id:"book-060",pageNumber:60,title:"건조함과 정리를 다루는 방식",evidenceGroup:"WELLNESS"},
    {id:"book-061",pageNumber:61,title:"차가움과 회복 시간을 다루는 방식",evidenceGroup:"WELLNESS"},
    {id:"book-062",pageNumber:62,title:"생활에서 잘 지켜지는 것과 놓치기 쉬운 것",evidenceGroup:"WELLNESS"},
    {id:"book-063",pageNumber:63,title:"10년 흐름에서 생활 리듬이 흔들리기 쉬운 때",evidenceGroup:"WELLNESS"}
  ]},
  {partNumber:"07",title:"도움이 되는 사람과 인연",pages:[
    {id:"book-064",pageNumber:64,title:"도움이 되는 사람과 인연",evidenceGroup:"NOBLE"},
    {id:"book-065",pageNumber:65,title:"귀인복을 한 문장으로",evidenceGroup:"NOBLE"},
    {id:"book-066",pageNumber:66,title:"사주에서 말하는 귀인이란",evidenceGroup:"NOBLE"},
    {id:"book-067",pageNumber:67,title:"나에게 들어온 귀인 표시",evidenceGroup:"NOBLE"},
    {id:"book-068",pageNumber:68,title:"배움과 지식으로 만나는 도움",evidenceGroup:"NOBLE"},
    {id:"book-069",pageNumber:69,title:"뜻밖의 전환을 만들어 주는 도움",evidenceGroup:"NOBLE"},
    {id:"book-070",pageNumber:70,title:"그 밖의 귀인 표시",evidenceGroup:"NOBLE"},
    {id:"book-071",pageNumber:71,title:"어떤 자리에서 도움을 만나기 쉬운가",evidenceGroup:"NOBLE"},
    {id:"book-072",pageNumber:72,title:"도움이 커지는 시기",evidenceGroup:"NOBLE"},
    {id:"book-073",pageNumber:73,title:"귀인을 알아보고 받는 방법",evidenceGroup:"NOBLE"}
  ]},
  {partNumber:"08",title:"특별하게 드러나는 표지",pages:[
    {id:"book-074",pageNumber:74,title:"특별하게 드러나는 표지",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-075",pageNumber:75,title:"눈에 띄는 특징을 한 문장으로",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-076",pageNumber:76,title:"내 사주에서 유난히 눈에 띄는 점",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-077",pageNumber:77,title:"사람의 시선을 끄는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-078",pageNumber:78,title:"혼자 깊이 파고드는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-079",pageNumber:79,title:"예민하게 감지하는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-080",pageNumber:80,title:"가까울수록 꼬이기 쉬운 관계",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-081",pageNumber:81,title:"날카롭게 몰입하는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-082",pageNumber:82,title:"부딪힘·흔들림·신경 쓰임",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-083",pageNumber:83,title:"서로 끌어당기고 커지는 힘",evidenceGroup:"STARS_RELATIONS"},
    {id:"book-084",pageNumber:84,title:"특별한 표지를 겁내지 않고 쓰는 법",evidenceGroup:"STARS_RELATIONS"}
  ]},
  {partNumber:"09",title:"삶의 에너지 단계",pages:[
    {id:"book-085",pageNumber:85,title:"삶의 에너지 단계",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-086",pageNumber:86,title:"내 에너지 흐름을 한 문장으로",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-087",pageNumber:87,title:"열두 단계의 흐름",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-088",pageNumber:88,title:"열두 단계는 무엇을 말하는가",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-089",pageNumber:89,title:"태어난 해 자리의 에너지",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-090",pageNumber:90,title:"태어난 달 자리의 에너지",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-091",pageNumber:91,title:"태어난 날 자리의 에너지",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-092",pageNumber:92,title:"태어난 시간 자리의 에너지",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-093",pageNumber:93,title:"인생 초반에 힘이 움직이는 방식",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-094",pageNumber:94,title:"인생 중반에 힘이 움직이는 방식",evidenceGroup:"TWELVE_STAGES"},
    {id:"book-095",pageNumber:95,title:"인생 후반에 힘이 움직이는 방식",evidenceGroup:"TWELVE_STAGES"}
  ]},
  {partNumber:"10",title:"내 안의 여러 역할",pages:[
    {id:"book-096",pageNumber:96,title:"내 안의 여러 역할",evidenceGroup:"TEN_GODS"},
    {id:"book-097",pageNumber:97,title:"타고난 성향을 한 문장으로",evidenceGroup:"TEN_GODS"},
    {id:"book-098",pageNumber:98,title:"내 안의 역할 분포",evidenceGroup:"TEN_GODS"},
    {id:"book-099",pageNumber:99,title:"열 가지 역할은 무엇인가",evidenceGroup:"TEN_GODS"},
    {id:"book-100",pageNumber:100,title:"경쟁하고 버티는 나",evidenceGroup:"TEN_GODS"},
    {id:"book-101",pageNumber:101,title:"말하고 만들어 내는 나",evidenceGroup:"TEN_GODS"},
    {id:"book-102",pageNumber:102,title:"돈과 결과를 다루는 나",evidenceGroup:"TEN_GODS"},
    {id:"book-103",pageNumber:103,title:"책임과 규칙을 다루는 나",evidenceGroup:"TEN_GODS"},
    {id:"book-104",pageNumber:104,title:"배우고 받아들이는 나",evidenceGroup:"TEN_GODS"},
    {id:"book-105",pageNumber:105,title:"겉으로 바로 보이는 역할",evidenceGroup:"TEN_GODS"},
    {id:"book-106",pageNumber:106,title:"속에 숨어 있는 역할",evidenceGroup:"TEN_GODS"},
    {id:"book-107",pageNumber:107,title:"겉모습과 속마음이 달라지는 이유",evidenceGroup:"TEN_GODS"},
    {id:"book-108",pageNumber:108,title:"상황에 따라 달라지는 내 모습",evidenceGroup:"TEN_GODS"}
  ]},
  {partNumber:"11",title:"앞으로 5년의 흐름",pages:[
    {id:"book-109",pageNumber:109,title:"앞으로 5년의 흐름",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-110",pageNumber:110,title:"향후 5년을 한 문장으로",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-111",pageNumber:111,title:"5년 전체 흐름",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-112",pageNumber:112,title:"첫 번째 해",evidenceGroup:"YEAR_1"},
    {id:"book-113",pageNumber:113,title:"두 번째 해",evidenceGroup:"YEAR_2"},
    {id:"book-114",pageNumber:114,title:"세 번째 해",evidenceGroup:"YEAR_3"},
    {id:"book-115",pageNumber:115,title:"네 번째 해",evidenceGroup:"YEAR_4"},
    {id:"book-116",pageNumber:116,title:"다섯 번째 해",evidenceGroup:"YEAR_5"},
    {id:"book-117",pageNumber:117,title:"한 해 안에서 움직임이 커지는 달",evidenceGroup:"MONTHLY"},
    {id:"book-118",pageNumber:118,title:"5년 동안 일·돈·관계가 움직이는 방식",evidenceGroup:"YEARLY_OVERVIEW"},
    {id:"book-119",pageNumber:119,title:"앞으로 5년의 선택 원칙",evidenceGroup:"YEARLY_OVERVIEW"}
  ]},
  {partNumber:"12",title:"변화가 커지는 때",pages:[
    {id:"book-120",pageNumber:120,title:"변화가 커지는 때",evidenceGroup:"CHANGE"},
    {id:"book-121",pageNumber:121,title:"지금 변화의 크기를 한 문장으로",evidenceGroup:"CHANGE"},
    {id:"book-122",pageNumber:122,title:"움직임이 커진다는 뜻",evidenceGroup:"CHANGE"},
    {id:"book-123",pageNumber:123,title:"부딪힘이 변화를 만드는 때",evidenceGroup:"CHANGE"},
    {id:"book-124",pageNumber:124,title:"서로 모이며 일이 커지는 때",evidenceGroup:"CHANGE"},
    {id:"book-125",pageNumber:125,title:"반복해서 신경 쓰이게 하는 압박",evidenceGroup:"CHANGE"},
    {id:"book-126",pageNumber:126,title:"기운이 실제로 옮겨 가는 관계",evidenceGroup:"CHANGE"},
    {id:"book-127",pageNumber:127,title:"움직임이 큰 시기를 찾는 법",evidenceGroup:"CHANGE"},
    {id:"book-128",pageNumber:128,title:"변화가 큰 때를 쓰는 방법",evidenceGroup:"CHANGE"}
  ]},
  {partNumber:"13",title:"10년마다 바뀌는 큰 흐름",pages:[
    {id:"book-129",pageNumber:129,title:"10년마다 바뀌는 큰 흐름",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-130",pageNumber:130,title:"지금 큰 흐름을 한 문장으로",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-131",pageNumber:131,title:"평생 10개의 큰 흐름",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-132",pageNumber:132,title:"10년 흐름은 어떻게 바뀔까",evidenceGroup:"DAEUN_OVERVIEW"},
    {id:"book-133",pageNumber:133,title:"평생 10년 흐름표",evidenceGroup:"DAEUN_OVERVIEW"},
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
    {id:"book-144",pageNumber:144,title:"초반·중반·후반으로 다시 읽기",evidenceGroup:"DAEUN_OVERVIEW"}
  ]},
  {partNumber:"14",title:"마치며",pages:[
    {id:"book-145",pageNumber:145,title:"마치며",evidenceGroup:"SYNTHESIS"},
    {id:"book-146",pageNumber:146,title:"결국 나는 어떤 사람인가",evidenceGroup:"SYNTHESIS"},
    {id:"book-147",pageNumber:147,title:"내 강점이 가장 잘 살아나는 때",evidenceGroup:"SYNTHESIS"},
    {id:"book-148",pageNumber:148,title:"강점이 부담으로 바뀌는 순간",evidenceGroup:"SYNTHESIS"},
    {id:"book-149",pageNumber:149,title:"일과 돈에서 반복되는 핵심",evidenceGroup:"SYNTHESIS"},
    {id:"book-150",pageNumber:150,title:"사랑과 가족에서 반복되는 핵심",evidenceGroup:"SYNTHESIS"},
    {id:"book-151",pageNumber:151,title:"생활 리듬에서 반복되는 핵심",evidenceGroup:"SYNTHESIS"},
    {id:"book-152",pageNumber:152,title:"나에게 도움이 되는 선택",evidenceGroup:"SYNTHESIS"},
    {id:"book-153",pageNumber:153,title:"평생 기억할 다섯 가지",evidenceGroup:"SYNTHESIS"},
    {id:"book-154",pageNumber:154,title:"전문 근거와 함께 책을 덮으며",evidenceGroup:"PROFESSIONAL"}
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
