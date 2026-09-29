export const INTERPRETATION_BRIDGE_V1={
  version:"interpretation-bridge-v1",
  principles:[
    "결론부터 만들지 말고 서로 관련된 deterministic evidence 2~4개를 먼저 묶는다.",
    "전문 용어를 말하기 전에 실제 생활에서 보이는 장면으로 번역한다.",
    "한 성향의 장점과 같은 성향이 과해질 때의 부담을 함께 설명한다.",
    "성격에서 한 말을 일·돈·관계 장에 복사하지 말고 그 분야에서 어떻게 달라지는지 설명한다.",
    "시기 해석은 support/favorability와 activation/change를 끝까지 별도 축으로 유지한다.",
    "단일 신살·오행·십성 하나로 사람이나 사건을 확정하지 않는다."
  ],
  strategies:{
    IDENTITY:{
      evidencePriority:["NATAL:DAY_MASTER","NATAL:PILLARS","NATAL:STRENGTH","NATAL:STRUCTURE","NATAL:TEN_GODS","NATAL:RELATIONS"],
      questions:["겉에서 보이는 모습과 혼자 있을 때의 방식이 어떻게 다른가","결정 전과 결정 후의 속도가 어떻게 다른가","같은 장점이 언제 고집·걱정·과부담으로 바뀌는가"]
    },
    WORK:{
      evidencePriority:["NATAL:STRUCTURE","NATAL:TEN_GODS","NATAL:STRENGTH","NATAL:RELATIONS","USEFUL_GOD:","CATEGORY:CURRENT_DAEUN:CAREER","CATEGORY:CURRENT_DAEUN:BUSINESS","CATEGORY:CURRENT_DAEUN:STUDY"],
      questions:["규칙과 자율성 중 어디에서 힘을 더 잘 쓰는가","책임·결정권·협업이 주어질 때 어떤 식으로 움직이는가","직장·사업·배움에서 같은 기질이 각각 어떻게 나타나는가"]
    },
    WEALTH:{
      evidencePriority:["NATAL:TEN_GODS","NATAL:PILLARS","NATAL:FIVE_ELEMENTS","NATAL:STRUCTURE","USEFUL_GOD:","CATEGORY:CURRENT_DAEUN:WEALTH"],
      questions:["돈을 벌 때 반복되는 방식은 무엇인가","돈을 쓸 때와 지킬 때 태도가 어떻게 달라지는가","기회가 커질 때 과감함과 경계심이 어떻게 함께 움직이는가","사람과 돈이 얽힐 때 어떤 습관을 조심해야 하는가"]
    },
    RELATIONSHIP:{
      evidencePriority:["NATAL:PILLARS","NATAL:TEN_GODS","NATAL:HIDDEN_STEMS","NATAL:RELATIONS","CONTEXT:RELATIONSHIP_STATUS","CATEGORY:CURRENT_DAEUN:RELATIONSHIP"],
      conventions:["day branch는 가까운 관계와 배우자 자리를 읽는 전통적 참고축으로 사용한다","month-day 관계는 사회생활과 가까운 관계 사이의 마찰·연결을 설명하는 참고축으로 사용한다"],
      questions:["처음 사람을 볼 때 무엇을 확인하는가","가까워진 뒤 표현 방식은 어떻게 바뀌는가","말하지 않고 쌓아 두기 쉬운 갈등은 무엇인가","관계가 흔들릴 때 반복되는 작은 장면은 무엇인가"]
    },
    CHILDREN:{
      evidencePriority:["CHILD:","CONTEXT:CHILD_REALITY_UNKNOWN"],
      questions:["부모 역할을 맡는다면 무엇을 잘 챙기는가","걱정이 많아질 때 통제하려는 모습이 생기는가","가족 역할이 커지는 시기에는 무엇이 활성화되는가"],
      safety:["실제 자녀 존재를 가정하지 않는다","정확한 자녀 수·태아 성별·임신 가능성·출산 시기를 예측하지 않는다"]
    },
    WELLNESS:{
      evidencePriority:["WELLNESS:","NATAL:FIVE_ELEMENTS","FORTUNE:DAEUN-"],
      questions:["어떤 생활 리듬을 지킬 때 덜 지치는가","과로할 때 먼저 무너지기 쉬운 습관은 무엇인가","쉬는 방식과 다시 움직이는 방식은 무엇인가"],
      safety:["질병·장기 이상·수술·치료·수명·의학 확률을 만들지 않는다"]
    },
    NOBLE:{
      evidencePriority:["NATAL:STARS","FORTUNE:DAEUN-","FORTUNE:SEUN-"],
      questions:["도움이 사람·배움·직책·관계 중 어떤 모습으로 들어오기 쉬운가","도움이 커지는 시기에 activation도 함께 커지는가","도움을 받을 때 본인이 해야 할 행동은 무엇인가"]
    },
    STARS_RELATIONS:{
      evidencePriority:["NATAL:STARS","NATAL:RELATIONS"],
      questions:["특별한 표지가 실제 성향에서 어떤 식으로 드러나는가","합은 무엇을 끌어당기고 충·파·해는 무엇을 흔드는가","같은 표지가 장점과 피로로 어떻게 나뉘는가"],
      safety:["신살 하나로 사고·질병·이혼·파산·사망을 예측하지 않는다"]
    },
    TEN_GODS:{
      evidencePriority:["NATAL:TEN_GODS","NATAL:HIDDEN_STEMS","NATAL:STRUCTURE"],
      questions:["경쟁·표현·돈·책임·배움의 역할 중 무엇이 겉에 보이는가","속기운에는 어떤 역할이 숨어 있는가","상황에 따라 어느 역할이 먼저 나오는가"]
    },
    YEARLY:{
      evidencePriority:["FORTUNE:SEUN-","CATEGORY:SEUN-","FORTUNE:WOLUN-","CATEGORY:WOLUN-"],
      questions:["도움이 커지는가 아니면 움직임이 커지는가","일·돈·관계 중 어떤 영역이 더 활성화되는가","한 해 안에서 움직임이 큰 달은 언제인가"],
      safety:["실제 사건 발생을 확정하지 않는다","연도와 월은 deterministic fortune evidence에 존재할 때만 쓴다"]
    },
    CHANGE:{
      evidencePriority:["NATAL:RELATIONS","FORTUNE:","NATAL:FIVE_ELEMENTS"],
      questions:["부딪힘·결합·변환 중 무엇이 변화를 만드는가","변화가 크지만 유리함은 낮을 수 있는가","활동성이 높은 시기에 무엇을 정리하고 무엇을 시도할 수 있는가"]
    },
    DAEUN:{
      evidencePriority:["FORTUNE:DAEUN-"],
      questions:["각 10년은 얼마나 도움받기 쉬운가","얼마나 바쁘게 움직이는가","무엇이 활성화되는가","앞 시기와 다음 시기의 차이는 무엇인가"],
      safety:["대운별 재물·사업·연애 상세 점수표를 평생총운에서 노출하지 않는다"]
    }
  }
} as const;
