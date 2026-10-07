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
      workPattern:"내가 어디까지 맡아야 하는지 분명하면 순서를 정해 끝까지 마무리하는 편이에요.",
      decisionPattern:"필요한 걸 확인하고 마음이 정해지면 행동은 빠른 편이에요."
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

type LooseRecord=Record<string,unknown>;
const asRecord=(value:unknown):LooseRecord|null=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as LooseRecord:null;
const asText=(value:unknown)=>typeof value==="string"?value:"";
const asNumber=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:null;
const STEM_READ:Record<string,string>={甲:"갑",乙:"을",丙:"병",丁:"정",戊:"무",己:"기",庚:"경",辛:"신",壬:"임",癸:"계"};
const BRANCH_READ:Record<string,string>={子:"자",丑:"축",寅:"인",卯:"묘",辰:"진",巳:"사",午:"오",未:"미",申:"신",酉:"유",戌:"술",亥:"해"};
const STEM_ELEMENT_NAME:Record<string,string>={甲:"갑목",乙:"을목",丙:"병화",丁:"정화",戊:"무토",己:"기토",庚:"경금",辛:"신금",壬:"임수",癸:"계수"};
const ELEMENT_PRO:Record<string,string>={wood:"목(木)",fire:"화(火)",earth:"토(土)",metal:"금(金)",water:"수(水)"};

function unwrapEvidenceValue(value:unknown){
  const record=asRecord(value);
  if(record&&"value" in record)return record.value;
  return value;
}
function evidenceValue(input:InterpretationInput,id:string){
  return unwrapEvidenceValue(input.evidence.find(row=>row.id===id)?.value);
}
function rowHasEvidencePrefix(row:Row,prefix:string){
  return row.evidenceIds.some(id=>id.startsWith(prefix));
}
function pillarReading(stem:string,branch:string){return (STEM_READ[stem]??stem)+(BRANCH_READ[branch]??branch);}

interface ConsultationFacts{
  dayStem:string;dayStemName:string;dayPillar:string;dayPillarReading:string;
  structure:string;strength:string;
  strongest:{element:string;percentage:number}|null;
  weakest:{element:string;percentage:number}|null;
  missing:string[];
  useful:string[];
  stageByPosition:Record<string,string>;
  tenGodCounts:Record<string,number>;
  starLabels:string[];
  relationCounts:{clash:number;break:number;harm:number;wonjin:number;combination:number;punishment:number};
  pillarReadings:Record<string,string>;
  stemTenGodByPosition:Record<string,string>;
  branchMainTenGodByPosition:Record<string,string>;
}
function consultationFacts(input:InterpretationInput):ConsultationFacts{
  const dayMaster=asRecord(evidenceValue(input,"NATAL:DAY_MASTER"));
  const pillars=asRecord(evidenceValue(input,"NATAL:PILLARS"));
  const day=asRecord(pillars?.day);
  const structure=asRecord(evidenceValue(input,"NATAL:STRUCTURE:PRIMARY"));
  const strength=asRecord(evidenceValue(input,"NATAL:STRENGTH:ADJUSTED"));
  const elementRows=input.evidence
    .filter(row=>row.id.startsWith("NATAL:FIVE_ELEMENTS:ELEMENT:"))
    .map(row=>asRecord(row.value))
    .filter((row):row is LooseRecord=>Boolean(row))
    .map(row=>({element:asText(row.element),percentage:asNumber(row.percentage)??0}))
    .filter(row=>row.element);
  const sorted=[...elementRows].sort((a,b)=>b.percentage-a.percentage);
  const useful=input.evidence
    .filter(row=>row.id.startsWith("USEFUL_GOD:SYNTHESIS:"))
    .map(row=>asRecord(row.value))
    .filter((row):row is LooseRecord=>Boolean(row))
    .filter(row=>["PRIMARY","SECONDARY","FAVORABLE"].includes(asText(row.role)))
    .sort((a,b)=>(asNumber(b.score)??0)-(asNumber(a.score)??0))
    .map(row=>asText(row.element))
    .filter(Boolean)
    .slice(0,3);
  const stagesRoot=asRecord(evidenceValue(input,"NATAL:TWELVE_STAGES"));
  const stages=asRecord(stagesRoot?.stages);
  const stageByPosition:Record<string,string>={};
  for(const position of ["year","month","day","hour"])stageByPosition[position]=asText(stages?.[position]);

  const pillarReadings:Record<string,string>={};
  for(const position of ["year","month","day","hour"]){
    const pillar=asRecord(pillars?.[position]),stem=asText(pillar?.stem),branch=asText(pillar?.branch);
    pillarReadings[position]=stem&&branch?pillarReading(stem,branch):"";
  }

  const tenGodRoot=asRecord(evidenceValue(input,"NATAL:TEN_GODS"));
  const tenGodCounts:Record<string,number>={};
  const addTenGod=(value:unknown)=>{const row=asRecord(value);const korean=asText(row?.korean);if(korean)tenGodCounts[korean]=(tenGodCounts[korean]??0)+1;};
  const heavenly=asRecord(tenGodRoot?.heavenlyStems);
  const stemTenGodByPosition:Record<string,string>={},branchMainTenGodByPosition:Record<string,string>={};
  for(const position of ["year","month","day","hour"]){
    const row=asRecord(heavenly?.[position]);
    stemTenGodByPosition[position]=asText(row?.korean);
    addTenGod(row);
  }
  const hidden=asRecord(tenGodRoot?.hiddenStems);
  for(const position of ["year","month","day","hour"]){
    const rows=hidden?.[position];
    if(Array.isArray(rows))for(const item of rows){
      const row=asRecord(item),role=asText(row?.role),tenGod=asRecord(row?.tenGod);
      addTenGod(tenGod);
      if(role==="mainQi")branchMainTenGodByPosition[position]=asText(tenGod?.korean);
    }
  }

  const starsRoot=asRecord(evidenceValue(input,"NATAL:STARS"));
  const starLabels:string[]=[];
  for(const key of ["nobleStars","peachBlossom","travelHorse","flowerCanopy","ghostGate","wonjin","needle","yangBlade","goegang","whiteTiger"]){
    const rows=starsRoot?.[key];
    if(Array.isArray(rows))for(const item of rows){const label=asText(asRecord(item)?.label);if(label&&!starLabels.includes(label))starLabels.push(label);}
  }

  const relationsRoot=asRecord(evidenceValue(input,"NATAL:RELATIONS"));
  const branches=asRecord(relationsRoot?.earthlyBranches);
  const lengthOf=(key:string)=>Array.isArray(branches?.[key])?(branches?.[key] as unknown[]).length:0;
  const relationCounts={
    clash:lengthOf("clashes"),
    break:lengthOf("breaks"),
    harm:lengthOf("harms"),
    wonjin:lengthOf("wonjin"),
    combination:lengthOf("sixCombinations")+lengthOf("threeHarmonies")+lengthOf("directionalCombinations"),
    punishment:lengthOf("punishments")
  };

  const dayStem=asText(dayMaster?.stem)||asText(day?.stem),dayBranch=asText(day?.branch);
  return{
    dayStem,
    dayStemName:STEM_ELEMENT_NAME[dayStem]??dayStem,
    dayPillar:dayStem&&dayBranch?dayStem+dayBranch:"",
    dayPillarReading:dayStem&&dayBranch?pillarReading(dayStem,dayBranch):"",
    structure:asText(structure?.type),
    strength:asText(strength?.level),
    strongest:sorted[0]??null,
    weakest:sorted.at(-1)??null,
    missing:elementRows.filter(row=>row.percentage===0).map(row=>row.element),
    useful,
    stageByPosition,
    tenGodCounts,
    starLabels,
    relationCounts,
    pillarReadings,
    stemTenGodByPosition,
    branchMainTenGodByPosition
  };
}
function elementPro(element:string){return ELEMENT_PRO[element]??element;}
const TEN_GOD_FAMILIES:Record<string,string[]>={비겁:["비견","겁재"],식상:["식신","상관"],재성:["정재","편재"],관성:["정관","편관"],인성:["정인","편인"]};
function familyCount(facts:ConsultationFacts,family:string){return(TEN_GOD_FAMILIES[family]??[]).reduce((sum,name)=>sum+(facts.tenGodCounts[name]??0),0);}
function dominantFamily(facts:ConsultationFacts){
  return Object.keys(TEN_GOD_FAMILIES).sort((a,b)=>familyCount(facts,b)-familyCount(facts,a))[0]??"";
}
function koreanCount(value:number){
  const words=["없음","하나","둘","셋","넷","다섯","여섯","일곱","여덟","아홉","열"];
  return Number.isInteger(value)&&value>=0&&value<=10?words[value]:String(value);
}
function familyMeaning(family:string){
  return family==="비겁"?"독립심과 경쟁력":family==="식상"?"표현과 생산력":family==="재성"?"돈과 현실 결과를 다루는 힘":family==="관성"?"책임감과 사회적 기준":family==="인성"?"학습력과 이해력":"자기 기준";
}
function relationSummary(facts:ConsultationFacts){
  const rows:string[]=[];
  if(facts.relationCounts.clash)rows.push("사람이나 상황이 강하게 부딪히며 변화가 생기기 쉬운 면");
  if(facts.relationCounts.break)rows.push("가까운 사이에서 작은 어긋남이 오래 남기 쉬운 면");
  if(facts.relationCounts.harm)rows.push("겉으로 넘겨도 속으로 불편함이 남기 쉬운 면");
  if(facts.relationCounts.wonjin)rows.push("가까울수록 서로에게 예민해지기 쉬운 면");
  if(facts.relationCounts.combination)rows.push("마음이나 일이 맞으면 관계가 빠르게 깊어지는 면");
  if(facts.relationCounts.punishment)rows.push("같은 문제를 반복해서 신경 쓰기 쉬운 면");
  return rows;
}

const STEM_STORY:Record<string,{image:string;core:string;shadow:string}>={
  甲:{image:"큰 나무",core:"방향이 정해지면 곧게 밀고 가며 스스로 키워가는 힘",shadow:"의미를 찾지 못하면 움직임이 둔해지고 자기 기준을 쉽게 굽히지 않는 면"},
  乙:{image:"유연하게 뻗는 풀과 덩굴",core:"상황을 읽고 사람과 자원을 연결하며 꾸준히 자라는 힘",shadow:"주변을 너무 많이 살피면 결정이 늦어지거나 마음을 숨기는 면"},
  丙:{image:"햇빛",core:"밖으로 드러내고 분위기를 움직이며 빠르게 확산시키는 힘",shadow:"속도가 너무 빨라지면 디테일이나 상대의 속도를 놓치는 면"},
  丁:{image:"등불",core:"필요한 곳에 집중하고 섬세하게 온기를 전달하는 힘",shadow:"예민함이 커지면 작은 일도 오래 마음에 남는 면"},
  戊:{image:"큰 산과 넓은 땅",core:"쉽게 흔들리지 않고 책임을 오래 버티는 힘",shadow:"변화를 늦게 받아들이거나 혼자 짐을 많이 지는 면"},
  己:{image:"잘 다듬은 밭",core:"작은 것을 세심하게 돌보고 현실적으로 정리하는 힘",shadow:"걱정이 많아지면 사소한 부분까지 챙기느라 피로해지는 면"},
  庚:{image:"단단한 쇠",core:"문제를 빠르게 구분하고 결단해 정리하는 힘",shadow:"기준이 강해지면 말과 판단이 지나치게 날카로워지는 면"},
  辛:{image:"정교하게 다듬은 금속과 보석",core:"차이를 세밀하게 보고 품질과 기준을 높이는 힘",shadow:"완성도를 높이려다 스스로에게도 엄격해지는 면"},
  壬:{image:"큰 강과 바다",core:"큰 흐름을 읽고 다양한 사람과 정보를 품는 힘",shadow:"범위가 너무 넓어지면 한곳에 집중하기 어려운 면"},
  癸:{image:"비와 이슬",core:"작은 변화를 빠르게 감지하고 정보를 섬세하게 받아들이는 힘",shadow:"생각과 감정이 안쪽에 오래 머물러 피로가 쌓이는 면"}
};
function stemStory(facts:ConsultationFacts){return STEM_STORY[facts.dayStem]??{image:"자기만의 기운",core:"자기 기준을 세우고 움직이는 힘",shadow:"한쪽으로 힘이 몰릴 때 피로가 커지는 면"};}
function dominantFamilySentence(facts:ConsultationFacts){
  const family=dominantFamily(facts),count=familyCount(facts,family);
  return count?`중요한 선택에서 가장 자주 앞에 나오는 힘은 ${familyMeaning(family)}입니다. 일·돈·관계에서도 이 힘이 반복해서 기준이 됩니다.`:"";
}
const TEN_GOD_CUSTOMER_MEANING:Record<string,string>={
  비견:"내 생각과 기준을 분명히 세우는 힘",
  겁재:"경쟁 속에서도 주도권을 놓치지 않으려는 힘",
  식신:"생각한 것을 꾸준히 말과 결과물로 만들어내는 힘",
  상관:"답답한 틀을 깨고 자기 생각을 솔직하게 표현하는 힘",
  정재:"돈과 생활을 안정적으로 관리하고 쌓아가는 힘",
  편재:"사람과 기회를 넓게 보고 현실적인 가능성을 빠르게 잡는 힘",
  정관:"약속과 책임을 중요하게 여기고 기준을 지키는 힘",
  편관:"압박이 있는 상황에서도 결단하고 책임지려는 힘",
  정인:"상대의 말과 경험을 충분히 받아들이고 이해하는 힘",
  편인:"겉으로 드러나지 않은 의미를 깊이 읽고 파고드는 힘"
};
function tenGodCustomerMeaning(role:string){
  return TEN_GOD_CUSTOMER_MEANING[role]??"상황에 맞춰 자기 역할을 찾아가는 힘";
}
function pillarRoleSentence(facts:ConsultationFacts,position:"year"|"month"|"day"|"hour",_label:string){
  const stemGod=facts.stemTenGodByPosition[position],branchGod=facts.branchMainTenGodByPosition[position];
  const roles=[stemGod,branchGod].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  const meanings=roles.map(tenGodCustomerMeaning);
  const subject=position==="month"?"사회생활에서는":position==="day"?"가까운 사람 앞에서는":position==="hour"?"혼자 생각하거나 앞으로를 준비할 때는":"낯선 환경에서는";
  if(!meanings.length)return `${subject} 평소보다 어떤 태도가 먼저 나오는지가 더 분명해집니다.`;
  if(meanings.length===1)return `${subject} ${meanings[0]}이 자연스럽게 드러납니다.`;
  return `${subject} ${meanings[0]}과 ${meanings[1]}이 함께 나타납니다.`;
}
function usefulSentence(facts:ConsultationFacts){
  if(!facts.useful.length)return"";
  return `도움이 되는 기운은 ${facts.useful.map(elementPro).join(" · ")} 순으로 잡힙니다. 이미 강한 부분을 더 키우기보다 부족한 쪽을 채울 때 전체 흐름이 매끄러워집니다.`;
}
function relationSentence(facts:ConsultationFacts){
  const tension=facts.relationCounts.break||facts.relationCounts.harm||facts.relationCounts.wonjin||facts.relationCounts.punishment;
  const clash=facts.relationCounts.clash;
  const bond=facts.relationCounts.combination;
  const rows:string[]=[];
  if(tension)rows.push("가까워질수록 작은 어긋남을 오래 생각하거나 서로에게 예민해지는 순간이 생길 수 있습니다.");
  if(clash)rows.push("사람이나 일이 강하게 부딪히는 때에는 감정부터 키우기보다 무엇이 실제 문제인지 먼저 확인하는 편이 좋습니다.");
  if(bond)rows.push("반대로 마음이 맞는 사람과는 관계가 빠르게 깊어지고, 함께하는 일에도 힘이 잘 실리는 편입니다.");
  if(!rows.length)return "사람 관계에서는 큰 충돌보다 평소의 말과 행동이 얼마나 꾸준한지가 더 중요하게 작용합니다.";
  rows.push("그래서 사람을 많이 만나는 것보다 누구와 얼마나 깊이 엮이는지가 더 중요합니다.");
  return rows.join(" ");
}
const STAR_CUSTOMER_MEANING:ReadonlyArray<readonly [string,string]>=[
  ["도화","사람의 시선을 끌고 기억에 남는 힘"],
  ["화개","혼자 깊이 파고들어 자기 것으로 만드는 힘"],
  ["역마","움직이고 환경을 바꿀 때 활력이 커지는 힘"],
  ["천을귀인","필요한 순간에 도움과 연결을 얻는 힘"],
  ["귀문","말투와 분위기의 작은 변화까지 빠르게 느끼는 힘"],
  ["원진","가까운 관계에서 예민함이 커질 수 있는 면"],
  ["현침","작은 차이를 놓치지 않는 세밀함"]
];
function starSentence(facts:ConsultationFacts){
  const meanings=Array.from(new Set(facts.starLabels.flatMap(label=>STAR_CUSTOMER_MEANING.filter(([token])=>label.includes(token)).map(([,meaning])=>meaning))));
  return meanings.length?`이 사주에서 눈에 띄는 특징은 ${meanings.slice(0,4).join(", ")}입니다. 이름을 외우기보다 실제 생활에서 언제 이 모습이 나오는지를 보는 편이 더 중요합니다.`:"특별한 이름을 붙이기보다 실제 생활에서 반복되는 성향을 중심으로 보는 편이 더 정확합니다.";
}

const ELEMENT_STORY:Record<string,{gift:string;life:string;shadow:string}>={
  wood:{gift:"성장·기획·확장",life:"무언가를 시작하면 키우고 다음 단계까지 생각하는 힘",shadow:"방향을 너무 많이 벌리면 시작한 일을 정리하는 속도가 늦어질 수 있는 면"},
  fire:{gift:"표현·생산·노출",life:"머릿속에 있는 것을 말·콘텐츠·행동·결과물로 밖에 꺼내는 힘",shadow:"속도가 너무 빨라지면 준비보다 노출이 앞서 피로가 커질 수 있는 면"},
  earth:{gift:"현실화·관리·재물",life:"아이디어를 돈·운영·자산처럼 손에 잡히는 결과로 굳히는 힘",shadow:"안정을 지키려는 마음이 커지면 새로운 선택을 늦게 받아들이는 면"},
  metal:{gift:"기준·책임·정리",life:"무엇이 맞고 틀린지 구분하고 품질과 약속을 지키는 힘",shadow:"기준이 너무 강해지면 자신과 타인에게 모두 엄격해질 수 있는 면"},
  water:{gift:"정보·학습·감각",life:"상황을 읽고 배우고 기억하며 여러 가능성을 연결하는 힘",shadow:"생각이 계속 이어지면 실행보다 준비가 길어질 수 있는 면"}
};
const BRANCH_ELEMENT:Record<string,string>={子:"water",丑:"earth",寅:"wood",卯:"wood",辰:"earth",巳:"fire",午:"fire",未:"earth",申:"metal",酉:"metal",戌:"earth",亥:"water"};
const STEM_ELEMENT:Record<string,string>={甲:"wood",乙:"wood",丙:"fire",丁:"fire",戊:"earth",己:"earth",庚:"metal",辛:"metal",壬:"water",癸:"water"};
const STAGE_STORY:Record<string,string>={
  장생:"새로운 것을 배우고 받아들이며 시작하는 힘",
  목욕:"사람과 경험 속에서 자신을 드러내고 감각을 넓히는 힘",
  관대:"사회 속에서 역할을 키우고 자신감을 쌓는 힘",
  건록:"자기 힘으로 자리를 잡고 독립적으로 움직이는 힘",
  제왕:"힘이 가장 크게 올라와 영향력과 책임이 함께 커지는 힘",
  쇠:"불필요한 것을 줄이고 중요한 것에 집중하는 힘",
  병:"민감해진 감각으로 방향을 다시 살피는 힘",
  사:"끝난 것을 정리하고 다음 단계로 넘기는 힘",
  묘:"겉으로 펼치기보다 안에 저장하고 정리하는 힘",
  절:"기존 흐름을 끊고 새 판으로 넘어가는 힘",
  태:"아직 드러나지 않은 가능성을 준비하는 힘",
  양:"작은 가능성을 보호하고 천천히 키우는 힘"
};
function elementStory(element:string){return ELEMENT_STORY[element]??{gift:"균형",life:"필요한 힘을 상황에 맞게 쓰는 능력",shadow:"한쪽으로 힘이 몰릴 때 피로가 커지는 면"};}
function familyPresence(facts:ConsultationFacts,family:string){
  const count=familyCount(facts,family),meaning=familyMeaning(family);
  if(count>=3)return `${meaning}이 평소 선택에서 자주 앞에 나옵니다. 익숙하게 쓰는 장점인 만큼 과해지는 순간만 조절하면 좋습니다.`;
  if(count>=1)return `${meaning}도 갖고 있습니다. 필요한 장면에서는 자연스럽게 꺼내 쓸 수 있는 힘입니다.`;
  return `${meaning}은 자동으로 나오기보다 경험을 쌓을수록 편해지는 영역입니다.`;
}

function tenGodTone(role:string){
  if(["정관","편관"].includes(role))return{front:"단정하고 책임감 있는 인상",gift:"약속과 기준을 지키려는 힘",shadow:"통제받는 느낌에 예민해지거나 스스로에게 엄격해지는 면"};
  if(["정인","편인"].includes(role))return{front:"차분하게 듣고 관찰하는 인상",gift:"배우고 이해한 뒤 판단하는 힘",shadow:"생각이 길어져 행동이 늦어질 수 있는 면"};
  if(["정재","편재"].includes(role))return{front:"현실적이고 상황 판단이 빠른 인상",gift:"돈·시간·자원을 실제 결과로 연결하는 힘",shadow:"성과와 손익을 너무 먼저 따질 수 있는 면"};
  if(["식신","상관"].includes(role))return{front:"표현이 분명하고 반응이 빠른 인상",gift:"생각을 말과 결과물로 밖에 꺼내는 힘",shadow:"말이 앞서거나 답답함을 참기 어려운 면"};
  if(["비견","겁재"].includes(role))return{front:"자기 색과 기준이 분명한 인상",gift:"스스로 결정하고 경쟁 속에서도 버티는 힘",shadow:"도움을 받기보다 혼자 해결하려는 면"};
  return{front:"차분하게 상황을 파악하는 인상",gift:"자기 기준을 세운 뒤 움직이는 힘",shadow:"확인이 길어지면 시작이 늦어질 수 있는 면"};
}

function stageSentence(facts:ConsultationFacts,position:string,_label:string){
  const stage=facts.stageByPosition[position],meaning=STAGE_STORY[stage]??"그때 필요한 힘을 쓰는 고유한 리듬";
  const context=position==="year"?"인생 초반에는":position==="month"?"사회생활에서는":position==="day"?"가까운 관계와 중요한 선택에서는":"인생 후반으로 갈수록";
  return stage?`${context} ${stage}의 흐름이 들어옵니다. 쉽게 말하면 ${meaning}이 중요한 시기와 장면에서 더 잘 드러납니다.`:"";
}
function pillarElementSentence(pillar:string){
  if(!pillar||pillar.length<2)return"";
  const stemElement=STEM_ELEMENT[pillar[0]],branchElement=BRANCH_ELEMENT[pillar[1]];
  if(!stemElement||!branchElement)return"";
  if(stemElement===branchElement)return `${pillarReading(pillar[0],pillar[1])}은 ${elementPro(stemElement)}의 색이 위아래에서 함께 강조되는 기둥입니다.`;
  return `${pillarReading(pillar[0],pillar[1])}은 ${elementPro(stemElement)}와 ${elementPro(branchElement)}가 한 기둥 안에서 만나는 구조입니다.`;
}

const CATEGORY_LABELS:Record<string,string>={OVERALLFLOW:"전체 흐름",WEALTH:"재물",BUSINESS:"사업",CAREER:"직업",RELATIONSHIP:"관계",STUDY:"학업",CHANGE:"변화"};
const FAVORABILITY_LABELS:Record<string,string>={
  PRIMARY_FAVORABLE:"가장 유리한 흐름",STRONG_FAVORABLE:"유리한 흐름",FAVORABLE:"도움이 되는 흐름",
  CONDITIONAL:"조건을 타는 흐름",NEUTRAL:"중립적인 흐름",UNFAVORABLE:"부담이 커질 수 있는 흐름"
};
const ACTIVATION_LABELS:Record<string,string>={LOW:"움직임이 크지 않은 편",MODERATE:"움직임이 적당히 생기는 편",HIGH:"변화와 활동이 커지는 편",VERY_HIGH:"변화와 활동이 매우 커지는 편"};

function rowEvidenceValue(input:InterpretationInput,row:Row,predicate:(id:string)=>boolean){
  for(const id of row.evidenceIds){
    if(!predicate(id))continue;
    const found=input.evidence.find(item=>item.id===id);
    if(found)return unwrapEvidenceValue(found.value);
  }
  return null;
}
function periodContext(input:InterpretationInput,row:Row){
  const value=asRecord(rowEvidenceValue(input,row,id=>id.includes(":PERIOD_CONTEXT")));
  return{
    daeunIndex:asNumber(value?.daeunIndex),
    daeunPillar:asText(value?.daeunPillar),
    seunYear:asNumber(value?.seunYear),
    seunPillar:asText(value?.seunPillar),
    wolunPillar:asText(value?.wolunPillar)
  };
}
function fortuneAxis(input:InterpretationInput,row:Row){
  const favor=asRecord(rowEvidenceValue(input,row,id=>id.includes(":FAVORABILITY")));
  const activation=asRecord(rowEvidenceValue(input,row,id=>id.includes(":ACTIVATION")));
  return{
    favorabilityLevel:asText(favor?.level),
    favorabilityScore:asNumber(favor?.score),
    activationLevel:asText(activation?.level),
    activationScore:asNumber(activation?.score)
  };
}
function categoryAxes(input:InterpretationInput,row:Row){
  const rows:Array<{key:string;label:string;support:number;activity:number}>=[];
  for(const id of row.evidenceIds){
    if(!id.startsWith("CATEGORY:"))continue;
    const value=asRecord(input.evidence.find(item=>item.id===id)?.value);
    if(!value)continue;
    const key=id.split(":").at(-1)??"";
    const support=asNumber(value.supportScore),activity=asNumber(value.activityScore);
    if(support==null&&activity==null)continue;
    rows.push({key,label:CATEGORY_LABELS[key]??key,support:support??0,activity:activity??0});
  }
  return rows;
}
function topCategorySentence(input:InterpretationInput,row:Row){
  const axes=categoryAxes(input,row);
  if(!axes.length)return"";
  const active=[...axes].sort((a,b)=>b.activity-a.activity)[0],support=[...axes].sort((a,b)=>b.support-a.support)[0];
  if(active&&support&&active.key!==support.key)return `움직임이 가장 큰 분야는 ${active.label}, 상대적으로 도움을 받기 쉬운 분야는 ${support.label} 쪽입니다. '바쁜 분야'와 '유리한 분야'가 같지 않을 수 있다는 점이 중요합니다.`;
  if(active)return `이 시기에는 ${active.label} 쪽의 움직임이 가장 크게 잡힙니다. 변화가 크다는 말은 무조건 좋거나 나쁘다는 뜻이 아니라 실제 선택할 일이 많아진다는 뜻에 가깝습니다.`;
  return"";
}
function fortunePillarSentence(pillar:string){
  if(!pillar||pillar.length<2)return"";
  const reading=pillarReading(pillar[0],pillar[1]),stemElement=STEM_ELEMENT[pillar[0]],branchElement=BRANCH_ELEMENT[pillar[1]];
  if(stemElement&&branchElement&&stemElement===branchElement)return `${reading}은 ${elementPro(stemElement)}이 위아래에서 함께 강조되는 시기입니다. 이 기운이 맡는 역할이 평소보다 전면에 나옵니다.`;
  if(stemElement&&branchElement)return `${reading}은 ${elementPro(stemElement)}와 ${elementPro(branchElement)}가 함께 들어오는 시기입니다. 두 기운이 원국과 어떻게 맞물리는지가 실제 체감을 만듭니다.`;
  return `${reading}의 기운이 들어오는 시기입니다.`;
}



