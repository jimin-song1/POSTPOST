import type {InterpretationInput,InterpretationProvider,InterpretationProviderRequest,InterpretationProviderResponse,StructuredInterpretation} from "@/types/ai-interpretation";

function evidenceFor(row:{evidenceIds:string[]},index=0){
  const count=Math.min(4,row.evidenceIds.length);
  if(count===row.evidenceIds.length)return row.evidenceIds;
  const start=index%row.evidenceIds.length;
  return Array.from({length:count},(_,offset)=>row.evidenceIds[(start+offset)%row.evidenceIds.length]);
}

function claim(id:string,row:{id:string;evidenceIds:string[];title?:string;evidenceGroup?:string},index:number){
  const ids=evidenceFor(row,index),topic=row.title??row.id;
  return {
    claimId:id,
    plainMeaning:`${topic}을 한 가지 표지만으로 단정하지 않고 서로 맞물리는 계산 근거를 함께 읽습니다.`,
    evidenceIds:ids,
    sourceFields:ids.map(item=>`${item}.value`),
    confidence:"HIGH",
    allowedChapters:[row.id],
    avoidRepeatingIn:[],
    pageQuestion:`${topic}이 실제 생활에서는 어떤 선택과 행동으로 이어지나요?`,
    personPattern:"확인할 것은 확인한 뒤 움직이고, 한번 정한 일은 끝까지 챙기는 방식입니다.",
    lifeScene:`${topic}과 관련된 선택이 생기면 먼저 기준을 세우고 필요한 정보를 확인한 뒤 움직입니다.`,
    upside:"잘 쓰이면 급하게 휩쓸리지 않고 필요한 순서를 잡을 수 있습니다.",
    shadow:"다만 모든 확인과 책임을 혼자 떠안으면 같은 힘이 피로로 바뀔 수 있습니다.",
    domainManifestation:`${row.evidenceGroup??"GENERAL"} 분야에서는 ${topic}과 연결된 행동으로 구체화됩니다.`,
    timing:"시기 근거가 있는 장에서는 변화의 크기와 유리한 정도를 따로 읽습니다.",
    actionClose:"지금 필요한 기준 한 가지와 남에게 맡길 몫 한 가지를 나눠 적어 보세요.",
    claimsUsed:[id],
    scenesUsed:[`SCENE-${row.id}-${index+1}`],
    priorSectionSummary:index?"앞 section에서 이미 말한 핵심은 되풀이하지 않고 이 주제의 결과만 이어갑니다.":"",
    domainConsequence:`${row.id}에서만 확인하는 ${topic}의 선택과 행동 결과입니다.`
  };
}

function plan(input:InterpretationInput){
  const rows=input.reportPlan??[],first=rows[0];
  if(!first)throw new Error("mock 해설에 reportPlan이 필요합니다.");
  const pick=(name:string)=>[claim(name,first,0)];
  return {
    planVersion:"interpretation-plan-v1",
    characterCore:{
      corePatterns:["확인할 것은 확인한 뒤 움직이고 정한 일은 끝까지 챙깁니다."],
      contradictions:["처음에는 신중하지만 기준이 서면 움직임이 빨라집니다."],
      dominantStrengths:["기준을 세우고 마무리하는 힘"],
      shadowPatterns:["혼자 다시 확인하느라 부담을 떠안을 수 있습니다."],
      relationshipPattern:"가까워지기 전에는 오래 보고, 가까워진 뒤에는 행동으로 챙깁니다.",
      workPattern:"책임 범위가 분명할 때 순서를 세우고 결과를 끝까지 확인합니다.",
      decisionPattern:"정보를 확인한 뒤 기준이 서면 빠르게 움직입니다."
    },
    coreIdentity:pick("CORE"),
    outerVsInner:pick("OUTER"),
    decisionPattern:pick("DECISION"),
    strengths:pick("STRENGTH"),
    strengthTradeoffs:pick("SHADOW"),
    workPattern:pick("WORK"),
    moneyPattern:pick("WEALTH"),
    relationshipPattern:pick("RELATIONSHIP"),
    wellnessPattern:pick("WELLNESS"),
    familyChildrenPattern:pick("CHILDREN"),
    lifeFlowTheme:pick("FLOW"),
    chapterClaims:rows.map((row,index)=>({sectionId:row.id,claims:[claim(`PAGE-${row.pageNumber??index+1}`,row,index)]}))
  };
}

