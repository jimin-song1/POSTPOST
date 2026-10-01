export const NARRATIVE_EDITORIAL_QA_V1={
  version:"narrative-editorial-qa-v1",
  maxSentenceLength:170,
  scene:{
    minimumSignals:2,
    contextWords:["회의","일","업무","돈","소비","사람","관계","아이","가족","몸","생활","삼재","해","시기","10년","역할","기회","자리","상황"],
    actionWords:["확인","비교","정리","결정","선택","말","묻","챙기","나누","맡","기다리","쉬","움직","기록","조율","점검","고르","세우","넘기","받"]
  },
  upsideWords:["잘 쓰이면","장점","도움","강점","살릴 수","수월"],
  shadowWords:["다만","과하면","부담","지치","막히","놓치","무거","피로","답답"],
  aiTonePatterns:[
    "로 해석됩니다","경향성이 보입니다","의 영향을 받습니다","라고 볼 수 있습니다","일 가능성이 있습니다",
    "종합적으로 보면","전체적으로 보면","따라서","이러한 특성은","이를 통해","로 판단됩니다","명리학적으로","사주적으로"
  ],
  reportTonePatterns:["종합 분석","특성 분석","분석 결과","해당 항목","본 항목","관계적 특성"],
  technicalTerms:["일간","신강","신약","격국","용신","희신","기신","지장간","십성","식신","상관","시주","십이운성","자녀궁","원국","대운","세운","월운","FORTUNE:","NATAL:","CHILD:","USEFUL_GOD:"],
  coreNine:[
    {id:"IDENTITY",label:"기본설계/성격",groups:["CORE","PILLARS","HIDDEN_STEMS","STRUCTURE_USEFUL","IDENTITY","ELEMENTS","STRENGTH"],timingRequired:false},
    {id:"WORK",label:"직업·사업·학업",groups:["WORK"],timingRequired:false},
    {id:"WEALTH",label:"재물",groups:["WEALTH"],timingRequired:false},
    {id:"RELATIONSHIP",label:"연애·결혼",groups:["RELATIONSHIP"],timingRequired:false},
    {id:"CHILDREN",label:"자녀",groups:["CHILDREN"],timingRequired:true},
    {id:"SAMJAE",label:"삼재",groups:["SAMJAE"],timingRequired:true},
    {id:"YEARLY",label:"향후 5년",groups:["YEARLY_OVERVIEW","YEAR_1","YEAR_2","YEAR_3","YEAR_4","YEAR_5","MONTHLY"],timingRequired:true},
    {id:"DAEUN",label:"대운",groups:["DAEUN_OVERVIEW","DAEUN_1","DAEUN_2","DAEUN_3","DAEUN_4","DAEUN_5","DAEUN_6","DAEUN_7","DAEUN_8","DAEUN_9","DAEUN_10"],timingRequired:true},
    {id:"SYNTHESIS",label:"최종 종합",groups:["SYNTHESIS"],timingRequired:false}
  ]
} as const;
