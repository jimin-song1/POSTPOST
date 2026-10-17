import {type LifetimeBookEvidenceGroup as LegacyEvidenceGroup} from "./lifetime-report.v3";

export type LifetimeEvidenceGroup=LegacyEvidenceGroup|"SAMJAE"|"FAMILY"|"YEAR_6";
export type ContentDensity="CONCEPT"|"GENERAL"|"CORE"|"TIMING_CORE";
export type NoveltyElement="NEW_CLAIM"|"NEW_SCENE"|"NEW_EVIDENCE_COMBINATION"|"NEW_TIMING"|"NEW_UPSIDE"|"NEW_SHADOW"|"NEW_ACTION";
export interface DynamicBookSection{
  id:string;sequence:number;title:string;partNumber:string;partTitle:string;evidenceGroup:LifetimeEvidenceGroup;
  contentKind:"FRONT_MATTER"|"CONTENT"|"PROFESSIONAL";density:ContentDensity;topic:string;pageStart:number;pageEnd:number;
}
export interface DynamicBookPart{partNumber:string;title:string;requiredTopics:string[];sections:DynamicBookSection[];}
export interface DynamicLifetimeBook{version:"lifetime-book-v5.6";parts:DynamicBookPart[];sections:DynamicBookSection[];contentSectionCount:number;pageCount:number;}

export const LIFETIME_CONTENT_CONTRACT_V1={
  version:"lifetime-content-contract-v5.6",minimumContentSections:90,recommendedContentSections:{min:100,max:null},
  totalCharacters:{minimum:90_000,recommendedMin:110_000,recommendedMax:140_000},
  sectionCharacters:{CONCEPT:{min:250,recommendedMax:450},GENERAL:{min:550,recommendedMax:900},CORE:{min:900,recommendedMax:1400},TIMING_CORE:{min:1000,recommendedMax:1800}},
  chapterMinimumCharacters:{CORE:2000,IDENTITY:5000,WORK:7000,WEALTH:4000,RELATIONSHIP:5000,CHILDREN:2000,FAMILY:2000,WELLNESS:3000,
    NOBLE_STARS:3000,TEN_GODS_STAGES:2000,YEARLY:4000,SAMJAE:1500,DAEUN:6000,SYNTHESIS:800},
  novelty:{minimumNewElements:3,maxReusedCoreClaim:1,maxReusedScene:0,semanticDuplicateThreshold:0.9},
  requiredChapters:["CORE","IDENTITY","WORK","WEALTH","RELATIONSHIP","FAMILY","WELLNESS","NOBLE_STARS","TEN_GODS_STAGES","YEARLY","SAMJAE","DAEUN","SYNTHESIS"]
} as const;

import type {RelationshipStatus} from "@/types/ai-interpretation";

