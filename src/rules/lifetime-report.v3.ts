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

/* Shared interpretation policy. The active table of contents is built in lifetime-report.v5.6.ts (V5.6). */
export const LIFETIME_BOOK_V1={
  relationship:{
    SINGLE:{label:"솔로",focus:["사람을 고르는 기준","관계 시작 방식","새로운 만남에서 보이는 성향","장기 관계에서 중요한 요소"]},
    DATING:{label:"연애 중",focus:["현재 관계에서 나타나는 성향","표현과 소통 방식","갈등 패턴","장기 관계로 갈 때 중요한 부분"]},
    MARRIED:{label:"기혼",focus:["배우자와 생활할 때의 성향","역할과 책임","소통 방식","오래 함께할수록 중요한 요소"]}
  },
  prohibitedChildrenClaims:["자녀는 두 명입니다","아들을 낳습니다","딸을 낳습니다","첫째는","둘째는","몇 살에 출산","임신이 됩니다","임신이 어렵습니다","현재 아이와"],
  prohibitedWellnessClaims:["심장이 약합니다","폐가 나쁩니다","신장이 약합니다","질병 확률","수술합니다","수명이","치료해야","약을 먹"],
  prohibitedAxisConfusion:["변화 움직임이 높아 좋은 운","활성도가 높아 좋은 운","지원과 활성을 합친 운 점수"]
} as const;