type Row=NonNullable<InterpretationInput["reportPlan"]>[number];
type DomainProfile={headline:string;lead:string;scene:string;strength:string;shadow:string;consequence:string;action:string;timing?:string;extra?:string[]};

function domainOf(group:string){
  if(group==="WORK")return"WORK";
  if(group==="WEALTH")return"WEALTH";
  if(group==="RELATIONSHIP")return"RELATIONSHIP";
  if(group==="CHILDREN")return"CHILDREN";
  if(group==="WELLNESS")return"WELLNESS";
  if(group==="SAMJAE")return"SAMJAE";
  if(group==="YEARLY_OVERVIEW"||group==="MONTHLY"||group.startsWith("YEAR_"))return"YEARLY";
  if(group==="DAEUN_OVERVIEW"||group.startsWith("DAEUN_"))return"DAEUN";
  if(group==="SYNTHESIS")return"SYNTHESIS";
  if(group==="NOBLE"||group==="STARS_RELATIONS")return"NOBLE";
  if(group==="TEN_GODS"||group==="TWELVE_STAGES")return"ROLES";
  if(["CORE","PILLARS","HIDDEN_STEMS","STRUCTURE_USEFUL","IDENTITY","ELEMENTS","STRENGTH"].includes(group))return"IDENTITY";
  return"GENERAL";
}

