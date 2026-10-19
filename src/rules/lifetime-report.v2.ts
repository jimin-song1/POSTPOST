import type { ChildStatus, RelationshipStatus } from "@/types/ai-interpretation";

export interface LifetimeReportSectionDefinition {id:string;chapterNumber:string;title:string;pageCount?:number;variableTitle?:boolean;}

const BASE_SECTIONS:LifetimeReportSectionDefinition[]=[
  {id:"prologue",chapterNumber:"PROLOGUE",title:"프롤로그",pageCount:5},
  {id:"personality",chapterNumber:"PART01",title:"성격"},
  {id:"career-study",chapterNumber:"PART02",title:"직업운·학업운"},
  {id:"workplace",chapterNumber:"PART03",title:"직장운"},
  {id:"business",chapterNumber:"PART04",title:"사업운"},
  {id:"wealth",chapterNumber:"PART05",title:"재물운"},
  {id:"love-marriage",chapterNumber:"PART06",title:"연애운·결혼운"},
  {id:"family",chapterNumber:"PART07",title:"가족운"},
  {id:"benefactor",chapterNumber:"PART08",title:"귀인운"},
  {id:"health",chapterNumber:"PART09",title:"건강운"},
  {id:"deep-reading",chapterNumber:"PART10",title:"사주 심층풀이"},
  {id:"special",chapterNumber:"SPECIAL",title:"신살·삼재",variableTitle:true},
  {id:"yearly",chapterNumber:"PART11",title:"연운",variableTitle:true},
  {id:"daeun",chapterNumber:"PART12",title:"평생 대운",variableTitle:true},
  {id:"epilogue",chapterNumber:"EPILOGUE",title:"에필로그"},
];

export function getLifetimeReportSections(relationshipStatus:RelationshipStatus,_childStatus:ChildStatus):LifetimeReportSectionDefinition[]{
  return BASE_SECTIONS.map(section=>section.id==="family"&&relationshipStatus==="MARRIED"?{...section,title:"가족운·자녀운"}:{...section});
}

export const LIFETIME_REPORT_V2={reportVersion:"lifetime-report-v5.6",inputVersion:"lifetime-interpretation-input-v5.6",schemaVersion:"lifetime-report-schema-v5.6",promptVersion:"lifetime-report-prompt-v5.6",sections:BASE_SECTIONS,
  relationship:{SINGLE:{label:"미혼",focus:["사람을 고르는 기준","관계 시작 방식","장기 관계에서 중요한 요소"]},DATING:{label:"연애 중",focus:["현재 관계의 소통 방식","갈등 패턴","결혼을 생각할 때 중요한 부분"]},MARRIED:{label:"기혼",focus:["배우자와의 역할과 책임","생활 속 소통 방식","오래 함께할수록 중요한 요소"]}},
  family:{SINGLE:{title:"가족운",focus:["원가족과의 관계","가족 안에서 맡는 역할","가족과 건강한 경계를 세우는 방식"]},MARRIED_NO_CHILDREN:{title:"가족운·자녀운",focus:["자녀 인연","부모가 되었을 때의 모습","자녀에게 기대하는 것","자녀와 관계 맺는 방식"]},MARRIED_WITH_CHILDREN:{title:"가족운·자녀운",focus:["자녀와 나의 인연","부모로서의 모습","자녀에게 기대하는 것","자녀와 의견이 다를 때","성장에 따른 관계 변화"]}},
  selectedContextPeriods:3,
  prohibitedFixedHeadings:["임신과 출산을 앞두고","손주와의 인연"],
  prohibitedChildrenClaims:["자녀는 두 명입니다","아들을 낳습니다","딸을 낳습니다","몇 살에 출산","임신이 됩니다","임신이 어렵습니다"],
  prohibitedWellnessClaims:["심장이 약합니다","폐가 나쁩니다","신장이 약합니다","질병 확률","수술합니다","수명이","치료해야","약을 먹"],
  prohibitedAxisConfusion:["변화 움직임이 높아 좋은 운","활성도가 높아 좋은 운","지원과 활성을 합친 운 점수"]} as const;