function elementFact(facts:ConsultationFacts){
  if(!facts.strongest||!facts.weakest)return"";
  if(facts.missing.length)return "오행에서는 "+elementPro(facts.strongest.element)+"이 가장 강하고, "+facts.missing.map(elementPro).join("·")+"은 원국에서 비어 있습니다.";
  return "오행에서는 "+elementPro(facts.strongest.element)+"이 가장 강하고 "+elementPro(facts.weakest.element)+"이 가장 약합니다.";
}
function strengthMeaning(level:string){
  const labels:Record<string,string>={
    "극약":"주변 도움과 회복을 충분히 써야 힘이 안정되는 편",
    "태약":"혼자 밀어붙이기보다 환경과 도움을 활용할수록 안정되는 편",
    "신약":"주변의 지원을 잘 활용할 때 본래 실력이 더 잘 살아나는 편",
    "중화신약":"균형에 가깝지만 주변 도움을 받으면 더 안정적인 편",
    "중화신강":"균형에 가깝고 필요할 때 스스로 밀어붙이는 힘도 충분한 편",
    "신강":"자기 힘으로 방향을 정하고 밀고 가는 힘이 분명한 편",
    "태강":"추진력이 강해 속도 조절과 역할 분담이 중요한 편",
    "극왕":"한 방향으로 힘이 강하게 몰려 조절과 분산이 중요한 편"
  };
  return labels[level]??"전체적으로 균형을 보며 힘을 쓰는 편";
}
function structureMeaning(structure:string){
  if(structure.includes("정관"))return"책임과 기준을 지키면서 신뢰를 쌓는 힘";
  if(structure.includes("편관"))return"압박이 있는 자리에서도 결단하고 책임지는 힘";
  if(structure.includes("정재"))return"꾸준히 관리하고 안정적으로 결과를 쌓는 힘";
  if(structure.includes("편재"))return"시장과 기회를 읽고 여러 자원을 움직이는 힘";
  if(structure.includes("식신"))return"배운 것을 결과물로 만들고 꾸준히 생산하는 힘";
  if(structure.includes("상관"))return"자기 생각을 밖으로 표현하고 기존 방식을 바꾸는 힘";
  if(structure.includes("정인")||structure.includes("편인"))return"배우고 이해한 것을 자기 것으로 만드는 힘";
  if(structure.includes("건록")||structure.includes("양인"))return"스스로 방향을 정하고 독립적으로 밀고 가는 힘";
  return"자기 기준을 세우고 현실에서 결과를 만드는 힘";
}
function workVerdict(facts:ConsultationFacts){
  if(facts.structure.includes("관"))return"조직 안에서도 역할을 해낼 수 있지만, 단순히 지시만 받는 자리보다 판단권과 책임이 함께 주어지는 자리에서 강점이 더 살아납니다.";
  if(facts.structure.includes("재"))return"일의 결과가 매출·운영·성과처럼 현실적인 숫자로 이어질 때 힘이 잘 살아납니다.";
  if(facts.structure.includes("식")||facts.structure.includes("상관"))return"기획한 것을 말·콘텐츠·제품·서비스처럼 밖으로 만들어낼 때 직업운이 살아납니다.";
  if(facts.structure.includes("인"))return"배우고 분석한 것을 전문성으로 바꾸는 일에서 강점이 분명합니다.";
  return"자기 판단으로 방향을 정하고 결과까지 책임질 수 있는 일에서 강점이 살아납니다.";
}
function consultationOpening(row:Row,facts:ConsultationFacts){
  const title=row.topic??row.title,group=row.evidenceGroup??"";
  if(group==="ELEMENTS")return elementFact(facts);
  if(group==="STRENGTH"&&facts.strength)return "전체 기운을 보면 "+strengthMeaning(facts.strength)+"입니다. 의지가 세다 약하다는 뜻보다, 혼자 밀어붙이는 힘과 주변 도움을 쓰는 비중을 보는 기준입니다.";
  if(group==="STRUCTURE_USEFUL"){
    const useful=facts.useful.length?facts.useful.map(elementPro).join(" · "):"";
    if(facts.structure&&useful)return "타고난 흐름의 중심은 "+structureMeaning(facts.structure)+"입니다. 도움 되는 기운은 "+useful+" 순으로 보고, 부족한 쪽을 보완할 때 전체 흐름이 더 매끄러워집니다.";
    if(facts.structure)return "타고난 흐름의 중심은 "+structureMeaning(facts.structure)+"입니다. 이 힘이 일과 관계에서 반복해서 중요한 기준으로 작동합니다.";
  }
  if(group==="IDENTITY"){
    if(/일주|두 글자/.test(title)&&facts.dayPillar)return (facts.dayPillarReading||facts.dayPillar)+" 일주는 이 사주에서 나 자신을 가장 가까이 보는 자리입니다. "+(facts.dayStemName||"나를 대표하는 기운")+"의 성향이 가까운 관계와 실제 선택에서 가장 직접적으로 드러납니다.";
    if(facts.dayStemName)return "나를 대표하는 중심은 "+facts.dayStemName+"입니다. "+elementFact(facts).replace(/^오행에서는 /,"")+" 이 조합이 성격의 방향을 만듭니다.";
  }
  if(group==="WORK"){
    if(/잘 맞는 일/.test(title))return "직업에서는 직함보다 하루 동안 어떤 판단을 하고 어떤 결과를 만드는지가 더 중요합니다. "+workVerdict(facts);
    if(/직장운/.test(title))return "직장운은 있습니다. "+workVerdict(facts);
    if(/사업운/.test(title))return facts.structure.includes("재")
      ?"사업운은 눈여겨볼 만합니다. 돈과 시장, 운영 결과를 직접 다루는 구조와 연결될수록 장점이 크게 살아납니다."
      :"사업은 무조건 독립하는 것보다 내가 결정권을 갖고 결과를 직접 확인할 수 있는 구조일 때 잘 맞습니다.";
    if(/책임/.test(title))return "책임이 커지면 오히려 집중력이 살아나는 편입니다. 다만 모든 일을 직접 확인하려 들면 강점이 과부하로 바뀌기 쉽습니다.";
    if(/인간관계/.test(title))return "직장 인간관계에서는 친밀감보다 역할과 약속이 분명한지가 더 중요합니다. 누가 어디까지 맡는지가 선명할수록 불필요한 감정 소모가 줄어듭니다.";
    if(/학업운/.test(title))return "학업운은 단순 암기보다 배워서 어디에 쓸지가 분명할수록 강합니다. "+(facts.dayStemName||"자기 중심")+"의 성향상 이해한 것을 자기 기준으로 다시 정리할 때 실력이 빨리 붙습니다.";
    return"";
  }
  if(group==="WEALTH"){
    if(/기본 성향/.test(title))return "재물운은 단순히 아끼는 힘보다 돈을 어디에 쓰고 어떤 결과로 돌려받는지가 중요합니다. "+(facts.structure?structureMeaning(facts.structure):"자기 기준을 현실 결과로 연결하는 힘")+"이 돈의 선택에도 그대로 이어집니다.";
    if(/돈의 흐름/.test(title))return "돈의 흐름은 한 번의 큰 행운보다 반복해서 남는 구조를 만드는 쪽에 가깝습니다. "+elementFact(facts)+" 이 균형 때문에 잘하는 부분과 일부러 보완해야 할 부분이 재물관리에서도 갈립니다.";
    if(/버는 힘/.test(title))return "돈을 버는 힘은 시간을 많이 쓰는 것보다 결과를 구조화하는 데서 커집니다. 기획한 것을 서비스·판매·운영처럼 반복 가능한 형태로 만들수록 재물운을 쓰기 좋습니다.";
    if(/모으고 지키/.test(title))return"버는 것과 지키는 것은 다른 능력입니다. 수입이 늘어도 사람·확장·새 기회에 돈이 같이 움직이면 남는 돈은 달라지므로, 기준과 정산 구조를 분명히 두는 편이 좋습니다.";
    if(/인간관계/.test(title))return"돈과 사람을 섞을 때는 호의보다 기준이 먼저입니다. 가까운 사이라도 금액·역할·정산 시점을 분명히 할수록 관계까지 오래 갑니다.";
  }
  if(group==="RELATIONSHIP"){
    if(/연애 성향/.test(title))return "연애는 빠르게 달아오르기보다 신뢰가 쌓인 뒤 깊어지는 쪽에 가깝습니다. 쉽게 마음을 열기보다 상대의 말과 행동이 꾸준한지를 오래 보는 편입니다.";
    if(/마음이 가는 상대/.test(title))return "마음이 가는 상대를 고를 때는 말보다 생활 태도와 책임감을 더 크게 봅니다. 처음의 설렘보다 시간이 지나도 믿을 수 있는지가 중요합니다.";
    if(/애정 표현/.test(title))return "애정 표현은 말만으로 끝나기보다 챙기고 계획하고 실제로 움직이는 쪽에 가깝습니다. 다만 상대에게도 같은 방식의 반응을 기대하면 서운함이 생길 수 있습니다.";
    if(/반복되는 패턴/.test(title))return "관계가 깊어질수록 일과 사생활, 내 기준과 상대의 방식이 부딪히는 지점이 중요해집니다. 가까운 사이일수록 설명을 생략하지 않는 게 핵심입니다.";
    if(/다툴 때/.test(title))return "갈등이 생기면 바로 터뜨리기보다 속으로 정리한 뒤 말하는 편입니다. 문제는 생각이 다 정리될 때까지 기다리면 상대에게는 갑작스럽게 느껴질 수 있다는 점입니다.";
    if(/결혼운/.test(title))return "결혼운은 관계를 오래 유지하는 힘과 각자의 영역을 지키는 균형이 중요합니다. 함께 살더라도 서로의 역할과 혼자 쓸 시간을 남겨두는 구조가 잘 맞습니다.";
    if(/가까운 관계/.test(title))return "가까워질수록 챙김이 커지는 편입니다. 다만 잘해주려는 마음이 상대의 선택까지 대신하는 관리로 바뀌지 않도록 선을 두는 게 중요합니다.";
  }
  if(group==="WELLNESS"&&facts.strongest&&facts.weakest){
    if(/몸이 보내는 신호/.test(title))return "건강운에서는 질병 이름보다 생활 균형을 먼저 봅니다. "+elementPro(facts.strongest.element)+"과 "+elementPro(facts.weakest.element)+"의 차이가 크기 때문에 무리한 뒤 회복하는 패턴을 특히 살펴야 합니다.";
    if(/생활 리듬/.test(title))return "생활 리듬은 몰아서 버티는 것보다 일정한 수면·식사·활동 시간을 유지할 때 안정적입니다.";
    if(/휴식과 회복/.test(title))return "회복은 아무것도 하지 않는 시간만으로 끝나지 않습니다. 머릿속 흐름을 끊어주는 가벼운 움직임과 장소 전환이 도움이 됩니다.";
    if(/긴장과 스트레스/.test(title))return "스트레스가 커지면 생각이 많아지고, 생각이 많아질수록 다시 피로가 쌓이는 순환을 만들기 쉽습니다. 머리를 쉬게 하는 시간이 실제 휴식만큼 중요합니다.";
    if(/활력이 떨어질 때/.test(title))return "활력이 떨어지는 순간은 해야 할 일이 많아서보다 무엇부터 해야 할지 흐려질 때입니다. 우선순위를 하나로 줄이는 게 가장 빠른 회복법입니다.";
    if(/식사와 생활 습관/.test(title))return "몸은 큰 변화보다 반복되는 작은 습관의 영향을 더 오래 받습니다. 일정한 식사와 수면 시간을 먼저 지키는 편이 맞습니다.";
  }
  if(group==="TWELVE_STAGES"){
    const position=/년주/.test(title)?"year":/월주/.test(title)?"month":/일주/.test(title)?"day":/시주/.test(title)?"hour":"";
    if(position&&facts.stageByPosition[position])return title+"은 "+facts.stageByPosition[position]+"에 해당합니다. 이름의 좋고 나쁨보다 그 자리에서 에너지를 어떤 방식으로 쓰는지를 보는 게 핵심입니다.";
  }
  if(group==="TEN_GODS"){
    if(/한눈에|분포|10가지/.test(title))return "십성은 경쟁·표현·돈·책임·배움 가운데 어떤 역할이 앞에 나오는지를 보는 틀입니다. "+(facts.structure?structureMeaning(facts.structure)+"이 이 사주의 중심축으로 작동합니다.":"");
    if(/비겁/.test(title))return "비겁은 스스로 결정하고 버티는 힘과 연결됩니다. 잘 쓰면 독립성과 경쟁력이 되지만, 모든 일을 직접 하려 들면 협업이 어려워질 수 있습니다.";
    if(/식상/.test(title))return "식상은 생각을 말과 결과물로 밖에 꺼내는 힘입니다. 콘텐츠·표현·생산·판매처럼 눈에 보이는 결과를 만들 때 이 축을 씁니다.";
    if(/재성/.test(title))return "재성은 돈 그 자체보다 현실의 결과와 자원을 다루는 힘입니다. 매출·자산·운영처럼 숫자로 남는 결과와 연결됩니다.";
    if(/관성/.test(title))return "관성은 책임과 규칙, 사회에서 맡는 역할과 연결됩니다. 기준을 지키는 힘이지만 납득되지 않는 통제까지 편하다는 뜻은 아닙니다.";
    if(/인성/.test(title))return "인성은 배우고 이해하고 받아들이는 힘입니다. 정보를 자기 것으로 만들고 전문성을 쌓는 과정과 연결됩니다.";
  }
  if(group==="YEARLY_OVERVIEW"||group==="MONTHLY"||group.startsWith("YEAR_"))return title+"은 사건 하나를 맞히는 장이 아니라, 그 시기에 어떤 분야의 움직임이 커지는지를 보는 장입니다. 좋은 시기와 바쁜 시기는 같은 말이 아니므로 둘을 나눠서 읽습니다.";
  if(group==="DAEUN_OVERVIEW"||group.startsWith("DAEUN_"))return title+"은 약 십 년 동안 반복되는 큰 환경을 봅니다. 같은 사람이라도 대운이 바뀌면 맡는 역할과 돈·관계의 우선순위가 달라질 수 있습니다.";
  if(group==="SAMJAE"||group==="CHANGE")return title+"은 나쁜 일이 생긴다는 뜻이 아닙니다. 실제 원국과 그 시기의 충돌·변화를 함께 보고, 무엇이 움직이기 쉬운지를 확인하는 장입니다.";
  if(group==="SYNTHESIS")return "여기서는 앞의 내용을 다시 나열하지 않습니다. "+(facts.dayPillarReading?facts.dayPillarReading+" 일주의 성향, ":"")+(facts.structure?structureMeaning(facts.structure)+", ":"")+(facts.strength?strengthMeaning(facts.strength):"원국의 균형")+"을 한데 묶어 앞으로 선택할 때 남겨야 할 핵심만 정리합니다.";
  return"";
}

function profile(row:Row,index:number):DomainProfile{
  const topic=row.topic??row.title,domain=domainOf(row.evidenceGroup??"");
  const suffix=index%3===0?"바로 움직이기보다 한 번 더 살펴보는 편이에요.":index%3===1?"상황을 본 뒤 뭐부터 할지 정하는 편이에요.":"지금 확인할 것과 바로 해도 될 일을 나눠보는 편이에요.";
  const base={
    IDENTITY:{
      headline:`${topic}`,
      lead:"사주의 중심 기운과 오행의 흐름을 따라, 실제 성격이 어디에서 달라지는지 차근차근 풀어볼게요.",
      scene:`사람을 만나거나 중요한 결정을 앞두면 바로 답부터 내기보다 주변 상황을 먼저 살펴요. ${suffix} 마음이 서고 나면 해야 할 일을 정해 바로 움직이는 편이에요.`,
      strength:"주변이 서두른다고 같이 휩쓸리기보다, 내가 중요하게 생각하는 건 쉽게 바꾸지 않는 편이에요. 한번 맡은 일도 중간에 흐지부지 두기보다 끝까지 마무리하려고 해요.",
      shadow:"다만 스스로 이해가 될 때까지 계속 확인하려 들면 시작이 늦어질 수 있어요. 이미 맡은 일까지 혼자 다 챙기려 하면 금방 지치기도 해요.",
      consequence:"처음에는 조용히 살피지만, 해야겠다고 마음먹고 나면 내가 어디까지 맡을지 분명하게 정하는 편이에요.",
      action:"결정을 앞두고 생각이 너무 많아지면 꼭 확인할 것 두 가지만 남겨보세요. 나머지는 움직이면서 확인해도 괜찮아요.",
      extra:["겉으로는 차분해 보여도 속으로는 여러 경우를 비교하고 있을 때가 많아요. 가까운 사람에게는 결론만 말하기보다 생각하는 과정도 조금씩 이야기해 주는 편이 좋아요."]
    },
    WORK:{
      headline:`${topic}`,
      lead:"일에서는 내가 어디까지 맡아야 하는지가 분명할수록 훨씬 편하게 움직여요.",
      scene:"일이 한꺼번에 들어오면 먼저 뭐부터 할지 정하고 빠진 게 없는지 살펴요. 회의가 길어지면 누가 무엇을 할지 다시 정리하고 다음 할 일을 잡는 편이에요.",
      strength:"마감이나 일정처럼 끝을 챙겨야 하는 일에서 강점이 보여요. 다른 사람이 놓친 부분을 마지막에 잡아주는 역할도 자연스럽게 맡는 편이에요.",
      shadow:"다만 결과가 마음에 안 들까 봐 남이 맡은 일까지 다시 들여다보기 시작하면 일이 점점 본인에게 몰릴 수 있어요. 책임감이 큰 만큼 혼자 다 하려는 습관은 조심하는 게 좋아요.",
      consequence:`${topic}에서는 스스로 방법을 정할 수 있고 맡은 몫이 분명할 때 힘이 잘 살아나요. 시키는 대로만 하기보다 내가 순서를 정하고 결과를 챙길 수 있는 일이 더 잘 맞는 편이에요.`,
      action:"일을 시작할 때 내가 직접 끝낼 일과 중간에 한 번만 확인할 일을 나눠보세요. 일을 맡길 때도 어디까지 해주면 되는지 먼저 말해두는 편이 좋아요.",
      extra:["새로운 걸 배울 때도 듣기만 하는 것보다 직접 한번 해보는 쪽이 잘 맞아요. 자기 방식이 잡히고 나면 비슷한 일을 다시 만났을 때 훨씬 빨리 움직여요."]
    },
    WEALTH:{
      headline:`${topic}`,
      lead:"돈 앞에서는 무조건 아끼거나 크게 쓰기보다, 왜 쓰는 돈인지 납득이 되는지가 더 중요한 편이에요.",
      scene:"큰돈을 쓰거나 계약을 앞두면 한 번 더 비교해 보는 편이에요. 그래도 필요하다고 마음을 정하고 나면 작은 차이를 오래 붙잡기보다 결정을 끝내는 쪽에 가까워요.",
      strength:"충동적으로 돈을 쓰기보다 필요한 곳과 미뤄도 되는 곳을 나누는 편이에요. 목적이 분명한 돈은 오히려 과감하게 쓸 수 있어요.",
      shadow:"손해 보기 싫은 마음이 커지면 비교만 오래 하다가 좋은 때를 놓칠 수 있어요. 반대로 한번 결정하고 나면 이미 정한 선택을 다시 보지 않으려 할 때도 있어요.",
      consequence:`${topic}에서는 돈의 액수보다 이유가 중요해요. 왜 쓰는 돈인지, 이 선택 뒤에 무엇을 남기고 싶은지가 분명하면 마음도 덜 흔들려요.`,
      action:"큰돈을 움직이기 전에는 왜 쓰는지, 얼마나 쓸지, 어디까지 손해를 감당할지만 먼저 정해보세요.",
      extra:["가까운 사람과 돈이 얽히면 친한 사이여도 금액과 약속을 한번 적어두는 편이 좋아요. 나중에 서로 다르게 기억해서 서운해지는 일을 줄일 수 있어요."]
    },
    RELATIONSHIP:{
      headline:`${topic}`,
      lead:"사람을 쉽게 가까이 두는 편은 아니지만, 한번 내 사람이라고 느끼면 오래 챙기는 편이에요.",
      scene:"처음 만난 사람은 말보다 행동을 오래 보는 편이에요. 가까워지고 나면 필요한 일을 챙겨주거나 약속을 지키는 식으로 마음을 보여줘요.",
      strength:"쉽게 흔들리지 않고 관계를 오래 가져가는 힘이 있어요. 상대가 예전에 했던 말을 기억하고 챙겨주는 모습도 신뢰를 만드는 데 도움이 돼요.",
      shadow:"서운한 일이 생겼을 때 바로 말하지 않고 혼자 오래 생각하면 상대는 이유를 모른 채 멀어졌다고 느낄 수 있어요. 약속을 중요하게 보는 만큼 같은 일이 반복되면 마음도 빨리 식을 수 있어요.",
      consequence:`${topic}에서는 마음의 크기보다 언제 말을 꺼내느냐가 더 중요해요. 오래 참다가 한꺼번에 말하기보다 작은 불편함부터 그때그때 알려주는 편이 관계가 편해져요.`,
      action:"상대가 알아서 눈치채길 기다리지 말고, 불편한 게 생기면 짧게라도 먼저 말해보세요. 생각할 시간이 필요하면 그 말부터 해도 괜찮아요.",
      extra:["가까운 사람일수록 대신 챙겨주는 일이 많아질 수 있어요. 하지만 상대가 해야 할 일까지 모두 떠맡지는 않는 게 좋아요."]
    },
    CHILDREN:{
      headline:`${topic}`,
      lead:"가족 안에서는 필요한 일을 먼저 챙기고 생활을 안정적으로 굴러가게 만드는 편이에요.",
      scene:"아이를 돌보거나 가족 안에서 챙길 일이 생기면 필요한 걸 미리 준비하는 편이에요. 해야 할 일이 늘어나도 말보다 행동으로 책임을 보여주려는 쪽에 가까워요.",
      strength:"생활 규칙을 만들고 꾸준히 챙기는 힘이 있어요. 작은 변화도 잘 알아차리는 편이라 필요한 순간에 빠르게 움직일 수 있어요.",
      shadow:"다만 모든 걸 내가 챙겨야 마음이 놓이기 시작하면 가족의 선택까지 대신 정하려 들 수 있어요. 잘 돌봐주는 것과 대신 살아주는 건 다르다는 점을 기억하는 게 좋아요.",
      consequence:`${topic}에서는 챙겨주는 힘만큼 기다려주는 힘도 중요해요. 안전한 범위라면 가족이 직접 선택하고 실수해볼 시간을 남겨두는 편이 관계를 더 편하게 만들어요.`,
      action:"가족 일이 많아질수록 내가 꼭 해야 할 일, 같이 정할 일, 남에게 맡길 일을 나눠보세요.",
      timing:"가족과 관련된 일이 많아지는 시기라고 해서 결과가 좋다거나 나쁘다고 바로 말할 수는 없어요. 실제로 어떤 변화가 생기는지를 함께 봐야 해요."
    },
    WELLNESS:{
      headline:`${topic}`,
      lead:"바쁠수록 쉬는 일은 자꾸 뒤로 밀리는 편이라, 쉴 시간을 일부러 먼저 잡아두는 게 잘 맞아요.",
      scene:"일정이 몰리면 피곤해도 해야 할 일을 먼저 끝내려는 편이에요. 그래서 아주 지친 다음에 쉬기보다 중간중간 멈출 시간을 넣어두는 게 좋아요.",
      strength:"생활 습관은 한 번 크게 바꾸기보다 작은 걸 꾸준히 지키는 방식이 잘 맞아요. 잠이나 식사 시간처럼 반복되는 건 한번 자리를 잡으면 오래 유지하는 편이에요.",
      shadow:"해야 할 걸 다 끝내야 쉰다고 생각하면 휴식이 계속 뒤로 밀릴 수 있어요. 몸이 힘들다고 느껴질 때는 그냥 참기보다 일정부터 줄여보는 게 좋아요.",
      consequence:`${topic}에서는 거창한 방법보다 다음 주에도 지킬 수 있는 작은 습관 하나가 더 중요해요. 무리한 다음 날에는 일부러 쉬는 시간을 남겨두는 식이 잘 맞아요.`,
      action:"하루 계획을 세울 때 할 일만 적지 말고 밥 먹을 시간과 쉴 시간도 같이 적어보세요. 몸이 계속 불편하다면 사주보다 의료 전문가의 판단을 먼저 따르는 게 맞아요."
    },
    SAMJAE:{
      headline:`${topic}`,
      lead:"삼재라고 해서 무조건 나쁜 시기로 볼 필요는 없어요. 다만 평소보다 바뀌는 일이 많아지는지 한 번 더 살펴보는 정도로 보면 돼요.",
      scene:"삼재에 해당하는 해에는 이사, 직장, 관계처럼 큰 변화가 한꺼번에 겹치는지 먼저 봐요. 변화가 많다고 바로 나쁜 해라고 정하지는 않아요.",
      strength:"미리 정리할 것과 새로 시작할 것을 나눠두면 변화가 와도 덜 휘둘려요. 준비가 되어 있으면 갑자기 상황이 바뀌어도 내가 고를 수 있는 여지가 남아요.",
      shadow:"삼재라는 말이 무섭다고 필요한 일까지 모두 미루면 오히려 좋은 기회를 놓칠 수 있어요. 반대로 변화가 많다고 무리하게 일을 벌이는 것도 피하는 게 좋아요.",
      consequence:`${topic}에서는 삼재만 따로 보지 않고 원래 사주와 그때의 십 년 흐름을 같이 봐요. 일이 많이 생기는 때와 결과가 편한 때는 꼭 같지 않아요.`,
      action:"이사나 계약처럼 되돌리기 어려운 일을 앞두고 있다면 평소보다 한 번 더 확인해보세요. 조심하라는 말은 아무것도 하지 말라는 뜻은 아니에요.",
      timing:"들삼재·눌삼재·날삼재는 변화가 들어오고 머물고 정리되는 흐름으로 참고해요. 특정 사건이 꼭 생긴다고 보지는 않아요."
    },
    YEARLY:{
      headline:`${topic}`,
      lead:"해마다 분위기는 달라요. 어떤 해는 일이 먼저 움직이고, 어떤 해는 돈이나 사람 문제가 더 크게 느껴질 수 있어요.",
      scene:"해가 바뀌면 일, 돈, 관계 가운데 유난히 일이 많아지는 곳이 달라질 수 있어요. 중요한 선택이 생기면 어느 쪽이 먼저 움직이는지부터 보는 편이에요.",
      strength:"움직임이 큰 해를 미리 알고 있으면 준비할 시간을 벌 수 있어요. 일이 많은 곳은 힘을 더 쓰고, 부담이 큰 곳은 속도를 조금 줄이는 식으로 대응할 수 있어요.",
      shadow:"변화가 많다고 무조건 좋은 해도 아니고, 힘든 기운이 하나 있다고 나쁜 해도 아니에요. 같은 해라도 일은 괜찮고 돈은 빠듯할 수 있어요.",
      consequence:`${topic}에서는 그 해의 기운만 보지 않고 태어날 때의 사주와 당시 십 년 흐름을 같이 봐요. 특정 사건을 맞히기보다 어디에 신경을 더 써야 하는지를 알려주는 쪽에 가까워요.`,
      action:"그 해에 일이 가장 많이 몰리는 곳 하나를 정하고, 미리 준비할 것과 나중에 해도 될 일을 나눠보세요.",
      timing:"계산된 연도와 시기 안에서만 설명해요. 근거 없는 달이나 사건을 새로 만들어내지는 않아요."
    },
    DAEUN:{
      headline:`${topic}`,
      lead:"십 년이 바뀌면 같은 사람도 맡는 일과 힘을 쓰는 방식이 조금씩 달라질 수 있어요.",
      scene:"십 년 흐름이 바뀌는 시기에는 예전과 맡는 일이나 주변 상황이 달라졌는지부터 살펴봐요. 예전에 잘하던 방식이 안 맞기 시작하면 방법을 조금 바꿔볼 때일 수 있어요.",
      strength:"앞 시기에서 배운 건 다음 시기에도 쓸 수 있어요. 다만 똑같이 반복하기보다 새 환경에 맞게 쓰는 방법을 바꾸면 훨씬 편해져요.",
      shadow:"예전에 잘되던 방식만 고집하면 주변이 바뀌었는데도 같은 문제를 반복할 수 있어요. 반대로 흐름이 바뀌었다고 모든 걸 한꺼번에 바꿀 필요도 없어요.",
      consequence:`${topic}에서는 십 년의 앞부분과 뒷부분이 어떻게 다른지, 전 시기에서 이어진 일이 무엇인지, 다음 시기를 위해 무엇을 준비하면 좋을지를 같이 봐요.`,
      action:"새 십 년을 앞두고 있다면 계속 가져갈 장점 하나와 이제 줄여도 될 습관 하나를 정해보세요.",
      timing:"도움을 받기 쉬운 때와 일이 많이 바뀌는 때는 서로 다를 수 있어요. 변화가 크다고 바로 좋거나 나쁜 시기라고 말하지 않아요."
    },
    SYNTHESIS:{
      headline:`${topic}`,
      lead:"끝까지 읽고 나면 몇 가지 반복되는 모습이 남아요. 그게 이 사주에서 가장 오래 가져갈 중심이에요.",
      scene:"중요한 선택이 겹치면 충분히 살펴본 뒤 마음이 정해진 순간부터 직접 움직여요. 일에서는 책임감으로, 돈에서는 신중함으로, 관계에서는 오래 지켜보는 태도로 드러나요.",
      strength:"서두르지 않으면서도 한번 결정하고 나면 끝까지 가져가는 힘이 있어요. 같은 장점이 상황에 따라 조금씩 다른 모습으로 나와요.",
      shadow:"다만 확인도 책임도 전부 내 몫이라고 생각하기 시작하면 금방 지칠 수 있어요. 모든 걸 완벽하게 하려 하기보다 지금 제일 중요한 것만 남기는 편이 좋아요.",
      consequence:`${topic}에서는 앞에서 했던 말을 다시 늘어놓기보다, 선택 전에는 신중하고 선택 후에는 꾸준하다는 큰 흐름만 남겨볼게요.`,
      action:"큰 선택 앞에서는 내가 확인할 것, 바로 결정할 것, 다른 사람에게 맡길 것을 나눠보세요. 세 가지만 정리해도 훨씬 편하게 움직일 수 있어요."
    },
    NOBLE:{
      headline:`${topic}`,
      lead:"누가 나를 무조건 도와준다고 보기보다, 필요한 순간에 어떤 사람과 연결되는지가 더 중요해요.",
      scene:"혼자 풀기 어려운 일이 생기면 아무에게나 기대기보다 그 일을 잘 아는 사람을 찾는 편이 좋아요. 제안을 받을 때도 사람의 이름보다 실제로 어떤 도움을 주고받을 수 있는지를 보는 게 더 중요해요.",
      strength:"필요할 때 맞는 사람을 잘 찾으면 관계가 많지 않아도 큰 힘이 될 수 있어요. 오래 믿고 이어가는 인연 하나가 여러 얕은 인연보다 도움이 될 때도 많아요.",
      shadow:"도움을 받는 걸 부담스러워해 혼자 버티면 이미 곁에 있는 도움을 놓칠 수 있어요. 반대로 좋은 인연이라는 말만 믿고 모든 제안을 받아들일 필요도 없어요.",
      consequence:`${topic}에서는 특정 사람이 무조건 귀인이라고 단정하지 않아요. 실제로 어떤 도움을 주고받는 관계인지까지 같이 봐요.`,
      action:"도움을 부탁할 때는 내가 필요한 것과 내가 책임질 것을 한 문장씩 나눠 말해보세요. 서로 오해가 훨씬 줄어요."
    },
    ROLES:{
      headline:`${topic}`,
      lead:"당신 안에는 한 가지 모습만 있는 게 아니에요. 일할 때, 배울 때, 사람을 챙길 때 나오는 모습이 조금씩 달라요.",
      scene:"일을 맡았을 때는 책임감이 먼저 나오고, 배우는 자리에서는 듣고 이해하는 모습이 먼저 나올 수 있어요. 사람을 챙길 때는 말보다 행동이 앞설 수도 있어요.",
      strength:"상황에 맞춰 다른 모습을 꺼내 쓸 수 있다는 건 큰 장점이에요. 한 가지 성격에 갇히지 않고 필요할 때 태도를 바꿀 수 있어요.",
      shadow:"다만 여러 사람의 기대를 다 맞추려 하면 정작 내가 원하는 걸 놓칠 수 있어요. 내가 맡지 않아도 되는 일까지 가져오지 않는 게 좋아요.",
      consequence:`${topic}에서는 어떤 모습이 진짜인지 하나를 고르는 게 아니라, 상황마다 어떤 모습이 먼저 나오는지를 봐요.`,
      action:"지금 내가 어떤 자리에서 무엇을 맡고 있는지만 한번 적어보세요. 꼭 해야 할 일과 굳이 안 해도 될 일이 더 잘 보여요."
    },
    GENERAL:{
      headline:`${topic}`,
      lead:"평소에는 잘 모르고 지나가도, 선택해야 할 일이 생기면 이런 모습이 꽤 선명하게 보여요.",
      scene:"선택할 일이 생기면 바로 밀어붙이기보다 먼저 상황을 한 번 살펴봐요. 여러 사람이 얽혀 있으면 내가 할 일과 남에게 맡길 일을 나눠놓고 움직이는 편이에요.",
      strength:"급하다고 바로 결론부터 내리지는 않지만, 마음이 정해지고 나면 행동은 꽤 빠른 편이에요. 한번 맡은 일도 중간에 흐지부지 두기보다 끝까지 마무리하려고 해요.",
      shadow:"다만 확인해야 마음이 놓이는 쪽이 강해지면 시작 전부터 생각이 길어질 수 있어요. 거기에 일까지 혼자 끌어안으면 금방 지칠 수 있어요.",
      consequence:`${topic}에서는 한 가지 특징만 보고 사람 전체를 정하지 않아요. 비슷한 장면에서 반복해서 나오는 모습을 함께 봐요.`,
      action:"결정을 앞두고 있다면 꼭 확인할 것과 남에게 맡겨도 될 일을 먼저 나눠보세요. 그 두 가지만 정리돼도 움직이기가 훨씬 편해져요."
    }
  } satisfies Record<string,DomainProfile>;
  return base[domain];
}

function withoutTopicPrefix(text:string,topic:string){
  if(!text.startsWith(topic))return text;
  return text
    .slice(topic.length)
    .replace(/^(?:에서도|에서는|에서|에선|에는|은|는|이|가|을|를|과|와|도)?[,·:\s]*/,"")
    .trim();
}
function trimOpening(text:string){
  return text
    .replace(/^잘 쓰이면\s*/,"")
    .replace(/^다만\s*/,"")
    .replace(/^반대로\s*/,"")
    .replace(/^특히\s*/,"")
    .trim();
}
function joinUpsideShadow(strength:string,shadow:string){
  const upside=trimOpening(strength),downside=trimOpening(shadow);
  return `${upside} 그런데 이런 모습이 너무 강해지면 ${downside.charAt(0).toLowerCase()+downside.slice(1)}`;
}
const CUSTOMER_NARRATION_TERM_MAP:Record<string,string>={
  "정관격":"책임과 원칙을 중시하는 흐름",
  "편관격":"결단과 책임이 강한 흐름",
  "정재격":"안정적으로 쌓아가는 흐름",
  "편재격":"기회와 현실 감각이 빠른 흐름",
  "식신격":"꾸준히 만들고 표현하는 흐름",
  "상관격":"자기 생각을 밖으로 꺼내는 흐름",
  "정인격":"배우고 이해하는 흐름",
  "편인격":"깊이 파고들어 해석하는 흐름",
  "건록격":"스스로 방향을 잡는 흐름",
  "양인격":"결단과 추진력이 강한 흐름",
  "비견":"자기 기준",
  "겁재":"경쟁심과 주도권",
  "식신":"꾸준한 표현력",
  "상관":"솔직한 표현력",
  "정재":"안정적인 관리력",
  "편재":"기회 감각",
  "정관":"책임감과 원칙",
  "편관":"결단력과 책임",
  "정인":"이해하고 받아들이는 힘",
  "편인":"깊게 파고드는 이해력",
  "비겁":"자기주도성",
  "식상":"표현력",
  "재성":"현실 감각",
  "관성":"책임감",
  "인성":"학습력"
};
function customerizeNarration(text:string){
  let result=text;
  for(const [term,meaning] of Object.entries(CUSTOMER_NARRATION_TERM_MAP).sort(([left],[right])=>right.length-left.length)){
    result=result.split(term).join(meaning);
  }
  return result;
}
function naturalizeNarration(text:string){
  return customerizeNarration(text)
    .replaceAll("자기준","자기 기준")
    .replaceAll("분명히 ","")
    .replace(/\s+/g," ")
    .trim();
}