// V5.6: 148 pages is an editorial budget, never a required number of generated topics.
type TopicSpec=readonly [string,number];
interface PartSpec{partNumber:string;title:string;start:number;end:number;group:LifetimeEvidenceGroup;topics:readonly TopicSpec[];}
export const V56_BASE_PARTS:readonly PartSpec[]=[
  {
    "partNumber": "00",
    "title": "사주원국",
    "start": 1,
    "end": 5,
    "group": "CORE",
    "topics": [
      [
        "○○님의 사주팔자",
        1
      ],
      [
        "나를 대표하는 일주",
        1
      ],
      [
        "사주의 네 기둥과 태어난 계절",
        1
      ],
      [
        "내 사주의 오행 분포",
        1
      ],
      [
        "이 사주에서 가장 눈여겨볼 점",
        1
      ]
    ]
  },
  {
    "partNumber": "01",
    "title": "성격",
    "start": 6,
    "end": 21,
    "group": "IDENTITY",
    "topics": [
      [
        "내가 타고난 성격",
        2
      ],
      [
        "첫인상과 친해진 뒤의 모습",
        2
      ],
      [
        "혼자 있을 때의 나",
        1
      ],
      [
        "속마음을 꺼낼 때",
        1
      ],
      [
        "중요한 선택을 앞두고",
        2
      ],
      [
        "한번 마음을 정하고 나면",
        1
      ],
      [
        "양보하는 것과 끝까지 지키는 것",
        2
      ],
      [
        "일이 뜻대로 풀리지 않을 때",
        1
      ],
      [
        "내 성격의 가장 큰 장점",
        2
      ],
      [
        "나를 힘들게 하는 성격",
        2
      ]
    ]
  },
  {
    "partNumber": "02",
    "title": "직업운·학업운",
    "start": 22,
    "end": 29,
    "group": "WORK",
    "topics": [
      [
        "타고난 일복",
        1
      ],
      [
        "나에게 잘 맞는 일",
        1
      ],
      [
        "오래 하면 지치기 쉬운 일",
        1
      ],
      [
        "반복되는 일과 변화가 많은 일",
        1
      ],
      [
        "새로운 일을 익힐 때",
        1
      ],
      [
        "나에게 맞는 공부법",
        1
      ],
      [
        "시험운과 자격증",
        1
      ],
      [
        "전문기술과 오래 쌓아가는 실력",
        1
      ]
    ]
  },
  {
    "partNumber": "03",
    "title": "직장운",
    "start": 30,
    "end": 36,
    "group": "WORK",
    "topics": [
      [
        "조직생활은 나와 잘 맞을까",
        1
      ],
      [
        "상사와 동료, 직장에서 맺는 관계",
        1
      ],
      [
        "의견이 부딪힐 때",
        1
      ],
      [
        "직장에서 받는 평가",
        1
      ],
      [
        "승진하거나 책임이 커질 때",
        2
      ],
      [
        "이직을 생각하게 되는 이유",
        1
      ]
    ]
  },
  {
    "partNumber": "04",
    "title": "사업운",
    "start": 37,
    "end": 44,
    "group": "WORK",
    "topics": [
      [
        "나는 사업과 인연이 있을까",
        1
      ],
      [
        "나에게 맞는 사업 형태",
        1
      ],
      [
        "고객을 만나고 판매할 때",
        1
      ],
      [
        "위험을 감수해야 하는 순간",
        1
      ],
      [
        "동업은 나와 잘 맞을까",
        1
      ],
      [
        "계약과 거래에서 조심할 점",
        1
      ],
      [
        "사람에게 일을 맡길 때",
        1
      ],
      [
        "사업을 키우거나 줄일 때",
        1
      ]
    ]
  },
  {
    "partNumber": "05",
    "title": "재물운",
    "start": 45,
    "end": 52,
    "group": "WEALTH",
    "topics": [
      [
        "내가 타고난 재물복",
        1
      ],
      [
        "나는 어떤 방식으로 돈을 벌까",
        1
      ],
      [
        "안정적인 수입과 변동이 큰 수입",
        1
      ],
      [
        "돈을 쓰는 습관",
        1
      ],
      [
        "돈을 모으고 지키는 일",
        1
      ],
      [
        "큰돈을 다루게 될 때",
        1
      ],
      [
        "투자와 재산 관리",
        1
      ],
      [
        "가까운 사람과의 금전 문제",
        1
      ]
    ]
  },
  {
    "partNumber": "06",
    "title": "연애운·결혼운",
    "start": 53,
    "end": 63,
    "group": "RELATIONSHIP",
    "topics": [
      [
        "내가 타고난 연애운",
        1
      ],
      [
        "어떤 사람에게 마음이 가는가",
        1
      ],
      [
        "연애가 시작될 때의 나",
        1
      ],
      [
        "사랑을 표현하고 받아들일 때",
        1
      ],
      [
        "가까워질수록 상대에게 바라는 것",
        1
      ],
      [
        "서운함이 쌓이거나 다툴 때",
        2
      ],
      [
        "내 사주에 나타난 배우자 인연",
        1
      ],
      [
        "결혼을 결정할 때 중요하게 보는 것",
        1
      ],
      [
        "결혼생활에서의 나",
        1
      ],
      [
        "오래 함께하기 위해 중요한 것",
        1
      ]
    ]
  },
  {
    "partNumber": "08",
    "title": "귀인운",
    "start": 75,
    "end": 80,
    "group": "NOBLE",
    "topics": [
      [
        "내가 타고난 귀인복",
        1
      ],
      [
        "나에게 도움이 되는 인연",
        2
      ],
      [
        "귀인을 만나게 되는 자리",
        1
      ],
      [
        "좋은 인연이 기회로 이어질 때",
        1
      ],
      [
        "내가 누군가에게 귀인이 될 때",
        1
      ]
    ]
  },
  {
    "partNumber": "09",
    "title": "건강운",
    "start": 81,
    "end": 90,
    "group": "WELLNESS",
    "topics": [
      [
        "타고난 건강운",
        2
      ],
      [
        "오행으로 보는 몸과 마음의 균형",
        1
      ],
      [
        "스트레스가 쌓일 때",
        1
      ],
      [
        "무리하기 쉬운 생활 습관",
        1
      ],
      [
        "어린 시절과 청년기의 건강운",
        1
      ],
      [
        "중년의 건강운",
        1
      ],
      [
        "노년의 건강운",
        2
      ],
      [
        "나에게 맞는 건강관리와 휴식",
        1
      ]
    ]
  },
  {
    "partNumber": "10",
    "title": "사주 심층풀이",
    "start": 91,
    "end": 106,
    "group": "CORE",
    "topics": [
      [
        "일간과 일지가 맺는 관계",
        1
      ],
      [
        "지지 속에 숨어 있는 기운, 지장간",
        1
      ],
      [
        "월령과 조후",
        2
      ],
      [
        "통근·투간과 일간의 강약",
        1
      ],
      [
        "오행이 서로 돕고 부딪히는 관계",
        1
      ],
      [
        "격국과 용신·희신",
        3
      ],
      [
        "합·충·형·파·해",
        1
      ],
      [
        "내 사주에 놓인 십성",
        1
      ],
      [
        "자리마다 달라지는 십성의 의미",
        2
      ],
      [
        "십성 사이의 관계",
        1
      ],
      [
        "십이운성이란 무엇인가",
        1
      ],
      [
        "네 기둥에 놓인 십이운성",
        1
      ]
    ]
  },
  {
    "partNumber": "SPECIAL",
    "title": "신살·삼재",
    "start": 107,
    "end": 111,
    "group": "STARS_RELATIONS",
    "topics": [
      [
        "내 사주에 나타난 신살",
        2
      ],
      [
        "나의 삼재는 언제일까",
        1
      ],
      [
        "들삼재·눌삼재·날삼재",
        1
      ],
      [
        "삼재에 관해 알아둘 것",
        1
      ]
    ]
  }
];