function profile(row:Row,index:number):DomainProfile{
  const topic=row.topic??row.title,domain=domainOf(row.evidenceGroup??"");
  const suffix=index%3===0?"먼저 움직이기보다 기준을 잡는 쪽입니다.":index%3===1?"상황을 본 뒤 필요한 순서를 고르는 편입니다.":"확인할 부분과 바로 움직일 부분을 나눠 보는 편입니다.";
  const base={
    IDENTITY:{
      headline:`${topic}, 평소 행동에서 먼저 보이는 모습`,
      lead:"성격을 한 단어로 붙이기보다 선택 전과 선택 후의 차이를 중심으로 봅니다.",
      scene:`사람을 만나거나 중요한 결정을 앞두면 바로 답을 내기보다 먼저 상황을 확인합니다. ${suffix} 기준이 잡힌 뒤에는 미루기보다 직접 정리해서 다음 행동으로 옮깁니다.`,
      strength:"잘 쓰이면 주변 분위기에 휩쓸리지 않고 자기 기준을 지킬 수 있습니다. 맡은 일이 생겼을 때 끝을 확인하는 힘도 여기에서 나옵니다.",
      shadow:"다만 스스로 납득할 때까지 확인하려고 하면 결정 전 시간이 길어지고, 이미 맡은 일까지 혼자 끌어안아 피로가 쌓일 수 있습니다.",
      consequence:`${topic}에서는 이 성향이 말보다 행동의 순서로 드러납니다. 처음에는 조용히 살피지만 필요하다고 판단한 뒤에는 책임 범위를 분명하게 잡습니다.`,
      action:"결정을 앞두었을 때 꼭 확인할 것 두 가지와 더 보지 않아도 될 것 한 가지를 나눠 적어 두면 신중함이 지연으로 바뀌는 걸 줄일 수 있습니다.",
      extra:["겉으로 차분해 보여도 속에서는 여러 선택지를 비교하는 시간이 있습니다. 가까운 사람은 결론보다 그 과정까지 들을 때 이 사람의 속도를 더 잘 이해할 수 있습니다."]
    },
    WORK:{
      headline:`${topic}, 실제로 일할 때 드러나는 방식`,
      lead:"직업 이름보다 일을 맡고 나누고 마무리하는 장면을 중심으로 봅니다.",
      scene:`업무가 한꺼번에 들어오면 먼저 순서를 정하고 빠진 것이 없는지 확인합니다. 회의에서 결론이 흐려질 때는 해야 할 일과 담당 역할을 나눠 정리한 뒤 움직이는 쪽에 가깝습니다.`,
      strength:"잘 쓰이면 검수, 일정 관리, 책임 구분처럼 결과를 안정시키는 일에서 강점이 살아납니다. 다른 사람이 놓친 부분을 마지막에 잡아 주는 역할도 자연스럽습니다.",
      shadow:"다만 결과가 마음에 들지 않을까 봐 남의 몫까지 다시 확인하면 일이 커질수록 병목이 생깁니다. 책임감이 강점이지만 모든 책임을 직접 들고 가면 오래 버티기 어렵습니다.",
      consequence:`${topic}에서는 자율성과 책임 범위가 분명할수록 힘을 쓰기 쉽습니다. 지시만 기다리는 자리보다 기준을 세우고 결과를 확인할 수 있는 역할에서 움직임이 선명해집니다.`,
      action:"일을 시작할 때 내가 끝까지 볼 일과 중간 확인만 할 일을 나누세요. 맡길 기준까지 미리 말해 두면 꼼꼼함을 유지하면서도 속도를 잃지 않습니다.",
      extra:["배울 때도 설명만 듣는 것보다 직접 정리하고 적용해 보는 과정이 중요합니다. 한번 자기 방식으로 구조를 잡으면 비슷한 문제를 다시 만났을 때 훨씬 빠르게 대응합니다."]
    },
    WEALTH:{
      headline:`${topic}, 돈을 움직일 때 먼저 보는 것`,
      lead:"재물은 많고 적음보다 벌기, 쓰기, 지키기에서 어떤 판단을 하는지 나눠 봅니다.",
      scene:`큰돈을 쓰거나 계약을 앞두면 조건을 한 번 더 비교하고 이유가 분명한지 확인합니다. 반대로 필요하다고 결정한 뒤에는 작은 차이를 오래 붙들기보다 돈을 움직여 일을 끝내는 편입니다.`,
      strength:"잘 쓰이면 충동에 휩쓸리지 않고 필요한 곳과 미뤄도 되는 곳을 구분할 수 있습니다. 돈의 목적이 분명할수록 관리 기준도 안정적으로 유지됩니다.",
      shadow:"다만 손해를 피하려고 너무 오래 비교하면 좋은 기회를 놓칠 수 있고, 반대로 결론을 낸 뒤에는 이미 정한 선택을 되돌아보지 않으려는 고집이 생길 수 있습니다.",
      consequence:`${topic}에서는 돈 자체보다 선택 기준이 중요합니다. 수입이나 지출이 커지는 순간에도 왜 쓰는지, 무엇을 남기려는지 분명할수록 판단이 흔들리지 않습니다.`,
      action:"돈이 움직이는 선택은 금액보다 목적, 기간, 멈출 기준을 먼저 적어 보세요. 세 가지가 분명하면 신중함과 실행력을 같이 살릴 수 있습니다.",
      extra:["사람과 돈이 얽히는 상황에서는 호의와 계약을 구분하는 것이 중요합니다. 가까운 관계일수록 금액과 역할을 말로만 두지 않고 기준을 남겨 두는 편이 편합니다."]
    },
    RELATIONSHIP:{
      headline:`${topic}, 가까워질수록 달라지는 관계의 속도`,
      lead:"관계는 첫인상보다 거리가 가까워진 뒤 어떤 행동을 하는지에 초점을 둡니다.",
      scene:`사람을 처음 만났을 때는 말보다 행동을 오래 보는 편입니다. 관계가 가까워진 뒤에는 약속을 챙기고 필요한 일을 직접 도우며 마음을 행동으로 보여 주는 쪽에 가깝습니다.`,
      strength:"잘 쓰이면 쉽게 흔들리지 않고 오래 가는 관계를 만들 수 있습니다. 상대의 말을 기억하고 실제로 챙기는 행동이 신뢰를 쌓는 데 도움이 됩니다.",
      shadow:"다만 서운한 일이 생겼을 때 바로 말하지 않고 혼자 확인하는 시간이 길어지면 상대는 이유를 모른 채 거리를 느낄 수 있습니다. 기준이 분명한 만큼 기대도 높아질 수 있습니다.",
      consequence:`${topic}에서는 마음의 크기보다 소통 시점이 중요합니다. 관계를 지키려고 참는 행동이 오히려 설명 부족으로 이어지지 않도록 중간에 말을 꺼내는 편이 좋습니다.`,
      action:"상대가 알아서 눈치채길 기다리기보다 불편해진 지점을 짧게 말해 보세요. 감정을 다 정리한 뒤가 아니라 관계가 멀어지기 전에 한 문장만 꺼내도 흐름이 달라집니다.",
      extra:["가까운 사이일수록 책임을 대신 짊어지는 방식으로 애정을 표현할 수 있습니다. 도움을 주는 것과 상대의 몫까지 가져오는 것은 따로 구분할 필요가 있습니다."]
    },
    CHILDREN:{
      headline:`${topic}, 가족 안에서 맡게 되는 역할`,
      lead:"실제 자녀의 존재나 수를 단정하지 않고 부모 역할과 가족 관계의 가능성을 생활 장면으로 풉니다.",
      scene:`아이를 돌보거나 가족 안에서 챙길 일이 생기면 먼저 필요한 것을 확인하고 생활 순서를 정리하는 쪽에 가깝습니다. 역할이 커질수록 말보다 준비와 행동으로 책임을 보여 주기 쉽습니다.`,
      strength:"잘 쓰이면 생활 기준을 안정적으로 만들어 주고 필요한 순간에 빠르게 챙길 수 있습니다. 반복되는 일상을 꾸준히 관리하는 힘도 장점이 됩니다.",
      shadow:"다만 모든 준비를 완벽하게 하려 하면 가족의 반응까지 본인이 책임져야 한다는 부담이 생길 수 있습니다. 잘 챙기는 힘이 통제로 느껴지지 않도록 여지를 남기는 것이 중요합니다.",
      consequence:`${topic}에서는 보호와 자율성의 균형이 핵심입니다. 필요한 기준은 세우되 아이나 가족이 직접 선택하고 실수할 공간까지 남겨 둘 때 관계가 더 편해집니다.`,
      action:"가족 역할이 커지는 시기에는 내가 꼭 할 일과 함께 결정할 일을 나눠 보세요. 책임을 나누는 것이 관심을 줄이는 일은 아닙니다.",
      timing:"가족 관련 흐름이 커지는 때에도 변화의 크기와 결과의 유리함은 같은 뜻으로 보지 않습니다. 시기 근거가 있는 부분만 따로 연결합니다."
    },
    WELLNESS:{
      headline:`${topic}, 몸보다 먼저 생활 리듬에서 보이는 신호`,
      lead:"건강을 진단하지 않고 전통적인 균형 관점에서 생활 리듬과 쉬는 방식을 살펴봅니다.",
      scene:`일정이 몰리면 쉬기 전에 해야 할 일을 먼저 정리하려는 편입니다. 생활 속에서 피로를 느껴도 맡은 역할을 끝낸 뒤 쉬려 하기보다 중간에 멈출 시간을 정해 두는 편이 더 맞습니다.`,
      strength:"잘 쓰이면 일정, 수면, 식사처럼 반복되는 생활 기준을 꾸준히 지키는 데 도움이 됩니다. 작은 습관을 정해 오래 유지하는 방식이 잘 맞습니다.",
      shadow:"다만 할 일을 다 끝내야 쉰다는 기준이 강해지면 휴식이 계속 뒤로 밀릴 수 있습니다. 몸의 신호를 참고용 정보가 아니라 일정 조정의 근거로 쓰는 연습이 필요합니다.",
      consequence:`${topic}에서는 특별한 방법보다 반복 가능한 생활 기준이 중요합니다. 무리한 날 다음에 회복 시간을 확보하는 식으로 리듬을 조절하면 부담이 한쪽으로 몰리는 것을 줄일 수 있습니다.`,
      action:"하루를 계획할 때 할 일만 적지 말고 멈출 시간도 같이 정하세요. 생활 조언은 참고용이며 질병이나 치료를 대신하는 판단으로 사용하지 않습니다."
    },
    SAMJAE:{
      headline:`${topic}, 겁내기보다 변화의 크기를 읽는 법`,
      lead:"삼재 여부와 실제 유불을 같은 말로 묶지 않고 변화가 커지는 조건을 따로 봅니다.",
      scene:`삼재에 해당하는 해에는 자리, 역할, 관계처럼 평소보다 신경 쓸 변화가 겹치는지 먼저 확인합니다. 변화가 많아도 바로 나쁜 해라고 정하지 않고 어떤 선택을 앞두고 있는지부터 살핍니다.`,
      strength:"잘 쓰이면 미리 정리할 것과 새로 시작할 것을 구분하는 계기로 삼을 수 있습니다. 변화를 알고 준비하면 갑작스럽게 끌려가기보다 선택권을 남길 수 있습니다.",
      shadow:"다만 삼재라는 이름만 보고 모든 일을 미루거나 겁부터 내면 실제로 필요한 기회까지 놓칠 수 있습니다. 반대로 변화가 크다는 이유로 무리하게 움직이는 것도 피해야 합니다.",
      consequence:`${topic}에서는 삼재 단계, 원래 사주의 관계, 당시 10년 흐름과 해의 움직임을 함께 봅니다. 변화 활성도와 유리한 정도는 끝까지 다른 값으로 다룹니다.`,
      action:"변화가 겹치는 해에는 계약, 이동, 역할 변경처럼 되돌리기 어려운 선택을 한 번 더 점검하세요. 조심한다는 말은 멈추라는 뜻보다 확인 범위를 넓히라는 뜻에 가깝습니다.",
      timing:"들어오는 해, 머무는 해, 정리되는 해의 성격을 나누어 보되 사건을 미리 정해 놓지는 않습니다."
    },
    YEARLY:{
      headline:`${topic}, 이 해에 먼저 움직이는 생활 영역`,
      lead:"해마다 같은 말을 반복하지 않고 도움받기 쉬운 정도와 변화가 큰 정도를 따로 읽습니다.",
      scene:`해가 바뀌면 일, 돈, 관계 가운데 먼저 움직이는 영역이 달라질 수 있습니다. 중요한 선택이 생기면 그해의 변화가 큰 부분부터 확인하고 실제 생활에서 무엇을 조정할지 결정합니다.`,
      strength:"잘 쓰이면 움직임이 큰 시기를 준비와 실행의 계기로 바꿀 수 있습니다. 도움이 붙는 영역은 힘을 쓰고, 부담이 큰 영역은 속도를 조절하는 식으로 대응할 수 있습니다.",
      shadow:"다만 변화가 크다는 이유만으로 좋은 해라고 보거나, 부담 신호 하나 때문에 나쁜 해라고 정하면 실제 선택이 단순해집니다. 같은 해 안에서도 분야별 체감은 다를 수 있습니다.",
      consequence:`${topic}에서는 해당 연도의 천간과 지지, 원래 사주와의 관계, 당시 10년 흐름을 함께 참고합니다. 사건을 만들기보다 실제로 활성화된 영역의 행동 기준을 정합니다.`,
      action:"그해에 일이 몰리는 분야 한 곳을 정하고 준비할 것, 바로 움직일 것, 보류할 것을 나눠 보세요. 해석은 선택 순서를 잡는 참고로 쓰는 편이 좋습니다.",
      timing:"연도와 시기 정보는 제공된 계산값 안에서만 사용하며 없는 월이나 사건을 새로 만들지 않습니다."
    },
    DAEUN:{
      headline:`${topic}, 10년 흐름이 바뀔 때 달라지는 역할`,
      lead:"10년을 한 줄 점수로 줄이지 않고 환경과 역할의 변화가 어떻게 이어지는지 봅니다.",
      scene:`10년 흐름이 바뀌는 구간에는 같은 사람도 맡는 역할과 선택 기준이 달라질 수 있습니다. 이전 시기에 익숙했던 방식이 잘 맞지 않으면 먼저 환경을 확인하고 무엇을 유지할지 결정하는 편이 좋습니다.`,
      strength:"잘 쓰이면 한 시기의 경험을 다음 시기의 자산으로 넘길 수 있습니다. 익숙한 강점을 그대로 반복하기보다 새 역할에 맞게 쓰는 방식을 바꾸면 흐름 전환을 활용하기 쉽습니다.",
      shadow:"다만 과거에 잘되던 방식만 고집하면 환경이 바뀌었는데도 같은 문제를 되풀이할 수 있습니다. 반대로 변화가 시작됐다고 모든 것을 한 번에 바꾸는 것도 부담이 큽니다.",
      consequence:`${topic}에서는 전반부와 후반부의 체감 차이, 앞 흐름에서 넘어온 과제, 다음 흐름으로 이어질 준비를 함께 봅니다. 재물이나 관계를 단일 점수로 줄이지 않습니다.`,
      action:"10년 단위의 전환에서는 버릴 것보다 계속 가져갈 강점부터 정하세요. 그다음 새 환경에서 더 이상 맞지 않는 습관 한 가지를 줄이면 변화가 덜 거칠게 느껴집니다.",
      timing:"시기별 support와 activation은 별도 값으로 유지하며 큰 변화가 곧 좋은 결과나 나쁜 결과를 뜻하지 않습니다."
    },
    SYNTHESIS:{
      headline:`${topic}, 결국 오래 남는 선택의 기준`,
      lead:"앞 장을 다시 요약하기보다 여러 분야에 반복되는 핵심 선택 원칙만 남깁니다.",
      scene:`중요한 선택이 겹치면 먼저 충분히 확인하고 기준이 선 뒤에는 직접 움직이는 흐름이 반복됩니다. 일에서는 책임 범위로, 돈에서는 비교 기준으로, 관계에서는 신뢰를 확인하는 시간으로 모습이 달라집니다.`,
      strength:"잘 쓰이면 성급하게 흔들리지 않으면서도 결론을 낸 뒤에는 끝까지 밀고 갈 수 있습니다. 서로 다른 분야에서 같은 강점을 다른 방식으로 사용할 수 있다는 점이 핵심입니다.",
      shadow:"다만 확인과 책임이 모두 본인 몫이 되면 강점이 피로로 바뀝니다. 모든 영역에서 완벽한 답을 찾으려 하기보다 지금 중요한 기준을 정하는 편이 오래 갑니다.",
      consequence:`${topic}에서는 앞에서 나온 말을 다시 늘어놓지 않고 선택 전의 신중함, 선택 후의 실행력, 책임을 나누는 방식이라는 공통축만 남깁니다.`,
      action:"앞으로 큰 선택을 만났을 때 확인할 것, 결정할 것, 남에게 맡길 것을 세 칸으로 나눠 보세요. 이 세 칸이 분명하면 자신의 강점을 가장 안정적으로 쓸 수 있습니다."
    },
    NOBLE:{
      headline:`${topic}, 도움을 받는 장면과 사람을 고르는 기준`,
      lead:"특별한 표지를 사건 예언으로 쓰지 않고 실제 관계와 도움의 방식으로 풀어봅니다.",
      scene:`혼자 해결하기 어려운 일이 생기면 아무에게나 기대기보다 역할과 경험이 맞는 사람을 먼저 확인합니다. 기회가 들어왔을 때도 누가 연결해 주는지보다 어떤 도움을 받을 수 있는지 보고 결정하는 편이 안전합니다.`,
      strength:"잘 쓰이면 필요한 순간에 맞는 사람과 자원을 연결해 문제를 빠르게 정리할 수 있습니다. 관계의 수보다 신뢰할 수 있는 연결을 오래 유지하는 힘이 중요합니다.",
      shadow:"다만 도움을 받는 것을 부담으로 느껴 혼자 버티면 이미 있는 연결을 쓰지 못할 수 있습니다. 반대로 좋은 인연이라는 이유만으로 모든 제안을 받아들이는 것도 경계해야 합니다.",
      consequence:`${topic}에서는 누가 무조건 나를 돕는다고 단정하지 않습니다. 도움을 주고받는 자리, 관계의 맥락, 실제 선택을 함께 보며 활용 범위를 정합니다.`,
      action:"도움이 필요한 상황에서는 부탁할 내용과 내가 책임질 부분을 먼저 나눠 말해 보세요. 관계가 편해지고 기대가 어긋나는 일도 줄어듭니다."
    },
    ROLES:{
      headline:`${topic}, 상황에 따라 달라지는 내 안의 역할`,
      lead:"여러 역할을 성격표처럼 나열하지 않고 어떤 상황에서 앞에 나오는지 봅니다.",
      scene:`일을 맡는 자리, 사람을 챙기는 자리, 결과를 만들어야 하는 자리에서 행동이 조금씩 달라집니다. 역할이 바뀌면 먼저 필요한 기준을 확인하고 그 상황에 맞는 태도를 선택하는 편입니다.`,
      strength:"잘 쓰이면 한 가지 모습에 갇히지 않고 상황에 맞게 책임, 표현, 학습, 협업 방식을 바꿀 수 있습니다. 역할 전환이 자연스러울수록 선택 폭도 넓어집니다.",
      shadow:"다만 여러 역할을 동시에 잘하려고 하면 어느 순간 본인의 기준보다 주변 요구를 먼저 챙길 수 있습니다. 무엇을 맡지 않을지 정하는 것도 중요한 선택입니다.",
      consequence:`${topic}에서는 내 안의 여러 역할 가운데 어떤 역할이 앞에 나오고 무엇과 부딪히는지 생활 장면으로 연결합니다. 한 역할만으로 사람 전체를 정하지 않습니다.`,
      action:"상황이 복잡할수록 지금 내가 맡은 역할을 한 문장으로 정해 보세요. 역할이 분명하면 해야 할 일과 하지 않아도 될 일이 함께 보입니다."
    },
    GENERAL:{
      headline:`${topic}, 실제 생활에서 확인할 한 가지`,
      lead:"계산 용어를 늘어놓기보다 이 주제가 선택과 행동에 어떻게 연결되는지 봅니다.",
      scene:`생활에서 선택할 일이 생기면 먼저 상황을 확인하고 필요한 순서를 정합니다. 사람과 역할이 얽힌 자리에서는 무엇을 직접 할지, 무엇을 나눌지 결정한 뒤 움직이는 편입니다.`,
      strength:"잘 쓰이면 급하게 결론을 내리지 않으면서도 필요한 순간에는 행동으로 이어갈 수 있습니다. 기준을 정리하는 힘이 장점으로 작동합니다.",
      shadow:"다만 확인할 것이 늘어나면 시작이 늦어지고, 책임까지 혼자 가져오면 부담이 커질 수 있습니다. 신중함과 과한 통제를 구분할 필요가 있습니다.",
      consequence:`${topic}에서는 한 가지 표지만으로 결론을 내리지 않고 여러 근거가 만나는 지점을 생활 장면으로 연결합니다.`,
      action:"지금 선택해야 할 일이 있다면 확인할 것과 맡길 것을 먼저 나눠 보세요. 기준이 간단할수록 행동으로 옮기기 쉽습니다."
    }
  } satisfies Record<string,DomainProfile>;
  return base[domain];
}