type EditorialAngleBank={scenes:readonly string[];consequences:readonly string[];actions:readonly string[]};
const EDITORIAL_ANGLE_BANKS:Record<string,EditorialAngleBank>={
  IDENTITY:{
    scenes:[
      "처음 보는 사람들과 있을 때는 분위기를 먼저 살피고, 어느 정도 편해진 뒤에 말을 꺼내는 편이에요.",
      "고를 게 많으면 바로 정하기보다 하나씩 비교해 본 뒤 결정하는 편이에요.",
      "가까운 사람이 의견을 물으면 일단 끝까지 들어보고, 내 생각이 정리된 뒤 솔직하게 말하는 편이에요.",
      "새로운 일을 시작할 때는 처음부터 크게 벌이기보다 한두 번 직접 해본 뒤 계속할지 정해요.",
      "문제가 생기면 바로 감정적으로 반응하기보다 무슨 일이 있었는지부터 차분히 살펴보는 편이에요."
    ],
    consequences:[
      "처음에는 조금 느려 보여도 한번 마음을 정하면 쉽게 흔들리지 않는 편이에요.",
      "주변에서는 신중하다고 볼 수 있고, 본인은 스스로 이해가 돼야 마음이 놓이는 편이에요.",
      "생각을 정리할 시간이 없으면 말수가 줄거나 결정을 미루게 될 수 있어요.",
      "낯선 상황에서는 바로 결론을 내리기보다 필요한 정보를 먼저 확인한 뒤 결정해요.",
      "같은 성향도 사람을 만날 때는 조심스럽게 다가가고, 일할 때는 순서를 꼼꼼히 챙기는 쪽으로 드러나요."
    ],
    actions:[
      "생각할 게 너무 많다면 꼭 확인할 것 세 가지만 남기고 결정해 보세요.",
      "처음부터 완벽한 답을 찾기보다 작은 선택 하나를 먼저 끝내 보세요.",
      "생각할 시간이 필요하면 주변 사람에게 그 시간을 먼저 말해 두세요.",
      "원래 생각과 새로 알게 된 내용을 따로 적어보면 마음이 덜 흔들려요.",
      "혼자 확인해야 할 일과 다른 사람에게 물어볼 일을 나누어 보세요."
    ]
  },
  WORK:{
    scenes:[
      "회의가 산으로 가기 시작하면 누가 무엇을 할지 다시 정리하고 다음 할 일을 잡는 편이에요.",
      "마감이 가까워지면 가장 중요한 결과부터 확인하고 덜 중요한 수정은 뒤로 미룹니다.",
      "남이 하던 일을 이어받을 때는 어디까지 되어 있는지 먼저 확인해야 마음이 놓이는 편이에요.",
      "일하는 방법을 스스로 정할 수 있을 때 속도가 붙고 결과 확인도 꼼꼼해집니다.",
      "새로운 업무를 배우면 설명을 듣는 데서 끝내지 않고 직접 한번 해보며 자기 순서를 만듭니다."
    ],
    consequences:[
      "마무리를 꼼꼼히 챙기는 편이라 믿음을 얻기 쉽지만, 이것저것 다 확인하려 들면 일이 본인에게 몰릴 수 있어요.",
      "스스로 방법을 정할 수 있을 때 일을 잘하는 편이고, 이유 없이 계속 재촉받으면 금방 지칠 수 있어요.",
      "같이 일할 때는 내가 중요하게 보는 걸 미리 말해두는 편이 좋아요. 그래야 꼼꼼함이 간섭처럼 보이지 않아요.",
      "사업이나 운영에서는 멋진 아이디어보다 매번 반복되는 일을 잘 굴러가게 만드는 힘이 더 중요할 수 있어요.",
      "배움에서는 이해한 내용을 자기 방식으로 다시 정리할 때 기억과 적용 속도가 함께 좋아집니다."
    ],
    actions:[
      "오늘 직접 끝낼 일과 중간 확인만 할 일을 따로 적어 보세요.",
      "일을 맡길 때는 어디까지 끝내면 되는지 한 문장으로 먼저 맞춰두세요.",
      "마감 직전에는 새 아이디어보다 이미 정한 핵심 결과를 우선하세요.",
      "회의가 길어지면 다음 행동과 담당자만 먼저 확정해 보세요.",
      "배운 내용을 바로 작은 결과물로 만들어 보면 이해가 훨씬 빨리 굳습니다."
    ]
  },
  WEALTH:{
    scenes:[
      "예산을 짤 때 생활에 꼭 필요한 돈과 선택해서 쓸 돈을 먼저 나누는 편입니다.",
      "큰 구매를 앞두면 여러 조건을 비교한 뒤 오래 쓸 이유가 있는지 확인합니다.",
      "계약이나 돈 약속이 생기면 얼마인지뿐 아니라 언제, 무엇을 받는지부터 꼼꼼히 보는 편이에요.",
      "정기적으로 나가는 돈은 한번 구조를 만들어 두면 꾸준히 관리하는 편입니다.",
      "새로운 수입 기회가 보여도 바로 뛰어들기보다 잃어도 되는 범위를 먼저 정합니다."
    ],
    consequences:[
      "목적이 분명한 돈은 과감하게 쓸 수 있지만 이유가 흐린 지출은 오래 고민하게 됩니다.",
      "손해를 줄이는 힘은 강점이지만 비교가 길어지면 필요한 시기를 놓칠 수 있습니다.",
      "사람과 돈이 섞이면 친한 사이여도 누가 무엇을 맡는지 분명해야 마음이 편한 편이에요.",
      "작은 돈까지 매번 신경 쓰기보다 크게 지킬 몇 가지만 정해두는 편이 더 오래 가요.",
      "돈을 얼마나 빨리 쓰느냐보다 어디까지 쓸지 미리 정해두는 게 마음을 편하게 해줘요."
    ],
    actions:[
      "큰돈을 쓰기 전 목적, 기간, 최대 금액 세 가지만 적어 보세요.",
      "비교 항목이 너무 많아지면 가장 중요한 두 조건만 남겨 결정해 보세요.",
      "가까운 사람과 돈이 얽히면 금액과 역할을 메시지나 기록으로 남겨 두세요.",
      "정기 지출은 한 달에 한 번만 검토하는 날짜를 정해 두는 편이 낫습니다.",
      "새 기회에는 기대 수익보다 먼저 멈출 조건을 정해 두세요."
    ]
  },
  RELATIONSHIP:{
    scenes:[
      "처음 만난 사람에게는 말보다 약속을 지키는지와 행동이 꾸준한지를 오래 봅니다.",
      "연락이 늦거나 분위기가 달라져도 바로 결론 내리기보다 이유를 확인하려는 편입니다.",
      "서운한 일이 생기면 즉시 따지기보다 혼자 생각을 정리한 뒤 말을 꺼내려 합니다.",
      "관계가 가까워지면 필요한 일을 대신 챙기며 마음을 행동으로 보여 주기 쉽습니다.",
      "서로 바쁜 시기에는 자주 보는 것보다 약속한 시간을 지키는지를 더 중요하게 느낍니다."
    ],
    consequences:[
      "가까워지는 속도는 빠르지 않아도 신뢰가 생긴 뒤에는 관계를 오래 지키는 힘이 있습니다.",
      "말하지 않고 알아주길 기다리면 나는 배려했다고 생각해도, 상대는 마음이 멀어진 걸로 느낄 수 있어요.",
      "약속을 중요하게 보는 편이라 같은 약속이 자꾸 깨지면 마음이 빨리 식을 수 있어요.",
      "챙기는 행동이 많아질수록 상대의 몫까지 대신 맡지 않는 경계가 중요해집니다.",
      "혼자 정리하는 시간이 길어지기 전에 지금 어떤 상태인지 한 문장이라도 알려 주는 편이 좋습니다."
    ],
    actions:[
      "불편한 일이 생기면 결론보다 지금 느낀 점 한 문장부터 말해 보세요.",
      "상대에게 기대하는 약속은 마음속 기준으로 두지 말고 구체적으로 알려 주세요.",
      "도와주기 전에 상대가 직접 하려는 몫이 무엇인지 먼저 물어보세요.",
      "생각할 시간이 필요할 때는 연락을 끊기보다 언제 다시 이야기할지 정해 두세요.",
      "관계가 편해질수록 감사한 행동을 당연하게 넘기지 말고 짧게 표현해 보세요."
    ]
  },
  CHILDREN:{
    scenes:[
      "아이를 돌보는 역할이 생긴다면 준비물과 생활 순서를 미리 정리해 두는 쪽에 가깝습니다.",
      "가족 안에서 규칙을 정할 때 이유를 이해시키고 반복해서 지키게 하려는 편입니다.",
      "아이를 돌보게 된다면 실수할 때마다 바로 대신 해결하기보다, 스스로 해볼 시간을 조금 남겨주는 게 좋아요.",
      "가족이 내 생각과 다르게 선택해도 크게 위험하지 않다면 한번 직접 해보게 두는 편이 좋아요.",
      "돌봄 일이 몰리는 시기에는 혼자 다 챙기기보다 가족끼리 역할을 나누는 것이 오래 갑니다."
    ],
    consequences:[
      "꾸준히 챙기는 힘은 안정감을 주지만 걱정이 커지면 선택까지 대신하려는 모습으로 바뀔 수 있습니다.",
      "생활 기준이 분명할수록 가족은 편해질 수 있지만 기준의 이유를 공유하지 않으면 답답하게 느낄 수 있습니다.",
      "잘 챙겨주는 것과 모든 일을 대신 책임지는 건 달라요. 내가 어디까지 해줄지 선을 정해두는 게 좋아요.",
      "작은 변화까지 알아차리는 장점은 크지만 매 순간 반응하려 하면 본인도 쉽게 지칠 수 있습니다.",
      "가족 역할이 커질수록 완벽한 준비보다 지속 가능한 분담이 관계를 편하게 만듭니다."
    ],
    actions:[
      "가족 일은 내가 꼭 할 것, 함께 정할 것, 맡길 것으로 세 칸을 나눠 보세요.",
      "규칙을 만들 때 지켜야 하는 이유를 짧게 설명하고 선택할 여지도 하나 남겨 주세요.",
      "도와주기 전에 스스로 해볼 시간을 조금 더 기다려 보세요.",
      "걱정되는 일이 생기면 바로 개입하기보다 실제로 필요한 도움부터 확인해 보세요.",
      "돌봄 일정이 많아지면 쉬는 시간도 역할표 안에 같이 넣어 두세요."
    ]
  },
  WELLNESS:{
    scenes:[
      "일정이 몰리는 날에는 쉬는 시간을 뒤로 미루기 쉬워 중간에 멈출 시간을 먼저 정해 두는 편이 좋습니다.",
      "잠을 제대로 못 잔 날에는 평소처럼 다 해내려 하기보다 꼭 할 일만 남기는 편이 좋아요.",
      "식사 시간이 흔들리면 하루 전체 리듬도 같이 흐트러지기 쉬워 시간을 단순하게 고정하는 편이 맞습니다.",
      "운동은 한 번에 많이 하기보다 짧아도 반복 가능한 시간을 정해 두는 방식이 잘 맞습니다.",
      "생활 환경이 바뀌는 주에는 새로운 계획보다 잠, 식사, 이동 시간을 먼저 안정시키는 편이 낫습니다."
    ],
    consequences:[
      "생활 기준이 일정하면 집중하기 쉬워지지만 모든 계획을 지켜야 한다는 압박으로 바뀌지 않게 해야 합니다.",
      "피로를 참고 끝까지 버티는 습관은 단기적으로는 일을 끝내도 회복 시간을 뒤로 밀 수 있습니다.",
      "작은 습관을 오래 유지하는 힘이 있어 거창한 변화보다 반복 가능한 기준이 더 잘 맞습니다.",
      "바쁜 날과 덜 바쁜 날의 강도를 다르게 잡아야 생활 리듬이 오래 유지됩니다.",
      "쉬는 시간을 보상처럼 두기보다 일정의 일부로 넣을 때 과부하를 줄이기 쉽습니다."
    ],
    actions:[
      "하루 계획에 해야 할 일과 함께 멈출 시간도 적어 두세요.",
      "잠이 부족한 날은 새 일을 늘리기보다 오늘 꼭 끝낼 일 하나를 줄여 보세요.",
      "식사와 이동 시간을 먼저 고정한 뒤 나머지 일정을 붙여 보세요.",
      "운동은 강도보다 다음 주에도 반복할 수 있는 길이로 시작하세요.",
      "환경이 바뀌는 시기에는 기존 생활 습관 한 가지만 먼저 지켜 보세요."
    ]
  },
  SAMJAE:{
    scenes:[
      "변화가 겹치는 해에 계약을 앞두면 조건과 되돌릴 수 없는 부분을 한 번 더 확인하는 편이 좋습니다.",
      "이동이나 자리 변화가 생기면 좋은지 나쁜지부터 정하기보다 바뀌는 역할이 무엇인지 먼저 봅니다.",
      "사람 일과 일이 한꺼번에 꼬이면 다 해결하려 하지 말고 급한 것부터 하나씩 풀어가는 편이 좋아요.",
      "새 기회가 들어와도 이름만 보고 겁내거나 들뜨기보다 실제 준비 정도를 확인해야 합니다.",
      "정리할 일이 많아지는 시기에는 붙잡을 것과 내려놓을 것을 나누어 보는 편이 도움이 됩니다."
    ],
    consequences:[
      "변화가 많다는 사실과 결과가 불리하다는 판단은 같은 뜻이 아니므로 각각 따로 봐야 합니다.",
      "큰 변화가 예상되면 미리 한두 가지를 더 확인해두는 편이 좋아요. 그래야 상황이 바뀌어도 선택할 여지가 남습니다.",
      "겁 때문에 필요한 기회를 모두 미루는 것도, 변화가 크다고 무리하게 움직이는 것도 피하는 편이 좋습니다.",
      "그 해에 붙은 이름보다 실제로 이사, 일, 사람 관계처럼 무엇이 바뀌는지를 보는 게 더 중요해요.",
      "정리와 전환이 필요한 때라면 과거 방식을 그대로 유지하는 것보다 기준을 다시 세우는 쪽이 맞을 수 있습니다."
    ],
    actions:[
      "계약과 이동처럼 되돌리기 어려운 선택은 확인 항목을 평소보다 하나 더 늘려 보세요.",
      "변화가 여러 개 겹치면 가장 먼저 결정해야 할 일과 기다려도 될 일을 나누세요.",
      "불안 때문에 미루는지 실제 준비가 부족해서 미루는지 이유를 구분해 적어 보세요.",
      "새 기회는 기대보다 먼저 필요한 시간과 비용을 계산해 보세요.",
      "정리할 일은 유지, 수정, 종료 세 가지로 나누면 판단이 쉬워집니다."
    ]
  },
  YEARLY:{
    scenes:[
      "새해에 일이 몰리면 가장 먼저 움직이는 분야가 무엇인지 확인하고 그곳부터 일정을 조정합니다.",
      "돈과 관련된 선택이 늘어나는 해에는 큰 결정보다 반복 지출과 약속된 비용부터 점검합니다.",
      "사람 관계가 바빠지는 해에는 만나는 수보다 어떤 관계에 시간을 더 쓸지 정하는 편이 중요합니다.",
      "역할이 달라지는 해에는 이전 방식이 그대로 맞는지 확인하고 필요한 부분만 바꿉니다.",
      "기회가 자주 보이는 해에도 전부 잡기보다 실제로 끝낼 수 있는 수를 먼저 정합니다.",
      "변화가 잦은 해에는 한 달 단위로 우선순위를 다시 정리하며 속도를 조절하는 편이 낫습니다."
    ],
    consequences:[
      "도움이 잘 들어오는 부분과 일이 많이 생기는 부분은 서로 다를 수 있어요. 둘은 따로 보는 게 맞아요.",
      "같은 해라도 일은 괜찮은데 돈은 빠듯할 수 있고, 관계는 또 다르게 느껴질 수 있어요. 한마디로 좋은 해, 나쁜 해라고 말하기는 어려워요.",
      "움직임이 큰 분야는 준비가 필요하고 비교적 조용한 분야는 기존 방식을 유지해도 괜찮을 수 있습니다.",
      "기회가 많아 보여도 선택 수가 너무 늘면 집중이 흩어질 수 있어 우선순위가 중요해집니다.",
      "부담이 있는 시기에도 도움받을 조건이 함께 있으면 혼자 버티는 방식만 고집할 필요는 없습니다.",
      "한 해의 흐름은 사건 예언보다 어떤 선택을 먼저 볼지 정하는 참고로 쓰는 편이 안전합니다."
    ],
    actions:[
      "올해 가장 많이 움직이는 분야 하나를 정하고 준비, 실행, 보류를 나눠 적어 보세요.",
      "큰 결정을 앞두면 지금 필요한 정보와 나중에 확인해도 될 정보를 구분해 보세요.",
      "관계 일정이 많아지면 꼭 지킬 약속부터 달력에 먼저 고정해 두세요.",
      "역할이 바뀌면 이전 방식 중 계속 가져갈 것 한 가지를 먼저 정하세요.",
      "기회가 겹치면 동시에 시작할 수 있는 수를 미리 제한해 보세요.",
      "한 달이 끝날 때 실제로 바뀐 것과 예상만 했던 것을 따로 기록해 보세요."
    ]
  },
  DAEUN:{
    scenes:[
      "십 년 흐름이 바뀌는 시기에는 예전과 맡는 일이나 주변 상황이 달라졌는지부터 살펴보는 편이에요.",
      "예전 방식이 잘 안 통할 때는 내가 못해서라고 생각하기보다 주변 상황이 어떻게 달라졌는지 먼저 보는 게 좋아요.",
      "새로운 사람과 연결이 늘어나는 시기에는 만남의 수보다 어떤 역할로 만날지 먼저 선택합니다.",
      "책임이 커지는 자리에서는 직접 하는 일과 관리할 일을 나누어 부담이 한곳에 몰리지 않게 합니다.",
      "배운 것을 결과로 바꿔야 하는 시기에는 준비 내용을 정리한 뒤 작은 결과물부터 남깁니다.",
      "다음 십 년으로 넘어가기 전에는 지금까지 잘된 방식 가운데 무엇을 가져갈지 먼저 정리합니다."
    ],
    consequences:[
      "예전에는 잘 통했던 방식이 다음 시기에는 덜 맞을 수 있어요. 그때는 방법을 조금 바꿔보는 편이 좋아요.",
      "같은 십 년 안에서도 앞부분과 뒷부분 분위기가 달라질 수 있어요. 십 년 전체를 한마디로 좋다 나쁘다 정하지 않는 편이 좋아요.",
      "환경 변화가 크더라도 도움받을 조건이 함께 있으면 혼자 모든 부담을 떠안을 필요는 없습니다.",
      "맡는 일이 커질수록 모든 걸 직접 하기보다 다른 사람과 일을 나누는 쪽이 더 중요해질 수 있어요.",
      "이전 시기의 경험은 버리는 것이 아니라 새 환경에서 다른 방식으로 쓰는 자산이 될 수 있습니다.",
      "다음 시기를 준비할 때는 새로 시작할 것보다 더 이상 맞지 않는 습관을 줄이는 일이 먼저일 수 있습니다."
    ],
    actions:[
      "지금 시기에 계속 가져갈 강점 한 가지와 줄일 습관 한 가지를 적어 보세요.",
      "역할이 바뀌면 직접 할 일과 관리할 일을 다시 나누어 보세요.",
      "환경이 달라질 때는 과거 방식이 안 통하는 이유를 먼저 적어 보세요.",
      "사람 관계가 넓어지면 누구와 어떤 역할로 연결되는지 구분해 보세요.",
      "준비가 길어지는 시기에는 작은 결과물 하나를 정해 마감해 보세요.",
      "다음 흐름을 앞두면 유지, 수정, 종료 세 칸으로 현재 일을 정리해 보세요."
    ]
  },
  SYNTHESIS:{
    scenes:[
      "큰 선택이 겹치는 상황에서는 충분히 확인한 뒤 기준이 선 순간부터 직접 움직입니다.",
      "일이 많아질수록 혼자 다시 확인하려는 습관이 강해져 책임을 나누는 선택이 중요해집니다.",
      "돈과 일에서는 내 원칙이 힘이 되지만, 관계에서는 그 원칙을 상대에게 잘 설명하는 게 더 중요해요.",
      "익숙한 상황에서는 빠르게 결정하지만 새로운 자리에서는 먼저 조건을 확인합니다.",
      "잘하고 싶은 마음이 커지는 상황에서는 완벽한 준비보다 끝낼 일을 먼저 선택합니다."
    ],
    consequences:[
      "신중한데도 한번 결정하면 행동이 빠를 수 있어요. 결정 전과 후의 모습이 다른 거예요.",
      "책임감은 신뢰를 만드는 강점이지만 혼자 들고 가는 순간 피로의 원인이 되기 쉽습니다.",
      "여러 분야에 공통으로 남는 핵심은 무엇을 선택할지보다 어디까지 책임질지를 정하는 방식입니다.",
      "사람과 상황을 오래 보는 덕분에 실수는 줄일 수 있지만, 너무 오래 고민하지 않도록 확인할 것만 간단히 정해두는 게 좋아요.",
      "오래 가는 선택은 모든 것을 잘하는 방향보다 중요한 것에 힘을 모으는 방향에 가깝습니다."
    ],
    actions:[
      "큰 선택 앞에서는 확인할 것, 결정할 것, 맡길 것을 세 칸으로 나눠 보세요.",
      "책임이 몰리면 꼭 본인이 해야 하는 일 한 가지만 남기고 나머지는 나눠 보세요.",
      "돈, 일, 관계에서 각각 가장 중요한 기준 한 문장씩만 정해 보세요.",
      "새 환경에서는 완벽히 이해한 뒤 시작하기보다 작은 행동 하나를 먼저 해보세요.",
      "한 달에 한 번 지금 계속할 것과 줄일 것을 다시 정리해 보세요."
    ]
  },
  NOBLE:{
    scenes:[
      "혼자 풀기 어려운 문제가 생기면 경험이 맞는 사람에게 구체적으로 무엇을 묻고 싶은지 정리한 뒤 도움을 구합니다.",
      "누군가를 소개받았을 때는 그 사람이 얼마나 유명한지보다 나와 실제로 어떤 도움을 주고받을 수 있는지가 더 중요해요.",
      "배움의 기회가 생기면 설명을 듣는 것보다 직접 적용해 볼 수 있는지 확인해야 도움이 오래 남습니다.",
      "직책이나 역할을 통해 만나는 사람은 친분보다 서로 맡은 일을 분명히 할 때 관계가 편해집니다.",
      "뜻밖의 제안을 받으면 좋은 인연이라는 이름보다 실제 조건과 역할을 먼저 확인하는 편이 안전합니다."
    ],
    consequences:[
      "도움을 받는 힘은 사람 수보다 필요한 순간에 맞는 연결을 쓰는 능력에 가깝습니다.",
      "혼자 버티려는 습관이 강하면 이미 있는 도움을 늦게 쓰게 될 수 있습니다.",
      "좋은 관계라도 서로 뭘 기대하는지 말하지 않으면 부담이 생길 수 있어요. 처음부터 솔직하게 맞춰두는 편이 좋아요.",
      "배움으로 만난 인연은 바로 결과보다 시간이 지나며 선택의 폭을 넓혀 줄 수 있습니다.",
      "도움을 받았을 때 본인의 책임 범위까지 분명히 하면 관계가 오래 가기 쉽습니다."
    ],
    actions:[
      "도움을 청할 때 필요한 일과 내가 책임질 일을 한 문장씩 나누어 말해 보세요.",
      "소개를 받으면 기대보다 먼저 서로 할 수 있는 일을 확인해 보세요.",
      "배운 내용은 작은 일 하나에 바로 적용해 보세요.",
      "역할로 만난 사람과는 일정과 책임을 초반에 맞춰 두세요.",
      "제안을 받으면 사람에 대한 호감과 실제 조건을 따로 적어 보세요."
    ]
  },
  ROLES:{
    scenes:[
      "내가 책임져야 하는 상황에서는 해야 할 일을 먼저 정하고 하나씩 처리하는 편이에요.",
      "배우는 자리에서는 바로 의견을 내기보다 내용을 충분히 듣고 자기 말로 다시 정리합니다.",
      "사람을 챙기는 자리에서는 필요한 일을 먼저 알아차려 행동으로 도우려는 편입니다.",
      "결과를 만들어야 하는 자리에서는 아이디어보다 마감과 완성 상태를 더 중요하게 봅니다.",
      "혼자 결정해야 할 때는 선택지를 너무 많이 두기보다 몇 개로 줄여서 고르는 편이 마음이 편해요."
    ],
    consequences:[
      "상황마다 앞에 나오는 역할이 달라 한 가지 성격표로 사람 전체를 설명하기 어렵습니다.",
      "여러 역할을 동시에 잘하려 하면 주변 요구를 먼저 챙기느라 자기 기준이 흐려질 수 있습니다.",
      "배우는 것과 직접 해보는 것이 잘 맞물리면 새 일을 익힌 뒤 실제 성과까지 내기 쉬워요.",
      "사람을 잘 챙기는 건 장점이지만, 상대가 해야 할 일까지 대신 떠맡지는 않는 게 좋아요.",
      "결과 중심 역할이 강해질수록 과정에서 필요한 휴식과 소통을 의식적으로 챙기는 편이 좋습니다."
    ],
    actions:[
      "지금 내가 맡은 역할을 한 문장으로 정하고 그 역할에 필요 없는 일 하나를 빼보세요.",
      "배우는 자리에서는 핵심을 세 줄로 다시 적어 보세요.",
      "도와주기 전에 상대가 직접 해야 할 몫을 먼저 확인해 보세요.",
      "결과가 중요한 일은 완료 기준을 시작할 때 정해 두세요.",
      "선택지가 많아지면 지금 역할에 꼭 필요한 두 가지만 남겨 보세요."
    ]
  },
  GENERAL:{
    scenes:[
      "선택할 일이 생기면 먼저 상황을 확인하고 지금 결정해야 할 것부터 순서를 잡습니다.",
      "여럿이 같이 움직여야 할 때는 내가 할 일과 남에게 넘길 일을 먼저 나누는 편이에요.",
      "새로운 얘기를 들었다고 처음 생각을 다 버리기보다, 달라진 부분만 다시 보는 편이에요.",
      "일이 복잡해질수록 여러 문제를 한꺼번에 풀기보다 하나씩 끝내는 방식이 잘 맞습니다.",
      "마음이 급할수록 더 많이 알아보려 하지 말고, 꼭 필요한 것만 확인하고 결정하는 편이 좋아요."
    ],
    consequences:[
      "기준이 잡혀 있으면 쉽게 흔들리지는 않아요. 대신 확인할 게 많아질수록 첫발을 떼는 데 시간이 더 걸릴 수 있습니다.",
      "책임을 나누는 기준이 분명할수록 주변과 함께 움직이기 쉬워집니다.",
      "새 정보가 생겨도 핵심 기준을 유지하면 필요 이상으로 흔들리지 않을 수 있습니다.",
      "복잡한 상황에서는 문제 수를 줄이는 것만으로도 행동 속도가 훨씬 나아질 수 있습니다.",
      "급한 마음과 실제로 급한 일을 구분하면 불필요한 실수를 줄이기 쉽습니다."
    ],
    actions:[
      "지금 꼭 결정해야 할 일 한 가지부터 적어 보세요.",
      "직접 할 일과 맡길 일을 두 칸으로 나누어 보세요.",
      "새 정보가 생기면 기존 판단에서 무엇만 바뀌는지 표시해 보세요.",
      "문제가 많아 보이면 오늘 끝낼 것 하나만 먼저 정하세요.",
      "확인 항목을 세 가지 안으로 줄인 뒤 움직여 보세요."
    ]
  }
};

function editorialAngle(row:Row,index:number){
  const topic=row.topic??row.title;
  if(domainOf(row.evidenceGroup??"")==="ROLES"&&topic==="네 기둥 위에 놓인 역할들")return{
    scene:"일을 맡는 자리에서는 마감과 책임을 앞세우고, 배우는 자리에서는 충분히 들은 뒤 자기 방식으로 정리합니다. 상황이 바뀔 때마다 어느 역할을 먼저 쓸지 고르는 편입니다.",
    consequence:"서로 다른 역할을 필요에 맞게 바꾸어 쓰면 선택 폭이 넓어지지만, 여러 몫을 동시에 맡으면 정작 본인의 우선순위가 흐려질 수 있습니다.",
    action:"이번 주에 맡은 역할을 일, 배움, 관계로 나누고 각 자리에서 꼭 할 일 하나씩만 남겨 보세요."
  };
  if(domainOf(row.evidenceGroup??"")==="ROLES"&&topic==="겉으로 바로 보이는 역할")return{
    scene:"회의나 첫 만남처럼 평가가 빠른 자리에서는 맡은 일을 분명히 하고 결과를 챙기는 모습이 먼저 드러납니다. 속으로 고민하는 시간보다 겉으로 확인되는 행동이 인상을 만듭니다.",
    consequence:"처음부터 책임감 있는 사람으로 보이기 쉽지만, 늘 해결하는 사람으로 굳어지면 주변이 도움을 당연하게 여기거나 본래 의도를 놓칠 수 있습니다.",
    action:"새로운 자리에서는 잘할 수 있는 일뿐 아니라 지금 맡지 않을 일도 초반에 함께 말해 보세요."
  };
  const bank=EDITORIAL_ANGLE_BANKS[domainOf(row.evidenceGroup??"")]??EDITORIAL_ANGLE_BANKS.GENERAL;
  const seed=Array.from(row.id).reduce((total,character,offset)=>total+character.charCodeAt(0)*(offset+1),index+1);
  return{
    scene:bank.scenes[seed%bank.scenes.length],
    consequence:bank.consequences[Math.floor(seed/bank.scenes.length)%bank.consequences.length],
    action:bank.actions[Math.floor(seed/(bank.scenes.length*bank.consequences.length))%bank.actions.length]
  };
}