export interface LifetimeBookOptions{includeSamjae:boolean;year:number;relationshipStatus?:RelationshipStatus;hasChildren?:boolean;
  daeunPeriods?:readonly {index:number;ageRange:string;pillar:string}[];}
export function buildDynamicLifetimeBook(options:LifetimeBookOptions):DynamicLifetimeBook{
  const married=options.relationshipStatus==="MARRIED";
  const family=["부모와 나의 인연","어린 시절 가족 안에서의 나","형제자매와의 인연","가족과 생각이 다를 때",married?"내가 꾸린 가족에서의 나":"원가족 안에서 내가 맡는 자리"];
  const children=!married?[]:options.hasChildren===true?["자녀와 나의 인연","부모로서 드러나는 나의 모습","자녀에게 기대하게 되는 것","자녀와 의견이 다를 때","자녀가 성장하면서 달라지는 관계"]:
    options.hasChildren===false?["내 사주에 나타난 자녀 인연","부모가 되었을 때의 나","자녀에게 기대하게 되는 것","자녀와 관계를 맺는 방식"]:[];
  const familyTopics=[...family,...children].map((title,i):TopicSpec=>[title,children.length&&i===5?12-family.length-children.length:1]);
  // Use all calculated periods. Eight periods occupy the example's 18 pages.
  const periods=options.daeunPeriods??[];
  const ordinals=["첫 번째","두 번째","세 번째","네 번째","다섯 번째","여섯 번째","일곱 번째","여덟 번째","아홉 번째","열 번째"];
  const specs:PartSpec[]=[...V56_BASE_PARTS.slice(0,7),{partNumber:"07",title:children.length?"가족운·자녀운":"가족운",start:64,end:74,group:"FAMILY",topics:familyTopics},...V56_BASE_PARTS.slice(7),
    {partNumber:"11",title:"연운 · 올해와 앞으로 5년",start:112,end:128,group:"YEARLY_OVERVIEW",topics:[["올해와 앞으로 다섯 해를 한눈에",2],...Array.from({length:6},(_,i):TopicSpec=>[i===0?`${options.year}년 · 올해 남은 운세`:`${options.year+i}년 운세`,i<3?2:3])]},
    {partNumber:"12",title:"평생 대운",start:129,end:146,group:"DAEUN_OVERVIEW",topics:[["○○님의 평생 대운표",2],...periods.map((p,i):TopicSpec=>[`${p.ageRange} · ${p.pillar} · ${ordinals[i]??`${i+1}번째`} 대운`,2])]},
    {partNumber:"EPILOGUE",title:"긴 사주 이야기를 마치며",start:147,end:148,group:"SYNTHESIS",topics:[["긴 사주 이야기를 마치며",2]]}];
  const rows:DynamicBookSection[]=[];let page=1;
  const parts=specs.map(spec=>{
    const sections=spec.topics.map(([title,budget],i)=>{
      let group=spec.group;
      if(spec.partNumber==="00")group=(["PILLARS","PILLARS","PILLARS","ELEMENTS","CORE"] as LifetimeEvidenceGroup[])[i];
      if(spec.partNumber==="07"&&i>=5)group="CHILDREN";
      if(spec.partNumber==="10")group=(["PILLARS","HIDDEN_STEMS","STRUCTURE_USEFUL","STRENGTH","ELEMENTS","STRUCTURE_USEFUL","STARS_RELATIONS","TEN_GODS","TEN_GODS","TEN_GODS","TWELVE_STAGES","TWELVE_STAGES"] as LifetimeEvidenceGroup[])[i];
      if(spec.partNumber==="SPECIAL"&&i>0)group="SAMJAE";
      if(spec.partNumber==="11"&&i>0)group=`YEAR_${i}` as LifetimeEvidenceGroup;
      if(spec.partNumber==="12"&&i>0)group=`DAEUN_${periods[i-1].index}` as LifetimeEvidenceGroup;
      const section:DynamicBookSection={id:`v56-${spec.partNumber}-${String(i+1).padStart(2,"0")}`,sequence:rows.length+1,title,partNumber:spec.partNumber,partTitle:spec.title,evidenceGroup:group,
        contentKind:"CONTENT",density:["11","12"].includes(spec.partNumber)?"TIMING_CORE":"CORE",topic:title,pageStart:page,pageEnd:page+budget-1};
      const extra=!married?({"01":2,"02":1,"04":1,"05":1,"11":1} as Record<string,number>)[spec.partNumber]??0:0;
      if(i===0)section.pageEnd+=extra;
      page=section.pageEnd+1;rows.push(section);return section;
    });
    return{partNumber:spec.partNumber,title:spec.title,requiredTopics:sections.map(row=>row.title),sections};
  });
  return{version:"lifetime-book-v5.6",parts,sections:rows,contentSectionCount:rows.length,pageCount:page-1};
}