function buildParagraphs(row:Row,index:number){
  const value=profile(row,index),topic=row.topic??row.title;
  const paragraphs=[
    `${topic}을 실제 생활에서 보면, ${value.scene}`,
    `${topic}이 강점으로 쓰일 때는 ${value.strength.replace(/^잘 쓰이면\s*/,"")}`,
    `${topic}이 부담으로 바뀌면 ${value.shadow.replace(/^다만\s*/,"")}`,
    value.consequence,
    `${topic}을 생활에서 다룰 때는 ${value.action}`
  ];
  if(value.timing)paragraphs.push(`${topic}의 시기를 볼 때는 ${value.timing}`);
  if(value.extra)paragraphs.push(...value.extra.map(extra=>`${topic}을 조금 더 넓게 보면 ${extra}`));
  return paragraphs;
}

function report(input:InterpretationInput):StructuredInterpretation{
  const rows=input.reportPlan??[];
  const sections=rows.map((row,index)=>{
    const ids=evidenceFor(row,row.pageNumber??index),value=profile(row,index);
    const fullParagraphs=buildParagraphs(row,index);
    const paragraphs=row.contentKind==="FRONT_MATTER"
      ?[fullParagraphs[0],fullParagraphs[1],fullParagraphs[4]]
      :row.contentKind==="PROFESSIONAL"
        ?[value.scene,value.consequence,value.action]
        :fullParagraphs;
    const pageNo=row.pageNumber??index+1;
    return {
      id:row.id,
      chapterNumber:row.chapterNumber,
      title:row.title,
      headline:value.headline,
      lead:`${row.topic??row.title}을 중심으로 ${value.lead}`,
      body:paragraphs.join("\n\n"),
      paragraphs,
      keyPoints:[`${row.topic??row.title}에서도 같은 성향의 장점과 부담을 함께 봅니다.`],
      evidenceIds:ids,
      partNumber:row.partNumber,
      partTitle:row.partTitle,
      evidenceGroup:row.evidenceGroup,
      contentKind:row.contentKind,
      noveltyElements:["NEW_CLAIM","NEW_SCENE","NEW_UPSIDE","NEW_SHADOW","NEW_ACTION"],
      claimsUsed:[`PAGE-${pageNo}-${row.id}`],
      scenesUsed:[`SCENE-${row.id}`],
      priorSectionSummary:index?"앞 section의 결론을 반복하지 않고 현재 주제의 결과만 이어갑니다.":"",
      domainConsequence:`${row.id}에서만 다루는 ${row.topic??row.title}의 생활 결과입니다.`,
      ...(row.contentKind==="PROFESSIONAL"?{professionalDetails:{summary:"고객용 해설에 사용한 계산 근거를 이곳에서만 확인합니다.",evidenceIds:ids}}:{})
    };
  });
  return {
    status:"completed",
    reportType:input.reportType,
    headline:"계산은 그대로 두고, 삶의 장면으로 풀었습니다",
    summary:"한 가지 표지만으로 단정하지 않고 서로 관련된 근거가 실제 선택과 행동에서 어떻게 이어지는지 살폈습니다.",
    sections,
    highlights:["같은 성향도 일, 돈, 관계에서는 서로 다른 행동으로 나타납니다."],
    cautions:["움직임이 크다는 말과 유리하다는 말은 같은 뜻이 아닙니다."],
    timeline:[],
    disclaimer:"전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다."
  };
}