function shouldIncludeTimingNote(row:Row){
  const topic=row.topic??row.title,group=row.evidenceGroup??"";
  if(group==="CHILDREN")return /시기|십 년|몇 년|테마/.test(topic);
  if(group==="SAMJAE")return /들삼재|눌삼재|날삼재|주기|다음 삼재|지나온/.test(topic);
  return false;
}
const DEPTH_BANKS:Record<string,{contextA:readonly string[];contextB:readonly string[];practiceA:readonly string[];practiceB:readonly string[]}>={
  IDENTITY:{
    contextA:[
      "첫인상보다 더 중요한 건 비슷한 상황에서 반복해서 꺼내는 태도입니다.",
      "겉으로 보이는 속도와 마음속에서 판단하는 속도는 서로 다를 수 있습니다.",
      "편한 환경에서는 자연스럽게 나오던 성향도 책임이 커지면 전혀 다른 모습으로 바뀔 수 있습니다.",
      "같은 장점도 여유가 있을 때와 시간이 부족할 때 쓰이는 방식이 달라집니다.",
      "내가 나를 설명하는 말과 주변 사람이 실제로 보는 행동 사이에는 작은 차이가 생기기 쉽습니다."
    ],
    contextB:[
      "결정을 앞둔 순간, 가까운 사람과 부딪힌 순간, 혼자 정리하는 순간을 나눠 보면 그 차이가 더 잘 보입니다.",
      "무엇을 먼저 확인하고 무엇을 뒤로 미루는지 살피면 단순한 성격표보다 실제 선택 방식을 이해하기 쉽습니다.",
      "특히 책임을 맡았을 때 나타나는 행동은 평소의 말보다 오래 반복되는 경향을 보여 줍니다.",
      "상황이 바뀌어도 끝까지 남는 기준이 무엇인지 보면 이 사람만의 중심을 찾기 쉬워집니다.",
      "잘하는 것만 보지 말고 피곤할 때 어떤 방식으로 무너지는지도 함께 봐야 균형이 맞습니다."
    ],
    practiceA:[
      "생활에서는 나를 한 단어로 정의하기보다 자주 반복되는 선택 세 가지를 적어 보는 편이 낫습니다.",
      "중요한 결정을 한 뒤에는 결과만 보지 말고 어떤 순서로 판단했는지도 함께 돌아보세요.",
      "주변의 평가가 엇갈릴 때는 누구 말이 맞는지보다 각자가 본 장면이 달랐는지부터 확인해 보세요.",
      "잘 풀린 날의 행동과 힘들었던 날의 행동을 나란히 놓아 보면 강점과 부담의 경계가 선명해집니다.",
      "익숙한 방식이 항상 정답이라고 생각하기보다 상황에 따라 바꿀 수 있는 선택지를 하나 남겨 두는 편이 좋습니다."
    ],
    practiceB:[
      "이렇게 보면 장점을 억지로 키우기보다 과해지는 순간만 조절해도 생활이 훨씬 편해질 수 있습니다.",
      "내 기준을 분명히 하되 모든 사람이 같은 속도로 움직이지 않는다는 점을 받아들이면, 관계에서도 일에서도 훨씬 여유가 생깁니다.",
      "성향을 고치려 하기보다 잘 쓰이는 조건을 늘리고 부담이 되는 조건을 줄이는 쪽이 오래 갑니다.",
      "나를 이해하는 목적은 이름표를 붙이는 데 있지 않고 다음 선택을 조금 더 편하게 만드는 데 있습니다.",
      "결국 중요한 것은 같은 특징을 언제 밀어붙이고 언제 한 걸음 늦출지 구분하는 감각입니다."
    ]
  },
  WORK:{
    contextA:[
      "일에서는 능력 자체보다 일을 맡는 순간부터 끝내는 순간까지 어떤 순서로 움직이는지가 더 크게 드러납니다.",
      "직장과 사업은 같은 사람에게도 전혀 다른 책임 구조를 요구하므로 편한 방식과 힘든 방식을 나눠 볼 필요가 있습니다.",
      "일이 많아질수록 실력보다 무엇부터 할지, 내가 어디까지 결정할 수 있는지, 언제까지 끝내야 하는지가 분명한 게 더 중요해요.",
      "혼자 잘하는 것과 팀 안에서 결과를 만드는 것은 다른 능력이라 각각의 장면을 따로 보는 편이 좋습니다.",
      "배우는 방식까지 살펴보면 새로운 일을 맡았을 때 적응 속도와 막히는 지점을 더 구체적으로 알 수 있습니다."
    ],
    contextB:[
      "무엇을 직접 끝내야 마음이 놓이는지와 어디까지 맡길 수 있는지를 보면 책임감이 강점으로 쓰이는 조건이 보입니다.",
      "지시가 분명한 환경과 자율성이 큰 환경에서 반응이 어떻게 달라지는지 비교하면 맞는 일의 구조가 선명해집니다.",
      "회의, 검수, 일정 조정, 사람을 설득하는 장면에서 각각 어떤 역할을 자연스럽게 맡는지도 중요한 단서가 됩니다.",
      "빠르게 시작하는 능력보다 중간에 기준을 잃지 않고 끝까지 가져가는 방식이 장기적인 성과를 좌우할 수 있습니다.",
      "잘 모르는 일을 배울 때 질문부터 하는지, 혼자 구조를 잡은 뒤 묻는지에 따라 협업 방식도 달라집니다."
    ],
    practiceA:[
      "일을 시작할 때 완료 기준과 중간 확인 시점을 먼저 정하면 불필요한 재확인을 크게 줄일 수 있습니다.",
      "내가 꼭 해야 하는 일과 다른 사람이 해도 되는 일을 처음부터 나누면 책임감이 병목으로 바뀌는 것을 막을 수 있습니다.",
      "업무가 몰릴 때는 중요도보다 되돌리기 어려운 일부터 구분하면 판단이 훨씬 단순해집니다.",
      "새 역할을 맡았을 때는 잘할 수 있는 것만 말하지 말고 필요한 권한과 도움도 같이 확인해 두는 편이 좋습니다.",
      "배우는 과정에서는 이해한 내용을 짧게 다시 설명해 보는 습관이 실제 적용 속도를 높이는 데 도움이 됩니다."
    ],
    practiceB:[
      "좋은 성과를 오래 유지하려면 모든 결과를 직접 확인하는 방식보다 확인할 기준을 공유하는 방식이 더 효율적입니다.",
      "일의 크기가 커질수록 개인의 꼼꼼함보다 역할을 나누는 구조가 중요해지므로 맡기는 연습도 실력의 일부가 됩니다.",
      "자율성이 필요한 사람이라면 자유만 요구하기보다 책임 범위와 결과 기준을 함께 제시할 때 신뢰를 얻기 쉽습니다.",
      "반복되는 업무에서 피로가 커진다면 능력 부족보다 맞지 않는 책임 배분이 원인인지 먼저 살펴볼 필요가 있습니다.",
      "직업 선택에서도 이름이나 이미지보다 하루 대부분을 어떤 방식으로 보내는지 확인하는 편이 실제 만족도와 더 가깝습니다."
    ]
  },
  WEALTH:{
    contextA:[
      "돈 문제는 많이 버는가보다 어떤 순간에 지갑을 열고 어떤 순간에 멈추는지를 보는 편이 실제 생활과 가깝습니다.",
      "수입, 소비, 저축, 투자, 사람과 얽힌 돈은 같은 기준으로 움직이지 않으므로 서로 나눠 살펴볼 필요가 있습니다.",
      "금액이 커질수록 감정과 판단이 섞이기 쉬워 평소의 소비 습관과 중요한 계약에서의 행동을 따로 봐야 합니다.",
      "돈을 지키는 힘과 기회를 잡는 힘은 반대처럼 보이지만 실제로는 멈출 기준이 분명할수록 함께 쓰기 쉽습니다.",
      "재물 흐름은 한 번의 큰 선택보다 반복되는 작은 결정이 쌓이면서 생활의 안정감에 더 크게 영향을 줍니다."
    ],
    contextB:[
      "무엇을 위해 쓰는 돈인지 목적이 분명하면 같은 지출도 후회가 적고 관리 기준을 유지하기 쉬워집니다.",
      "좋은 기회를 놓칠까 불안할 때와 손해가 두려울 때의 반응을 비교하면 돈 앞에서 흔들리는 지점을 찾기 쉽습니다.",
      "가까운 사람과 돈이 얽히면 호의, 책임, 계약의 경계가 흐려질 수 있어 평소보다 더 구체적인 기준이 필요합니다.",
      "돈을 모으는 것만큼 예상 밖의 지출이 생겼을 때 어떻게 복구하는지도 장기적인 관리 습관을 보여 줍니다.",
      "이미 내린 결정을 되돌아보기 어려운 성향이 있다면 큰 금액일수록 검토 시간을 미리 정해 두는 편이 안전합니다."
    ],
    practiceA:[
      "큰돈이 움직이는 선택은 목적, 기간, 손실을 멈출 기준을 먼저 적은 뒤 결정하는 편이 좋습니다.",
      "소비를 줄이는 것보다 꼭 쓰고 싶은 항목과 미뤄도 되는 항목을 구분하면 관리가 오래 유지됩니다.",
      "사람과 돈이 함께 얽히는 일은 친밀도와 별개로 금액, 역할, 종료 조건을 기록해 두는 편이 편합니다.",
      "기회가 많아 보일수록 모두 잡으려 하지 말고 지금 생활에서 감당할 수 있는 범위를 먼저 정해 두세요.",
      "한 달의 결과만 보고 잘했다거나 못했다고 평가하지 말고 반복되는 지출 이유를 몇 달 단위로 살펴보는 편이 낫습니다."
    ],
    practiceB:[
      "돈을 잘 다룬다는 것은 항상 아끼는 것이 아니라 필요한 곳에는 쓰고 멈춰야 할 곳에서는 멈출 수 있다는 뜻에 가깝습니다.",
      "관리 기준이 단순할수록 감정이 흔들리는 순간에도 원래 계획으로 돌아오기 쉬워집니다.",
      "손실을 피하려는 마음이 너무 커지면 성장 기회까지 막힐 수 있으므로 위험을 없애기보다 감당할 범위를 정하는 편이 현실적입니다.",
      "반대로 자신감이 커질수록 확인 절차를 줄이고 싶어질 수 있으니 큰 선택일수록 평소의 검토 순서를 유지하는 것이 좋습니다.",
      "재물 계획은 미래를 맞히는 일이 아니라 현재의 선택이 생활에 어떤 부담을 남기는지 점검하는 과정으로 보는 편이 맞습니다."
    ]
  },
  RELATIONSHIP:{
    contextA:[
      "관계에서는 마음의 크기보다 가까워지는 속도와 불편함을 말하는 시점이 더 큰 차이를 만들 수 있습니다.",
      "처음 만났을 때의 태도와 오래 가까워진 뒤의 행동이 다를 수 있으므로 관계의 시간을 나눠 보는 편이 좋습니다.",
      "좋아하는 마음을 말로 표현하는 사람도 있고 약속을 지키고 챙기는 행동으로 보여 주는 사람도 있습니다.",
      "다툼이 생겼을 때 바로 말하는 사람인지, 혼자 생각할 시간이 필요한 사람인지에 따라 같은 일도 훨씬 다르게 느껴질 수 있어요.",
      "가까운 사람일수록 기대가 커지기 쉬워 배려와 책임의 경계를 분명히 하는 일이 중요해집니다."
    ],
    contextB:[
      "상대가 알아서 이해해 주기를 기다리는 시간이 길어질수록 실제 마음과 겉으로 보이는 태도 사이의 거리가 커질 수 있습니다.",
      "평소에는 잘 넘기는 일도 신뢰와 약속에 관련된 문제에서는 기준이 더 엄격해질 수 있습니다.",
      "도움을 주는 행동이 애정 표현이 되기 쉬운 사람은 상대의 몫까지 대신하지 않는 선을 함께 정할 필요가 있습니다.",
      "관계가 편해질수록 설명을 줄이기 쉬운데 오히려 가까운 사이일수록 작은 기준을 말로 확인하는 편이 오해를 줄입니다.",
      "서로 다른 속도를 존중하면서도 중요한 문제를 계속 미루지 않는 균형이 오래가는 관계에서 중요합니다."
    ],
    practiceA:[
      "불편함이 생겼을 때 감정을 완벽히 정리할 때까지 기다리기보다 지금 필요한 한 문장만 먼저 꺼내 보세요.",
      "상대에게 바라는 행동이 있다면 서운함으로 표현하기 전에 구체적인 부탁으로 바꾸어 말하는 편이 좋습니다.",
      "도와주기 전에 상대가 직접 해야 할 몫이 무엇인지 확인하면 애정과 부담을 구분하기 쉬워집니다.",
      "갈등이 생기면 누가 맞는지부터 정하기보다 서로 어떤 장면을 다르게 봤는지 먼저 맞춰 보세요.",
      "관계가 깊어질수록 함께하는 시간만큼 각자 혼자 정리할 시간도 남겨 두는 편이 안정적입니다."
    ],
    practiceB:[
      "마음을 오래 참는 것이 관계를 지키는 방법처럼 보여도 설명이 늦어지면 상대는 거리감으로 받아들일 수 있습니다.",
      "기준이 분명한 사람은 신뢰를 오래 지키는 장점이 있지만 상대가 같은 기준을 알고 있는지 확인하는 과정이 필요합니다.",
      "애정은 책임을 대신 짊어지는 일과 같지 않으므로 서로의 선택권을 남겨 두는 것이 오히려 관계를 오래 편하게 만듭니다.",
      "좋은 관계는 갈등이 없는 상태보다 갈등이 생겼을 때 다시 대화로 돌아오는 방법을 알고 있는 상태에 가깝습니다.",
      "현재 관계 상태가 어떻든 중요한 것은 상대를 예측하는 것보다 내가 어떤 방식으로 가까워지고 멀어지는지 이해하는 일입니다."
    ]
  },
  WELLNESS:{
    contextA:[
      "몸과 생활을 볼 때는 특별한 징후를 찾기보다 평소 무리하는 순서와 회복하는 방식을 먼저 살펴보는 편이 좋습니다.",
      "일이 많을 때 수면, 식사, 움직임 가운데 무엇부터 무너지는지 보면 생활 리듬의 약한 고리를 찾기 쉽습니다.",
      "겉으로 버틸 수 있는 힘과 실제로 회복되는 속도는 다를 수 있어 쉬는 방식까지 함께 보는 것이 중요합니다.",
      "생활 습관은 한 번 크게 바꾸는 것보다 반복 가능한 작은 기준을 오래 유지할 때 더 안정적으로 자리 잡습니다.",
      "몸의 느낌을 무시하고 일정만 따라가면 피로가 쌓여도 늦게 알아차릴 수 있으므로 중간 점검이 필요합니다."
    ],
    contextB:[
      "바쁜 날과 쉬는 날의 차이가 지나치게 크면 회복보다 버티기와 몰아서 쉬기가 반복될 수 있습니다.",
      "잠을 줄여 일을 끝내는 방식이 자주 반복되는지, 식사를 미루는 습관이 있는지처럼 구체적인 생활 장면을 보는 편이 낫습니다.",
      "몸 상태를 성격 문제로 여기지 말고 일정과 책임 배분을 조절해야 한다는 신호로 받아들이면 대응이 쉬워집니다.",
      "생활 리듬이 흔들릴 때 가장 먼저 지킬 한 가지를 정해 두면 모든 습관을 한꺼번에 바꾸려는 부담을 줄일 수 있습니다.",
      "회복 시간을 계획에 넣지 않으면 쉬는 일이 늘 마지막 순서로 밀릴 수 있다는 점을 기억할 필요가 있습니다."
    ],
    practiceA:[
      "하루 계획에는 할 일뿐 아니라 멈출 시간과 식사 시간을 함께 적어 두는 편이 좋습니다.",
      "피곤한 날에는 평소 기준을 모두 지키려 하지 말고 반드시 유지할 습관 하나만 남겨 보세요.",
      "일정이 몰릴수록 잠을 먼저 줄이기보다 다음 날까지 미뤄도 되는 일을 구분해 두는 편이 낫습니다.",
      "휴식도 일이 끝난 뒤 받는 보상으로 두기보다 다음 일을 계속하기 위한 준비 시간으로 보는 편이 현실적입니다.",
      "생활 기록은 완벽하게 하지 말고 수면, 식사, 피로도처럼 자주 흔들리는 항목 두세 가지만 간단히 확인해 보세요."
    ],
    practiceB:[
      "이 내용은 질병이나 치료를 판단하는 것이 아니라 생활의 균형을 돌아보기 위한 참고 기준입니다.",
      "불편한 증상이 있거나 건강이 걱정될 때는 사주 해설보다 의료 전문가의 평가를 우선해야 합니다.",
      "생활 리듬을 조정할 때는 극단적인 계획보다 지금 일정에서 실제로 지킬 수 있는 수준을 고르는 편이 오래 갑니다.",
      "회복이 느린 시기에는 의지로 버티는 것보다 책임과 일정을 줄이는 선택도 필요할 수 있습니다.",
      "몸을 관리한다는 말은 통제하는 일이 아니라 신호를 알아차리고 필요한 도움을 받는 것까지 포함합니다."
    ]
  },
  SAMJAE:{
    contextA:[
      "삼재는 이름만으로 사건을 정하는 표가 아니라 변화가 겹칠 수 있는 시기를 점검하는 오래된 시간 틀로 보는 편이 안전합니다.",
      "같은 삼재 기간이어도 그때 어떤 일을 하고 있고 어떤 십 년을 지나고 있는지에 따라 느끼는 분위기는 크게 달라질 수 있어요.",
      "변화가 많다는 것과 결과가 나쁘다는 것은 같은 뜻이 아니므로 두 가지를 끝까지 따로 봐야 합니다.",
      "삼재를 겁내기보다 이동, 계약, 역할 변화처럼 되돌리기 어려운 선택이 겹치는지 확인하는 데 쓰는 편이 현실적입니다.",
      "들어오는 해, 머무는 해, 정리되는 해를 나누는 이유도 사건을 맞히기보다 변화의 단계가 다를 수 있음을 보기 위해서입니다."
    ],
    contextB:[
      "평소보다 일이 많아질 때는 기회와 부담이 동시에 커질 수 있으므로 한쪽만 보고 판단하지 않는 것이 중요합니다.",
      "이름이 무섭다는 이유로 필요한 선택을 모두 미루면 오히려 실제 생활의 기회를 놓칠 수 있습니다.",
      "반대로 변화가 시작됐다는 이유로 모든 것을 한꺼번에 바꾸는 것도 부담을 키울 수 있어 순서를 정하는 편이 좋습니다.",
      "원래 사주의 관계와 당시 환경을 함께 보면 무엇을 더 확인해야 하는지 정도는 구체적으로 정할 수 있습니다.",
      "과거 삼재를 돌아볼 때도 좋았는지 나빴는지보다 어떤 변화가 있었고 어떻게 대응했는지를 살펴보는 편이 도움이 됩니다."
    ],
    practiceA:[
      "큰 계약이나 이동이 있다면 평소보다 확인 항목을 하나 더 늘리는 정도로 현실적인 대비를 해보세요.",
      "변화가 겹치는 시기에는 새로 시작할 일과 먼저 정리할 일을 따로 적어 두면 부담을 줄일 수 있습니다.",
      "불안해서 결정을 미루고 있다면 실제 위험과 이름 때문에 생긴 걱정을 구분해 보는 편이 좋습니다.",
      "주변의 삼재 이야기를 그대로 적용하기보다 지금 내 생활에서 바뀌는 역할이 무엇인지부터 확인해 보세요.",
      "지나온 시기를 돌아볼 때 당시 잘 대응했던 방법을 찾아 두면 다음 변화에도 활용할 수 있습니다."
    ],
    practiceB:[
      "삼재는 멈추라는 명령보다 평소보다 한 번 더 확인하라는 신호로 쓰는 편이 적절합니다.",
      "변화의 크기가 커도 준비가 되어 있다면 새로운 선택을 시작하는 계기가 될 수 있습니다.",
      "유리함과 변화량을 따로 보면 불필요한 공포를 줄이고 실제 행동 기준을 만들기 쉬워집니다.",
      "시기 이름보다 현실의 계약 조건, 건강 상태, 가족 상황 같은 구체적인 정보를 더 우선해야 합니다.",
      "결국 중요한 것은 삼재 자체를 피하는 일이 아니라 변화가 왔을 때 선택권을 남겨 두는 방식입니다."
    ]
  },
  CHILDREN:{
    contextA:[
      "자녀운은 아이의 존재 여부를 단정하는 말보다, 돌봄과 가족 역할이 생겼을 때 어떤 태도가 먼저 나오는지를 보는 쪽이 더 정확해요.",
      "가족 안에서는 사랑하는 마음과 책임지는 방식이 같이 움직여요. 챙겨주는 힘이 큰 사람일수록 상대가 직접 해볼 몫도 남겨두는 게 필요해요.",
      "아이와의 관계는 잘해주는 양보다 기다려주는 힘에서 차이가 생기기 쉬워요. 바로 해결해주는 것과 성장할 시간을 주는 건 다른 일이에요.",
      "가족 일이 많아질수록 누구 하나의 희생으로 버티는 구조는 오래가기 어려워요. 역할을 나누는 게 관계를 지키는 방법이 됩니다.",
      "자녀와 가족운은 한 번의 사건보다 오랜 시간 반복되는 돌봄의 리듬으로 보는 편이 좋아요."
    ],
    contextB:[
      "기준이 분명한 사람은 가족에게 안정감을 줄 수 있지만, 그 기준을 설명하지 않으면 통제처럼 느껴질 수 있어요.",
      "걱정이 커질수록 상대가 실수하기 전에 먼저 막아주고 싶어질 수 있어요. 하지만 안전한 범위라면 직접 해볼 시간을 주는 게 더 오래 남아요.",
      "가족을 잘 챙기는 것과 모든 책임을 혼자 떠안는 건 달라요. 내가 꼭 해야 하는 일과 함께 정할 일을 나누는 게 필요해요.",
      "아이를 대할 때는 결과보다 과정을 기다려주는 힘이 중요해요. 잘못한 순간마다 바로 정답을 주면 스스로 판단할 기회를 놓칠 수 있어요.",
      "가족 안에서 생기는 피로는 사랑이 부족해서가 아니라 역할이 한쪽으로 몰릴 때 커지는 경우가 많아요."
    ],
    practiceA:[
      "가족 일은 내가 꼭 할 일, 함께 정할 일, 상대에게 맡길 일로 나눠두면 훨씬 덜 지쳐요.",
      "걱정되는 일이 생겼을 때 바로 대신 해결하기보다 어떤 도움이 필요한지 먼저 물어보는 게 좋아요.",
      "규칙을 정할 때는 지켜야 하는 이유까지 같이 말해주면 갈등이 줄어요.",
      "돌봄이 많아지는 시기에는 쉬는 시간도 역할처럼 미리 확보해두는 게 좋아요.",
      "잘해주고 싶은 마음이 커질수록 상대가 직접 선택할 여지를 하나는 남겨두세요."
    ],
    practiceB:[
      "가족운을 잘 쓴다는 건 모든 일을 완벽하게 해내는 게 아니라 오래 버틸 수 있는 구조를 만드는 데 가까워요.",
      "상대가 내 기준과 다르게 움직여도 위험하지 않다면 한번 경험하게 두는 편이 관계를 더 편하게 만들어요.",
      "도움이 필요한 순간과 간섭이 되는 순간을 구분하면 챙김이 훨씬 따뜻하게 전달돼요.",
      "가족 안에서 내가 늘 해결하는 사람이 되지 않도록 작은 일부터 나누는 연습이 필요해요.",
      "좋은 가족 관계는 누가 더 많이 희생했는지가 아니라 서로 책임을 나눌 수 있는지에서 오래 갑니다."
    ]
  },
  YEARLY:{
    contextA:[
      "한 해의 운은 좋다 나쁘다 한마디로 끝내기보다, 그해에 일이 많이 움직이는 분야와 비교적 안정적인 분야를 나눠 보는 게 더 정확해요.",
      "같은 해라도 직업은 활발한데 돈은 정리할 일이 많을 수 있고, 관계는 또 다른 흐름을 보일 수 있어요.",
      "연운은 평생 성격을 바꾸는 게 아니라 원래 가진 성향 가운데 어떤 부분을 더 자주 쓰게 되는지를 보여줘요.",
      "기회가 늘어나는 해에는 좋은 일만 많아지는 게 아니라 선택해야 할 일이 함께 늘어날 수 있어요.",
      "변화가 큰 해에는 결과보다 먼저 생활 방식과 역할이 바뀌는 경우가 많아요."
    ],
    contextB:[
      "움직임이 많은 분야는 준비가 필요하고, 비교적 조용한 분야는 기존 방식을 유지하는 것만으로도 충분할 수 있어요.",
      "좋은 흐름이 들어와도 한꺼번에 너무 많은 일을 잡으면 오히려 집중력이 흩어질 수 있어요.",
      "부담이 있는 해에도 도움받을 조건이 같이 들어오면 혼자 버티는 방식만 고집할 필요는 없어요.",
      "그해의 분위기는 사건을 미리 맞히는 표가 아니라 어디에 힘을 더 쓸지 정하는 안내에 가까워요.",
      "한 해를 보낼 때는 시작 시점보다 무엇을 남기고 마무리할지가 더 중요해지는 경우도 많아요."
    ],
    practiceA:[
      "그해 가장 많이 움직이는 분야 하나를 먼저 정하고 준비할 것과 미뤄도 될 일을 나눠보세요.",
      "기회가 여러 개 들어오면 동시에 시작할 수 있는 수를 미리 정해두는 게 좋아요.",
      "돈과 일이 같이 바빠지는 해에는 수입보다 약속된 지출부터 먼저 확인해두세요.",
      "관계 일정이 많아지는 해에는 꼭 지킬 약속부터 먼저 잡아두는 편이 좋아요.",
      "한 달이 끝날 때 실제로 바뀐 일과 예상만 했던 일을 나눠보면 다음 선택이 훨씬 쉬워져요."
    ],
    practiceB:[
      "연운은 겁내는 도구보다 우선순위를 잡는 도구로 쓸 때 훨씬 유용해요.",
      "좋은 시기에도 모든 기회를 잡을 필요는 없어요. 끝까지 가져갈 수 있는 선택이 결국 더 크게 남아요.",
      "부담이 있는 시기에는 속도를 줄이는 것도 운을 잘 쓰는 방법이 될 수 있어요.",
      "같은 해라도 어느 달에 무엇을 시작하느냐에 따라 체감이 달라질 수 있으니 큰 선택은 흐름을 나눠 보는 게 좋아요.",
      "한 해의 운은 결과를 대신 정해주는 답이 아니라 준비할 곳과 힘을 뺄 곳을 알려주는 기준에 가까워요."
    ]
  },
  DAEUN:{
    contextA:[
      "대운은 약 십 년 동안 반복되는 큰 배경이에요. 사람 자체가 바뀐다기보다 같은 사람에게 요구되는 역할과 환경이 달라진다고 보면 이해하기 쉬워요.",
      "예전에는 잘 맞던 방식이 다음 대운에서는 답답하게 느껴질 수 있어요. 그건 능력이 떨어진 게 아니라 환경이 요구하는 방식이 달라졌기 때문일 수 있어요.",
      "대운이 바뀌는 시기에는 직업, 돈, 관계, 생활환경 가운데 한두 축이 같이 움직이는 경우가 많아요.",
      "같은 십 년 안에서도 앞부분은 적응하는 시간이 되고, 뒤로 갈수록 그 흐름을 실제 결과로 굳히는 시간이 될 수 있어요.",
      "대운은 한 번의 사건보다 오래 반복되는 선택의 방향을 보는 데 더 잘 맞아요."
    ],
    contextB:[
      "책임이 커지는 대운에는 직접 하는 일보다 관리하고 결정하는 일이 늘어날 수 있어요.",
      "배움이 강해지는 대운에는 준비가 길어질 수 있지만, 그 시간을 다음 단계의 기반으로 바꾸는 게 중요해요.",
      "돈의 흐름이 살아나는 대운이라도 확장만 하면 남는 것이 적을 수 있어요. 수익을 자산과 구조로 굳히는 과정이 필요해요.",
      "사람이 많이 들어오는 대운에는 인맥 수보다 누구와 어떤 역할로 연결되는지가 더 중요해요.",
      "다음 대운으로 넘어가기 전에는 새로 시작할 것보다 이제는 맞지 않는 방식을 줄이는 일이 먼저일 수 있어요."
    ],
    practiceA:[
      "현재 대운에서 계속 가져갈 강점 하나와 줄여야 할 습관 하나를 정해두면 다음 선택이 선명해져요.",
      "역할이 커질수록 직접 할 일과 관리할 일을 나눠두는 편이 좋아요.",
      "환경이 바뀌는데 예전 방식을 고집하고 있다면 무엇이 달라졌는지부터 적어보세요.",
      "십 년의 중간쯤에서는 처음 세운 목표보다 실제로 남은 결과를 한번 점검하는 게 좋아요.",
      "다음 대운이 가까워지면 유지할 것, 바꿀 것, 끝낼 것을 세 칸으로 정리해보세요."
    ],
    practiceB:[
      "대운이 좋다는 말은 아무것도 하지 않아도 일이 풀린다는 뜻이 아니에요. 그 시기에 맞는 역할을 선택할 때 힘을 더 잘 쓸 수 있다는 뜻에 가까워요.",
      "부담이 큰 대운도 권한과 경험이 함께 커지는 시기라면 성장의 시간이 될 수 있어요.",
      "이전 대운에서 쌓은 경험은 버려지는 게 아니라 다음 대운에서 다른 방식으로 쓰이는 자산이 돼요.",
      "십 년 흐름을 한 문장으로만 좋다 나쁘다 정하기보다 직업·재물·관계를 나눠 보는 게 훨씬 정확해요.",
      "대운을 잘 쓰는 핵심은 미래를 기다리는 게 아니라 지금 시기에 맞는 선택을 하는 데 있어요."
    ]
  },
  NOBLE:{
    contextA:[
      "귀인운은 누군가가 모든 문제를 해결해준다는 뜻보다, 필요한 순간에 맞는 사람과 연결될 가능성을 보는 쪽에 가까워요.",
      "도움을 많이 받는 사람보다 필요한 때에 정확히 도움을 요청할 줄 아는 사람이 귀인운을 더 잘 쓰는 경우가 많아요.",
      "귀인은 친한 사람으로만 들어오지 않아요. 일, 거래, 배움, 소개처럼 목적이 있는 관계에서 더 분명하게 나타날 수 있어요.",
      "좋은 인연은 처음부터 특별하게 느껴지기보다 시간이 지나며 선택의 폭을 넓혀주는 경우도 많아요.",
      "귀인운은 사람 수보다 연결의 질이 더 중요해요. 누구와 왜 만나는지가 분명할수록 실제 도움이 오래 남아요."
    ],
    contextB:[
      "혼자 해결하려는 힘이 강하면 이미 옆에 있는 도움도 늦게 쓰게 될 수 있어요.",
      "누군가가 좋은 사람이라는 것과 나에게 실제로 도움이 되는 관계라는 것은 조금 다른 문제예요.",
      "배움으로 만난 인연은 바로 돈이 되지 않아도 이후의 선택과 기회를 크게 넓혀줄 수 있어요.",
      "도움을 받을수록 내가 책임질 몫까지 분명히 해야 관계가 오래 편하게 갑니다.",
      "뜻밖의 제안을 받았을 때는 사람에 대한 호감과 실제 조건을 따로 보는 게 좋아요."
    ],
    practiceA:[
      "도움을 청할 때는 필요한 것과 내가 직접 할 일을 한 문장씩 나눠 말해보세요.",
      "소개받은 사람에게 기대부터 하기보다 서로 어떤 일을 할 수 있는지 먼저 확인해보세요.",
      "배운 내용은 작은 일 하나에 바로 적용해보면 귀인 인연이 실제 결과로 연결되기 쉬워요.",
      "일로 만난 사람과는 일정과 책임을 초반에 맞춰두는 편이 좋아요.",
      "새 제안을 받으면 좋은 사람인지보다 역할과 조건이 맞는지부터 확인해보세요."
    ],
    practiceB:[
      "귀인을 기다리는 것보다 도움을 받을 준비가 되어 있는지가 더 중요할 때가 많아요.",
      "좋은 인연은 의존하게 만드는 사람이 아니라 선택권을 넓혀주는 사람에 가까워요.",
      "도움을 받는다고 내 기준을 내려놓을 필요는 없어요. 오히려 기준이 분명할수록 관계가 오래 갑니다.",
      "귀인운이 강한 시기에는 새로운 사람을 많이 만나는 것보다 필요한 연결을 놓치지 않는 게 더 중요해요.",
      "사람에게 기대는 것과 관계를 활용하는 건 달라요. 서로의 역할이 분명할 때 귀인운이 가장 편하게 작동해요."
    ]
  },
  ROLES:{
    contextA:[
      "십성과 십이운성은 사람을 여러 조각으로 나누는 표가 아니라, 상황마다 어떤 역할과 에너지가 먼저 나오는지를 보는 도구예요.",
      "일할 때 앞에 나오는 성향과 가까운 사람 앞에서 나오는 성향이 다를 수 있는 이유도 역할이 달라지기 때문이에요.",
      "어떤 역할이 강하다고 해서 그 역할만 평생 쓰는 건 아니에요. 환경에 따라 앞에 나오는 힘이 달라집니다.",
      "배우는 힘, 표현하는 힘, 돈을 다루는 힘, 책임지는 힘은 서로 따로 움직이기도 하고 한 장면에서 같이 작동하기도 해요.",
      "십성은 좋고 나쁨보다 어떤 역할을 많이 쓰고 어떤 역할은 의식적으로 키워야 하는지를 보는 데 더 유용해요."
    ],
    contextB:[
      "여러 역할이 동시에 강하게 나오면 주변에서는 다재다능하게 보이지만 본인은 해야 할 일이 많다고 느낄 수 있어요.",
      "배우는 힘이 강한 사람은 준비가 깊어질 수 있고, 표현하는 힘이 강한 사람은 결과를 빨리 밖으로 꺼내는 쪽에 가까워요.",
      "돈을 다루는 역할과 책임지는 역할이 같이 움직이면 결과와 기준을 동시에 챙기려는 모습이 강해질 수 있어요.",
      "겉으로 드러난 역할과 속에 숨은 역할이 다르면 다른 사람이 보는 나와 내가 느끼는 내가 다르게 느껴질 수 있어요.",
      "십이운성은 이름이 강하거나 약해 보여도 실제로는 각 자리에서 힘을 쓰는 방식이 다르다는 뜻으로 보는 게 좋아요."
    ],
    practiceA:[
      "지금 가장 많이 맡고 있는 역할 하나를 정하고 그 역할 때문에 놓치고 있는 부분이 있는지 살펴보세요.",
      "배움만 길어지고 있다면 작은 결과물을 하나 만들고, 실행만 앞서고 있다면 확인 시간을 한번 두는 식으로 균형을 잡아보세요.",
      "사람마다 나에게 기대하는 역할이 다르다면 모두 맞추려 하기보다 내가 오래 할 수 있는 역할을 먼저 정해두세요.",
      "겉으로 잘하는 역할과 속으로 편한 역할이 다를 때는 두 가지를 모두 쓸 수 있는 환경을 찾는 게 좋아요.",
      "여러 역할이 겹치는 시기에는 지금 가장 중요한 역할 하나만 먼저 끝내는 편이 좋아요."
    ],
    practiceB:[
      "십성은 성격검사처럼 나를 고정하는 표가 아니라 상황을 읽는 언어에 가까워요.",
      "어떤 역할이 부족하다고 해서 능력이 없다는 뜻은 아니에요. 필요할 때 의식적으로 쓰는 연습이 필요한 경우가 많아요.",
      "강한 역할은 장점이지만 과하게 쓰면 피로가 될 수 있어요. 잘하는 힘일수록 쉬는 지점을 같이 정해두는 게 좋아요.",
      "역할이 달라졌을 때 예전 모습과 다르다고 이상한 게 아니에요. 환경에 맞춰 다른 힘이 앞에 나온 것뿐이에요.",
      "십성과 십이운성을 함께 보면 무엇을 잘하는지보다 언제 어떤 힘을 쓰는지가 더 선명해집니다."
    ]
  },
  GENERAL:{
    contextA:[
      "사주 해설은 용어를 많이 아는 것보다 서로 다른 계산값이 한 사람 안에서 어떻게 연결되는지를 읽는 데 의미가 있어요.",
      "한 가지 값만 보면 단순해 보이지만 원국 전체를 같이 보면 같은 특징도 전혀 다른 방향으로 작동할 수 있어요.",
      "사주에서 중요한 건 하나의 단어보다 여러 근거가 같은 방향을 가리키는지 확인하는 일이에요.",
      "좋은 특징도 너무 과하면 부담이 되고, 약한 특징도 필요한 시기에 잘 쓰면 강점이 될 수 있어요.",
      "계산값은 결론을 대신하는 답이 아니라 왜 이런 모습이 반복되는지 설명해주는 근거에 가까워요."
    ],
    contextB:[
      "그래서 한 장만 따로 떼어 읽기보다 앞뒤 내용을 이어서 볼 때 훨씬 정확한 그림이 나와요.",
      "같은 사람도 일, 돈, 관계에서는 다른 선택을 할 수 있기 때문에 분야를 나눠 보는 이유가 있어요.",
      "전문용어 자체보다 그 말이 실제 생활에서 어떤 선택으로 이어지는지를 아는 게 훨씬 중요해요.",
      "한 가지 특징을 좋다 나쁘다 정하기보다 어디에서 강점이 되고 어디에서 부담이 되는지를 같이 보는 게 좋아요.",
      "사주 전체의 방향은 여러 장에서 반복해서 같은 결론이 나올 때 더 분명해집니다."
    ],
    practiceA:[
      "읽다가 특히 잘 맞는 부분이 있다면 그 문장이 어떤 장면에서 반복됐는지 떠올려보세요.",
      "한 문장만 기억하기보다 성격·일·돈·관계에서 공통으로 남는 특징을 찾아보는 게 좋아요.",
      "잘 맞지 않는 문장은 억지로 끼워 맞추기보다 어떤 근거에서 나온 말인지 뒤의 설명과 같이 보세요.",
      "사주에서 말한 강점은 실제 생활에서 써본 경험이 있을 때 가장 의미가 커져요.",
      "앞에서 나온 설명과 뒤의 운 흐름이 어떻게 이어지는지 연결해서 읽어보세요."
    ],
    practiceB:[
      "결국 좋은 해설은 무서운 말을 많이 하는 해설이 아니라 내 선택을 이해하기 쉽게 만드는 해설에 가까워요.",
      "사주를 읽는 목적은 사람을 고정하는 게 아니라 반복되는 선택을 알아차리는 데 있어요.",
      "계산값이 같아도 현실의 환경과 선택에 따라 결과는 달라질 수 있어요.",
      "사주가 말해주는 방향과 실제 상황을 같이 볼 때 가장 현실적인 판단이 됩니다.",
      "이 책에서는 어려운 말을 외우기보다 내 삶에서 반복되는 흐름을 찾는 데 집중하면 충분해요."
    ]
  },
  SYNTHESIS:{
    contextA:[
      "마지막에는 앞의 내용을 다시 나열하기보다 여러 분야에서 공통으로 반복된 선택 원칙만 남기는 편이 좋습니다.",
      "일, 돈, 관계가 서로 달라 보여도 결정을 내리는 순서와 책임을 다루는 방식에는 같은 축이 나타날 수 있습니다.",
      "강점은 모든 상황에서 똑같이 쓰이는 것이 아니라 환경에 따라 다른 모습으로 바뀌어 나타납니다.",
      "앞에서 나온 조언 가운데 서로 겹치는 부분을 줄이면 실제 생활에서 기억해야 할 기준이 훨씬 단순해집니다.",
      "평생 흐름을 한 문장으로 정리하려 하기보다 앞으로 선택할 때 반복해서 확인할 질문을 남기는 편이 현실적입니다."
    ],
    contextB:[
      "충분히 확인한 뒤 움직이는 힘은 안정감을 주지만 모든 책임을 혼자 가져오면 같은 장점이 피로로 바뀔 수 있습니다.",
      "사람과 일을 오래 지키는 힘이 있다면 다음 단계에서는 무엇을 맡지 않을지도 함께 정할 필요가 있습니다.",
      "기준을 세우는 능력은 돈과 일에서는 장점이 되지만 관계에서는 설명이 늦어지지 않도록 말의 시점을 조절해야 합니다.",
      "변화가 큰 시기에도 자신에게 익숙한 강점을 그대로 쓰기보다 새 역할에 맞게 사용법을 바꾸는 편이 좋습니다.",
      "결국 여러 조언은 확인할 것, 결정할 것, 맡길 것을 나누는 세 가지 질문으로 다시 정리할 수 있습니다."
    ],
    practiceA:[
      "큰 선택을 앞두면 지금 꼭 확인할 것 두 가지와 더 보지 않아도 될 것 한 가지를 적어 보세요.",
      "책임이 커질수록 내가 끝까지 볼 일과 다른 사람에게 맡길 일을 먼저 나눠 두는 편이 좋습니다.",
      "관계에서는 결론보다 설명 시점을 놓치지 않는 것을 하나의 생활 기준으로 두어 보세요.",
      "돈과 일에서는 시작 기준만큼 멈출 기준도 미리 정해 두면 흔들림을 줄일 수 있습니다.",
      "생활 리듬이 무너질 때는 모든 것을 고치려 하지 말고 가장 먼저 회복할 한 가지부터 선택해 보세요."
    ],
    practiceB:[
      "이 기준들은 미래를 대신 결정해 주는 답이 아니라 이미 가진 강점을 덜 지치게 쓰기 위한 참고선입니다.",
      "환경이 달라지면 같은 사람도 다른 선택을 할 수 있으므로 해설보다 현재의 현실 조건을 항상 우선해야 합니다.",
      "잘 맞는 부분은 생활에서 시험해 보고 맞지 않는 부분은 억지로 자신에게 끼워 맞추지 않아도 됩니다.",
      "앞으로의 흐름도 이미 정해진 사건처럼 볼 필요는 없어요. 어떤 선택을 하고 얼마나 준비하느냐에 따라 실제 느낌은 달라질 수 있습니다.",
      "결국 사주책의 목적은 사람을 고정하는 것이 아니라 다음 선택을 조금 더 이해하기 쉽게 만드는 데 있습니다."
    ]
  }
};

function chapterDepthExpansion(row:Row,index:number){
  const domain=domainOf(row.evidenceGroup??""),bank=DEPTH_BANKS[domain];if(!bank)return[] as string[];
  const seed=Array.from(row.id).reduce((total,character,offset)=>total+character.charCodeAt(0)*(offset+3),index+11);
  const a=seed%bank.contextA.length,b=Math.floor(seed/bank.contextA.length)%bank.contextB.length;
  const c=Math.floor(seed/7)%bank.practiceA.length,d=Math.floor(seed/11)%bank.practiceB.length;
  return[
    `${bank.contextA[a]} ${bank.contextB[b]}`,
    `${bank.practiceA[c]} ${bank.practiceB[d]}`
  ];
}

