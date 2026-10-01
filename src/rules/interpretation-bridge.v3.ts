export const NARRATIVE_DOMAINS=["IDENTITY","WORK","WEALTH","RELATIONSHIP","CHILDREN","WELLNESS","YEARLY","DAEUN","SYNTHESIS"] as const;
export type NarrativeDomain=typeof NARRATIVE_DOMAINS[number];

export const INTERPRETATION_BRIDGE_V3={
  version:"interpretation-bridge-v3",
  pipeline:["pageQuestion","evidence","personPattern","lifeScene","upside","shadow","domainManifestation","timing","actionClose"],
  evidence:{minimum:2,maximum:4,singleSignalStrongClaim:false,filteredForModel:true},
  timing:{supportAndFavorability:"SUPPORT",activationAndChange:"ACTIVATION",mustStaySeparate:true},
  repetition:{trackClaims:true,trackScenes:true,comparePriorSectionSummary:true,reuseRequiresNewDomainConsequence:true},
  voice:{honorific:true,shortNaturalKorean:true,technicalTermsAfterPlainMeaning:true},
  domains:{
    IDENTITY:"겉과 속, 결정 전후, 잘 쓰일 때와 짐이 될 때를 한 인물상으로 잇는다.",
    WORK:"책임·자율성·협업·결과·학습 장면으로만 성향을 다시 쓴다.",
    WEALTH:"벌기·쓰기·지키기·사람과 돈이 얽히는 장면을 나눈다.",
    RELATIONSHIP:"거리감이 있을 때와 가까워진 뒤의 말과 행동을 나눈다.",
    CHILDREN:"자녀성·노출·시주·12운성·관계를 함께 보고 부모와 가족 역할을 설명한다.",
    WELLNESS:"진단 없이 과로·휴식·회복의 생활 리듬만 말한다.",
    YEARLY:"유리함과 움직임을 분리하고 근거에 있는 연·월만 말한다.",
    DAEUN:"10년 흐름의 도움과 변화량을 분리해 앞뒤 시기와 비교한다.",
    SYNTHESIS:"앞 장에서 두 번 이상 확인된 패턴만 묶고 새 예언을 만들지 않는다."
  },
  blacklist:["~로 해석됩니다","~의 경향성이 보입니다","~라고 볼 수 있습니다","종합적으로 보면","따라서","이러한 특성은","이를 통해","~로 판단됩니다"]
} as const;