export class MockInterpretationProvider implements InterpretationProvider{
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{
    const fixedCore={
      corePatterns:["확인할 것은 확인한 뒤 움직이고 정한 일은 끝까지 챙깁니다."],
      contradictions:["처음에는 신중하지만 기준이 서면 움직임이 빨라집니다."],
      dominantStrengths:["기준을 세우고 마무리하는 힘"],
      shadowPatterns:["혼자 다시 확인하느라 부담을 떠안을 수 있습니다."],
      relationshipPattern:"가까워지기 전에는 오래 보고, 가까워진 뒤에는 행동으로 챙깁니다.",
      workPattern:"책임 범위가 분명할 때 순서를 세우고 결과를 끝까지 확인합니다.",
      decisionPattern:"정보를 확인한 뒤 기준이 서면 빠르게 움직입니다."
    };
    if("corePatterns" in ((request.schema.properties??{}) as Record<string,unknown>))
      return {output:fixedCore,provider:"mock",model:"deterministic-fixture-v4",tokenUsage:{input:0,output:0}};
    const wantsPlan="planVersion" in ((request.schema.properties??{}) as Record<string,unknown>);
    return {output:wantsPlan?plan(request.input):report(request.input),provider:"mock",model:"deterministic-fixture-v4",tokenUsage:{input:0,output:0}};
  }
}