function coreChapterExpansion(row:Row){
  const byId:Record<string,string[]>={
    "legacy-book-007":[
      "이 사주는 생각 없이 바로 움직이는 타입은 아니에요. 먼저 상황을 파악하고 자기 기준이 서면 그때부터 움직임이 빨라집니다.",
      "한번 맡은 일은 중간에 흐리게 두기보다 끝을 보려는 힘이 강하고, 사람을 대할 때도 처음부터 쉽게 속을 보이기보다 시간을 두고 신뢰를 쌓습니다.",
      "겉으로는 차분해 보여도 속에서는 기준이 분명한 편이라, 무엇을 받아들이고 무엇을 거절할지가 생각보다 또렷합니다."
    ],
    "legacy-book-008":[
      "한마디로 말하면, 신중하게 판단하고 결정한 뒤에는 꾸준히 밀고 가는 사람이에요.",
      "생각이 너무 길어지지만 않으면, 신중함과 끈기가 가장 큰 장점으로 작용합니다."
    ],
    "legacy-book-009":[
      "이 사람 안에는 한 가지 모습만 있는 게 아닙니다. 낯선 사람 앞에서는 먼저 분위기를 읽고, 일을 할 때는 책임과 기준이 앞에 서며, 가까운 사람 앞에서는 감정과 신뢰가 훨씬 솔직하게 드러납니다.",
      "서로 다른 사람처럼 보이는 순간도 있지만 사실은 같은 사람이 자리마다 다른 힘을 꺼내 쓰는 거예요. 그래서 이 사주는 한 단어로 성격을 정하기보다, 관계의 거리와 맡은 역할에 따라 어떤 모습이 앞에 나오는지를 함께 보는 편이 더 정확합니다."
    ],
    "legacy-book-010":[
      "처음 만난 사람 앞에서는 말을 많이 하기보다 상대의 말투와 태도를 먼저 봅니다. 바로 가까워지기보다 어떤 사람인지 파악한 뒤 자연스럽게 거리를 좁혀 갑니다.",
      "첫인상은 차분하고 신중한 쪽에 가깝습니다. 다만 분위기가 파악되고 편해지면 자기 생각을 분명하게 말하는 편입니다."
    ],
    "legacy-book-011":[
      "사회생활에서는 해야 할 일과 책임 범위가 분명할수록 강점이 잘 드러납니다. 일이 주어지면 순서를 잡고 끝까지 챙기는 쪽에 가깝습니다.",
      "반대로 기준 없이 일이 자주 바뀌거나 이유 없이 재촉받는 환경에서는 피로가 빨리 쌓입니다. 역할과 마감이 분명한 곳에서 훨씬 안정적으로 성과를 냅니다."
    ],
    "legacy-book-012":[
      "가까운 사람 앞에서는 밖에서보다 감정과 기준이 더 솔직하게 드러납니다. 믿음이 생긴 사람에게는 오래 챙기고 쉽게 관계를 끊지 않습니다.",
      "대신 서운함이 생겼을 때 바로 말하기보다 속으로 정리하는 시간이 길어질 수 있습니다. 가까운 사이일수록 마음에 걸린 일을 너무 오래 묵히지 않는 게 중요합니다."
    ],
    "legacy-book-013":[
      "혼자 있을 때는 지나간 일과 앞으로 할 일을 머릿속에서 다시 정리하는 시간이 많습니다. 겉으로 쉬고 있어도 머릿속에서는 다음 순서를 계속 생각하는 편입니다.",
      "이 성향은 계획을 세우는 데 강점이 되지만, 생각이 끊기지 않으면 쉬는 시간까지 긴장으로 바뀔 수 있습니다."
    ],
    "legacy-book-014":[
      "겉으로 바로 드러내지 않은 생각이 안쪽에 오래 남는 편입니다. 그 자리에서는 넘긴 일도 혼자 있을 때 다시 떠올리며 의미를 정리합니다.",
      "그래서 겉으로 보이는 반응보다 속에서 생각하는 양이 더 많을 수 있습니다. 말이 짧았다고 해서 생각까지 단순한 사람은 아닙니다."
    ],
    "legacy-book-022":[
      "일주는 사주에서 나 자신을 가장 가까이 보는 자리예요. 이 두 글자를 중심으로 기본 성향과 가까운 관계에서의 반응을 함께 읽습니다.",
      "한자 이름 자체를 외울 필요는 없어요. 아래에서는 이 일주가 실제 성격과 생활에서 어떻게 드러나는지를 쉬운 말로 풀어갑니다."
    ]
  };
  if(byId[row.id])return byId[row.id];

  const title=row.topic??row.title;
  if(row.evidenceGroup==="STRUCTURE_USEFUL"){
    if(title.includes("필요한 기운")||title.includes("삶의 틀"))return[
      "잘 풀릴 때는 이미 강한 부분만 더 밀기보다 부족한 쪽을 보완하는 선택이 중요합니다.",
      "생각은 충분한데 표현이 늦다면 더 고민하는 것보다 말이나 행동으로 꺼내는 쪽이 균형을 잡는 데 도움이 됩니다."
    ];
    return[
      "도움이 되는 기운은 많을수록 좋다는 뜻이 아니에요. 현재 사주에서 부족한 부분을 보완하는 역할에 가깝습니다.",
      "생활에서는 사람, 일, 휴식처럼 실제로 바꿀 수 있는 선택과 연결해서 보는 게 가장 이해하기 쉽습니다."
    ];
  }
  return[] as string[];
}

function coreIdentityConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const id=row.id.replace(/^legacy-/,""),title=row.topic??row.title,group=row.evidenceGroup??"",stem=stemStory(facts);
  const monthRole=facts.branchMainTenGodByPosition.month||facts.stemTenGodByPosition.month;
  const dayRole=facts.branchMainTenGodByPosition.day||facts.stemTenGodByPosition.day;
  const hourRole=facts.branchMainTenGodByPosition.hour||facts.stemTenGodByPosition.hour;
  const monthTone=tenGodTone(monthRole),dayTone=tenGodTone(dayRole),hourTone=tenGodTone(hourRole);
  const strongest=facts.strongest?.element,weakest=facts.weakest?.element;
  const strongStory=strongest?elementStory(strongest):null,weakStory=weakest?elementStory(weakest):null;

  if(id==="book-007")return[
    `사주의 중심부터 보면 ${facts.dayStemName||"나를 대표하는 기운"}이 자리합니다. ${stem.image}에 비유하는 기운으로, ${stem.core}이 기본 성향의 뼈대를 만듭니다.`,
    elementFact(facts)||"오행은 한쪽만 보고 판단하지 않고 다섯 기운의 강약을 함께 봅니다.",
    dominantFamilySentence(facts)||"십성에서는 한 가지 역할만 앞세우기보다 여러 역할이 어떻게 섞이는지를 함께 봅니다.",
    facts.structure?`타고난 흐름의 중심에는 ${structureMeaning(facts.structure)}이 있습니다. 이 힘이 실제 생활에서 어떻게 쓰이는지를 보는 게 중요합니다.`:"타고난 구조는 한 가지 이름보다 여러 계산 근거가 같은 방향을 가리키는지 함께 봅니다.",
    `그래서 이 사주는 단순히 '신중한 사람'처럼 한 단어로 끝내기 어렵습니다. ${stem.core}이 강점으로 작동하고, 반대로 ${stem.shadow}이 부담으로 바뀌는 순간을 함께 보는 편이 정확합니다.`
  ];

  if(id==="book-008")return[
    `이 사주를 한 문장으로 줄이면, '${stem.core}을 가진 사람'에 가깝습니다.`,
    dominantFamilySentence(facts)||`${facts.dayStemName||"중심 기운"}의 성향이 판단과 선택에서 반복해서 나타납니다.`,
    facts.structure?`${structureMeaning(facts.structure)}이 함께 작동하기 때문에, 잘하고 싶은 마음만 있는 것이 아니라 실제 역할과 결과까지 책임지려는 힘이 같이 붙습니다.`:"자기 기준이 선 뒤에는 생각을 행동으로 옮기고 결과를 끝까지 확인하려는 힘이 있습니다.",
    `장점은 한번 방향을 정하면 쉽게 흐트러지지 않는다는 점입니다. 다만 ${stem.shadow}이 강해지면 스스로 만든 기준 때문에 오히려 시작이 늦거나 피로가 커질 수 있습니다.`
  ];

  if(id==="book-009")return[
    "한 가지 모습으로만 설명되는 사람은 아닙니다. 낯선 사람 앞에서는 먼저 분위기를 읽고, 일을 할 때는 책임과 기준이 앞에 서며, 가까운 사람 앞에서는 감정과 신뢰가 훨씬 솔직하게 드러납니다.",
    "사회에서는 맡은 역할을 가볍게 넘기지 않고, 한번 책임진 일은 끝까지 정리하려는 힘이 강합니다.",
    "반대로 가까운 관계에서는 옳고 그름보다 '이 사람을 믿어도 되는가'가 더 중요해집니다. 한번 마음을 준 사람에게는 생각보다 오래 정을 쓰는 편입니다.",
    "자리마다 보이는 모습이 조금씩 다른 건 모순이 아닙니다. 상황에 따라 가장 필요한 힘을 먼저 꺼내 쓰는 것입니다.",
    "그래서 이 사람을 제대로 읽으려면 일할 때와 사랑할 때, 혼자 있을 때의 모습까지 함께 봐야 합니다."
  ];

  if(id==="book-010")return[
    "처음 만난 자리에서는 말보다 분위기를 먼저 읽는 편입니다. 상대가 어떤 사람인지, 어느 정도까지 편하게 대해도 되는지를 자연스럽게 살핍니다.",
    "그래서 첫인상은 차분하고 단정한 쪽에 가깝습니다. 처음부터 많은 이야기를 꺼내기보다 필요한 말부터 정확하게 하는 편입니다.",
    "사람을 가볍게 판단하는 건 아니지만, 말과 행동이 다른 사람에게는 금방 마음을 열지 않습니다.",
    "반대로 신뢰가 생기고 편해지면 처음보다 훨씬 솔직하고 분명한 모습이 나옵니다.",
    "첫인상과 친해진 뒤의 모습에 차이가 있는 편이지만, 그 차이는 사람을 천천히 알아가는 성향에서 나옵니다."
  ];

  if(id==="book-011")return[
    "사회생활에서는 책임감이 꽤 강한 편입니다. 맡은 일이 생기면 대충 넘기기보다 어디까지 해야 끝난 건지 스스로 기준을 세웁니다.",
    "누가 시키지 않아도 빠진 부분이 보이면 그냥 지나치기 어렵고, 한번 맡은 일은 마무리까지 확인해야 마음이 놓이는 편입니다.",
    "이런 성향은 시간이 갈수록 큰 장점이 됩니다. 단순히 일을 잘하는 사람보다 '맡겨도 되는 사람'으로 신뢰를 얻기 쉽습니다.",
    "다만 책임만 주어지고 결정할 권한은 없는 환경에서는 답답함이 빨리 쌓일 수 있습니다.",
    "가장 잘 맞는 자리는 모든 일을 혼자 하는 곳이 아니라, 내 판단을 쓸 수 있으면서 책임의 범위도 분명한 자리입니다."
  ];

  if(id==="book-012")return[
    "가까운 사람 앞에서는 내 생각이 더 분명해집니다. 그렇다고 내 주장만 앞세우는 사람은 아닙니다.",
    "상대가 왜 그런 말을 했는지, 어떤 마음이었는지를 오래 생각하는 편이라 한번 믿은 사람에게는 쉽게 마음을 거두지 않습니다.",
    "그래서 가까운 사이일수록 약속과 태도의 일관성을 중요하게 봅니다. 밖에서는 넘길 수 있는 일도 가까운 사람의 말과 행동이 다르면 오래 마음에 남을 수 있습니다.",
    "서운함이 생겼을 때 바로 크게 부딪히기보다 혼자 정리하는 시간이 필요한 편입니다.",
    "다만 마음속에서 결론이 다 난 뒤에 말하면 상대에게는 갑작스럽게 느껴질 수 있으니, 작은 불편은 작을 때 꺼내는 편이 관계를 오래 지키는 데 좋습니다."
  ];

  if(id==="book-013")return[
    "혼자 있을 때는 밖에서 보이는 것보다 생각이 훨씬 많아지는 편입니다. 지나간 일을 다시 정리하고, 앞으로 어떻게 할지 머릿속에서 여러 번 그려봅니다.",
    "이 덕분에 남들이 지나친 부분을 다시 보고 다음 선택을 준비하는 힘이 있습니다.",
    "문제가 생겨도 바로 감정에 끌려가기보다 이유와 순서를 정리한 뒤 움직이려는 편이라, 복잡한 일을 차분하게 풀어내는 데 강합니다.",
    "다만 쉬는 시간에도 계속 다음 일을 생각하면 몸은 쉬어도 머리는 쉬지 못할 수 있습니다.",
    "혼자 있는 시간에는 생각을 더 늘리기보다 어느 지점에서 멈출지 정해주는 습관이 필요합니다."
  ];

  if(id==="book-014")return[
    "겉으로 바로 말하지 않은 생각이 안쪽에 오래 남는 편입니다. 그 자리에서는 지나간 일도 시간이 지난 뒤 다시 떠올리며 의미를 정리할 수 있습니다.",
    dominantFamilySentence(facts)||"속에서 반복되는 생각은 눈에 보이는 행동보다 더 큰 비중을 차지할 수 있습니다.",
    "특히 말의 앞뒤가 맞지 않거나 신뢰가 흔들린 일은 단순히 기분이 나빴다는 수준보다 '이 사람을 계속 믿어도 되는가'의 문제로 남기 쉽습니다.",
    "그래서 겉으로 조용하다고 마음까지 금방 정리된 것은 아닙니다. 반대로 한번 납득하고 마음이 풀리면 같은 일을 오래 붙잡지 않을 수도 있습니다.",
    "이 사주의 속마음을 이해하려면 감정의 크기보다 무엇을 신뢰의 기준으로 삼는지를 보는 편이 더 정확합니다."
  ];

  if(id==="book-016"||id==="book-024"){
    const first=strongest&&strongStory?`가장 강한 ${elementPro(strongest)}은 ${strongStory.gift}과 연결됩니다. 생활에서는 ${strongStory.life}으로 나타나기 쉽습니다.`:"오행의 강약은 다섯 기운을 비교해서 읽습니다.";
    const second=weakest&&weakStory?`반대로 ${elementPro(weakest)}은 상대적으로 약합니다. 이 기운이 맡는 '${weakStory.life}'은 자동으로 나오기보다 의식적으로 보완할수록 좋아지는 영역입니다.`:"약한 기운은 부족하다는 판정보다 의식적으로 보완할 영역을 보여줍니다.";
    return[
      id==="book-016"?"오행표에서 중요한 것은 숫자 하나가 아니라 어느 기운이 앞에 서고 어느 기운이 뒤로 물러나는지입니다. 이 차이가 성격과 생활의 우선순위를 만듭니다.":"오행의 강약은 좋고 나쁨을 매기는 점수가 아닙니다. 어떤 힘은 자연스럽게 쓰고, 어떤 힘은 일부러 꺼내 써야 하는지를 보여주는 지도에 가깝습니다.",
      first,
      second,
      facts.missing.length?`특히 ${facts.missing.map(elementPro).join("·")}이 원국에서 비어 있다는 점은 중요합니다. 능력이 없다는 뜻이 아니라 그 역할이 저절로 켜지기보다 환경과 습관을 통해 작동시키는 편이 좋다는 뜻입니다.`:"다섯 기운이 모두 있어도 비율 차이가 크면 생활에서 체감되는 강약은 분명하게 생깁니다.",
      "그래서 오행은 '많아서 좋다, 적어서 나쁘다'로 읽지 않습니다. 강한 힘은 과해지는 순간을 조절하고, 약한 힘은 필요한 장면에서 의식적으로 보완하는 것이 핵심입니다."
    ];
  }

  if(id==="book-017")return[
    `전체 기운의 균형을 계산하면 ${strengthMeaning(facts.strength)}입니다.`,
    "이 값은 의지가 세다 약하다는 성격평가가 아닙니다. 혼자 밀어붙이는 힘과 주변의 도움을 받아 안정되는 힘 가운데 어느 쪽을 더 많이 쓰는지를 보는 기준입니다.",
    dominantFamilySentence(facts)||"원국에서 반복되는 역할을 함께 보면 실제로 힘을 쓰는 방식이 더 선명해집니다.",
    "힘이 충분한 사람도 환경이 맞지 않으면 지칠 수 있고, 도움을 많이 쓰는 구조도 좋은 사람과 자원을 잘 연결하면 훨씬 큰 결과를 만들 수 있습니다.",
    "결국 중요한 것은 강약의 이름보다 내 힘을 어디까지 직접 쓰고, 어느 지점부터 사람·시간·환경의 도움을 받아야 오래 갈 수 있는지를 아는 것입니다."
  ];

  if(id==="book-018"||id==="book-025")return[
    usefulSentence(facts)||"도움이 되는 기운은 이미 강한 부분보다 현재 부족한 부분을 보완하는 쪽에서 찾습니다.",
    facts.structure?`이 사주의 기본축은 ${structureMeaning(facts.structure)}입니다. 도움 되는 기운은 이 장점을 없애는 것이 아니라 더 편하게 쓰게 만들어주는 역할을 합니다.`:"도움 되는 기운은 타고난 장점을 바꾸기보다 과한 부분을 덜고 부족한 부분을 채우는 역할에 가깝습니다.",
    strongest&&strongStory?`이미 강한 ${elementPro(strongest)}의 ${strongStory.life}은 굳이 더 밀어붙이지 않아도 자연스럽게 나옵니다.`:"이미 익숙한 힘은 생활에서 자연스럽게 반복됩니다.",
    weakest&&weakStory?`반대로 약한 ${elementPro(weakest)}의 ${weakStory.life}은 일정, 사람, 일하는 방식처럼 현실적인 선택으로 보완할 때 체감이 큽니다.`:"부족한 힘은 생활환경과 습관으로 보완할 때 가장 현실적으로 달라집니다.",
    "사주에서 도움이 되는 기운을 안다는 것은 색이나 물건을 고르는 문제가 아니라, 내가 자주 놓치는 행동을 어떤 방식으로 생활에 넣을지 정하는 데 더 가깝습니다."
  ];

  if(id==="book-020")return[
    `오행으로 보면 이 사주의 중심은 ${facts.dayStemName||"나를 대표하는 기운"}에서 시작합니다. ${stem.image}처럼 ${stem.core}이 기본 방향입니다.`,
    elementFact(facts)||"다섯 기운의 강약이 이 중심 성향을 어떻게 밀어주고 조절하는지 함께 봅니다.",
    strongest&&strongStory?`여기에 ${elementPro(strongest)}의 비중이 가장 크게 잡혀 ${strongStory.life}이 생활 전반에서 더 자주 쓰입니다.`:"가장 강한 기운이 생활에서 반복적으로 쓰이는 힘을 결정합니다.",
    weakest&&weakStory?`반면 ${elementPro(weakest)}의 역할은 자동으로 나오기보다 필요할 때 의식적으로 꺼내 쓰는 편이 맞습니다.`:"약한 기운은 일부러 보완할 때 전체 흐름이 안정됩니다.",
    "이 조합 때문에 같은 일주라도 사람마다 실제 성격과 생활 방식이 달라집니다. 일주만 보지 않고 오행의 강약을 같이 보는 이유가 여기에 있습니다."
  ];

  if(id==="book-021")return[
    `나를 대표하는 기운은 ${facts.dayStemName||"중심 기운"}입니다. 명리에서는 ${stem.image}의 이미지로 설명합니다.`,
    `이 기운의 장점은 ${stem.core}입니다. 스스로 의미를 찾은 일에서는 오래 버티고 자기 방식으로 성장시키는 힘으로 연결됩니다.`,
    dominantFamilySentence(facts)||"십성의 분포가 이 기운을 어떤 역할로 가장 많이 쓰는지 보여줍니다.",
    `반대로 ${stem.shadow}이 강해질 때는 같은 장점이 부담으로 바뀔 수 있습니다.`,
    "그래서 나를 대표하는 기운은 성격을 고정하는 별명이 아니라, 선택 앞에서 가장 먼저 꺼내 쓰는 기본 도구라고 생각하면 이해하기 쉽습니다."
  ];

  if(id==="book-022")return[
    `나를 가장 가까이 보여주는 두 글자는 ${facts.dayPillarReading||facts.dayPillar}입니다.`,
    pillarElementSentence(facts.dayPillar)||"일주는 위아래 두 기운이 한 자리에서 만나는 구조입니다.",
    pillarRoleSentence(facts,"day","일주"),
    "이 두 글자는 가까운 관계, 내가 편안함을 느끼는 방식, 중요한 선택에서 끝까지 남는 기준을 읽을 때 중심이 됩니다.",
    "일주의 이름만 외울 필요는 없습니다. 이 두 글자가 오행과 십성 속에서 어떤 역할을 맡고 있는지까지 같이 봐야 실제 성격과 연결됩니다."
  ];

  if(id==="book-023")return[
    "겉으로 보이는 나와 실제 속마음 사이에는 약간의 온도차가 있습니다. 밖에서는 역할에 맞춰 정리된 모습을 보이지만, 안에서는 훨씬 많은 가능성을 비교하고 감정을 오래 정리할 수 있습니다.",
    pillarRoleSentence(facts,"month","밖에서 먼저 보이는 월주"),
    pillarRoleSentence(facts,"day","내가 편할 때 드러나는 일주"),
    "이 차이는 가식이라기보다 상황에 맞춰 다른 힘을 쓰는 능력에 가깝습니다. 사회에서는 책임과 기준이 필요하고, 가까운 관계에서는 신뢰와 감정이 더 중요해지기 때문입니다.",
    "문제는 밖에서 너무 오래 버티다가 가까운 사람에게 한꺼번에 피로를 풀 때 생깁니다. 겉과 속의 차이가 커질수록 중간에서 마음을 설명하는 시간이 필요합니다."
  ];

  if(id==="book-026")return[
    "오행은 성격표 안에서 끝나지 않습니다. 가장 강한 기운은 일할 때, 돈을 쓸 때, 사람을 대할 때 반복해서 같은 우선순위를 만들기 쉽습니다.",
    strongest&&strongStory?`${elementPro(strongest)}이 강하기 때문에 ${strongStory.life}이 생활의 기본 습관으로 자리하기 쉽습니다.`:"강한 기운은 특별히 의식하지 않아도 생활에서 반복됩니다.",
    weakest&&weakStory?`반대로 ${elementPro(weakest)}이 약해 ${weakStory.life}은 바쁠수록 가장 먼저 놓치기 쉬운 부분이 됩니다.`:"약한 기운은 바쁠 때 가장 먼저 빠지는 행동으로 확인하기 쉽습니다.",
    "그래서 잘 풀리는 방법도 단순합니다. 잘하는 힘은 과해지지 않게 조절하고, 약한 힘은 거창하게 바꾸기보다 일정과 습관 속에 작게 넣어두는 편이 오래 갑니다.",
    usefulSentence(facts)||"오행의 균형은 생활 속 선택으로 조금씩 보완해갈 수 있습니다."
  ];

  if(["CORE","PILLARS","HIDDEN_STEMS","ELEMENTS","STRENGTH","STRUCTURE_USEFUL","IDENTITY"].includes(group))return[
    consultationOpening(row,facts)||`${title}은 원국의 여러 계산값을 한데 묶어서 읽는 장입니다.`,
    elementFact(facts)||dominantFamilySentence(facts),
    rowHasEvidencePrefix(row,"NATAL:STRUCTURE")&&facts.structure?`${structureMeaning(facts.structure)}과 ${facts.dayStemName||"중심 기운"}의 성향이 어떻게 함께 작동하는지 보는 것이 핵심입니다.`:`${facts.dayStemName||"중심 기운"}이 다른 오행과 어떻게 섞이는지 보는 것이 핵심입니다.`,
    "한 가지 값만 떼어 좋고 나쁘다고 판단하지 않고, 같은 방향을 가리키는 근거가 겹칠 때 그 특징을 더 중요하게 봅니다."
  ].filter(Boolean);

  return null;
}



function workConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,structure=facts.structure,dominant=dominantFamily(facts);
  const officer=familyCount(facts,"관성"),wealth=familyCount(facts,"재성"),peer=familyCount(facts,"비겁"),resource=familyCount(facts,"인성"),output=familyCount(facts,"식상");

  if(/직업운·학업운/.test(title))return[
    `직업운의 핵심은 '${familyMeaning(dominant)}'을 실제 결과로 바꾸는 데 있습니다.`,
    dominantFamilySentence(facts),
    structure?`${structureMeaning(structure)}이 직업 선택에서 중요한 기준이 됩니다.`:"직업에서는 내가 잘하는 것보다 어떤 책임 구조에서 오래 버틸 수 있는지가 더 중요합니다.",
    "단순히 유명한 직업이나 안정적인 직장을 고르는 것보다, 하루 대부분을 어떤 방식으로 판단하고 누구와 책임을 나누는지 보는 편이 잘 맞습니다.",
    "학업도 마찬가지입니다. 배우는 것 자체보다 배운 내용을 실제 일과 결과에 연결할 수 있을 때 성취감이 크게 올라갑니다."
  ];

  if(/나에게 잘 맞는 일/.test(title))return[
    `잘 맞는 일은 ${stemStory(facts).core}을 쓸 수 있는 일입니다.`,
    structure?`특히 ${structureMeaning(structure)}이 필요한 역할에서 강점이 살아납니다.`:dominantFamilySentence(facts),
    officer>=resource&&officer>=wealth?"기준을 세우고 책임지는 역할, 일정과 품질을 관리하는 일, 사람과 조직의 흐름을 정리하는 일과 잘 맞습니다.":wealth>officer?"시장 반응을 보고 운영·판매·수익 구조를 만드는 일처럼 결과가 숫자로 확인되는 일과 잘 맞습니다.":resource>=output?"분석·기획·교육·전문지식처럼 배우고 이해한 것을 구조화하는 일과 잘 맞습니다.":"아이디어를 콘텐츠·서비스·제품처럼 밖으로 만들어내는 일과 잘 맞습니다.",
    "반대로 의미를 느끼지 못한 반복 업무나 결정권 없이 지시만 수행하는 환경에서는 실력보다 답답함이 먼저 커질 수 있습니다.",
    "직업 이름보다 '내가 판단할 수 있는 범위가 있는가, 만든 결과가 남는가'를 기준으로 고르는 편이 훨씬 정확합니다."
  ];

  if(/직장과 사업/.test(title)){
    const monthWork=facts.branchMainTenGodByPosition.month||facts.stemTenGodByPosition.month;
    const laterWork=facts.stemTenGodByPosition.hour||facts.branchMainTenGodByPosition.hour;
    const organizationFirst=["정관","편관"].includes(monthWork);
    const independentLater=["정재","편재"].includes(laterWork);
    const verdict=organizationFirst&&independentLater
      ?"둘 중 하나를 고르면 장기적으로는 사업이나 독립수입 쪽에 조금 더 무게가 있습니다. 다만 처음부터 맨땅에서 시작하기보다 직장이나 조직에서 시스템과 운영을 익힌 뒤 결정권을 넓혀가는 흐름이 더 잘 맞습니다."
      :wealth>officer
        ?"둘 중 하나를 고르면 사업이나 독립수입 쪽이 조금 더 잘 맞습니다. 시장 반응과 돈의 흐름을 직접 보고 결정할 수 있을 때 강점이 더 살아납니다."
        :officer>wealth
          ?"둘 중 하나를 고르면 직장 쪽이 조금 더 잘 맞습니다. 다만 단순 지시를 받는 자리보다 책임과 판단권이 함께 커지는 직장이 더 잘 맞습니다."
          :"직장과 사업의 차이보다 결정권이 있는지가 더 중요하지만, 굳이 고르면 안정적인 조직 안에서 경험을 쌓고 이후 독립성을 넓히는 흐름이 잘 맞습니다.";
    return[
      verdict,
      officer>0?"조직 안에서도 맡은 역할과 책임을 이해하고 신뢰를 쌓는 힘이 있습니다.":"직장에서는 단순 지시보다 자율성과 결과 책임이 있는 자리가 더 편합니다.",
      wealth>0?"돈과 운영, 시장 반응을 직접 다루는 감각도 있어 독립수입이나 사업으로 확장할 여지가 있습니다.":"사업을 한다면 실제 매출과 운영을 다룰 구조부터 만드는 것이 중요합니다.",
      structure?`${structureMeaning(structure)}이 중심에 있어 아무 기준도 없는 자유보다, 시스템을 갖춘 뒤 내 결정권을 넓혀가는 방식이 안정적입니다.`:"처음부터 모든 것을 혼자 만들기보다 역할과 시스템을 확보한 뒤 결정권을 넓히는 편이 안정적입니다.",
      "결국 가장 피해야 할 환경은 직장이냐 사업이냐와 상관없이 책임만 크고 내 판단을 쓸 수 없는 구조입니다."
    ];
  }

  if(/^직장운$/.test(title))return[
    "직장운은 있습니다. 조직 안에서 맡은 역할을 이해하고 결과 기준을 지키는 힘을 실제로 쓸 수 있습니다.",
    familyPresence(facts,"관성"),
    structure?`${structureMeaning(structure)}이 중심에 있어 단순 실무보다 시간이 갈수록 책임과 판단권이 커지는 자리에서 강점이 더 선명해집니다.`:"경력이 쌓일수록 단순 실행보다 판단과 조율이 필요한 역할이 더 잘 맞습니다.",
    "다만 이유를 설명하지 않는 지시나 권한 없이 책임만 커지는 구조에는 스트레스가 크게 쌓일 수 있습니다.",
    "좋은 직장은 편한 곳보다 기준이 분명하고, 내가 결과에 영향을 줄 수 있으며, 성과를 인정받을 구조가 있는 곳입니다."
  ];

  if(/책임이 커질 때/.test(title))return[
    "책임이 커지면 오히려 집중력이 올라오는 편입니다. 누군가 해야 하는 일이라고 판단하면 평소보다 더 빠르게 우선순위를 정합니다.",
    familyPresence(facts,"관성"),
    peer>0?"비겁도 함께 있어 남에게 완전히 맡기기보다 내가 직접 확인하려는 힘이 붙습니다. 이 조합은 위기 대응에는 강하지만 일이 커질수록 병목이 될 수 있습니다.":"책임이 커질수록 직접 처리할 일과 확인만 할 일을 나누는 것이 중요합니다.",
    "가장 조심할 점은 '내가 하는 게 빠르다'는 이유로 다른 사람의 몫까지 가져오는 것입니다. 처음에는 빨라도 시간이 지나면 본인만 지치는 구조가 됩니다.",
    "책임이 커질수록 더 많이 하는 사람이 아니라 기준을 공유하고 맡길 수 있는 사람이 되어야 운을 오래 씁니다."
  ];

  if(/^사업운$/.test(title))return[
    wealth>0?"사업운은 눈여겨볼 만합니다. 시장과 돈, 운영 결과를 직접 다루는 감각이 있어 결과가 눈에 보이는 일에서 강점이 살아납니다.":"사업운은 '사업가 기질' 한마디보다 결과를 밖에 내놓고 시장 반응을 확인하는 힘을 얼마나 키우느냐가 중요합니다.",
    familyPresence(facts,"재성"),
    output>0?"식상도 함께 작동하기 때문에 만들고 표현한 것을 판매와 결과로 연결하는 흐름을 쓰기 좋습니다.":"표현과 생산을 맡는 식상은 의식적으로 키워야 합니다. 좋은 아이디어를 갖고 있는 것과 상품·콘텐츠·서비스로 내놓는 것은 다른 단계입니다.",
    "사업에서 강점은 방향을 잡고 구조를 만드는 힘입니다. 반대로 아이디어가 늘어날수록 하나가 자리 잡기 전에 다음 판을 벌리는 것은 조심해야 합니다.",
    "가장 좋은 방식은 하나를 만들어 반응을 확인하고, 반복 가능하게 정리한 뒤 다음 확장으로 넘어가는 것입니다."
  ];

  if(/직장 인간관계/.test(title))return[
    "직장 인간관계에서는 친해지는 속도보다 역할과 약속이 분명한지가 더 중요합니다.",
    peer>0?"동료와 서로 자극을 주고받으며 성장하는 힘이 있습니다. 경쟁이 적당히 있는 환경에서는 오히려 집중력이 살아날 수 있습니다.":"동료와의 관계에서는 감정적 친밀감보다 업무 기준과 책임 분담이 더 중요한 편입니다.",
    relationSentence(facts),
    "문제는 내가 원하는 기준을 상대도 당연히 알고 있을 것이라고 생각할 때 생깁니다. 업무에서는 마음보다 완료 기준을 말로 공유하는 편이 훨씬 편합니다.",
    "좋은 동료는 모든 일을 대신해주는 사람이 아니라 서로 맡은 몫을 분명히 하고 필요한 순간에 연결되는 사람에 가깝습니다."
  ];

  if(/^학업운$/.test(title))return[
    resource>0?"학업운은 좋은 편입니다. 정보를 받아들이고 이해한 뒤 자기 방식으로 다시 정리하는 힘이 있습니다.":"공부는 오래 앉아 있는 것보다 목적과 적용처가 분명할 때 훨씬 잘 붙는 편입니다.",
    familyPresence(facts,"인성"),
    "특히 자격, 전문기술, 실무지식처럼 '이걸 배우면 어디에 쓸지'가 분명한 공부에서 집중력이 높아집니다.",
    output>0?"배운 것을 설명하거나 결과물로 만들어보면 이해가 더 빠르게 굳습니다.":"배움이 준비에서 끝나지 않도록 작은 결과물이나 실전 적용을 함께 두는 것이 중요합니다.",
    "이 사주의 공부는 학위나 점수 자체보다 선택권을 넓히고 실제 일을 더 잘하게 만드는 도구로 쓸 때 가장 힘이 큽니다."
  ];

  if(row.evidenceGroup==="WORK")return[
    consultationOpening(row,facts)||"일에서는 직업 이름보다 어떤 책임을 맡고 얼마나 판단할 수 있는지가 더 중요합니다.",
    dominantFamilySentence(facts),
    structure?`${structureMeaning(structure)}이 일의 기준이 됩니다.`:"일의 기준과 책임 구조가 맞을수록 강점이 오래 유지됩니다.",
    "잘하는 일을 많이 맡는 것보다, 어떤 역할에서 실력이 안정적으로 반복되는지를 아는 것이 중요합니다."
  ].filter(Boolean);

  return null;
}



function wealthConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,wealth=familyCount(facts,"재성"),peer=familyCount(facts,"비겁"),output=familyCount(facts,"식상");

  if(/^재물운$/.test(title))return[
    wealth>0?"돈은 단순히 모아두는 대상보다 내가 원하는 결과를 현실로 만드는 수단으로 보는 성향이 강합니다.":"재물운은 타고난 돈복 한마디보다 돈을 만드는 구조를 얼마나 잘 만들고 유지하느냐가 더 중요합니다.",
    familyPresence(facts,"재성"),
    output>0?"아이디어와 능력을 실제 결과물로 바꾸는 과정이 돈과 연결되기 쉽습니다.":"돈을 키우려면 생각과 준비를 실제 제품·서비스·콘텐츠·성과로 꺼내는 과정이 특히 중요합니다.",
    peer>0?"사람·경쟁·확장에 돈이 움직이는 속도도 빨라질 수 있어, 수입과 별개로 정산 기준을 세워야 합니다.":"돈을 지키는 힘은 수입의 크기보다 반복지출과 확장 속도를 관리하는 데서 갈립니다.",
    "결국 재물운은 한 번의 큰 기회보다 벌고, 남기고, 다시 굴리는 구조를 만드는 쪽에서 더 크게 살아납니다."
  ];

  if(/돈에 대한 기본 성향/.test(title))return[
    "돈은 무조건 아껴야 마음이 놓이는 대상이라기보다, 필요하다고 판단한 곳에 써서 원하는 결과를 만드는 도구에 가깝습니다.",
    familyPresence(facts,"재성"),
    peer>0?"사람과 경쟁, 새로운 기회가 돈의 움직임에 영향을 주기 쉬워 '좋은 관계니까 괜찮겠지'보다 숫자와 약속을 먼저 보는 습관이 중요합니다.":"목적이 분명한 지출과 습관적인 지출을 나누면 재물 관리가 훨씬 단순해집니다.",
    "필요하다고 확신하면 과감해질 수 있지만, 확신이 서기 전에는 비교와 검토가 길어질 수 있습니다.",
    "이 성향에는 예산을 아주 촘촘하게 짜는 것보다, 큰돈을 쓸 때 반드시 확인할 기준 몇 가지를 정해두는 방식이 더 잘 맞습니다."
  ];

  if(/^돈의 흐름$/.test(title))return[
    "돈의 흐름은 들어오는 돈만 보면 반쪽입니다. 이 사주는 돈이 어디로 다시 나가고 무엇으로 남는지까지 함께 봐야 합니다.",
    familyPresence(facts,"재성"),
    peer>0?"확장, 사람, 공동 프로젝트처럼 '같이 움직이는 돈'에서 새는 구멍이 생기지 않도록 관리해야 합니다.":"반복해서 나가는 비용과 한 번 쓰고 끝나는 비용을 구분하면 돈의 흐름이 훨씬 선명해집니다.",
    facts.useful.length?usefulSentence(facts):"오행의 균형을 보면 돈을 벌 때 필요한 힘과 지킬 때 필요한 힘이 같지 않을 수 있습니다.",
    "재물운을 키우는 핵심은 수입을 늘리는 것만이 아니라, 번 돈이 다음 기회와 자산으로 이어지는 길을 만드는 것입니다."
  ];

  if(/돈을 버는 힘/.test(title))return[
    output>0?"돈을 버는 힘은 생각한 것을 실제 결과물로 만들어 시장에 내놓는 데서 시작합니다. 반응을 받고 고쳐가는 과정이 수입으로 이어지기 쉽습니다.":"돈을 버는 힘은 머릿속 아이디어를 밖으로 꺼내 실제 결과물로 만드는 순간부터 시작됩니다.",
    familyPresence(facts,"식상"),
    wealth>0?"그다음에는 이 결과를 매출·거래·자산처럼 실제 숫자로 굳히는 힘이 중요합니다.":"결과물을 반복 가능한 판매·서비스·운영 구조로 바꾸는 과정이 재물운에서 특히 중요합니다.",
    "한 시간 일해서 한 시간 값을 받는 구조만 고집하기보다, 한 번 만든 결과가 여러 번 쓰이거나 팔리는 구조를 만들수록 강점이 커집니다.",
    "많이 준비하는 것보다 실제 고객과 시장 앞에 내놓는 횟수를 늘리는 것이 돈을 버는 힘을 가장 빠르게 키웁니다."
  ];

  if(/모으고 지키는 힘/.test(title))return[
    "버는 힘과 지키는 힘은 별개입니다. 수입이 늘어도 확장과 사람, 새로운 시도에 같이 나가면 통장에 남는 돈은 달라집니다.",
    peer>0?"공동자금, 사람과 얽힌 지출, 경쟁 때문에 커지는 비용은 특히 기준을 세워두는 편이 좋습니다.":"돈을 지키는 힘은 의지보다 자동이체·계좌분리처럼 손대지 않아도 굴러가는 구조에서 더 안정적으로 만들어집니다.",
    wealth>0?"돈의 흐름을 숫자로 기록하기 시작하면 관리 능력은 빠르게 좋아질 수 있습니다.":"돈을 지키는 습관은 복잡한 재테크보다 흐름을 눈에 보이게 만드는 것부터 시작하는 편이 좋습니다.",
    "큰 지출을 줄이는 것도 중요하지만, 사람 때문에 반복해서 나가는 돈이나 이유 없이 늘어난 고정비를 정리하는 쪽이 효과가 더 클 수 있습니다.",
    "재물운을 오래 가져가려면 '얼마를 벌까'와 함께 '얼마를 반드시 남길까'를 먼저 정해야 합니다."
  ];

  if(/돈과 인간관계/.test(title))return[
    "돈과 사람이 섞이는 순간에는 감정보다 기준이 먼저 필요합니다. 친한 관계일수록 오히려 금액과 약속을 더 분명히 해야 합니다.",
    peer>0?"사람과 함께 무언가를 벌이는 일은 잘 맞을 수 있지만, 역할과 정산이 흐려지면 서운함도 같이 커질 수 있습니다.":"사람을 도와주는 돈과 투자하는 돈을 같은 기준으로 보지 않는 것이 중요합니다.",
    relationSentence(facts),
    "공동사업, 지분, 대여, 가족 간 돈거래처럼 관계가 걸린 돈은 기억에 맡기지 말고 숫자와 종료 조건을 남겨두는 편이 좋습니다.",
    "돈의 기준을 세우는 것은 사람을 못 믿어서가 아니라, 좋은 관계를 오래 유지하기 위해 서로의 기대를 맞추는 과정에 가깝습니다."
  ];

  if(/큰 기회/.test(title))return[
    "큰 기회가 들어왔을 때 이 사주가 가장 조심해야 할 것은 기회 자체보다 '확장 속도'입니다.",
    output>0?"식상이 움직이면 새로운 아이디어와 결과물이 계속 생길 수 있어, 하나가 자리 잡기 전에 다음 것을 만들고 싶어질 수 있습니다.":"아이디어가 많아질수록 동시에 여러 판을 벌이기보다 지금 검증 중인 것의 결과를 먼저 보는 편이 좋습니다.",
    wealth>0?"재성이 있기 때문에 좋은 기회를 실제 돈으로 연결할 힘은 있지만, 숫자가 좋다고 모든 기회를 잡을 필요는 없습니다.":"수익 가능성보다 손실을 감당할 수 있는 범위와 회수 시점을 먼저 보는 편이 안전합니다.",
    "가장 좋은 순서는 하나를 시험하고, 반응을 확인하고, 반복 가능하게 만든 뒤 다음 확장으로 넘어가는 것입니다.",
    "기회를 놓치지 않는 사람보다 좋은 기회와 아직 이른 기회를 구분하는 사람이 결국 더 크게 남깁니다."
  ];

  if(/평생 재물운/.test(title))return[
    "평생 재물운에서 가장 중요한 것은 한방이 아니라 구조입니다. 나이가 들수록 무엇을 해야 돈이 되고 무엇이 시간을 낭비하는지 구분하는 힘이 커지는 쪽이 유리합니다.",
    familyPresence(facts,"재성"),
    usefulSentence(facts)||"오행의 강약을 보면 돈을 만들 때 필요한 힘과 돈을 지킬 때 필요한 힘을 따로 보완해야 합니다.",
    "좋은 시기에는 확장만 생각하지 말고 반복수익·계약·자산처럼 남는 형태로 굳히는 과정이 필요합니다.",
    "재물운의 완성은 많이 버는 순간이 아니라, 번 돈이 다음 선택의 자유를 만들어주는 상태에 가깝습니다."
  ];

  if(row.evidenceGroup==="WEALTH")return[
    consultationOpening(row,facts)||`${title}은 돈을 만들고 지키는 힘을 따로 나눠 보는 장입니다.`,
    familyPresence(facts,"재성"),
    peer>0?familyPresence(facts,"비겁"):"돈과 사람의 경계를 분명히 할수록 재물 관리가 편해집니다.",
    "재물운은 금액 하나보다 반복되는 선택과 관리 구조를 보는 편이 더 정확합니다."
  ];

  return null;
}



function relationshipConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,dayRole=facts.branchMainTenGodByPosition.day||facts.stemTenGodByPosition.day,dayTone=tenGodTone(dayRole);

  if(/연애운·결혼운·자녀운/.test(title))return[
    "가까운 관계에서는 처음의 끌림보다 시간이 지나도 믿을 수 있는지가 더 중요합니다.",
    "마음이 열리면 상대를 오래 챙기고 관계를 쉽게 가볍게 여기지 않는 편입니다.",
    relationSentence(facts),
    "연애와 결혼에서는 서로의 역할과 영역을 존중할수록 관계가 편해집니다.",
    "가족을 사랑하는 마음이 책임을 전부 떠안는 방식으로 바뀌지 않게 선을 두는 것도 중요합니다."
  ];

  if(/^연애 성향$/.test(title))return[
    "연애는 빠르게 달아오르기보다 신뢰가 쌓이면서 깊어지는 쪽에 가깝습니다.",
    "마음이 열리면 관계를 가볍게 소비하기보다 오래 이어갈 방법을 생각합니다. 말보다 반복되는 행동과 약속을 더 크게 보는 편입니다.",
    "상대가 믿을 만한 사람이라는 확신이 생기면 생각보다 오래 챙기고 쉽게 마음을 거두지 않습니다.",
    "반대로 신뢰가 한번 흔들리면 작은 일도 이전과 다르게 보이기 시작할 수 있습니다.",
    "연애에서는 상대를 고르는 눈만큼 마음이 달라진 이유를 제때 말하는 힘이 중요합니다."
  ];

  if(/반복되는 패턴/.test(title))return[
    "관계에서 반복되는 패턴은 가까워질수록 기대가 커진다는 데서 시작합니다.",
    relationSentence(facts),
    "처음에는 상대의 속도를 존중하다가도 관계가 깊어지면 말하지 않아도 알아주길 기대하거나, 내가 챙긴 만큼 상대도 비슷하게 움직이길 바랄 수 있습니다.",
    "이 기대가 맞지 않을 때 바로 싸우기보다 속으로 정리하는 시간이 길어지면, 상대에게는 문제가 갑자기 커진 것처럼 보일 수 있습니다.",
    "가까운 관계일수록 추측보다 설명이 필요합니다. 작은 불편을 작을 때 말하는 것이 가장 큰 반복을 끊는 방법입니다."
  ];

  if(/가까운 관계에서/.test(title))return[
    `가까운 사람에게는 ${dayTone.gift}이 애정의 방식으로 나옵니다. 믿는 사람일수록 챙기고 오래 책임지려는 마음이 커집니다.`,
    "문제는 챙김이 상대의 선택까지 대신하는 순간입니다. 좋은 뜻으로 시작했어도 상대에게는 관리받는 느낌으로 바뀔 수 있습니다.",
    relationSentence(facts),
    "가까울수록 역할을 분명히 나누고, 상대가 직접 해볼 몫을 남겨두는 편이 관계를 더 오래 편하게 만듭니다.",
    "사랑의 크기를 책임의 양으로 증명하려 하기보다, 필요할 때 연결되고 각자의 영역은 남겨두는 방식이 잘 맞습니다."
  ];

  if(/마음이 가는 상대/.test(title))return[
    "마음이 가는 상대는 화려한 말보다 생활 태도와 책임감이 일정한 사람에 가깝습니다.",
    "말이 자주 바뀌거나 중요한 약속을 가볍게 여기는 사람보다는 자기 일을 하고, 자기 몫을 책임지고, 대화가 통하는 사람에게 신뢰가 붙기 쉽습니다.",
    "관계에서도 말의 화려함보다 태도의 일관성과 책임감을 더 중요하게 보는 편입니다.",
    "다만 나와 비슷하게 기준이 강한 사람끼리는 맞는 부분만큼 부딪히는 부분도 커질 수 있습니다. 존중과 통제가 어디서 갈리는지 보는 게 중요합니다.",
    "결국 좋은 상대는 나를 대신 결정해주는 사람이 아니라, 각자의 기준을 지키면서도 서로의 선택을 설명할 수 있는 사람입니다."
  ];

  if(/애정 표현/.test(title))return[
    "애정 표현은 말만 많이 하는 방식보다 행동으로 챙기는 쪽에 가깝습니다. 필요한 것을 기억하고, 계획을 같이 세우고, 실제로 시간을 내는 식입니다.",
    "본인은 행동으로 충분히 표현했다고 생각해도 상대는 말로 확인받고 싶을 수 있습니다. 이 차이를 모르면 서로 좋아하면서도 서운함이 생길 수 있습니다.",
    "반대로 상대가 말은 잘하지만 행동이 따라오지 않으면 신뢰가 빠르게 떨어질 수 있습니다.",
    "그래서 가까운 관계에서는 '나는 이렇게 하고 있으니 알겠지'보다 짧게라도 마음을 말해주는 편이 좋습니다.",
    "가장 잘 맞는 표현은 거창한 이벤트보다 '고맙다, 서운했다, 필요하다'를 솔직하게 말하고 행동으로 이어주는 방식입니다."
  ];

  if(/다툴 때/.test(title))return[
    "다툴 때는 바로 폭발하기보다 속으로 정리한 뒤 말하는 쪽에 가깝습니다.",
    relationSentence(facts),
    "생각이 정리되는 동안 상대는 문제가 끝난 줄 알 수 있고, 본인은 이미 여러 장면을 연결해 결론을 내릴 수 있습니다. 그래서 나중에 말하면 상대에게는 갑자기 커진 문제처럼 들릴 수 있습니다.",
    "논리가 다 정리될 때까지 기다리기보다 '지금 조금 서운하다, 생각하고 다시 말하겠다' 정도만 먼저 알려주는 게 좋습니다.",
    "갈등의 핵심은 누가 맞는지가 아니라 서로 다른 속도로 감정을 처리한다는 점을 이해하고 대화의 시간을 맞추는 데 있습니다."
  ];

  if(/결혼운/.test(title))return[
    "결혼운은 함께 사는 것 자체보다 역할과 독립성을 어떻게 나누느냐가 중요합니다.",
    "가족이 중요해도 자기 일과 자기 공간이 완전히 사라지면 답답함이 커질 수 있습니다.",
    "서로의 영역을 인정하면서도 중요한 약속은 함께 정하는 결혼이 더 잘 맞습니다.",
    relationSentence(facts),
    "좋은 결혼은 모든 것을 함께하는 상태보다, 함께 책임질 것과 각자 책임질 것을 나눈 상태에 가깝습니다."
  ];

  if(row.evidenceGroup==="RELATIONSHIP")return[
    consultationOpening(row,facts)||"가까운 관계에서는 누구를 만나는가보다 어떤 사람에게 마음을 열고 어떤 패턴을 반복하는지가 더 중요합니다.",
    relationSentence(facts),
    "마음이 깊어질수록 챙김과 기대가 함께 커질 수 있으니, 상대의 몫까지 대신 책임지지 않는 선이 필요합니다.",
    "관계운은 누가 나타날지를 맞히는 것보다 가까워진 뒤의 내 선택을 이해하는 데 더 가치가 있습니다."
  ].filter(Boolean);

  return null;
}



function childrenConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,hourRole=facts.branchMainTenGodByPosition.hour||facts.stemTenGodByPosition.hour,hourTone=tenGodTone(hourRole);

  if(/자녀운/.test(title)&&!/시주/.test(title))return[
    "자녀운에서는 아이의 수나 성별을 단정하지 않습니다. 대신 부모 역할이 생겼을 때 어떤 방식으로 돌보고 책임지는지가 더 중요합니다.",
    "필요한 것을 빨리 챙기고 생활의 기준을 잡아주는 힘이 강한 편이라, 가족에게 안정감을 주는 부모가 되기 쉽습니다.",
    "다만 걱정이 커질수록 아이가 직접 해볼 몫까지 대신하려는 모습으로 바뀔 수 있습니다.",
    "잘해주려는 마음과 대신 살아주는 건 다른 일이기 때문에, 안전한 범위에서는 직접 선택하고 경험할 시간을 주는 편이 좋습니다.",
    "좋은 자녀운은 모든 것을 미리 해결해주는 데 있지 않고, 필요한 순간에 정확히 도와주고 한 걸음 물러날 줄 아는 데 가깝습니다."
  ];

  if(/가족운/.test(title))return[
    "가족을 중요하게 여기면서도 자기 역할과 자기 시간이 필요한 사람입니다. 한쪽만 남기면 오래 버티기 어렵습니다.",
    "가족 일이 몰릴수록 '내가 해야 마음이 놓인다'는 마음이 커질 수 있지만, 한 사람이 모든 생활을 책임지는 구조는 결국 피로를 만듭니다.",
    "함께할 일, 각자 할 일, 도와줄 일을 나누어두면 사랑이 책임으로만 바뀌는 것을 막을 수 있습니다.",
    "가까운 사람을 챙기는 힘은 장점이지만, 그 사람의 선택까지 대신하지 않는 선이 필요합니다.",
    "가족의 균형은 많이 희생하는 데 있지 않고, 가족과 자기 일을 함께 오래 가져갈 수 있는 구조를 만드는 데 있습니다."
  ];

  if(/부모가 되었을 때/.test(title))return[
    `부모 역할이 생기면 ${hourTone.gift}이 크게 살아날 수 있습니다. 필요한 것을 빠르게 챙기고 생활 기준을 잡아주는 힘으로 이어집니다.`,
    "다만 잘해주고 싶은 마음이 커질수록 작은 실수까지 미리 막아주고 싶어질 수 있습니다.",
    "아이에게 필요한 것은 항상 정답을 주는 부모보다 직접 해보고 다시 돌아올 수 있는 안전한 기준입니다.",
    "규칙을 정할 때 이유를 함께 설명하고, 위험하지 않은 선택은 직접 경험하게 두는 편이 관계를 더 편하게 만듭니다.",
    "돌봄을 오래 잘하려면 아이의 성장만큼 부모의 휴식과 개인 시간을 지키는 것도 중요합니다."
  ];

  if(/가까워지는 법/.test(title))return[
    "아이와 가까워지는 데는 많은 말을 하는 것보다 반복해서 지켜주는 약속이 더 중요할 수 있습니다.",
    "본인이 옳다고 생각하는 방식을 바로 가르치기보다 아이가 왜 그렇게 했는지 먼저 듣는 시간이 필요합니다.",
    "도와주기 전에 '어디까지 해봤어?'를 물어보면 챙김과 자율성을 같이 지킬 수 있습니다.",
    "감정을 해결해주려 하기보다 감정을 알아주는 시간이 먼저일 때도 있습니다.",
    "가까운 관계일수록 설명을 줄이지 않는 것이 좋습니다. 가족이니까 당연히 알 것이라고 생각하면 오히려 오해가 길어질 수 있습니다."
  ];

  if(/부모 역할의 장점/.test(title))return[
    `부모 역할에서 가장 큰 장점은 ${hourTone.gift}입니다.`,
    "한번 책임진 사람을 오래 챙기고 생활을 안정시키는 힘은 아이에게 큰 안전감이 될 수 있습니다.",
    "문제가 생겼을 때 감정만 따라가기보다 해결할 순서를 잡는 것도 강점입니다.",
    "이 힘이 잘 쓰이면 아이에게 '문제가 생겨도 다시 정리할 수 있다'는 감각을 가르쳐줄 수 있습니다.",
    "다만 장점을 오래 쓰려면 혼자 모든 책임을 떠안지 않고 다른 가족과 역할을 나누는 구조가 꼭 필요합니다."
  ];

  if(/부모 역할이 부담/.test(title))return[
    "부모 역할이 부담으로 바뀌는 순간은 아이의 모든 선택을 내 책임처럼 느끼기 시작할 때입니다.",
    "잘못될까 봐 미리 막아주고, 준비가 부족해 보이면 대신 챙기고, 결과까지 내가 확인하려 하면 본인도 아이도 숨이 막힐 수 있습니다.",
    `${hourTone.shadow}이 강해지는 시기에는 특히 작은 일까지 신경이 곤두설 수 있습니다.`,
    "이때는 도와줄 일보다 '내가 하지 않아도 되는 일'을 먼저 정하는 편이 좋습니다.",
    "부모 역할은 완벽하게 하는 일이 아니라 오래 지속하는 일이기 때문에, 힘을 빼는 기준도 실력의 일부입니다."
  ];

  if(row.evidenceGroup==="CHILDREN")return[
    "부모 역할과 가족 관계에서는 내가 얼마나 잘해주느냐보다 오래 지속할 수 있는 돌봄의 균형이 중요합니다.",
    "필요한 것을 챙기는 힘은 충분하지만, 모든 책임을 혼자 가져오면 사랑보다 피로가 먼저 커질 수 있습니다.",
    "상대가 직접 해볼 몫을 남겨두고 가족 안에서 역할을 나누는 편이 관계를 더 편하게 만듭니다.",
    "이 해설은 자녀의 수나 성별, 임신 여부를 단정하지 않고 부모 역할과 가족 관계에서 반복될 수 있는 태도를 중심으로 봅니다."
  ].filter(Boolean);

  return null;
}

function wellnessConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,strongest=facts.strongest?.element,weakest=facts.weakest?.element;
  const strong=strongest?elementStory(strongest):null,weak=weakest?elementStory(weakest):null;

  if(/^건강운$/.test(title))return[
    "건강운은 질병 이름을 맞히는 장이 아니라, 생활이 무너질 때 어떤 패턴부터 흔들리는지를 보는 장입니다.",
    strongest&&strong?`가장 강한 ${elementPro(strongest)}은 ${strong.life}과 연결되고, 이 힘을 오래 쓰면 장점만큼 피로도 같이 쌓일 수 있습니다.`:"오행의 강약을 생활 리듬과 함께 봅니다.",
    weakest&&weak?`반대로 약한 ${elementPro(weakest)}의 '${weak.life}'은 바쁠수록 가장 먼저 놓치기 쉬운 부분입니다.`:"약한 기운은 회복과 생활습관에서 먼저 보완할 부분을 알려줍니다.",
    "그래서 건강운에서는 무리한 뒤 몰아서 쉬는 패턴보다 수면·식사·활동을 일정하게 유지하는 힘을 더 중요하게 봅니다.",
    "불편한 증상이나 건강 걱정이 있다면 실제 검진과 의료 판단을 우선하고, 사주 해설은 생활 습관을 돌아보는 참고로만 쓰는 것이 맞습니다."
  ];

  if(/몸이 보내는 신호/.test(title))return[
    "몸의 신호는 대개 갑자기 생긴 한 번의 피로보다, 평소 반복해서 무시한 생활 패턴에서 먼저 드러납니다.",
    strongest&&strong?`${elementPro(strongest)}의 힘을 많이 쓰는 만큼 ${strong.life}에 집중할 때 쉬는 타이밍을 놓치지 않는 것이 중요합니다.`:"집중이 길어질수록 중간에 쉬는 시간을 먼저 확보하는 편이 좋습니다.",
    weakest&&weak?`${elementPro(weakest)}이 약한 편이라 ${weak.life}을 보완하는 습관이 회복 리듬에 도움이 됩니다.`:"회복은 한 번 크게 쉬는 것보다 반복 가능한 생활 기준에서 만들어집니다.",
    "몸이 버틸 수 있다고 계속 밀어붙이는 것과 실제로 회복되고 있는 것은 다른 문제입니다.",
    "피로가 반복되면 의지의 문제로 넘기지 말고 일정, 수면, 식사 중 무엇이 먼저 무너졌는지부터 확인하는 편이 좋습니다."
  ];

  if(/생활 리듬/.test(title))return[
    "생활 리듬은 몰아서 일하고 몰아서 쉬는 방식보다 일정한 시간에 자고 먹고 움직이는 방식이 훨씬 잘 맞습니다.",
    "일정이 바빠질수록 가장 먼저 지킬 기준 하나를 정해두면 전체 리듬이 쉽게 무너지지 않습니다.",
    strongest&&strong?`${elementPro(strongest)}의 힘이 강하면 잘하는 일에 몰입하는 시간이 길어질 수 있어, 멈출 시간을 미리 잡아두는 것이 중요합니다.`:"몰입이 길어질수록 멈출 시간을 미리 정해두는 게 좋습니다.",
    "완벽한 루틴을 만들기보다 바쁜 날에도 지킬 수 있는 최소 기준을 만드는 편이 오래 갑니다.",
    "생활 리듬이 잡히면 생각과 감정도 같이 정돈되는 경우가 많기 때문에, 바쁠수록 기본 시간을 먼저 지키는 편이 유리합니다."
  ];

  if(/휴식과 회복/.test(title))return[
    "휴식은 아무것도 하지 않는 시간만을 뜻하지 않습니다. 머릿속 흐름을 끊고 다른 감각을 쓰는 시간이 실제 회복에 더 도움이 될 수 있습니다.",
    "생각이 계속 이어지는 사람은 누워 있어도 일과 계획을 머릿속에서 반복하면 쉬었다는 느낌을 받기 어렵습니다.",
    weakest&&weak?`${elementPro(weakest)}이 맡는 ${weak.life}을 생활에 조금씩 넣어주는 것이 회복의 균형을 맞추는 데 도움이 됩니다.`:"평소 덜 쓰는 활동을 휴식에 섞으면 머리와 몸의 리듬을 바꾸기 쉽습니다.",
    "짧은 산책, 장소 변경, 화면을 보지 않는 시간처럼 생각의 방향을 끊어주는 휴식이 잘 맞습니다.",
    "회복을 일이 끝난 뒤 받는 보상으로 두지 말고 다음 일을 계속하기 위한 일정의 일부로 넣는 편이 좋습니다."
  ];

  if(/긴장과 스트레스/.test(title))return[
    "스트레스가 커지면 생각이 많아지고, 생각이 많아질수록 다시 피곤해지는 순환을 만들기 쉽습니다.",
    dominantFamily(facts)==="인성"?"인성의 비중이 큰 구조라 정보를 많이 받아들이고 안에서 정리하는 시간이 길어질 수 있습니다.":"스트레스를 받을 때 문제를 해결하려고 더 많이 확인하고 통제하려는 반응이 나올 수 있습니다.",
    relationSentence(facts),
    "이럴 때 더 생각해서 답을 찾으려 하기보다 지금 해결할 수 있는 것과 내일로 넘겨도 되는 것을 나누는 편이 훨씬 낫습니다.",
    "긴장을 줄이는 핵심은 모든 문제를 끝내는 것이 아니라 오늘 끝내지 않아도 되는 문제를 머릿속에서 내려놓는 데 있습니다."
  ];

  if(/활력이 떨어질 때/.test(title))return[
    "활력이 떨어지는 순간은 할 일이 많아서보다 무엇부터 해야 할지 흐려질 때 더 빨리 옵니다.",
    "해야 할 일이 여러 개 겹치면 전부 조금씩 건드리기보다 오늘 반드시 끝낼 하나를 먼저 정하는 편이 좋습니다.",
    weakest&&weak?`특히 ${elementPro(weakest)}이 약한 만큼 ${weak.life}과 연결된 행동이 빠지면 전체 리듬이 더 답답하게 느껴질 수 있습니다.`:"평소 덜 쓰는 힘이 빠질 때 피로가 더 크게 체감될 수 있습니다.",
    "몸이 지쳤는데 의지로만 밀어붙이면 다음 날의 회복 시간을 더 크게 빌려 쓰게 됩니다.",
    "활력을 되찾는 가장 빠른 방법은 일을 더 잘하려는 것이 아니라 우선순위를 줄이고 쉬는 시간을 먼저 확보하는 것입니다."
  ];

  if(/식사와 생활 습관/.test(title))return[
    "생활 습관에서는 거창한 관리보다 규칙성이 중요합니다.",
    "식사·수면·움직임 가운데 하나만 매일 비슷한 시간에 유지해도 전체 리듬을 잡는 기준점이 생깁니다.",
    "바쁜 날에 모든 습관을 포기하지 말고 최소한 지킬 한 가지를 남겨두는 편이 좋습니다.",
    "무리해서 며칠 몰아붙였다가 길게 쉬는 방식보다 일정한 속도로 가는 편이 이 사주에는 더 안정적입니다.",
    "건강 관리도 완벽한 계획보다 다음 주에도 반복할 수 있는 기준을 만드는 것이 핵심입니다."
  ];

  if(/건조함|몸이 차고/.test(title))return[
    `${title} 같은 표현은 명리에서 오행의 균형을 생활 이미지로 설명하기 위한 말입니다. 실제 질환이나 체질을 진단하는 뜻은 아닙니다.`,
    elementFact(facts)||"오행의 강약을 바탕으로 생활에서 과한 부분과 부족한 부분을 살펴봅니다.",
    "이런 장에서는 특정 음식이나 치료법을 단정하기보다 수면, 활동량, 수분, 식사처럼 기본 생활을 안정적으로 유지하는 쪽을 먼저 봅니다.",
    "몸의 불편은 사주보다 실제 증상과 검사 결과를 우선해야 합니다.",
    "해설은 생활 리듬을 점검하는 참고로만 보고, 이상이 지속되면 의료 전문가의 평가를 받는 것이 맞습니다."
  ];

  if(/잘 지키는 습관/.test(title))return[
    "해야 한다고 정한 일은 비교적 잘 지키는 편이지만, 당장 문제가 없어 보이는 자기 몸과 휴식은 뒤로 밀릴 수 있습니다.",
    "책임 있는 일정은 잘 챙기면서 검진, 운동, 쉬는 시간처럼 급하지 않은 자기관리는 미루기 쉬운 구조입니다.",
    "그래서 건강관리에서는 의지가 아니라 예약과 반복 일정으로 자동화하는 방식이 잘 맞습니다.",
    "잘하는 습관을 더 늘리기보다 자주 놓치는 한 가지를 고정하는 편이 효과가 큽니다.",
    "예방적인 관리는 문제가 생긴 뒤 크게 바꾸는 것보다 훨씬 적은 힘으로 오래 유지할 수 있습니다."
  ];

  if(/대운에서 건강/.test(title))return[
    "대운이 바뀌는 시기에는 건강 자체보다 생활환경과 책임이 달라지면서 리듬이 흔들리는 경우를 먼저 봅니다.",
    "직업·거주·가족 역할이 바뀌면 수면과 식사 시간이 같이 달라질 수 있기 때문에, 변화기에는 기본 습관을 먼저 고정하는 편이 좋습니다.",
    relationSentence(facts),
    "변화가 큰 때라고 건강 문제가 생긴다고 단정할 수는 없습니다. 다만 일정이 흔들릴 가능성이 크다면 무리한 계획을 줄이고 회복 시간을 확보하는 편이 안전합니다.",
    "운의 변화를 건강 예언으로 쓰기보다 생활 리듬이 깨지기 쉬운 시기를 미리 알고 관리 기준을 세우는 데 쓰는 것이 맞습니다."
  ];

  if(row.evidenceGroup==="WELLNESS")return[
    consultationOpening(row,facts)||`${title}은 생활 리듬과 회복 방식을 보는 장입니다.`,
    elementFact(facts)||"오행의 균형을 생활 습관과 연결해서 봅니다.",
    "건강운은 진단이나 치료를 대신하지 않습니다. 몸의 불편은 실제 의료 판단을 우선합니다.",
    "사주에서는 어떤 상황에서 무리하고 어떤 방식으로 회복하는지를 생활 기준으로 정리하는 정도가 가장 안전합니다."
  ];

  return null;
}



function nobleConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title;
  const noble=facts.starLabels.filter(label=>/귀인/.test(label));
  const stars=facts.starLabels.slice(0,5);

  if(/^귀인운$/.test(title)||/^귀인복$/.test(title))return[
    noble.length?`도움을 받을 수 있는 인연의 흐름이 있습니다. 다만 누군가가 늘 곁에서 모든 일을 해결해준다는 뜻은 아닙니다.`:"귀인운은 타고난 이름 하나보다 필요한 순간에 맞는 사람과 연결되는 방식으로 읽는 편이 정확합니다.",
    "이 사주에서 중요한 것은 도움의 양보다 타이밍입니다. 혼자 해결하기 어려운 문제를 만났을 때 경험이 맞는 사람에게 정확히 묻는 능력이 귀인운을 실제 힘으로 바꿉니다.",
    dominantFamily(facts)==="인성"?"선생·전문가·자료·배움 자체가 큰 도움으로 들어오기 쉬운 편입니다. 사람 한 명뿐 아니라 좋은 정보와 교육도 넓은 의미의 귀인이 됩니다.":"귀인은 친한 사람으로만 들어오지 않습니다. 일·거래·배움·소개처럼 목적이 분명한 관계에서 더 실질적인 도움을 받을 수 있습니다.",
    "도움을 받는다고 내 기준을 내려놓을 필요는 없습니다. 오히려 내가 필요한 것과 내가 책임질 것을 분명히 할수록 좋은 인연이 오래 갑니다.",
    "귀인운을 잘 쓰는 사람은 귀인을 기다리는 사람이 아니라, 기회가 왔을 때 알아보고 연결할 준비가 된 사람입니다."
  ];

  if(/사주에서 말하는 귀인이란/.test(title))return[
    "사주에서 말하는 귀인은 '나를 구해줄 사람'보다 내 선택의 폭을 넓혀주는 사람에 가깝습니다.",
    noble.length?`사람이나 정보, 기회를 통해 막힌 길이 열리는 흐름이 있습니다.`:"평소에는 혼자 해결하는 일이 많아도 특정 시기에는 사람이나 정보의 도움을 크게 체감할 수 있습니다.",
    "좋은 조언을 주는 사람, 일의 문을 열어주는 고객이나 거래처, 배움의 방향을 바꿔주는 전문가도 모두 귀인의 역할을 할 수 있습니다.",
    "중요한 건 유명한 사람을 만나는 것이 아니라 내가 막힌 지점과 정확히 맞는 연결을 얻는 것입니다.",
    "그래서 귀인운은 사람의 신분보다 '그 관계를 통해 실제로 무엇이 달라지는가'를 보는 편이 훨씬 현실적입니다."
  ];

  if(/내 사주에 들어온 귀인/.test(title))return[
    noble.length?`도움을 뜻하는 인연의 표시가 들어와 있습니다.`:"평소 도움을 받는 일이 많지 않더라도 특정 시기에 좋은 연결이 들어올 수 있습니다.",
    starSentence(facts),
    "귀인이 있다는 말은 평생 도움만 받는다는 뜻이 아닙니다. 오히려 중요한 선택 앞에서 적절한 연결이 생길 가능성을 하나의 장점으로 보는 편이 맞습니다.",
    "그 연결을 살리려면 평소 혼자 해결하는 습관만 고집하지 않고, 필요한 순간에 도움을 요청할 수 있어야 합니다.",
    "좋은 인연은 한 번의 호의보다 시간이 지나며 선택과 결과를 바꿔주는 관계로 확인됩니다."
  ];

  if(/배움에서 만나는 귀인/.test(title))return[
    "배움에서 만나는 귀인은 단순히 지식을 많이 알려주는 사람이 아닙니다. 내가 무엇을 더 배워야 하는지 방향을 잡아주는 사람이 더 중요합니다.",
    familyPresence(facts,"인성"),
    "책·강의·자료처럼 사람이 아닌 정보도 이 사주에서는 충분히 귀인 역할을 할 수 있습니다.",
    "배운 것을 바로 작은 일에 적용해보면 어떤 인연과 정보가 실제로 도움이 되는지 빠르게 구분할 수 있습니다.",
    "배움의 귀인을 잘 쓰는 핵심은 많이 듣는 것이 아니라, 좋은 지식을 내 선택과 결과로 바꾸는 데 있습니다."
  ];

  if(/뜻밖의 기회를 주는 귀인/.test(title))return[
    "뜻밖의 기회는 아주 가까운 사람보다 새로운 일과 외부 연결에서 들어오는 경우가 더 체감되기 쉽습니다.",
    familyCount(facts,"재성")>0?"고객·거래·시장과 연결된 사람이 실제 기회로 이어질 가능성이 큽니다.":"외부 인연이 실제 기회가 되려면 호감보다 역할과 조건이 맞는지가 먼저입니다.",
    "소개나 제안을 받았을 때 '좋은 사람 같다'는 느낌과 실제 계약 조건은 따로 보는 편이 좋습니다.",
    "기회가 되는 귀인은 대신 결정해주는 사람이 아니라 내가 할 수 있는 일을 더 큰 판과 연결해주는 사람에 가깝습니다.",
    "따라서 새로운 사람을 많이 만나는 것보다, 지금 필요한 기회가 무엇인지 분명히 알고 만나는 편이 훨씬 유리합니다."
  ];

  if(/귀인은 어디에서 만날까/.test(title))return[
    "귀인은 집 안에서 기다리는 것보다 내가 움직이는 자리에서 만날 가능성이 커집니다. 일, 배움, 거래, 프로젝트처럼 역할이 있는 공간이 중요합니다.",
    familyCount(facts,"인성")>=familyCount(facts,"재성")?"배움과 전문성의 연결이 강한 편이라 강의·전문가·업무 네트워크에서 좋은 인연을 만날 가능성을 눈여겨봅니다.":"시장과 현실 결과를 다루는 연결이 중요해 고객·거래처·프로젝트 인맥에서 기회가 생길 가능성을 눈여겨봅니다.",
    "좋은 인연은 처음부터 친한 사람이 아니라 서로 할 수 있는 일이 분명한 사람일 때 오래갑니다.",
    "내가 가진 것을 설명할 준비가 되어 있어야 상대도 어디에서 도와줄 수 있는지 알 수 있습니다.",
    "귀인운을 넓히는 가장 현실적인 방법은 사람 수를 늘리는 것이 아니라 내가 하는 일과 필요한 도움을 분명하게 보여주는 것입니다."
  ];

  if(/귀인운이 강해지는 때/.test(title))return[
    "귀인운이 강해지는 시기는 사람을 무조건 많이 만나는 시기가 아니라, 도움과 기회가 실제 선택에 연결되기 쉬운 때를 말합니다.",
    "이때는 혼자 해결하려고 시간을 오래 쓰기보다 전문가, 경험자, 거래 파트너처럼 역할이 분명한 사람의 도움을 빨리 쓰는 편이 좋습니다.",
    "좋은 흐름이라고 모든 제안을 받아들일 필요는 없습니다. 어떤 연결이 내 방향과 맞는지 확인하는 기준은 그대로 필요합니다.",
    "운이 좋아도 준비가 되어 있지 않으면 좋은 인연을 스쳐 지나갈 수 있습니다.",
    "평소에 내가 하는 일과 필요한 도움을 정리해두는 것이 귀인운을 가장 현실적으로 쓰는 방법입니다."
  ];

  if(/귀인을 알아보는 법/.test(title))return[
    "귀인은 나에게 좋은 말만 해주는 사람이 아닙니다. 때로는 현실적인 기준을 보여주고 잘못된 방향을 빨리 끊어주는 사람이 더 큰 귀인이 될 수 있습니다.",
    "만난 뒤 선택지가 넓어지는지, 일이 더 명확해지는지, 혼자였을 때보다 결과가 좋아지는지를 보면 관계의 가치를 판단하기 쉽습니다.",
    "반대로 의존하게 만들거나 기준을 흐리게 하는 관계는 이름이 좋아도 귀인으로 보기 어렵습니다.",
    "도움받은 만큼 내 책임도 분명히 할 수 있는 관계가 오래갑니다.",
    "결국 귀인을 알아보는 기준은 '이 사람 덕분에 내가 더 나은 선택을 할 수 있는가'입니다."
  ];

  if(row.evidenceGroup==="NOBLE")return[
    starSentence(facts),
    noble.length?`좋은 인연은 사람 한 명보다 필요한 순간에 들어오는 조언·소개·기회처럼 나타날 수 있습니다.`:"귀인운은 원국과 시기를 함께 보는 편이 좋습니다.",
    "귀인운은 의존을 뜻하지 않습니다. 필요한 순간에 맞는 사람과 연결되고 그 도움을 실제 결과로 바꾸는 능력에 가깝습니다.",
    "좋은 인연일수록 역할과 기대가 분명할 때 오래갑니다."
  ];

  return null;
}

function starRelationConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title;
  const has=(token:string)=>facts.starLabels.some(label=>label.includes(token));
  const relations=relationSummary(facts);

  if(/^신살$/.test(title)||/눈에 띄는 신살|강하게 보이는 신살/.test(title))return[
    starSentence(facts),
    facts.starLabels.length?`현재 원국에서 먼저 볼 신살은 ${facts.starLabels.slice(0,5).join(" · ")}입니다.`:"특정 신살 이름보다 원국의 오행과 십성, 관계를 먼저 보는 것이 중요합니다.",
    "신살은 성격과 사건을 단독으로 결정하는 힘이 아닙니다. 다른 계산 결과와 같은 방향을 가리킬 때 의미가 더 선명해집니다.",
    "예를 들어 대중성 신호가 있어도 표현하는 힘이 실제로 작동해야 사람 앞에 드러나고, 이동 신호가 있어도 실제 운에서 변화가 들어와야 체감이 커질 수 있습니다.",
    "그래서 이 장에서는 신살을 무섭게 나열하기보다 어디에서 장점으로 쓰이고 어디에서 과해질 수 있는지 중심으로 봅니다."
  ];

  if(/사람의 시선을 끄는 힘/.test(title))return[
    has("도화")?"사람들 사이에서 눈에 띄고 기억에 남는 힘이 있습니다. 이건 연애운만 뜻하는 게 아니라 말투, 분위기, 취향, 캐릭터처럼 '이 사람은 뭔가 다르다'는 인상을 남기는 쪽으로도 나타납니다.":"대중에게 보이는 힘은 외모 하나로 결정되지 않습니다. 표현력과 이미지, 사람 앞에서 드러나는 태도가 함께 작용합니다.",
    "이 힘은 외모만을 뜻하지 않습니다. 말투, 분위기, 캐릭터, 취향, 브랜드처럼 '이 사람은 뭔가 다르다'는 인상을 만드는 쪽으로도 작동합니다.",
    familyCount(facts,"식상")>0?"식상까지 함께 있으면 이 주목도를 콘텐츠와 표현으로 연결하기 좋습니다.":"표현을 맡는 식상이 약하다면 주목을 받는 것과 꾸준히 콘텐츠를 내놓는 것은 별개의 과제가 될 수 있습니다.",
    "잘 쓰면 대중성, 홍보, 콘텐츠, 고객 접점에서 장점이 됩니다. 반대로 타인의 반응을 지나치게 의식하면 자기 기준이 흔들릴 수 있습니다.",
    "주목받는 힘의 핵심은 더 튀는 것이 아니라 나만의 특징을 꾸준히 같은 방향으로 보여주는 데 있습니다."
  ];

  if(/혼자 깊이 파고드는 힘/.test(title))return[
    has("화개")?"혼자 있는 시간에 한 분야를 깊게 파고드는 힘이 강한 편입니다. 관심이 생긴 주제는 겉핥기보다 자기 방식으로 끝까지 이해하려고 합니다.":"혼자 깊이 파고드는 힘은 한 가지 표시보다 평소 배우고 생각하는 습관을 함께 봐야 더 정확합니다.",
    familyCount(facts,"인성")>0?"인성도 함께 작동해 관심이 생긴 분야를 자료·공부·전문지식으로 깊게 확장하는 힘이 있습니다.":"관심이 생긴 주제는 겉핥기보다 자기 방식으로 정리해 이해하려는 경향이 있습니다.",
    "이 힘은 연구, 전문지식, 기획, 심리, 철학처럼 답이 한 번에 나오지 않는 분야에서 장점이 될 수 있습니다.",
    "반대로 혼자 생각하는 시간이 너무 길어지면 밖으로 결과를 내는 속도가 늦어질 수 있습니다.",
    "깊이 파는 힘은 세상과 끊어질 때보다 배운 것을 밖에 꺼내 사람과 연결할 때 가장 크게 살아납니다."
  ];

  if(/예민하게 감지하는 힘/.test(title))return[
    "이 사주는 사람의 말 자체보다 말투와 분위기, 앞뒤의 변화까지 같이 읽는 힘을 중요하게 봅니다.",
    has("귀문")||has("원진")?"가까운 사람의 말투나 분위기가 평소와 조금만 달라져도 빨리 알아차리는 편입니다. 장점은 섬세함이지만, 실제 일보다 가능성을 먼저 생각하면 피로가 커질 수 있습니다.":"작은 변화도 빠르게 감지하는 편이라 사람의 반응이나 분위기를 읽는 데 강점이 있습니다.",
    "장점은 남들이 지나친 신호를 빨리 알아차린다는 점입니다. 고객 반응이나 관계의 분위기를 읽는 일에서는 큰 강점이 됩니다.",
    "단점은 실제로 일어난 일보다 가능성을 더 많이 생각해 피로가 커질 수 있다는 점입니다.",
    "감각이 예민할수록 추측과 사실을 한번 나눠보는 습관이 필요합니다. 느낀 것이 틀렸다는 뜻이 아니라, 정확한 감각을 오래 쓰기 위한 기준입니다."
  ];

  if(/가까울수록 꼬이기 쉬운 관계/.test(title))return[
    relations.length?`원국의 관계에서는 ${relations.join(", ")}이 확인됩니다.`:"원국에 가까운 관계를 크게 흔드는 관계 신호가 여러 겹으로 잡힌 편은 아닙니다.",
    "가까운 관계에서 생기는 문제는 사랑의 크기보다 '말하지 않아도 알겠지'라는 기대에서 시작되는 경우가 많습니다.",
    "특히 신뢰와 약속에 민감한 사람은 작은 어긋남을 단순한 실수보다 관계 전체의 문제로 받아들이기 쉽습니다.",
    "이럴수록 상대의 의도를 추측하기보다 실제 행동과 말을 한번 확인하는 것이 중요합니다.",
    "가까운 사이일수록 설명을 줄이지 않는 것이 관계가 꼬이는 힘을 가장 현실적으로 줄이는 방법입니다."
  ];

  if(/날카롭게 몰입하는 힘/.test(title))return[
    has("현침")||has("침")?"작은 차이를 놓치지 않고 세밀하게 보는 힘이 있습니다. 품질을 높이거나 오류를 찾는 일에서는 큰 장점이 됩니다.":"몰입과 디테일은 한 가지 표시보다 평소 책임감과 학습 습관을 함께 볼 때 더 정확합니다.",
    "이 힘은 품질을 높이고 오류를 잡는 일에서 큰 장점입니다. 남들이 대충 넘어간 부분을 끝까지 확인할 수 있습니다.",
    "다만 완성도를 높이려는 마음이 커질수록 스스로에게도 너무 엄격해질 수 있습니다.",
    "모든 일에 같은 완성도를 요구하면 중요한 일과 덜 중요한 일의 구분이 흐려집니다.",
    "몰입을 강점으로 오래 쓰려면 '여기까지면 충분하다'는 완료 기준을 시작 전에 정해두는 편이 좋습니다."
  ];

  if(/부딪힘|흔들림|압박/.test(title))return[
    relationSentence(facts),
    "사람이나 환경이 부딪히는 흐름이 있다고 해서 나쁜 일이 생긴다는 뜻은 아닙니다. 익숙한 방식이 흔들리면서 새로운 선택이 필요해지는 때가 있다는 뜻에 가깝습니다.",
    "원국에 이미 있는 관계는 평생의 성격처럼 고정된 사건이 아니라 비슷한 상황에서 반복해서 신경 쓰이는 패턴에 가깝습니다.",
    "운에서 같은 관계가 다시 들어올 때는 생활환경, 역할, 사람 관계의 변화가 더 크게 체감될 수 있습니다.",
    "중요한 건 겁내는 것이 아니라 어떤 부분이 움직이기 쉬운지 알고 계약·이동·관계의 기준을 미리 세우는 것입니다."
  ];

  if(/서로 끌어당기고 커지는 힘/.test(title))return[
    facts.relationCounts.combination>0?"한 사람이나 일에 마음과 힘이 빠르게 모이는 성향이 있습니다. 잘 맞는 상대나 목표를 만나면 집중력이 크게 올라가는 편입니다.":"평소에는 한곳에 힘이 몰리지 않아도 특정 시기에는 사람이나 일 하나에 집중력이 크게 올라갈 수 있습니다.",
    "이런 끌림이 무조건 좋은 것만은 아닙니다. 힘이 한쪽으로 모이는 만큼 다른 선택지가 잘 보이지 않을 수도 있습니다.",
    "잘 쓰이면 협업, 계약, 집중력처럼 힘을 한곳에 모으는 장점이 됩니다.",
    "반대로 한 관계나 일에 너무 많은 에너지가 묶이면 다른 선택지가 줄어들 수 있습니다.",
    "중요한 건 무엇과 무엇이 붙었는지가 아니라, 그 만남 때문에 내 삶에서 어떤 선택과 행동이 더 커지는지입니다."
  ];

  if(/신살은 어떻게 봐야/.test(title))return[
    "신살은 사주의 메인 계산이 아니라 보조 설명입니다. 신살 하나로 성격, 결혼, 재물, 사건을 확정하는 방식은 피하는 게 맞습니다.",
    starSentence(facts),
    "오행·십성·원국 관계에서 이미 보이는 특징과 신살이 같은 방향을 가리킬 때 그 의미를 조금 더 강하게 볼 수 있습니다.",
    "반대로 신살 이름은 강해 보여도 다른 계산에서 근거가 약하면 참고 수준으로 두는 편이 안전합니다.",
    "이 사주에서 신살의 가치는 운명을 겁주는 데 있지 않고, 이미 가진 장점을 어디에 활용할지 설명해주는 보조 언어에 있습니다."
  ];

  if(row.evidenceGroup==="STARS_RELATIONS")return[
    starSentence(facts),
    relationSentence(facts),
    "신살과 원국 관계는 단독으로 결론을 내리지 않고 오행·십성의 흐름과 같은 방향을 가리키는지 확인합니다.",
    "이 장의 목적은 무서운 이름을 붙이는 것이 아니라 실제 생활에서 어떤 힘이 반복되는지 이해하는 데 있습니다."
  ];

  return null;
}

function twelveStageConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title;
  const all=[["year","년주"],["month","월주"],["day","일주"],["hour","시주"]] as const;

  if(/^십이운성$/.test(title)||/한눈에 보기/.test(title))return[
    `십이운성은 ${all.map(([position])=>facts.stageByPosition[position]).filter(Boolean).join(" → ")}의 흐름으로 잡힙니다.`,
    "이 이름들은 인생이 그대로 흥하고 쇠한다는 뜻이 아닙니다. 각 자리에서 에너지를 어떤 방식으로 쓰는지 설명하는 열두 단계입니다.",
    ...all.slice(0,2).map(([position,label])=>stageSentence(facts,position,label)),
    "네 자리를 함께 보면 어릴 때, 사회생활, 가까운 관계, 후반으로 갈수록 힘을 쓰는 방식이 어떻게 달라지는지 읽을 수 있습니다."
  ].filter(Boolean);

  if(/12단계|뜻하는 것/.test(title))return[
    "십이운성은 생명력이 생기고 자라고 정점에 올랐다가 다시 정리되는 순환을 열두 단계로 나눈 개념입니다.",
    "장생·건록·제왕처럼 이름이 강해 보이는 단계가 무조건 좋고, 쇠·병·사처럼 이름이 약해 보이는 단계가 나쁘다는 뜻은 아닙니다.",
    "어떤 단계는 시작과 확장에 강하고, 어떤 단계는 선택과 정리, 깊이 있는 경험에 강합니다.",
    "중요한 건 내 사주의 각 자리에 어떤 단계가 놓였는지, 그 자리가 무엇을 뜻하는지를 같이 보는 것입니다.",
    "그래서 십이운성은 운세 점수보다 인생의 각 장면에서 힘을 쓰는 리듬을 설명하는 도구로 보는 편이 정확합니다."
  ];

  for(const [position,label] of all){
    if(title.includes(label+"의 십이운성"))return[
      stageSentence(facts,position,label),
      pillarRoleSentence(facts,position,label),
      facts.stageByPosition[position]?`${facts.stageByPosition[position]}의 핵심은 ${STAGE_STORY[facts.stageByPosition[position]]??"그 자리의 고유한 리듬"}입니다.`:"이 자리의 단계는 다른 기둥과 함께 읽습니다.",
      position==="year"?"초반에는 새로운 환경을 받아들이고 자기 기준을 만드는 과정과 연결됩니다.":position==="month"?"사회생활에서는 일을 배우고 역할을 키우는 과정과 연결됩니다.":position==="day"?"가까운 관계에서는 감정과 중요한 선택을 다루는 모습으로 연결됩니다.":"후반으로 갈수록 경험을 어디에 집중하고 무엇을 남길지가 중요해집니다.",
      "십이운성 하나만으로 결론을 내리지 않고 오행과 십성, 원국 관계를 함께 볼 때 실제 모습이 더 선명해집니다."
    ];
  }

  if(/인생 초반/.test(title))return[
    stageSentence(facts,"year","초반 흐름을 보는 년주"),
    stageSentence(facts,"month","사회로 넘어가는 월주"),
    "초반은 결과를 빨리 확정하는 시기보다 환경을 경험하고 자기 기준을 만드는 과정으로 읽는 편이 좋습니다.",
    "이때의 시행착오는 나중에 무엇을 잘하고 무엇을 피해야 하는지 판단하는 자료가 됩니다.",
    "초반의 속도보다 경험을 자기 것으로 만드는 힘이 이후 흐름에 더 오래 남습니다."
  ];

  if(/인생 중반/.test(title))return[
    stageSentence(facts,"month","중반의 사회 흐름을 보는 월주"),
    stageSentence(facts,"day","나 자신을 보는 일주"),
    "중반은 배운 것과 경험을 실제 직업·돈·관계의 선택으로 굳히는 시기입니다.",
    "무엇을 해야 결과가 남고 무엇이 시간을 소모하는지 구분하는 힘이 점점 중요해집니다.",
    "이때는 모든 가능성을 열어두는 것보다 잘 맞는 영역을 선택해 깊게 가져가는 편이 유리합니다."
  ];

  if(/인생 후반/.test(title))return[
    stageSentence(facts,"hour","후반 흐름을 보는 시주"),
    "후반으로 갈수록 직접 모든 일을 처리하는 힘보다 경험을 이용해 판단하고 선택하는 힘이 더 중요해집니다.",
    "지금까지 쌓은 전문성과 관계를 어떻게 남기고 전달할지가 후반 만족도와 연결될 수 있습니다.",
    "모든 역할을 끝까지 붙잡기보다 중요한 것만 남기고 다른 사람에게 넘길 수 있는 능력이 필요합니다.",
    "후반의 운은 활동이 줄어든다는 뜻보다 힘을 쓰는 방식이 더 선택적으로 바뀐다는 뜻으로 보는 편이 맞습니다."
  ];

  if(row.evidenceGroup==="TWELVE_STAGES")return[
    `${title}은 십이운성의 이름보다 그 자리에 놓인 단계가 어떤 힘을 쓰는지 보는 장입니다.`,
    ...all.map(([position,label])=>stageSentence(facts,position,label)).filter(Boolean).slice(0,2),
    "십이운성은 좋고 나쁨을 단정하지 않고 오행·십성·대운과 함께 봅니다."
  ];

  return null;
}

function tenGodConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,dominant=dominantFamily(facts);
  const visible=Object.values(facts.stemTenGodByPosition).filter(Boolean);
  const hidden=Object.values(facts.branchMainTenGodByPosition).filter(Boolean);

  if(/^십성$/.test(title)||/한눈에 보기|십성 분포/.test(title))return[
    dominantFamilySentence(facts),
    "십성은 사람을 열 가지 성격으로 잘라 보는 표가 아닙니다. 내가 스스로 밀어붙이는 힘, 밖으로 표현하는 힘, 돈과 결과를 다루는 힘, 책임을 맡는 힘, 배우고 이해하는 힘이 어떤 비중으로 섞여 있는지를 보는 도구입니다.",
    `이 사주에서는 ${familyMeaning(dominant)}이 가장 먼저 눈에 들어옵니다. 이 힘은 익숙하게 쓰는 장점이지만, 너무 많이 쓰면 피로의 원인이 될 수도 있습니다.`,
    "반대로 덜 익숙한 힘은 능력이 없다는 뜻이 아닙니다. 필요한 순간에 의식적으로 꺼내 쓰고 경험을 쌓을수록 전체 균형이 좋아집니다.",
    "그래서 이 장에서는 어려운 이름을 외우기보다, 어떤 힘이 자연스럽고 어떤 힘은 일부러 키워야 하는지를 중심으로 읽으면 충분합니다."
  ];

  if(/십성 10가지 뜻/.test(title))return[
    "십성 열 가지는 결국 다섯 역할을 음양에 따라 다시 나눈 것입니다. 비겁은 나와 경쟁, 식상은 표현과 생산, 재성은 돈과 결과, 관성은 책임과 규칙, 인성은 배움과 이해를 맡습니다.",
    "같은 돈의 기운 안에서도 안정적으로 관리하는 힘과 기회를 넓게 잡는 힘이 다르고, 같은 책임의 기운 안에서도 기준을 지키는 힘과 압박 속에서 결단하는 힘이 다릅니다. 이름을 외우기보다 실제 행동의 차이로 이해하면 훨씬 쉽습니다.",
    "중요한 건 어려운 이름보다 이 힘들이 실제 생활에서 어디에서 자주 나오고 서로 어떻게 섞이는지입니다.",
    dominantFamilySentence(facts),
    "뒤에서는 어려운 이름보다 실제 생활에서 어떻게 행동하고 선택하는지를 중심으로 이어서 보겠습니다."
  ];

  for(const [family,pattern] of [["비겁",/비겁/],["식상",/식상/],["재성",/재성/],["관성",/관성/],["인성",/인성/]] as const){
    if(pattern.test(title))return[
      familyPresence(facts,family),
      family==="비겁"?"비겁은 스스로 결정하고 버티는 힘입니다. 잘 쓰면 독립성과 경쟁력이 되지만, 과해지면 도움을 받기보다 모든 일을 직접 하려는 모습으로 바뀔 수 있습니다.":family==="식상"?"식상은 생각을 말과 결과물로 밖에 꺼내는 힘입니다. 콘텐츠·표현·생산·판매처럼 눈에 보이는 결과를 만들 때 이 힘을 씁니다.":family==="재성"?"재성은 돈만 뜻하지 않습니다. 시간·자원·사람을 현실적인 결과로 운영하고 매출·자산처럼 숫자로 남기는 힘입니다.":family==="관성"?"관성은 책임과 규칙, 사회에서 맡는 역할을 뜻합니다. 기준을 지키고 신뢰를 쌓는 힘이지만, 통제와 압박이 과해지면 스트레스가 커질 수 있습니다.":"인성은 배우고 이해하고 받아들이는 힘입니다. 정보를 자기 것으로 만들고 전문성을 쌓는 데 강하지만, 생각과 준비만 길어질 수 있다는 점도 함께 봅니다.",
      family===dominant?"이 힘은 평소 선택에서 자주 앞에 나오는 편입니다. 익숙하게 잘 쓰는 만큼 과해지는 순간만 조절하면 좋습니다.":"이 힘은 늘 앞에 나오는 편은 아니지만, 필요한 장면에서 의식적으로 쓰면 전체 균형이 좋아집니다.",
      family===dominant?"일과 관계에서도 이 힘을 자주 쓰게 됩니다. 그래서 장점이 분명한 만큼 피로가 쌓이는 순간도 알아두는 편이 좋습니다.":"필요한 장면에서 이 힘을 일부러 꺼내 쓰는 연습이 도움이 됩니다.",
      "강한 십성은 더 키우는 것보다 과해지는 순간을 조절하고, 약한 십성은 능력이 없다고 보기보다 필요한 때 쓸 수 있도록 경험을 쌓는 편이 좋습니다."
    ];
  }

  if(/겉으로 드러난 십성/.test(title))return[
    `겉으로 드러난 자리에서는 ${Array.from(new Set(visible)).join(" · ")||"여러 역할"}이 먼저 보입니다.`,
    "겉의 십성은 사람들이 나를 처음 보고 어떤 역할의 사람으로 받아들이기 쉬운지를 설명해줍니다.",
    "일을 맡았을 때, 처음 만났을 때, 책임이 생겼을 때처럼 밖으로 행동해야 하는 장면에서 이 역할이 빠르게 드러납니다.",
    hidden.length?`하지만 속에는 ${Array.from(new Set(hidden)).join(" · ")}도 함께 있어 겉으로 보이는 모습만으로 마음 전체를 설명하기는 어렵습니다.`:"속의 역할은 다른 계산과 함께 봅니다.",
    "겉의 역할을 잘한다고 항상 그 역할이 편한 것은 아닙니다. 잘 보이는 힘과 실제로 충전되는 힘이 다를 수 있습니다."
  ];

  if(/속에 숨은 십성/.test(title))return[
    `속에 깔린 역할에서는 ${Array.from(new Set(hidden)).join(" · ")||"여러 십성"}이 중요합니다.`,
    "숨은 십성은 바로 행동으로 보이기보다 마음속 판단, 오래된 습관, 가까운 관계에서 천천히 드러납니다.",
    visible.length?`겉에서는 ${Array.from(new Set(visible)).join(" · ")}이 먼저 보이지만, 속의 역할과 다르면 주변이 보는 나와 내가 느끼는 나 사이에 차이가 생길 수 있습니다.`:"겉과 속의 역할을 같이 봐야 실제 성향이 선명해집니다.",
    "속에 강한 역할은 평소에는 잘 드러나지 않아도 스트레스가 크거나 아주 편한 사람 앞에서 갑자기 커질 수 있습니다.",
    "그래서 십성은 겉으로 보이는 것과 안에 숨은 것을 나눠 읽는 편이 훨씬 정확합니다."
  ];

  if(/겉으로 보이는 나와 속마음/.test(title))return[
    `겉의 십성은 ${Array.from(new Set(visible)).join(" · ")||"여러 역할"}, 속의 중심 역할은 ${Array.from(new Set(hidden)).join(" · ")||"다른 역할"}로 나뉩니다.`,
    "두 층이 비슷하면 겉과 속의 차이가 적고, 다르면 사회에서 보이는 모습과 혼자 느끼는 마음의 온도차가 커질 수 있습니다.",
    "예를 들어 밖에서는 책임감 있게 정리하면서도 속에서는 계속 배우고 확인하고 싶을 수 있고, 반대로 겉은 유연해 보여도 속 기준은 매우 단단할 수 있습니다.",
    "이 차이를 억지로 없앨 필요는 없습니다. 다만 밖에서 오래 버틴 뒤 가까운 사람에게 피로가 몰리지 않도록 중간에서 마음을 설명하는 시간이 필요합니다.",
    "겉과 속을 모두 자기 모습으로 인정할 때 역할 전환에서 오는 피로가 훨씬 줄어듭니다."
  ];

  if(/상황마다 달라지는 십성/.test(title))return[
    "십성은 한 사람이 늘 같은 역할만 쓰지 않는다는 것을 보여줍니다.",
    pillarRoleSentence(facts,"month","사회생활의 월주"),
    pillarRoleSentence(facts,"day","가까운 관계의 일주"),
    pillarRoleSentence(facts,"hour","후반과 결과의 시주"),
    "어떤 자리에서 어떤 십성이 앞에 나오는지 알면 '왜 일할 때의 나와 집에서의 내가 이렇게 다르지?'라는 차이를 훨씬 자연스럽게 이해할 수 있습니다."
  ];

  if(row.evidenceGroup==="TEN_GODS")return[
    dominantFamilySentence(facts),
    "십성은 어려운 이름을 외우는 표가 아니라, 일·돈·관계에서 어떤 힘을 자연스럽게 쓰는지 이해하는 데 도움이 됩니다.",
    familyPresence(facts,dominant),
    "잘 쓰는 힘은 과해지는 순간을 조절하고, 덜 익숙한 힘은 필요한 장면에서 조금씩 써보는 정도로 이해하면 충분합니다."
  ];

  return null;
}



function timingConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  const title=row.topic??row.title,group=row.evidenceGroup??"",context=periodContext(input,row),axis=fortuneAxis(input,row);
  const favor=FAVORABILITY_LABELS[axis.favorabilityLevel]??"",activation=ACTIVATION_LABELS[axis.activationLevel]??"";

  if(group==="FORTUNE_EXPLAIN")return[
    "대운·연운·월운은 같은 운을 세 번 말하는 것이 아닙니다. 각각 보는 시간의 크기가 다릅니다.",
    "대운은 약 십 년 동안 이어지는 큰 환경과 역할의 변화를 보고, 연운은 그 십 년 안에서 특정 해에 무엇이 더 움직이는지를 봅니다.",
    "월운은 한 해 안에서도 변화가 집중되는 달을 좁혀보는 도구입니다. 큰 흐름이 좋아도 특정 달에는 일이 몰릴 수 있고, 반대로 부담 있는 해에도 편하게 지나가는 달이 있습니다.",
    "POSTPOST는 '도움이 되는 정도'와 '움직임이 큰 정도'를 따로 계산합니다. 일이 많이 생긴다고 무조건 좋은 운이 아니고, 조용하다고 나쁜 운도 아닙니다.",
    "그래서 시기운은 사건을 맞히기보다 언제 무엇을 준비하고, 어느 분야에서 선택이 많아질지를 보는 방식으로 읽습니다."
  ];

  if(group==="YEARLY_OVERVIEW"){
    if(/앞으로 5년 한눈에 보기/.test(title))return[
      "앞으로 다섯 해는 한 문장으로 좋다 나쁘다 정하기보다 해마다 움직이는 분야가 어떻게 바뀌는지 이어서 보는 것이 중요합니다.",
      "어떤 해는 직업과 사업이 먼저 움직이고, 어떤 해는 돈이나 관계가 더 크게 체감될 수 있습니다.",
      topCategorySentence(input,row)||"다섯 해를 비교하면 도움을 받기 쉬운 분야와 실제 변화가 큰 분야가 서로 다르게 나타날 수 있습니다.",
      "첫해의 선택이 다음 해의 결과로 이어지고, 중간의 변화가 뒤의 구조를 바꾸는 식으로 다섯 해는 서로 연결되어 움직입니다.",
      "따라서 한 해만 떼어 판단하기보다 시작·전환·정리의 순서를 보면서 계획을 잡는 편이 훨씬 정확합니다."
    ];

    if(/5년 전체 흐름/.test(title))return[
      "다섯 해 전체 흐름에서 가장 먼저 볼 것은 '무엇이 시작되고 무엇이 굳어지는가'입니다.",
      topCategorySentence(input,row)||"직업·재물·관계의 움직임을 따로 비교해 가장 큰 축을 찾습니다.",
      "초반에 활동이 커지는 분야는 경험과 결과물을 만들고, 뒤쪽에서 지원이 높아지는 분야는 그 결과를 안정시키는 쪽으로 쓰는 편이 좋습니다.",
      "변화가 겹치는 해에는 모든 것을 동시에 바꾸기보다 이후 몇 년까지 가져갈 한두 가지를 선택하는 것이 중요합니다.",
      "이 다섯 해를 잘 쓰는 기준은 매년 다른 목표를 만드는 것이 아니라, 해마다 역할이 달라지는 같은 큰 방향을 유지하는 데 있습니다."
    ];

    if(/직업·재물·관계 변화/.test(title))return[
      "앞으로 다섯 해는 직업·재물·관계가 같은 속도로 움직이지 않습니다. 어느 한쪽이 커질 때 다른 쪽의 시간을 빌려 쓰는 경우가 생길 수 있습니다.",
      topCategorySentence(input,row)||"각 분야의 지원과 움직임을 나눠보면 우선순위가 더 선명해집니다.",
      "직업이 커지는 해에는 돈보다 역할과 책임이 먼저 늘 수 있고, 재물이 살아나는 해에는 이전에 만든 결과를 수익으로 굳히는 과정이 중요해집니다.",
      "관계가 많이 움직이는 해에는 사람 수보다 어떤 관계를 유지하고 어떤 관계를 정리할지가 더 중요할 수 있습니다.",
      "세 분야를 동시에 완벽하게 가져가려 하기보다 그해 가장 크게 움직이는 축 하나를 중심에 두는 편이 현실적입니다."
    ];

    if(/기억할 점/.test(title))return[
      "앞으로 다섯 해에서 기억할 것은 '좋은 해를 기다리는 것'보다 해마다 다른 역할을 제대로 쓰는 것입니다.",
      "지원이 높은 해에는 결과를 남기고, 움직임이 큰 해에는 선택지를 정리하며, 부담이 큰 해에는 무리한 확장보다 구조를 다듬는 편이 좋습니다.",
      "한 해의 평가를 연말 결과 하나로만 하지 말고 그해 새로 생긴 역할·사람·기술이 다음 해에 무엇으로 이어졌는지까지 보세요.",
      "운이 바뀌어도 원국의 강점은 사라지지 않습니다. 다만 같은 강점을 쓰는 방법이 시기마다 달라집니다.",
      "다섯 해의 흐름은 미래를 확정하는 예언보다 지금 무엇을 먼저 준비할지 정하는 장기 일정표로 쓰는 편이 가장 유용합니다."
    ];

    return[
      `${title}에서는 다섯 해의 지원과 움직임을 비교합니다.`,
      topCategorySentence(input,row)||"직업·재물·관계 가운데 어느 분야가 먼저 움직이는지를 봅니다.",
      "좋은 흐름과 바쁜 흐름은 같은 뜻이 아니므로 반드시 따로 읽습니다.",
      "각 해의 결과보다 다섯 해가 어떤 순서로 이어지는지를 보는 편이 중요합니다."
    ];
  }

  if(/^YEAR_[1-5]$/.test(group)){
    const year=context.seunYear,periodPillar=context.seunPillar;
    const heading=year?`${year}년`:title;
    return[
      periodPillar?`${heading}은 ${pillarReading(periodPillar[0],periodPillar[1])}의 기운이 들어오는 해입니다.`:`${heading}은 앞뒤 해와 비교해 어떤 분야가 움직이는지 보는 해입니다.`,
      periodPillar?fortunePillarSentence(periodPillar):"그해의 간지와 현재 대운, 원국의 관계를 함께 봅니다.",
      favor&&activation?`계산상 ${favor}이면서 ${activation}입니다. 도움을 받는 정도와 실제 변화량을 따로 봐야 이 해의 성격이 정확해집니다.`:favor?`전체적으로 ${favor}으로 읽습니다.`:activation?`이 해는 ${activation}입니다.`:"한 해의 분위기는 지원과 활동을 나누어 판단합니다.",
      topCategorySentence(input,row)||"직업·재물·관계·학업·변화 가운데 어느 분야의 선택이 많아지는지를 따로 확인합니다.",
      activation.includes("커지는")||activation.includes("매우")?"움직임이 큰 해에는 기회와 부담이 같이 늘 수 있습니다. 모든 제안을 잡기보다 이후에도 남길 선택을 고르는 편이 좋습니다.":"움직임이 크지 않은 해에는 억지로 판을 키우기보다 기존 결과를 정리하고 다음 변화를 준비하는 편이 좋습니다."
    ];
  }

  if(group==="MONTHLY")return[
    "월운은 한 해를 열두 조각으로 나눠 '언제 체감이 커지는가'를 보는 장입니다.",
    "연운이 전체 배경이라면 월운은 실제 일정이 몰리거나 관계·계약·이동이 집중되는 구간을 더 좁게 보여줍니다.",
    "변화가 큰 달이라고 나쁜 달은 아닙니다. 해야 할 일이 많고 결정을 미루기 어려운 달에 가깝습니다.",
    "큰 계약이나 이동처럼 되돌리기 어려운 선택은 움직임이 큰 달에 확인 절차를 하나 더 두는 정도가 현실적인 활용법입니다.",
    "월운은 모든 달을 통제하려는 표가 아니라 바쁜 달과 정리하기 좋은 달을 구분해 일정에 여유를 두는 데 쓰는 편이 좋습니다."
  ];

  return null;
}

function changeConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,group=row.evidenceGroup??"";

  if(group==="CHANGE"){
    if(/삼재·변화운|변화운은 어느 정도/.test(title))return[
      "변화운이 크다는 말은 나쁜 일이 생긴다는 뜻이 아닙니다. 기존 생활 방식이 그대로 유지되기보다 선택과 이동이 많아질 수 있다는 뜻에 가깝습니다.",
      relationSentence(facts),
      "원국에 있는 충·합·형·파·해는 평생 같은 사건을 반복한다는 뜻이 아니라, 운에서 새로운 기운이 들어올 때 어느 부분이 먼저 흔들리는지 알려주는 기준입니다.",
      "변화가 커질수록 새로 시작할 것과 먼저 정리할 것을 나누는 힘이 중요해집니다.",
      "좋은 변화도 준비가 없으면 부담이 될 수 있고, 부담스러운 변화도 오래 막혀 있던 것을 정리하는 계기가 될 수 있습니다."
    ];

    if(/변화운이 커진다는 뜻/.test(title))return[
      "변화운이 커지면 가장 먼저 달라지는 것은 사건보다 '선택의 수'입니다. 그대로 둘지 바꿀지 결정해야 하는 일이 많아집니다.",
      "직업, 거주, 관계, 계약처럼 생활의 틀을 건드리는 선택이 겹치면 체감이 더 커질 수 있습니다.",
      relationSentence(facts),
      "이 시기에는 모든 변화를 기회라고 밀어붙이지도, 불안하다고 전부 막지도 않는 균형이 필요합니다.",
      "되돌리기 어려운 선택만 한 번 더 확인하고, 나머지는 움직이면서 수정할 여지를 남겨두는 편이 좋습니다."
    ];

    if(/부딪힘이 변화를 만드는 때/.test(title))return[
      "충은 서로 다른 힘이 정면으로 부딪히는 관계입니다. 기존 자리를 그대로 유지하기보다 방향을 바꾸거나 움직임을 만드는 쪽으로 체감되기 쉽습니다.",
      facts.relationCounts.clash?`원국에는 충의 관계가 ${koreanCount(facts.relationCounts.clash)} 곳 확인되어, 운에서 같은 축이 자극될 때 변화가 더 선명하게 느껴질 수 있습니다.`:"원국 자체의 충이 강하지 않다면 운에서 충이 들어오는 시기를 더 분명하게 체감할 수 있습니다.",
      "충이 들어온다고 무조건 이별·퇴사·이사를 뜻하지 않습니다. 일정, 역할, 사람 관계의 재조정처럼 작은 변화로도 나타날 수 있습니다.",
      "변화를 피하려고만 하면 오히려 이미 맞지 않는 구조를 오래 끌 수 있습니다.",
      "충이 강한 때는 무엇을 지킬지보다 무엇을 바꾸어야 다음 단계가 편해지는지를 보는 편이 좋습니다."
    ];

    if(/서로 모이며 일이 커지는 때/.test(title))return[
      "합은 서로 다른 힘이 연결되어 한 방향으로 모이는 관계입니다. 사람, 일, 관심이 한곳에 붙으면서 일이 커질 수 있습니다.",
      facts.relationCounts.combination?`원국에는 합의 관계가 ${koreanCount(facts.relationCounts.combination)} 곳 있어 관계와 일이 연결될 때 집중력이 크게 올라가는 지점이 있습니다.`:"원국의 합이 강하지 않아도 운에서 합이 완성되면 특정 사람이나 일에 힘이 모일 수 있습니다.",
      "합은 좋은 관계라는 뜻만은 아닙니다. 일이 커지는 만큼 시간과 책임도 같이 묶일 수 있습니다.",
      "잘 쓰면 협업·계약·집중력으로 이어지고, 과하면 한 가지 일에 너무 많은 에너지가 묶일 수 있습니다.",
      "합이 강한 때는 무엇이 붙는가보다 그 결과 무엇이 커지고 무엇을 포기해야 하는지를 같이 보는 편이 정확합니다."
    ];

    if(/반복해서 신경 쓰이게 하는 압박/.test(title))return[
      "형은 같은 문제가 반복해서 신경 쓰이거나 내부 압박이 커지는 관계로 읽습니다.",
      facts.relationCounts.punishment?`원국에는 형의 관계가 ${koreanCount(facts.relationCounts.punishment)} 곳 확인됩니다.`:"원국에 형이 강하지 않다면 운에서 형이 들어오는 때에만 일시적으로 압박을 크게 느낄 수 있습니다.",
      "이때는 큰 사건보다 사소한 불편과 반복 업무가 쌓여 피로가 커지는 식으로 나타날 수 있습니다.",
      "작은 문제를 참다가 한꺼번에 해결하려 하기보다 반복되는 원인을 하나씩 줄이는 편이 좋습니다.",
      "형은 겁낼 이름이 아니라 '같은 부담을 계속 반복하고 있지 않은가'를 점검하는 신호로 쓰는 편이 현실적입니다."
    ];

    if(/기운이 실제로 옮겨 가는 관계/.test(title))return[
      "합이 있다고 모든 기운이 바로 다른 오행으로 바뀌는 것은 아닙니다. 계절, 뿌리, 드러난 기운, 방해 관계를 함께 봐야 실제 변화가 생기는지 판단할 수 있습니다.",
      "POSTPOST 계산에서는 단순히 '합이 있다'에서 끝내지 않고 실제로 얼마만큼 기운이 이동했는지를 별도로 계산합니다.",
      "고객 해설에서는 그 내부 계산 과정을 그대로 늘어놓지 않고, 최종적으로 어떤 오행이 강해지고 약해졌는지만 반영합니다.",
      "그래서 원국표의 오행 비율과 해설에서 말하는 강약은 관계가 반영된 최종값을 기준으로 읽습니다.",
      "이 장의 핵심은 겉으로 보이는 글자 수보다 실제로 남은 힘의 분포가 더 중요하다는 점입니다."
    ];

    if(/변화가 큰 시기/.test(title))return[
      "변화가 큰 시기는 원국의 관계가 대운·연운과 다시 맞물릴 때 더 선명해집니다.",
      relationSentence(facts),
      "직업과 돈, 관계가 동시에 움직이는 시기라면 모든 결정을 같은 달에 몰아넣지 않는 편이 좋습니다.",
      "변화가 많을수록 가장 먼저 바꿀 것과 마지막까지 지킬 것을 분리해두면 흔들림이 줄어듭니다.",
      "큰 변화는 운이 나빠서 생기는 것이 아니라 다음 구조로 넘어가기 위해 기존 방식이 더 이상 맞지 않을 때 생기기도 합니다."
    ];

    if(/기억할 점/.test(title))return[
      "변화운이 큰 때 가장 중요한 건 겁먹지 않는 것과 무리하게 들뜨지 않는 것입니다.",
      "좋은 기회가 와도 시간·돈·관계의 비용을 확인하고, 부담스러운 변화가 와도 실제로 지켜야 할 것이 무엇인지 먼저 구분하세요.",
      "운에서 움직임이 크다는 이유만으로 모든 것을 바꿀 필요는 없습니다.",
      "되돌리기 어려운 선택에는 확인을 늘리고, 수정 가능한 선택에는 여지를 남기는 방식이 가장 현실적입니다.",
      "변화운은 미래의 사건을 맞히는 말보다 '지금 선택지가 많아질 수 있으니 기준을 준비하라'는 신호로 쓰는 편이 맞습니다."
    ];

    return[
      `${title}에서는 원국의 관계와 시기운이 만날 때 어떤 변화가 커지는지를 봅니다.`,
      relationSentence(facts),
      "변화의 크기와 결과의 유불리는 같은 뜻이 아니므로 따로 읽습니다.",
      "움직임이 큰 때는 선택 기준을 미리 정해두는 것이 가장 큰 대비가 됩니다."
    ];
  }

  if(group==="SAMJAE"){
    if(/삼재란/.test(title))return[
      "삼재는 띠를 기준으로 세 해의 변화 주기를 보는 전통적인 시간표입니다.",
      "삼재에 들어갔다고 모든 나쁜 일이 생긴다는 뜻은 아닙니다. 실제 사주 원국과 그해의 관계가 어떻게 맞물리는지를 함께 봐야 합니다.",
      "POSTPOST에서는 삼재 이름보다 같은 시기에 충·합·활동량이 실제로 얼마나 겹치는지를 더 중요하게 봅니다.",
      "그래서 삼재인데도 비교적 편하게 지나갈 수 있고, 삼재가 아니어도 큰 변화가 생길 수 있습니다.",
      "삼재는 공포의 기준보다 평소보다 확인을 조금 더 늘리는 변화 주기로 이해하는 편이 맞습니다."
    ];

    if(/들삼재/.test(title))return[
      "들삼재는 세 해 변화 주기가 시작되는 첫해입니다. 새로운 일이 들어오거나 기존 환경이 흔들리기 시작하는 단계로 봅니다.",
      "처음부터 큰 사건이 생긴다고 단정하지 않고 사람·일·생활환경 가운데 무엇이 달라지기 시작하는지 확인합니다.",
      relationSentence(facts),
      "새로운 선택이 많아지면 한꺼번에 모든 판을 바꾸기보다 먼저 들어온 변화가 실제로 필요한지 확인하는 편이 좋습니다.",
      "들삼재의 핵심은 시작되는 변화를 겁내는 게 아니라 앞으로 세 해 동안 가져갈 기준을 잡는 것입니다."
    ];

    if(/눌삼재/.test(title))return[
      "눌삼재는 변화가 진행 중인 가운데 부담과 선택이 가장 크게 체감될 수 있는 가운데 해로 봅니다.",
      "이미 시작한 일을 계속 가져갈지, 방향을 바꿀지 판단해야 하는 장면이 생길 수 있습니다.",
      "움직임이 많다는 이유로 무조건 멈출 필요는 없지만, 일정과 돈을 과하게 확장하는 것은 조심하는 편이 좋습니다.",
      "이 시기에는 새로 시작하는 것만큼 이미 벌인 일을 정리하고 구조를 다듬는 일이 중요합니다.",
      "눌삼재는 버티는 해보다 불필요한 부담을 줄이는 해로 쓰는 편이 더 현실적입니다."
    ];

    if(/날삼재/.test(title))return[
      "날삼재는 세 해 변화 주기를 정리하고 밖으로 빠져나오는 마지막 단계입니다.",
      "앞의 두 해에서 시작된 변화가 실제 결과나 새로운 생활 방식으로 굳어질 수 있습니다.",
      "끝나는 해라고 모든 문제가 자동으로 사라지는 것은 아니지만, 무엇을 남기고 무엇을 놓을지가 훨씬 분명해질 수 있습니다.",
      "새로운 판을 또 벌이기보다 지난 두 해 동안 만든 변화 가운데 계속 가져갈 것을 정리하는 편이 좋습니다.",
      "날삼재의 핵심은 끝났다는 안도보다 변화에서 얻은 것을 다음 흐름의 기반으로 만드는 것입니다."
    ];

    return[
      `${title}은 삼재 이름 자체보다 실제 생활에서 어떤 변화가 겹치는지를 보는 장입니다.`,
      relationSentence(facts),
      "삼재는 좋고 나쁨을 단정하지 않고 대운·연운과 원국의 관계를 함께 봅니다.",
      "겁내기보다 큰 계약과 이동에서 확인을 하나 더 늘리는 정도로 활용하는 편이 현실적입니다."
    ];
  }

  return null;
}

function daeunConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  const title=row.topic??row.title,group=row.evidenceGroup??"",context=periodContext(input,row),axis=fortuneAxis(input,row);
  const pillar=context.daeunPillar,favor=FAVORABILITY_LABELS[axis.favorabilityLevel]??"",activation=ACTIVATION_LABELS[axis.activationLevel]??"";

  if(group==="DAEUN_OVERVIEW"){
    if(/^대운$/.test(title))return[
      "대운은 약 십 년 동안 반복되는 큰 배경입니다. 사람 자체가 바뀐다기보다 같은 사람에게 요구되는 역할과 환경이 달라진다고 보면 이해하기 쉽습니다.",
      "어떤 십 년은 공부와 준비가 길어지고, 어떤 십 년은 돈과 책임이 커지며, 어떤 십 년은 사람과 이동이 많아질 수 있습니다.",
      "대운이 바뀐다고 하루아침에 인생이 뒤집히는 것은 아닙니다. 보통 앞뒤 시기가 겹치며 역할과 관심사가 서서히 바뀝니다.",
      "좋은 대운도 준비가 없으면 지나갈 수 있고, 부담이 큰 대운도 권한과 경험이 함께 커지면 성장의 시기가 될 수 있습니다.",
      "그래서 대운은 기다리는 운보다 지금 십 년에 무엇을 쌓아야 다음 십 년이 편해지는지를 보는 장기 구조로 읽는 편이 맞습니다."
    ];

    if(/현재 대운/.test(title))return[
      "현재 대운은 지금 몇 년 동안 반복해서 느끼는 일·돈·관계의 큰 배경을 설명합니다.",
      "최근 몇 년 사이 관심사가 달라졌거나 예전 방식이 잘 맞지 않기 시작했다면 대운의 역할 변화와 연결해 볼 수 있습니다.",
      "현재 대운에서는 잘되는 것만 보는 것이 아니라 같은 문제를 왜 반복해서 만나게 되는지도 함께 봅니다.",
      "이 시기에 익혀야 할 역할을 제대로 쓰면 다음 대운으로 넘어갈 때 경험이 그대로 자산이 됩니다.",
      "현재 대운의 핵심은 미래를 기다리는 것이 아니라 지금 가장 자주 요구받는 역할을 알아차리는 데 있습니다."
    ];

    if(/평생 대운/.test(title)||/대운표/.test(title))return[
      "평생 대운표는 인생을 열 해 단위로 좋고 나쁘게 줄 세우는 표가 아닙니다. 각 십 년에서 무엇이 중심 역할이 되는지를 비교하는 지도입니다.",
      "초반에는 배우고 경험하는 힘이, 중반에는 직업과 돈을 현실화하는 힘이, 후반에는 경험을 이용해 판단하고 관리하는 힘이 더 중요해질 수 있습니다.",
      "같은 오행이 반복되는 대운과 전혀 다른 기운이 들어오는 대운은 체감 방식이 달라집니다.",
      "대운 사이의 연결을 보면 한 시기에 배운 것이 다음 시기에 돈이 되고, 한 시기의 책임이 다음 시기에 권한으로 바뀌는 흐름을 읽을 수 있습니다.",
      "표를 볼 때는 '언제가 제일 좋은가'보다 '각 시기에 무엇을 해야 다음 단계가 쉬워지는가'를 보는 편이 훨씬 유용합니다."
    ];

    if(/어떻게 바뀔까/.test(title))return[
      "대운은 경계 날짜를 기준으로 칼처럼 끊기기보다 앞의 흐름과 뒤의 흐름이 겹치며 바뀌는 경우가 많습니다.",
      "새 대운의 기운이 들어오면 먼저 관심사와 역할이 달라지고, 이후 실제 직업·돈·관계의 구조가 따라 바뀌는 식으로 체감될 수 있습니다.",
      "예전에는 잘 통했던 방식이 덜 맞기 시작해도 능력이 떨어진 것이 아니라 환경이 다른 역할을 요구하기 시작한 것일 수 있습니다.",
      "대운 교체기에는 모든 것을 새로 만들기보다 유지할 것, 수정할 것, 끝낼 것을 나누는 편이 좋습니다.",
      "변화의 핵심은 과거를 버리는 게 아니라 이전 십 년의 경험을 다음 십 년에 맞는 방식으로 다시 쓰는 데 있습니다."
    ];

    if(/초·중·후반/.test(title))return[
      "대운 전체를 보면 초반·중반·후반에 요구되는 역할이 조금씩 달라집니다.",
      "초반은 나를 만들고 경험을 쌓는 시간이 길고, 중반은 그 경험을 직업·재물·가족의 현실 구조로 굳히는 힘이 중요해집니다.",
      "후반으로 갈수록 직접 모든 일을 하는 것보다 경험을 이용해 선택하고 사람과 자원을 배치하는 역할이 더 커질 수 있습니다.",
      "어느 구간이 절대적으로 좋다 나쁘다기보다 각 시기에 맞는 역할을 쓸 때 만족도와 결과가 좋아집니다.",
      "평생 대운의 핵심은 같은 사람이 나이에 따라 다른 힘을 배워가는 과정으로 보는 데 있습니다."
    ];

    return[
      `${title}은 십 년 단위의 큰 흐름을 읽는 장입니다.`,
      "대운은 사건 하나보다 역할·환경·관심사가 오래 반복되는 방향을 봅니다.",
      "앞 대운에서 만든 경험이 다음 대운에서 다른 결과로 이어질 수 있습니다.",
      "좋고 나쁨 하나로 줄이지 않고 직업·재물·관계의 변화를 따로 봅니다."
    ];
  }

  if(/^DAEUN_[1-9]$/.test(group)||group==="DAEUN_10"){
    return[
      pillar?`이 대운은 ${pillarReading(pillar[0],pillar[1])}의 기운으로 흘러갑니다.`:`${title}에서는 이 십 년의 중심 기운을 봅니다.`,
      pillar?fortunePillarSentence(pillar):"대운의 간지와 원국의 관계를 함께 읽습니다.",
      favor&&activation?`계산상 ${favor}이면서 ${activation}입니다. 편한 십 년인지보다 도움과 변화가 어떤 비율로 들어오는지가 중요합니다.`:favor?`전체적인 지원은 ${favor}으로 읽습니다.`:activation?`이 십 년은 ${activation}입니다.`:"대운의 도움 정도와 활동량을 따로 봅니다.",
      topCategorySentence(input,row)||"이 대운에서 직업·재물·관계 중 어느 분야의 역할이 커지는지를 함께 봅니다.",
      "십 년 전체를 한 번에 판단하지 말고 앞부분에는 적응하고, 중간에는 결과를 만들고, 뒷부분에는 다음 대운으로 가져갈 것을 정리하는 식으로 쓰는 편이 좋습니다."
    ];
  }

  return null;
}

function synthesisConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  const title=row.topic??row.title,stem=stemStory(facts),dominant=dominantFamily(facts);

  if(/^총정리$/.test(title))return[
    `전체 사주를 다시 묶으면 ${facts.dayStemName||"중심 기운"}의 '${stem.core}'과 ${dominant}의 '${familyMeaning(dominant)}'이 가장 오래 남는 축입니다.`,
    facts.structure?`${structureMeaning(facts.structure)}이 이 힘에 사회적 역할과 결과의 방향을 붙여줍니다.`:"원국의 여러 기운이 이 중심축을 서로 밀어주고 조절합니다.",
    elementFact(facts)||"오행의 강약이 잘하는 힘과 의식적으로 보완할 힘을 나눠줍니다.",
    "일·돈·관계는 서로 다른 장이지만 결국 같은 사람이 선택하기 때문에 반복되는 기준이 있습니다.",
    "이제부터는 앞의 내용을 다시 나열하기보다 평생 선택에서 실제로 기억할 몇 가지 기준만 남겨보겠습니다."
  ];

  if(/결국 나는 어떤 사람인가/.test(title))return[
    `결국 이 사주는 ${stem.core}을 가진 사람입니다.`,
    dominantFamilySentence(facts),
    "남이 만들어놓은 기준을 그대로 따라가기보다 스스로 납득한 방향을 오래 가져갈 때 힘이 가장 안정적입니다.",
    `반대로 ${stem.shadow}이 강해질 때는 장점이 피로와 지연으로 바뀔 수 있습니다.`,
    "핵심은 성격을 고치는 것이 아니라 잘하는 힘을 결과로 연결하고, 과해지는 순간만 조절하는 데 있습니다."
  ];

  if(/강점이 가장 잘 살아나는 때/.test(title))return[
    `강점은 ${familyMeaning(dominant)}을 실제 결과로 바꿀 때 가장 크게 살아납니다.`,
    "알고 있는 것과 할 수 있는 것을 밖으로 꺼내 사람·시장·관계 속에서 반응을 받을 때 운의 흐름이 구체적인 결과가 됩니다.",
    usefulSentence(facts)||"도움 되는 기운은 부족한 역할을 보완해 강점을 더 편하게 쓰게 해줍니다.",
    "혼자 완벽해질 때까지 준비하기보다 일정 수준이 되면 내놓고 피드백을 받는 쪽이 성장 속도를 높여줍니다.",
    "잘되는 시기에는 더 많이 벌이는 것보다 잘되는 한두 가지를 구조로 굳히는 편이 다음 단계까지 오래 갑니다."
  ];

  if(/강점이 부담으로 바뀌는 순간/.test(title))return[
    `가장 큰 강점인 ${stem.core}도 한쪽으로 몰리면 ${stem.shadow}으로 바뀔 수 있습니다.`,
    dominantFamilySentence(facts),
    "책임감이 강하면 모든 일을 직접 가져오고, 분석력이 강하면 준비가 끝나지 않으며, 독립심이 강하면 도움을 너무 늦게 쓰는 식입니다.",
    "잘하는 힘일수록 '이 정도면 충분하다'는 종료 기준과 다른 사람에게 넘길 기준이 필요합니다.",
    "강점을 줄이는 것이 아니라 강점이 나를 소모하기 전에 사용량을 조절하는 것이 핵심입니다."
  ];

  if(/직업운·재물운 핵심/.test(title))return[
    facts.structure?`직업운의 중심은 ${structureMeaning(facts.structure)}입니다.`:"직업에서는 자기 판단과 결과 책임이 같이 있을 때 강점이 살아납니다.",
    `재물운에서는 ${familyMeaning("재성")}과 ${familyMeaning("식상")}의 연결이 중요합니다. 만들고 밖에 내놓은 것이 실제 돈과 구조로 이어져야 합니다.`,
    familyPresence(facts,"재성"),
    "장기적으로는 시간을 그대로 파는 구조보다 경험과 결과물을 반복 가능한 서비스·상품·운영 구조로 바꾸는 쪽이 유리합니다.",
    "일과 돈의 공통 핵심은 많이 하는 것이 아니라 남는 구조를 만드는 데 있습니다."
  ];

  if(/연애·가족운 핵심/.test(title))return[
    `관계의 중심은 ${facts.dayPillarReading||facts.dayPillar} 일주에서 보이는 신뢰의 기준입니다.`,
    "가까워질수록 오래 챙기려는 힘이 커지지만, 상대의 몫까지 대신 책임지는 순간 관계가 무거워질 수 있습니다.",
    relationSentence(facts),
    "좋은 관계는 서로의 독립성을 지키면서도 중요한 감정과 약속은 설명할 수 있는 관계에 가깝습니다.",
    "가족을 중요하게 여기되 자기 일과 자기 시간을 함께 지키는 구조가 오래 갈수록 더 안정적입니다."
  ];

  if(/건강운 핵심/.test(title))return[
    "건강운의 핵심은 특별한 체질 이름보다 생활 리듬입니다.",
    elementFact(facts)||"오행의 강약을 생활 습관과 연결해서 봅니다.",
    "일이 몰릴수록 수면·식사·휴식 중 무엇이 먼저 무너지는지 알아두면 과부하를 빨리 알아차릴 수 있습니다.",
    "버틸 수 있는 힘과 실제로 회복되는 힘은 다르기 때문에, 쉬는 시간을 일정 안에 먼저 넣는 편이 좋습니다.",
    "건강 문제는 반드시 실제 증상과 의료 판단을 우선하고, 사주 해설은 생활을 점검하는 참고로만 쓰는 것이 맞습니다."
  ];

  if(/나에게 도움이 되는 선택/.test(title))return[
    usefulSentence(facts)||"도움이 되는 선택은 이미 잘하는 것을 더 밀어붙이기보다 부족한 역할을 생활에 넣는 쪽에서 찾습니다.",
    facts.strongest?`강한 ${elementPro(facts.strongest.element)}의 힘은 이미 자연스럽게 나오므로, 과해지는 순간을 조절하는 게 먼저입니다.`:"잘하는 힘은 필요한 만큼 쓰고 멈출 기준이 필요합니다.",
    facts.weakest?`약한 ${elementPro(facts.weakest.element)}은 ${elementStory(facts.weakest.element).life}과 연결되므로, 이 행동을 일정과 습관 속에 작게 넣는 편이 좋습니다.`:"덜 익숙한 힘은 작은 습관으로 반복해서 쓰는 편이 좋습니다.",
    "결정할 때는 완벽한 답을 찾기보다 지금 확인해야 할 것과 움직이면서 수정해도 될 것을 나누세요.",
    "이 사주에 가장 도움이 되는 선택은 내 강점을 없애는 선택이 아니라, 강점을 결과로 이어주고 피로를 줄여주는 선택입니다."
  ];

  if(/평생 기억할 다섯 가지/.test(title))return[
    `첫째, ${stem.core}은 평생의 가장 큰 자산입니다. 다만 준비만 길어지지 않게 결과로 꺼내는 습관이 필요합니다.`,
    `둘째, ${familyMeaning(dominant)}을 잘 쓰되 모든 책임을 혼자 가져오지 마세요. 사람과 역할을 나누는 능력도 실력입니다.`,
    "셋째, 일과 돈에서는 시작 기준만큼 멈출 기준과 정산 기준을 분명히 두는 편이 좋습니다.",
    "넷째, 가까운 관계에서는 마음을 오래 참기보다 작은 불편을 작을 때 설명하는 것이 신뢰를 오래 지키는 방법입니다.",
    "다섯째, 운이 좋은 때를 기다리기보다 지금 들어온 역할을 제대로 끝내고 남는 구조를 만드는 것이 평생 운을 가장 현실적으로 살리는 방법입니다."
  ];

  if(row.evidenceGroup==="SYNTHESIS")return[
    consultationOpening(row,facts)||`${title}에서는 앞의 해설을 실제 선택 기준으로 압축합니다.`,
    dominantFamilySentence(facts),
    usefulSentence(facts)||elementFact(facts),
    "총정리는 같은 말을 반복하기보다 앞으로 선택할 때 실제로 기억할 기준만 남기는 장입니다."
  ].filter(Boolean);

  return null;
}


function sectionExtras(row:Row,value:DomainProfile){
  if(!value.extra)return[] as string[];
  const topic=row.topic??row.title,domain=domainOf(row.evidenceGroup??"");
  const keep=domain==="IDENTITY"?/겉과 속이 다르게|한 문장으로 보는 나/.test(topic):
    domain==="WORK"?/배우고 시험|배움/.test(topic):
    domain==="WEALTH"?/돈 때문에 생기는 인간관계/.test(topic):
    domain==="RELATIONSHIP"?/좋아할 때 표현/.test(topic):false;
  return keep?value.extra:[];
}
function buildParagraphs(row:Row,index:number,facts:ConsultationFacts,input:InterpretationInput){
  if(row.contentKind!=="CONTENT"){
    const value=profile(row,index),angle=editorialAngle(row,index);
    return [value.scene,value.consequence,angle.action].map(paragraph=>naturalizeNarration(paragraph)).filter(Boolean);
  }

  const candidates=[
    coreIdentityConsultation(row,facts),
    workConsultation(row,facts),
    wealthConsultation(row,facts),
    relationshipConsultation(row,facts),
    childrenConsultation(row,facts),
    wellnessConsultation(row,facts),
    nobleConsultation(row,facts),
    starRelationConsultation(row,facts),
    twelveStageConsultation(row,facts),
    tenGodConsultation(row,facts),
    timingConsultation(row,facts,input),
    changeConsultation(row,facts),
    daeunConsultation(row,facts,input),
    synthesisConsultation(row,facts)
  ];
  const selected=candidates.find((paragraphs):paragraphs is string[]=>Array.isArray(paragraphs)&&paragraphs.length>0);
  const fallback=[
    consultationOpening(row,facts)||`${row.topic??row.title}은 원국의 계산 결과를 바탕으로 읽습니다.`,
    elementFact(facts)||dominantFamilySentence(facts),
    rowHasEvidencePrefix(row,"NATAL:STRUCTURE")&&facts.structure?`${structureMeaning(facts.structure)}과 ${facts.dayStemName||"중심 기운"}의 성향이 이 주제에서 어떻게 작동하는지 함께 봅니다.`:"한 가지 값만 떼어 판단하지 않고, 이 장에 배정된 근거 안에서 같은 방향을 가리키는 흐름을 함께 봅니다.",
    "이 장에서는 앞에서 한 말을 되풀이하기보다 이 주제에서 새롭게 드러나는 선택과 결과만 남깁니다."
  ].filter(Boolean);
  return (selected??fallback)
    .map(paragraph=>naturalizeNarration(paragraph))
    .filter(Boolean)
    .filter((paragraph,paragraphIndex,rows)=>rows.indexOf(paragraph)===paragraphIndex);
}

function report(input:InterpretationInput):StructuredInterpretation{
  const rows=input.reportPlan??[],facts=consultationFacts(input);
  const sections=rows.map((row,index)=>{
    const ids=input.reportVersion==="dynamic-lifetime-book-v4"?[...row.evidenceIds]:evidenceFor(row,row.pageNumber??index),value=profile(row,index),angle=editorialAngle(row,index);
    const fullParagraphs=buildParagraphs(row,index,facts,input);
    const frontMatterParagraphs=[
      fullParagraphs[0],
      fullParagraphs[1],
      fullParagraphs[3]??fullParagraphs[2]
    ].filter((paragraph):paragraph is string=>typeof paragraph==="string"&&paragraph.length>0);
    const paragraphs=row.contentKind==="FRONT_MATTER"
      ?frontMatterParagraphs
      :row.contentKind==="PROFESSIONAL"
        ?[value.scene,value.consequence,value.action]
        :fullParagraphs;
    const pageNo=row.pageNumber??index+1;
    const lead=undefined;
    return {
      id:row.id,
      chapterNumber:row.chapterNumber,
      title:row.title,
      headline:row.title,
      lead,
      body:paragraphs.join("\n\n"),
      paragraphs,
      keyPoints:[`${row.title}의 핵심은 위 해설의 계산 근거와 함께 읽습니다.`],
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
    headline:facts.dayPillarReading?facts.dayPillarReading+" 일주에서 시작하는 평생사주":"원국에서 시작하는 평생사주",
    summary:facts.structure?structureMeaning(facts.structure)+"과 오행의 강약, 대운과 연운을 한 사람의 이야기로 이어서 풀었습니다.":"원국의 오행과 시간 흐름을 한 사람의 이야기로 이어서 풀었습니다.",
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
      workPattern:"내가 어디까지 맡아야 하는지 분명하면 순서를 정해 끝까지 마무리하는 편이에요.",
      decisionPattern:"필요한 걸 확인하고 마음이 정해지면 행동은 빠른 편이에요."
    };
    if("corePatterns" in ((request.schema.properties??{}) as Record<string,unknown>))
      return {output:fixedCore,provider:"mock",model:"deterministic-fixture-v4",tokenUsage:{input:0,output:0}};
    const wantsPlan="planVersion" in ((request.schema.properties??{}) as Record<string,unknown>);
    return {output:wantsPlan?plan(request.input):report(request.input),provider:"mock",model:"deterministic-fixture-v4",tokenUsage:{input:0,output:0}};
  }
}
