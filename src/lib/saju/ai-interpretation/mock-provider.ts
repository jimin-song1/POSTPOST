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
  const facts=consultationFacts(input),spine=personalitySpine(facts);
  const pick=(name:string)=>[claim(name,first,0)];
  return {
    planVersion:"interpretation-plan-v1",
    characterCore:{
      corePatterns:[spine.core],
      contradictions:[spine.conflict],
      dominantStrengths:[spine.decision],
      shadowPatterns:[spine.shadow],
      relationshipPattern:spine.close,
      workPattern:spine.work,
      decisionPattern:spine.decision
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
  dayStem:string;dayStemName:string;dayBranch:string;dayPillar:string;dayPillarReading:string;
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
  wellnessAttention:Array<{element:string;customerStatus:string;theme:string;traditionalAreas:string[];attentionLevel:string;attentionIndex:number}>;
  wellnessHabits:Record<string,string>;
  wellnessPeriods:Array<{daeunIndex:number;ageRange:string;pillar:string;attention:number;level:string}>;
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
  for(const position of ["year","month","day","hour"]){
    const value=stages?.[position],row=asRecord(value);
    stageByPosition[position]=asText(row?.korean)||asText(value);
  }

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

  const wellnessAttention=input.evidence
    .filter(row=>row.id.startsWith("WELLNESS:ELEMENT:"))
    .map(row=>asRecord(row.value))
    .filter((row):row is LooseRecord=>Boolean(row))
    .map(row=>({
      element:asText(row.element),
      customerStatus:asText(row.customerStatus),
      theme:asText(row.theme),
      traditionalAreas:Array.isArray(row.traditionalAreas)?row.traditionalAreas.filter((item):item is string=>typeof item==="string"):[],
      attentionLevel:asText(row.attentionLevel),
      attentionIndex:asNumber(row.attentionIndex)??0
    }))
    .filter(row=>row.element)
    .sort((a,b)=>b.attentionIndex-a.attentionIndex);
  const wellnessHabits:Record<string,string>={};
  const habitRows=evidenceValue(input,"WELLNESS:HABITS");
  if(Array.isArray(habitRows))for(const item of habitRows){
    const row=asRecord(item),element=asText(row?.element),guidance=asText(row?.guidance);
    if(element&&guidance)wellnessHabits[element]=guidance;
  }

  const wellnessPeriods:ConsultationFacts["wellnessPeriods"]=[];
  const lifetimeWellness=evidenceValue(input,"WELLNESS:LIFETIME_CONTEXT");
  if(Array.isArray(lifetimeWellness))for(const item of lifetimeWellness){
    const row=asRecord(item);
    if(!row)continue;
    wellnessPeriods.push({
      daeunIndex:asNumber(row.daeunIndex)??0,
      ageRange:asText(row.ageRange),
      pillar:asText(row.pillar),
      attention:asNumber(row.attention)??0,
      level:asText(row.level)
    });
  }

  const dayStem=asText(dayMaster?.stem)||asText(day?.stem),dayBranch=asText(day?.branch);
  return{
    dayStem,
    dayStemName:STEM_ELEMENT_NAME[dayStem]??dayStem,
    dayBranch,
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
    branchMainTenGodByPosition,
    wellnessAttention,
    wellnessHabits,
    wellnessPeriods
  };
}
function elementPro(element:string){return ELEMENT_PRO[element]??element;}
function hasKoreanBatchim(text:string){
  const chars=Array.from(text).reverse();
  const hangul=chars.find(char=>{const code=char.charCodeAt(0);return code>=0xac00&&code<=0xd7a3;});
  if(!hangul)return false;
  return (hangul.charCodeAt(0)-0xac00)%28!==0;
}
function withParticle(text:string,batchim:string,noBatchim:string){return text+(hasKoreanBatchim(text)?batchim:noBatchim);}
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
  return family==="비겁"?"스스로 판단하고 밀고 가는 성향":family==="식상"?"생각을 말과 결과물로 꺼내는 성향":family==="재성"?"돈과 현실 결과를 챙기는 성향":family==="관성"?"책임과 약속을 중요하게 보는 성향":family==="인성"?"충분히 이해하고 자기 것으로 만드는 성향":"자기 판단을 중요하게 보는 성향";
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
const STEM_COUNSELING:Record<string,{opening:string;shadow:string}>={
  甲:{opening:"자기 방향이 분명한 사람입니다. 한번 마음을 정하면 쉽게 흔들리지 않고, 시간이 걸리더라도 자기 방식대로 끝까지 해내려는 힘이 있습니다.",shadow:"왜 해야 하는지 납득되지 않으면 움직임이 확 느려지고, 자기 생각을 너무 오래 붙들면 고집처럼 보일 수 있습니다."},
  乙:{opening:"주변 상황을 빠르게 읽고 그 안에서 자기 길을 찾아갑니다. 처음부터 세게 밀기보다 사람과 환경을 보면서 가장 오래 갈 방법을 고릅니다.",shadow:"주변을 너무 많이 살피면 결정을 미루거나 정작 자기 마음을 뒤로 미룰 수 있습니다."},
  丙:{opening:"생각이 정리되면 밖으로 빠르게 꺼내 보여줍니다. 분위기를 밝게 만들고 사람을 움직이게 하는 데 강점이 있습니다.",shadow:"속도가 너무 빨라지면 세부적인 부분이나 상대가 따라오는 속도를 놓칠 수 있습니다."},
  丁:{opening:"필요한 사람과 일에는 정성을 아끼지 않습니다. 크게 드러내기보다 가까운 곳을 세심하게 챙길 때 장점이 잘 살아납니다.",shadow:"예민함이 커지면 작은 말이나 상황도 오래 마음에 남을 수 있습니다."},
  戊:{opening:"쉽게 흔들리지 않고 한번 맡은 일은 오래 버팁니다. 주변에서는 든든하고 책임감 있는 사람으로 보기 쉽습니다.",shadow:"변화를 늦게 받아들이거나 혼자 너무 많은 책임을 들고 가면 피로가 쌓일 수 있습니다."},
  己:{opening:"작은 부분을 놓치지 않고 현실적으로 정리합니다. 사람이나 일을 꾸준히 돌보고 안정시키는 데 강점이 있습니다.",shadow:"걱정이 많아지면 사소한 부분까지 직접 챙기느라 쉽게 지칠 수 있습니다."},
  庚:{opening:"무엇이 필요한지 빠르게 구분하고 결정을 내립니다. 문제가 생기면 오래 끌기보다 정리하고 다음으로 넘어가려 합니다.",shadow:"기준이 너무 강해지면 말이나 판단이 상대에게 날카롭게 느껴질 수 있습니다."},
  辛:{opening:"차이를 세밀하게 보고 완성도를 높입니다. 작은 부분까지 잘 다듬어 결과의 질을 끌어올리는 데 강점이 있습니다.",shadow:"잘하고 싶은 마음이 커질수록 자신과 주변 사람에게 지나치게 엄격해질 수 있습니다."},
  壬:{opening:"큰 그림을 보면서 여러 사람과 정보를 함께 다룹니다. 한 가지 방식에 갇히기보다 가능성을 넓게 보는 데 강점이 있습니다.",shadow:"관심과 선택지가 너무 많아지면 한곳에 집중하는 시간이 짧아질 수 있습니다."},
  癸:{opening:"작은 변화와 분위기를 빠르게 알아차립니다. 겉으로는 조용해 보여도 속에서는 많은 정보를 받아들이고 정리합니다.",shadow:"생각과 감정을 안에 오래 담아두면 혼자 지치는 시간이 길어질 수 있습니다."}
};
function stemCounseling(facts:ConsultationFacts){return STEM_COUNSELING[facts.dayStem]??{opening:"자기 방식이 분명하고, 납득한 일은 꾸준히 끝까지 가져갑니다.",shadow:"한쪽 생각에 오래 머물면 시작이 늦거나 피로가 커질 수 있습니다."};}
function dominantFamilySentence(facts:ConsultationFacts){
  const family=dominantFamily(facts),count=familyCount(facts,family);
  if(!count)return"";
  if(family==="비겁")return"남이 정해준 답보다 내가 납득한 방식대로 움직이려 합니다. 의견이 갈리거나 경쟁이 붙을수록 자기 판단을 더 단단히 지켜요.";
  if(family==="식상")return"생각만 오래 품기보다 말하거나 만들어서 밖으로 보여줄 때 장점이 살아납니다. 결과물이 눈에 보이기 시작하면 속도도 자연스럽게 붙어요.";
  if(family==="재성")return"현실적인 결과를 중요하게 봅니다. 돈·시간·성과처럼 실제로 남는 것이 분명할수록 판단도 빨라져요.";
  if(family==="관성")return"맡은 일과 약속을 가볍게 넘기지 않습니다. 그래서 주변에서는 책임감 있고 믿을 만한 사람으로 보기 쉬워요.";
  if(family==="인성")return"바로 결론부터 내리기보다 충분히 이해하고 자기 방식으로 정리한 뒤 움직입니다. 배우고 파고드는 일에도 강점이 있어요.";
  return"중요한 선택에서는 남의 말보다 스스로 납득할 수 있는지를 중요하게 봅니다.";
}
const TEN_GOD_CUSTOMER_MEANING:Record<string,string>={
  비견:"내 생각과 기준을 세우는 힘",
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
const USEFUL_ELEMENT_GUIDE:Record<string,{why:string;where:string;practice:string}>={
  water:{why:"생각이 한 방향으로 굳을 때 다른 가능성을 열고, 필요한 정보를 받아들여 판단을 유연하게 만드는 데 도움을 줍니다.",where:"새로운 일을 검토할 때, 사람의 의견을 들을 때, 막힌 문제에서 다른 방법을 찾을 때 특히 필요합니다.",practice:"결정 전에 다른 관점 하나를 더 확인하고, 혼자 오래 끌기보다 필요한 사람에게 묻는 습관을 만들어보세요."},
  fire:{why:"머릿속에 있는 생각을 말·행동·콘텐츠처럼 밖으로 꺼내 실제 반응을 받게 하는 데 도움을 줍니다.",where:"발표·영업·콘텐츠·홍보·제안처럼 준비한 것을 밖에 보여줘야 할 때 특히 필요합니다.",practice:"완벽해질 때까지 기다리지 말고 준비가 어느 정도 되면 먼저 말하고, 올리고, 제안해보는 횟수를 늘려보세요."},
  wood:{why:"생각을 계획으로만 남겨두지 않고 시작하고 키워 다음 단계로 이어가는 데 도움을 줍니다.",where:"새 프로젝트를 시작할 때, 공부한 것을 실전에 써볼 때, 장기 목표를 단계별로 키울 때 특히 필요합니다.",practice:"큰 계획보다 이번 주에 바로 시작할 작은 행동 하나를 정하고 끝까지 이어보세요."},
  earth:{why:"아이디어를 일정·돈·운영처럼 현실적인 형태로 굳히고 안정적으로 유지하는 데 도움을 줍니다.",where:"사업 운영, 돈 관리, 일정 관리, 반복 가능한 시스템을 만들 때 특히 필요합니다.",practice:"해야 할 일을 기한·금액·담당자처럼 눈에 보이는 기준으로 바꿔두세요."},
  metal:{why:"선택지가 많을 때 우선순위를 정하고, 무엇을 지킬지 선을 분명하게 세우는 데 도움을 줍니다.",where:"계약·품질·의사결정·정리처럼 기준을 세우고 마무리해야 할 때 특히 필요합니다.",practice:"결정 전에 꼭 지킬 기준 두세 가지만 정하고 나머지는 과감히 덜어내세요."}
};
function usefulElementGuide(element:string){return USEFUL_ELEMENT_GUIDE[element]??{why:"부족한 부분을 보완해 선택을 더 편하게 만드는 데 도움을 줍니다.",where:"평소 자주 막히는 장면에서 필요합니다.",practice:"작은 행동으로 반복해 익숙하게 만들어보세요."};}
function usefulSentence(facts:ConsultationFacts){
  if(!facts.useful.length)return"";
  return `도움이 되는 기운은 ${facts.useful.map(elementPro).join(" · ")} 순입니다.`;
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
  return meanings.length?`평소 눈에 띄는 특징은 ${meanings.slice(0,4).join(", ")}입니다. 이름을 외우기보다 실제 생활에서 언제 이 모습이 나오는지를 보는 편이 더 중요합니다.`:"특별한 이름을 붙이기보다 실제 생활에서 반복되는 성향을 중심으로 보는 편이 더 정확합니다.";
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
const ELEMENT_BEHAVIOR:Record<string,{natural:string;weak:string;practice:string}>={
  wood:{natural:"새로운 일을 시작하면 다음 단계까지 키우고 방향을 넓히는 흐름이 자연스럽게 이어집니다.",weak:"새로운 일을 먼저 시작하거나 방향을 넓히는 데 시간이 걸릴 수 있습니다.",practice:"완벽한 계획을 세운 뒤 움직이기보다 작은 시작을 먼저 만들어보는 습관이 도움이 됩니다."},
  fire:{natural:"머릿속에 있는 생각을 말·콘텐츠·행동으로 밖에 꺼내 보여주는 데 익숙한 편이에요.",weak:"생각은 충분한데 말이나 공개가 늦어질 수 있습니다. 준비는 많이 했는데 시작을 미루는 식으로 나타날 수 있습니다.",practice:"완벽하게 준비될 때까지 기다리기보다 중간 단계에서도 한번 말해보고 보여주는 습관이 도움이 됩니다."},
  earth:{natural:"아이디어를 일정·돈·운영처럼 손에 잡히는 결과로 정리하는 힘이 자연스럽게 나와요.",weak:"좋은 생각이 있어도 일정이나 돈, 운영처럼 현실적인 형태로 굳히는 데 시간이 걸릴 수 있습니다.",practice:"해야 할 일을 숫자·기한·담당자처럼 눈에 보이는 형태로 바꿔두면 훨씬 편해집니다."},
  metal:{natural:"무엇이 맞고 틀린지 구분하고, 흐트러진 일을 정리하거나 약속과 품질을 지키는 힘이 자연스럽게 나옵니다.",weak:"무엇을 기준으로 정리할지 결정하거나 선을 분명하게 긋는 일이 늦어질 수 있습니다.",practice:"결정 전에 꼭 지킬 기준 두세 가지만 정해두면 선택이 훨씬 선명해집니다."},
  water:{natural:"상황을 읽고 정보를 모으고 여러 가능성을 연결하는 데 익숙합니다.",weak:"새로운 정보를 받아들이거나 상황을 넓게 비교하는 데 시간이 더 필요할 수 있습니다.",practice:"혼자 생각만 이어가기보다 필요한 정보를 정해 짧게 찾아보고 바로 다음 행동으로 넘기는 습관이 도움이 됩니다."}
};
function elementBehavior(element:string){return ELEMENT_BEHAVIOR[element]??{natural:"익숙한 방식은 굳이 의식하지 않아도 자연스럽게 나와요.",weak:"덜 익숙한 방식은 필요한 순간에 조금 늦게 나올 수 있습니다.",practice:"생활 속에서 작은 행동으로 반복해보면 훨씬 편해집니다."};}
const ELEMENT_OVERUSE:Record<string,{sign:string;reset:string}>={
  wood:{sign:"하고 싶은 일을 계속 벌리면서 이미 시작한 일을 정리하는 속도가 늦어질 수 있습니다.",reset:"새로운 걸 시작하기 전에 지금 하던 일 하나를 끝내는 기준을 먼저 정해두는 편이 좋습니다."},
  fire:{sign:"반응을 빨리 얻고 싶어 말이나 행동이 앞서거나, 사람들의 반응에 신경을 너무 많이 쓸 수 있습니다.",reset:"바로 반응하기 전에 한 번만 정리하고, 모든 사람에게 보여주려 하기보다 중요한 대상부터 고르는 편이 좋습니다."},
  earth:{sign:"안전한 선택을 지키려다 변화가 필요한 순간에도 익숙한 방식을 너무 오래 붙잡을 수 있습니다.",reset:"완전히 바꾸기보다 작은 범위에서 먼저 시험해보고 결과가 괜찮으면 넓혀가는 방식이 잘 맞습니다."},
  metal:{sign:"기준이 높아져 사소한 오류까지 그냥 넘기기 어렵고, 다른 사람의 방식이 답답하게 느껴질 수 있습니다.",reset:"시작 전에 '여기까지면 충분하다'는 완료 기준을 정하고, 덜 중요한 일은 완벽하게 붙들기보다 충분히 괜찮은 지점에서 넘기는 연습이 도움이 됩니다."},
  water:{sign:"생각과 가능성이 계속 늘어나 결정이 늦어지거나, 이미 답을 알고도 확인을 반복할 수 있습니다.",reset:"확인할 항목을 세 개 정도로 줄이고 그 안에서 결정을 끝내는 시간을 정해두는 편이 좋습니다."}
};
function elementOveruse(element:string){return ELEMENT_OVERUSE[element]??{sign:"잘하는 방식을 너무 오래 쓰면 오히려 피로가 커질 수 있습니다.",reset:"멈출 기준을 미리 정해두는 편이 좋습니다."};}
function roleBehavior(role:string){
  if(["정관","편관"].includes(role))return"밖에서는 해야 할 일과 약속을 먼저 챙기고, 맡은 일은 끝까지 정리하려는 모습이 강하게 나옵니다.";
  if(["정재","편재"].includes(role))return"밖에서는 시간과 돈, 결과처럼 현실적으로 확인되는 부분을 빠르게 챙깁니다.";
  if(["식신","상관"].includes(role))return"밖에서는 생각을 말이나 결과물로 보여주고, 답답한 상황에서는 의견도 분명하게 냅니다.";
  if(["정인","편인"].includes(role))return"밖에서는 바로 결론내리기보다 상황을 충분히 보고 이해한 뒤 움직입니다.";
  if(["비견","겁재"].includes(role))return"밖에서는 남에게 끌려가기보다 자기 판단을 지키고, 경쟁이 붙을수록 더 집중하는 모습이 나옵니다.";
  return"밖에서는 상황에 맞춰 해야 할 일을 정리하고 자기 몫을 챙깁니다.";
}
function closeRoleBehavior(role:string){
  if(["정관","편관"].includes(role))return"가까운 사람에게도 약속과 태도의 일관성을 중요하게 보고, 믿음이 깨지면 생각보다 오래 마음에 남을 수 있습니다.";
  if(["정재","편재"].includes(role))return"가까운 사람에게는 말보다 실제로 챙겨주고 시간을 쓰는 방식으로 마음을 보여줍니다.";
  if(["식신","상관"].includes(role))return"편한 사람 앞에서는 평소보다 말이 많아지고, 좋고 싫은 감정도 훨씬 솔직하게 드러날 수 있습니다.";
  if(["정인","편인"].includes(role))return"가까운 사람의 말과 행동을 오래 생각하고, 왜 그랬는지까지 이해하려 합니다.";
  if(["비견","겁재"].includes(role))return"가까운 사람 앞에서는 내 생각이 더 분명해지고, 편한 사이일수록 솔직한 기준도 잘 숨기지 않아요.";
  return"가까운 사람 앞에서는 밖에서보다 감정과 자기 생각이 훨씬 솔직하게 나옵니다.";
}

type PersonalitySpine={
  core:string;
  decision:string;
  firstMeeting:string;
  work:string;
  close:string;
  conflict:string;
  alone:string;
  shadow:string;
};

function personalitySpine(facts:ConsultationFacts):PersonalitySpine{
  const family=dominantFamily(facts);
  const monthRole=facts.branchMainTenGodByPosition.month||facts.stemTenGodByPosition.month;
  const dayRole=facts.branchMainTenGodByPosition.day||facts.stemTenGodByPosition.day;
  const hourRole=facts.branchMainTenGodByPosition.hour||facts.stemTenGodByPosition.hour;
  const counseling=stemCounseling(facts);

  const decision=family==="비겁"
    ?"중요한 선택에서는 남이 정한 답보다 스스로 납득할 수 있는 기준이 있어야 움직입니다. 한번 마음을 정하면 쉽게 흔들리지 않는 편이에요."
    :family==="식상"
      ?"생각을 오래 품고 있기보다 말하거나 만들어서 밖으로 꺼낼 때 판단이 더 선명해집니다. 직접 반응을 확인하면서 방향을 잡는 쪽이에요."
      :family==="재성"
        ?"중요한 선택에서는 시간과 돈, 실제로 남는 결과를 함께 봅니다. 현실적인 이득이 분명할수록 결정도 빨라지는 쪽이에요."
        :family==="관성"
          ?"무엇을 맡게 되는지와 끝까지 책임질 수 있는지를 중요하게 봅니다. 약속과 역할이 분명하면 결정도 훨씬 편해져요."
          :"바로 결론부터 내리기보다 충분히 이해하고 자기 방식으로 정리한 뒤 움직입니다. 납득이 되어야 마음도 같이 움직이는 쪽이에요.";

  const firstMeeting=["정관","편관"].includes(monthRole)
    ?"낯선 자리에서는 먼저 분위기와 사람들의 태도를 살핍니다. 말보다 약속을 어떻게 지키는지, 맡은 일을 어떻게 대하는지를 보면서 믿어도 되는 사람인지 판단해요."
    :["정재","편재"].includes(monthRole)
      ?"낯선 자리에서는 말보다 실제 행동을 먼저 봅니다. 시간을 어떻게 쓰는지, 약속을 지키는지, 사람을 대하는 태도가 꾸준한지를 보면서 거리를 정해요."
      :["식신","상관"].includes(monthRole)
        ?"낯선 자리에서는 대화가 잘 통하는지와 반응이 자연스러운지를 먼저 봅니다. 처음부터 모든 이야기를 꺼내기보다 상대의 말투와 분위기를 보며 자기 속도를 맞춰요."
        :["정인","편인"].includes(monthRole)
          ?"낯선 자리에서는 말을 많이 하기보다 먼저 듣고 살핍니다. 상대가 어떤 사람인지 어느 정도 이해가 된 뒤에야 자기 이야기를 조금씩 꺼내는 쪽이에요."
          :"낯선 자리에서는 처음부터 가까워지기보다 분위기와 상대의 태도를 먼저 봅니다. 내 기준에서 괜찮은 사람인지 확인한 뒤 조금씩 거리를 좁혀요.";

  const work=["정관","편관"].includes(monthRole)
    ?"일에서는 맡은 범위와 책임을 먼저 봅니다. 해야 할 일이 분명하면 순서를 정해 끝까지 챙기고, 애매하게 남겨두는 걸 답답해할 수 있어요."
    :["정재","편재"].includes(monthRole)
      ?"일에서는 시간과 결과를 현실적으로 따집니다. 무엇을 하면 실제 성과로 이어지는지 확인하면서 움직이고, 손에 잡히는 결과가 있을 때 힘이 더 잘 납니다."
      :["식신","상관"].includes(monthRole)
        ?"일에서는 생각을 실제 결과물로 꺼낼 때 힘이 살아납니다. 말하고 만들고 보여주는 과정에서 속도가 붙고, 답답한 방식이 오래 이어지면 자기 의견도 분명해져요."
        :["정인","편인"].includes(monthRole)
          ?"일에서는 먼저 이해하고 정리하는 과정이 필요합니다. 왜 하는 일인지 납득되면 깊게 파고들지만, 설명 없이 바로 결과만 요구받으면 속도가 늦어질 수 있어요."
          :"일에서는 자기 판단을 쓸 수 있는지가 중요합니다. 맡은 범위가 분명하면 스스로 순서를 정하고 끝까지 가져가는 힘이 살아나요.";

  const close=["정관","편관"].includes(dayRole)
    ?"가까운 사람에게는 약속과 태도의 일관성을 더 중요하게 봅니다. 한번 믿은 사람은 오래 보지만, 말과 행동이 반복해서 달라지면 그때부터 마음의 거리를 다시 생각해요."
    :["정재","편재"].includes(dayRole)
      ?"가까운 사람에게는 말보다 행동으로 마음을 보여주는 쪽입니다. 시간을 내고 필요한 걸 챙기면서 정을 표현하고, 서로 주고받는 균형이 깨지면 서운함도 커질 수 있어요."
      :["식신","상관"].includes(dayRole)
        ?"가까운 사람 앞에서는 말과 감정이 훨씬 솔직해집니다. 편한 사이일수록 좋고 싫은 게 분명하게 드러나고, 마음이 맞으면 함께하는 시간도 크게 늘어날 수 있어요."
        :["정인","편인"].includes(dayRole)
          ?"가까운 사람의 말과 행동을 오래 생각합니다. 왜 그런 말을 했는지까지 이해하려 하고, 한번 정이 들면 쉽게 관계를 끊기보다 충분히 생각해보는 쪽이에요."
          :"가까운 사람 앞에서는 자기 생각과 기준이 더 분명해집니다. 한번 내 사람이라고 느끼면 오래 가지만, 중요한 선이 반복해서 무너지면 생각보다 단호해질 수 있어요.";

  const conflict=["정관","편관"].includes(dayRole)
    ?"서운한 일이 생기면 바로 크게 부딪히기보다 상대가 같은 태도를 반복하는지 먼저 봅니다. 한두 번은 넘겨도 신뢰가 계속 흔들리면 겉으로 조용한 상태에서 마음이 멀어질 수 있어요."
    :["정재","편재"].includes(dayRole)
      ?"갈등이 생기면 누가 얼마나 했는지, 실제로 무엇이 달라졌는지를 따져보게 됩니다. 계속 한쪽만 챙기고 있다는 느낌이 들면 작은 일도 오래 서운하게 남을 수 있어요."
      :["식신","상관"].includes(dayRole)
        ?"서운한 일이 생기면 결국 말로 풀어야 마음이 정리됩니다. 다만 감정이 많이 쌓인 뒤 꺼내면 말이 세질 수 있어서, 작을 때 이야기하는 게 훨씬 편해요."
        :["정인","편인"].includes(dayRole)
          ?"서운한 일이 생기면 바로 결론내리기보다 혼자 여러 번 생각합니다. 충분히 정리한 뒤 말을 꺼내는 편이라, 상대에게는 갑자기 마음이 멀어진 것처럼 보일 때도 있어요."
          :"선을 넘었다고 느끼면 바로 싸우기보다 먼저 자기 기준을 다시 확인합니다. 참을 때는 참지만 마음속 결론이 난 뒤에는 태도가 단호해질 수 있어요.";

  const alone=["정관","편관"].includes(hourRole)
    ?"혼자 있을 때는 아직 끝나지 않은 일이나 책임이 자꾸 떠오를 수 있어요. 쉬는 시간에도 해야 할 일을 머릿속에서 정리하다 보면 실제로 쉬는 시간이 짧아질 수 있습니다."
    :["정재","편재"].includes(hourRole)
      ?"혼자 있을 때는 앞으로 필요한 돈과 일정, 현실적인 계획을 정리하는 생각이 많아질 수 있어요. 막연한 걱정보다 구체적인 계획을 세울 때 마음이 편해지는 쪽입니다."
      :["식신","상관"].includes(hourRole)
        ?"혼자 있을 때는 밖에서 다 하지 못한 말이나 아이디어가 더 많이 떠오릅니다. 생각을 글이나 메모, 결과물로 꺼내놓으면 머릿속도 같이 정리되는 쪽이에요."
        :["정인","편인"].includes(hourRole)
          ?"혼자 있을 때는 생각이 깊어집니다. 지나간 일의 이유를 다시 보고 앞으로 어떻게 할지 정리하는 시간이 필요하지만, 생각이 너무 길어지면 머리가 쉬지 못할 수 있어요."
          :"혼자 있을 때는 남의 기준보다 내 생각을 다시 확인합니다. 무엇이 맞는지 스스로 결론을 내리고 나면 마음이 훨씬 편해지는 쪽이에요.";

  return{
    core:counseling.opening,
    decision,
    firstMeeting,
    work,
    close,
    conflict,
    alone,
    shadow:counseling.shadow
  };
}
function careerExamples(facts:ConsultationFacts){
  const roles:string[]=[];
  const add=(...items:string[])=>{for(const item of items)if(!roles.includes(item))roles.push(item);};
  const structure=facts.structure;
  if(structure.includes("관"))add("프로젝트 관리","운영관리","품질·감사","인사·조직관리","공공·행정");
  if(structure.includes("재"))add("사업운영","영업관리","상품기획","재무·회계","구매·유통");
  if(structure.includes("식")||structure.includes("상관"))add("콘텐츠 기획","마케팅","브랜드 기획","제품·서비스 기획","제작");
  if(structure.includes("인"))add("리서치·분석","교육·강의","컨설팅","전문직","데이터·기획");
  const dominant=dominantFamily(facts);
  if(dominant==="비겁")add("팀 리딩","사업·창업","프리랜서","영업","프로젝트 책임");
  if(dominant==="재성")add("사업운영","영업·판매","상품기획","재무관리","고객·거래 관리");
  if(dominant==="관성")add("운영관리","프로젝트 관리","품질·컴플라이언스","조직관리","행정");
  if(dominant==="식상")add("콘텐츠 기획","마케팅","기획·제작","제품개발","교육·발표");
  if(dominant==="인성")add("분석·리서치","교육","컨설팅","전문직","기획");
  return roles.slice(0,7);
}
function careerOccupationExamples(facts:ConsultationFacts){
  const jobs:string[]=[];
  const add=(...items:string[])=>{for(const item of items)if(!jobs.includes(item))jobs.push(item);};
  const structure=facts.structure,dominant=dominantFamily(facts);
  if(structure.includes("관"))add("프로젝트 매니저","인사·노무 담당자","품질관리자","감사·컴플라이언스 담당자","공무원·공기업 직군");
  if(structure.includes("재"))add("펀드매니저·자산운용 직군","재무·회계 담당자","MD·상품기획자","영업관리자","구매·유통 담당자");
  if(structure.includes("식")||structure.includes("상관"))add("마케터","브랜드 매니저","콘텐츠 기획자","PD·제작자","서비스·제품 기획자");
  if(structure.includes("인"))add("리서처·분석가","컨설턴트","교사·강사","연구원","데이터 분석가");
  if(dominant==="비겁")add("창업가","프리랜서 전문가","영업직","팀장·조직 리더");
  if(dominant==="재성")add("자산운용·금융 직군","사업개발 담당자","세일즈·영업관리","MD·유통 직군");
  if(dominant==="관성")add("프로젝트 매니저","관리자","공공·행정 직군","품질·감사 직군");
  if(dominant==="식상")add("콘텐츠·광고 기획자","마케터","크리에이터","제품·서비스 기획자");
  if(dominant==="인성")add("연구·분석 직군","교육자","컨설턴트","전문자격 기반 직군");
  if(facts.strongest?.element==="metal")add("펀드매니저·자산운용 직군","리스크관리 직군","회계·감사 직군","금융상품 기획 직군");
  return jobs.slice(0,9);
}
function studyExamples(facts:ConsultationFacts){
  const studies:string[]=[];
  const add=(...items:string[])=>{for(const item of items)if(!studies.includes(item))studies.push(item);};
  const structure=facts.structure,dominant=dominantFamily(facts);
  if(structure.includes("관")||dominant==="관성")add("프로젝트관리·품질관리","인사·노무","행정·공공 분야","컴플라이언스·감사 관련 공부");
  if(structure.includes("재")||dominant==="재성")add("회계·재무","투자·금융","부동산·자산관리","유통·MD·영업 관련 실무 공부");
  if(structure.includes("식")||structure.includes("상관")||dominant==="식상")add("마케팅·브랜딩","콘텐츠 제작","광고·기획","디자인·제품기획 관련 실무 공부");
  if(structure.includes("인")||dominant==="인성")add("데이터·분석","상담·교육","리서치·연구","전문자격 시험");
  if(facts.strongest?.element==="metal")add("투자분석·금융","회계·재무","품질·감사","리스크관리 관련 공부");
  if(!studies.length)add("업무에 바로 쓰는 자격증","실무기술 과정","전문성을 증명할 수 있는 교육");
  return studies.slice(0,6);
}
function familyPresence(facts:ConsultationFacts,family:string){
  const count=familyCount(facts,family);
  if(family==="비겁"){
    if(count>=3)return "남이 정한 방식보다 직접 판단하고 움직이려는 모습이 자주 나옵니다. 의견이 갈리거나 경쟁이 붙으면 자기 판단을 더 단단히 붙드는 쪽이에요.";
    if(count>=1)return "평소에는 상황을 맞춰가도 중요한 순간에는 결국 본인이 납득한 방식으로 결정합니다.";
    return "처음부터 주도권을 잡기보다 경험이 쌓인 뒤 자기 판단이 생길수록 훨씬 편해지는 쪽입니다.";
  }
  if(family==="식상"){
    if(count>=3)return "생각을 말이나 결과물로 밖에 꺼낼 때 장점이 잘 살아납니다. 만들고 설명하고 보여주는 일을 오래 할수록 실력도 더 선명해져요.";
    if(count>=1)return "필요한 순간에는 생각을 말이나 결과물로 꺼낼 수 있지만, 어느 정도 준비가 되어야 마음이 놓입니다.";
    return "생각은 많아도 바로 말하거나 보여주는 건 늦을 수 있습니다. 실제로 해보고 보여주는 경험이 쌓일수록 훨씬 편해집니다.";
  }
  if(family==="재성"){
    if(count>=3)return "돈·시간·성과처럼 실제로 남는 결과를 빠르게 확인합니다. 무엇을 해야 현실적인 이득이 생기는지 보는 감각도 비교적 분명해요.";
    if(count>=1)return "평소 모든 일을 돈으로 따지지는 않지만, 중요한 선택에서는 시간과 비용에 비해 무엇이 남는지를 꽤 현실적으로 봅니다.";
    return "돈과 결과를 바로 연결해서 판단하기보다 경험을 통해 어떤 선택이 실제 이득으로 남는지 배우는 쪽에 가깝습니다.";
  }
  if(family==="관성"){
    if(count>=3)return "맡은 일과 약속을 가볍게 넘기지 않습니다. 책임질 일이 생기면 오히려 집중력이 올라가고 마무리까지 직접 확인하려 해요.";
    if(count>=1)return "평소 늘 규칙을 앞세우는 타입은 아니지만, 책임질 일이 생기면 약속과 마무리를 꽤 중요하게 챙깁니다.";
    return "책임과 규칙을 처음부터 편하게 느끼기보다 실제 역할을 맡아보면서 자기 방식의 기준을 만들어갑니다.";
  }
  if(family==="인성"){
    if(count>=3)return "새로운 걸 접하면 바로 결론내리기보다 충분히 이해하고 자기 말로 다시 정리하려 합니다. 배우고 파고드는 일에 강점이 있습니다.";
    if(count>=1)return "필요한 정보는 그냥 넘기지 않고 이해한 뒤 움직입니다. 낯선 일일수록 먼저 알아보고 정리해야 마음이 놓여요.";
    return "처음부터 오래 공부하기보다 실제 필요가 생겼을 때 집중해서 배우는 방식이 더 잘 맞습니다.";
  }
  return "상황에 따라 필요한 모습을 꺼내 쓰는 사람이에요.";
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
  const reading=pillarReading(pillar[0],pillar[1]),stemElement=STEM_ELEMENT[pillar[0]],branchElement=BRANCH_ELEMENT[pillar[1]];
  if(!stemElement||!branchElement)return"";
  const subject=withParticle(reading,"은","는");
  if(stemElement===branchElement)return `${subject} ${withParticle(elementPro(stemElement),"이","가")} 위아래에 함께 놓여 같은 성향이 더 또렷하게 드러나는 조합입니다.`;
  return `${subject} ${withParticle(elementPro(stemElement),"과","와")} ${elementPro(branchElement)}가 함께 있는 조합입니다.`;
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
    daeunAgeRange:asText(value?.daeunAgeRange),
    startAgeYears:asNumber(value?.startAgeYears),
    endAgeYears:asNumber(value?.endAgeYears),
    seunYear:asNumber(value?.seunYear),
    seunPillar:asText(value?.seunPillar),
    wolunPillar:asText(value?.wolunPillar),
    period:asRecord(value?.period)
  };
}
type FortuneSnapshot={
  synthesisId:string;year:number|null;daeunIndex:number|null;daeunPillar:string;ageRange:string;startAge:number|null;endAge:number|null;startYear:number|null;endYear:number|null;
  favorabilityScore:number;favorabilityLevel:string;activationScore:number;activationLevel:string;
  categories:Array<{key:string;label:string;support:number;activity:number}>;
};
function snapshotCategories(input:InterpretationInput,synthesisId:string){
  const rows:Array<{key:string;label:string;support:number;activity:number}>=[];
  const prefix=`CATEGORY:${synthesisId}:`;
  for(const evidence of input.evidence){
    if(!evidence.id.startsWith(prefix))continue;
    const value=asRecord(evidence.value),key=evidence.id.slice(prefix.length);
    const support=asNumber(value?.supportScore),activity=asNumber(value?.activityScore);
    if(support==null&&activity==null)continue;
    rows.push({key,label:CATEGORY_LABELS[key]??key,support:support??0,activity:activity??0});
  }
  return rows;
}
function fortuneSnapshots(input:InterpretationInput,row:Row){
  const snapshots:FortuneSnapshot[]=[];
  for(const id of row.evidenceIds){
    if(!id.startsWith("FORTUNE:")||!id.endsWith(":PERIOD_CONTEXT"))continue;
    const synthesisId=id.slice("FORTUNE:".length,-":PERIOD_CONTEXT".length);
    const context=asRecord(evidenceValue(input,id));
    if(!context)continue;
    const favor=asRecord(evidenceValue(input,`FORTUNE:${synthesisId}:FAVORABILITY`));
    const activation=asRecord(evidenceValue(input,`FORTUNE:${synthesisId}:ACTIVATION`));
    const period=asRecord(context.period),startInstant=asText(period?.startInstant),endInstant=asText(period?.endInstant);
    const startYear=/^\d{4}/.test(startInstant)?Number(startInstant.slice(0,4)):null,endYear=/^\d{4}/.test(endInstant)?Number(endInstant.slice(0,4)):null;
    snapshots.push({
      synthesisId,
      year:asNumber(context.seunYear),
      daeunIndex:asNumber(context.daeunIndex),
      daeunPillar:asText(context.daeunPillar),
      ageRange:asText(context.daeunAgeRange),
      startAge:asNumber(context.startAgeYears),
      endAge:asNumber(context.endAgeYears),
      startYear,
      endYear,
      favorabilityScore:asNumber(favor?.score)??0,
      favorabilityLevel:asText(favor?.level),
      activationScore:asNumber(activation?.score)??0,
      activationLevel:asText(activation?.level),
      categories:snapshotCategories(input,synthesisId)
    });
  }
  return snapshots;
}
function topSnapshotCategory(snapshot:FortuneSnapshot,mode:"activity"|"support"){
  if(!snapshot.categories.length)return null;
  return [...snapshot.categories].sort((a,b)=>mode==="activity"?b.activity-a.activity:b.support-a.support)[0]??null;
}
function uniqueYearSnapshots(rows:FortuneSnapshot[]){
  const grouped=new Map<number,FortuneSnapshot[]>();
  for(const row of rows){
    if(row.year==null)continue;
    const bucket=grouped.get(row.year)??[];
    bucket.push(row);grouped.set(row.year,bucket);
  }
  const duration=(row:FortuneSnapshot)=>{
    const start=row.startYear!=null?Date.parse(String(row.startYear)+"-01-01"):NaN;
    const end=row.endYear!=null?Date.parse(String(row.endYear)+"-01-01"):NaN;
    return Number.isFinite(start)&&Number.isFinite(end)?Math.max(1,end-start):1;
  };
  return [...grouped.entries()]
    .sort(([a],[b])=>a-b)
    .map(([,bucket])=>[...bucket].sort((a,b)=>duration(b)-duration(a)||a.synthesisId.localeCompare(b.synthesisId))[0]);
}
function categoryLifeSentence(label:string){
  if(label==="재물")return"돈의 출입·수입 구조·큰 지출처럼 재물 선택이 많아지기 쉽습니다.";
  if(label==="사업")return"사업·부수입·고객·판매처럼 시장 반응을 직접 확인할 일이 늘기 쉽습니다.";
  if(label==="직업")return"직무 변화·책임 확대·이직이나 역할 조정처럼 일의 자리가 움직이기 쉽습니다.";
  if(label==="관계")return"새로운 만남, 관계 정리, 결혼처럼 사람과의 거리 조정이 중요해지기 쉽습니다.";
  if(label==="학업")return"자격증·전문 공부·새 기술처럼 앞으로 써먹을 배움에 시간을 쓰기 좋습니다.";
  if(label==="변화")return"이동·환경 변화·새로운 선택처럼 익숙한 생활 틀을 바꿀 일이 많아질 수 있습니다.";
  return`${label} 쪽에서 평소보다 선택할 일이 늘기 쉽습니다.`;
}
function categoryActionSentence(label:string){
  if(label==="재물")return"큰돈을 움직일 때는 수입만 보지 말고 회수 시점과 남길 금액을 먼저 정해두는 편이 좋습니다.";
  if(label==="사업")return"새 아이디어를 한꺼번에 넓히기보다 고객 반응이 확인되는 한 가지를 먼저 밀어붙이는 편이 좋습니다.";
  if(label==="직업")return"역할이 커질수록 책임만 늘어나는지, 결정권도 같이 커지는지를 확인하는 게 중요합니다.";
  if(label==="관계")return"새로운 만남이나 관계 변화가 있으면 감정만 보지 말고 생활 방식과 약속이 실제로 맞는지 같이 보세요.";
  if(label==="학업")return"자격·전문 공부처럼 끝난 뒤 바로 쓸 수 있는 결과가 남는 공부를 잡는 편이 좋습니다.";
  if(label==="변화")return"여러 변화를 동시에 만들기보다 반드시 바꿀 것 하나와 지킬 것 하나를 먼저 정해두는 편이 좋습니다.";
  return"움직임이 큰 분야에 시간을 먼저 배분하고 다른 일은 과하게 벌리지 않는 편이 좋습니다.";
}
function partnerAppearanceSentence(facts:ConsultationFacts){
  const element=BRANCH_ELEMENT[facts.dayBranch]??"";
  const byElement:Record<string,string>={
    wood:"전체적으로 길고 단정한 선, 자연스럽고 깔끔한 인상이 먼저 들어오는 사람",
    fire:"표정과 눈빛이 밝고 생기가 있으며, 말하거나 움직일 때 존재감이 살아나는 사람",
    earth:"편안하고 안정감 있는 인상, 과하게 꾸미기보다 단정하고 든든한 분위기의 사람",
    metal:"이목구비나 선이 또렷하고 깔끔하며, 옷차림도 정돈된 인상을 주는 사람",
    water:"선이 부드럽고 차분하며, 눈빛이나 분위기에서 조용하고 유연한 느낌이 나는 사람"
  };
  const role=facts.branchMainTenGodByPosition.day||facts.stemTenGodByPosition.day;
  const style=["정관","편관"].includes(role)?"옷차림이나 태도도 단정하고 자기관리가 되는 쪽":
    ["정재","편재"].includes(role)?"실용적이면서도 상황에 맞게 센스 있게 꾸미는 쪽":
    ["식신","상관"].includes(role)?"표정이 풍부하거나 말할 때 매력이 살아나는 쪽":
    ["정인","편인"].includes(role)?"차분하고 지적인 분위기, 과한 꾸밈보다 자기 취향이 보이는 쪽":
    ["비견","겁재"].includes(role)?"활동적이고 자기 색이 분명한 인상":"꾸밈보다 전체 분위기가 안정적인 쪽";
  const base=byElement[element]??"깔끔하고 자기 생활이 느껴지는 인상의 사람";
  return `배우자 자리인 일지의 분위기를 외형으로 풀면, ${base}에게 마음이 갈 가능성이 있습니다. 스타일은 ${style}이 더 잘 맞습니다. 정확한 키·얼굴형을 단정하는 뜻은 아니고, 첫인상과 분위기의 경향으로 보는 편이 맞습니다.`;
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
  const readingTopic=withParticle(reading,"은","는");
  if(stemElement&&branchElement&&stemElement===branchElement)return `${readingTopic} ${withParticle(elementPro(stemElement),"이","가")} 위아래에서 함께 강조되는 시기입니다. 이 기운이 맡는 역할이 평소보다 전면에 나옵니다.`;
  if(stemElement&&branchElement)return `${readingTopic} ${withParticle(elementPro(stemElement),"과","와")} ${withParticle(elementPro(branchElement),"이","가")} 함께 들어오는 시기입니다. 평소 가진 성향과 만나면서 어느 분야의 움직임이 커지는지가 중요합니다.`;
  return `${reading}의 기운이 들어오는 시기입니다.`;
}



function elementFact(facts:ConsultationFacts){
  if(!facts.strongest||!facts.weakest)return"";
  const strongest=elementPro(facts.strongest.element);
  if(facts.missing.length){
    const missing=facts.missing.map(elementPro);
    const missingText=missing.length===1?withParticle(missing[0],"은","는"):missing.join("·")+"은";
    return "오행에서는 "+withParticle(strongest,"이","가")+" 가장 강하고, "+missingText+" 사주 안에서 비어 있습니다.";
  }
  const weakest=elementPro(facts.weakest.element);
  return "오행에서는 "+withParticle(strongest,"이","가")+" 가장 강하고 "+withParticle(weakest,"이","가")+" 가장 약합니다.";
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
function strengthCounseling(level:string){
  if(["극약","태약"].includes(level))return"혼자 끝까지 버티는 것보다 사람·정보·환경의 도움을 일찍 받아들일 때 훨씬 안정적으로 오래 가는 편입니다.";
  if(level==="신약")return"웬만한 일은 스스로 해내려 하지만, 일이 커질수록 혼자 버티기보다 필요한 도움을 잘 쓰는 쪽에서 본래 실력이 더 잘 살아납니다.";
  if(level==="중화신약")return"웬만한 일은 스스로 판단하고 해낼 수 있지만, 모든 걸 혼자 끌고 가기보다 필요한 순간에 주변 도움을 받을 때 훨씬 안정적으로 오래 가는 편입니다.";
  if(level==="중화신강")return"스스로 방향을 잡고 밀어붙일 힘이 충분한 편입니다. 다만 일이 커질수록 혼자 다 챙기기보다 사람과 역할을 나누는 쪽이 더 오래 갑니다.";
  if(level==="신강")return"스스로 판단하고 끝까지 끌고 가는 힘이 분명한 편입니다. 그래서 도움을 받아야 할 시점까지 혼자 버티는 시간이 길어질 수 있습니다.";
  if(["태강","극왕"].includes(level))return"혼자 밀고 가는 힘이 강한 편이라 시작과 추진은 빠를 수 있습니다. 대신 속도를 늦추고 다른 사람에게 맡기는 순간을 의식적으로 만들어야 지치지 않습니다.";
  return"혼자 할 일과 도움받을 일을 적당히 나눌 때 가장 안정적으로 오래 가는 편입니다.";
}
function structureMeaning(structure:string){
  if(structure.includes("정관"))return"책임과 약속을 중요하게 여기고 신뢰를 쌓는 성향";
  if(structure.includes("편관"))return"압박이 있어도 결단하고 맡은 몫을 끝까지 책임지는 성향";
  if(structure.includes("정재"))return"꾸준히 관리하면서 안정적인 결과를 쌓아가는 성향";
  if(structure.includes("편재"))return"사람과 기회를 넓게 보고 현실적인 가능성을 빠르게 잡는 성향";
  if(structure.includes("식신"))return"배운 것을 실제 결과물로 꾸준히 만들어내는 성향";
  if(structure.includes("상관"))return"자기 생각을 분명히 표현하고 답답한 방식을 바꾸려는 성향";
  if(structure.includes("정인")||structure.includes("편인"))return"충분히 이해하고 자기 방식으로 정리한 뒤 움직이는 성향";
  if(structure.includes("건록")||structure.includes("양인"))return"스스로 방향을 정하고 자기 방식대로 밀고 가는 성향";
  return"스스로 기준을 세우고 실제 결과까지 챙기려는 성향";
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
    if(facts.structure&&useful)return "평소 가장 자주 드러나는 모습은 "+structureMeaning(facts.structure)+"입니다. 도움 되는 기운은 "+useful+" 순으로 보고, 부족한 쪽을 보완할 때 전체 흐름이 더 매끄러워집니다.";
    if(facts.structure)return "평소 가장 자주 드러나는 모습은 "+structureMeaning(facts.structure)+"입니다. 일과 관계에서도 비슷한 선택 기준이 반복해서 나타납니다.";
  }
  if(group==="IDENTITY"){
    if(/일주|두 글자/.test(title)&&facts.dayPillar)return (facts.dayPillarReading||facts.dayPillar)+" 일주는 이 사주에서 나 자신을 가장 가까이 보는 자리입니다. "+(facts.dayStemName||"나를 대표하는 기운")+"의 성향이 가까운 관계와 실제 선택에서 가장 직접적으로 드러납니다.";
    if(facts.dayStemName)return "나를 대표하는 중심은 "+facts.dayStemName+"입니다. "+elementFact(facts).replace(/^오행에서는 /,"")+" 이 조합이 성격의 방향을 만듭니다.";
  }
  if(group==="WORK"){
    if(/잘 맞는 일/.test(title))return "직업에서는 직함보다 하루 동안 어떤 판단을 하고 어떤 결과를 만드는지가 더 중요합니다. "+workVerdict(facts);
    if(/직장운|직장에서 잘 풀리는 방식/.test(title))return "직장에서는 맡은 범위와 판단권이 분명할수록 강점이 더 잘 살아납니다. "+workVerdict(facts);
    if(/사업운/.test(title))return facts.structure.includes("재")
      ?"사업운은 눈여겨볼 만합니다. 돈과 시장, 운영 결과를 직접 다루는 구조와 연결될수록 장점이 크게 살아납니다."
      :"사업은 무조건 독립하는 것보다 내가 결정권을 갖고 결과를 직접 확인할 수 있는 구조일 때 잘 맞습니다.";
    if(/책임/.test(title))return "책임이 커지면 오히려 집중력이 살아나는 편입니다. 다만 모든 일을 직접 확인하려 들면 강점이 과부하로 바뀌기 쉽습니다.";
    if(/인간관계/.test(title))return "직장 인간관계에서는 친밀감보다 역할과 약속이 분명한지가 더 중요합니다. 누가 어디까지 맡는지가 선명할수록 불필요한 감정 소모가 줄어듭니다.";
    if(/학업운|어떤 공부가 잘 맞을까/.test(title))return "공부는 단순 암기보다 배워서 어디에 쓸지가 분명할수록 잘 맞습니다. 이해한 내용을 자기 말로 다시 정리할 때 실력이 빨리 붙는 편입니다.";
    return"";
  }
  if(group==="WEALTH"){
    if(/기본 성향/.test(title))return "재물운은 단순히 아끼는 힘보다 돈을 어디에 쓰고 어떤 결과로 돌려받는지가 중요합니다. "+(facts.structure?structureMeaning(facts.structure):"자기 기준을 현실 결과로 연결하는 힘")+"이 돈의 선택에도 그대로 이어집니다.";
    if(/돈의 흐름/.test(title))return "돈의 흐름은 한 번의 큰 행운보다 반복해서 남는 구조를 만드는 쪽에 가깝습니다. "+elementFact(facts)+" 이 균형 때문에 잘하는 부분과 일부러 보완해야 할 부분이 재물관리에서도 갈립니다.";
    if(/버는 힘/.test(title))return "돈을 버는 힘은 시간을 많이 쓰는 것보다 결과를 구조화하는 데서 커집니다. 기획한 것을 서비스·판매·운영처럼 반복 가능한 형태로 만들수록 재물운을 쓰기 좋습니다.";
    if(/모으고 지키/.test(title))return"버는 것과 지키는 것은 다른 능력입니다. 수입이 늘어도 사람·확장·새 기회에 돈이 같이 움직이면 남는 돈은 달라지므로, 기준과 정산 구조를 미리 정해두는 편이 좋습니다.";
    if(/인간관계/.test(title))return"돈과 사람을 섞을 때는 호의보다 기준이 먼저입니다. 가까운 사이라도 금액·역할·정산 시점을 미리 정해둘수록 관계까지 오래 갑니다.";
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
    if(/한눈에|분포|10가지/.test(title))return "일·돈·관계에서 어떤 역할이 먼저 나오는지 보면 평소 선택 방식이 더 쉽게 보입니다. "+(facts.structure?structureMeaning(facts.structure)+"이 평소 선택에서 자주 드러납니다.":"");
    if(/비겁/.test(title))return "비겁은 스스로 결정하고 버티는 힘과 연결됩니다. 잘 쓰면 독립성과 경쟁력이 되지만, 모든 일을 직접 하려 들면 협업이 어려워질 수 있습니다.";
    if(/식상/.test(title))return "식상은 생각을 말과 결과물로 밖에 꺼내는 힘입니다. 콘텐츠·표현·생산·판매처럼 눈에 보이는 결과를 만들 때 이 축을 씁니다.";
    if(/재성/.test(title))return "재성은 돈 그 자체보다 현실의 결과와 자원을 다루는 힘입니다. 매출·자산·운영처럼 숫자로 남는 결과와 연결됩니다.";
    if(/관성/.test(title))return "관성은 책임과 규칙, 사회에서 맡는 역할과 연결됩니다. 기준을 지키는 힘이지만 납득되지 않는 통제까지 편하다는 뜻은 아닙니다.";
    if(/인성/.test(title))return "인성은 배우고 이해하고 받아들이는 힘입니다. 정보를 자기 것으로 만들고 전문성을 쌓는 과정과 연결됩니다.";
  }
  if(group==="YEARLY_OVERVIEW"||group==="MONTHLY"||group.startsWith("YEAR_"))return title+"은 특정 사건을 맞히기보다 그 시기에 일·돈·관계 중 어디가 더 바빠지는지를 살펴봅니다. 좋은 시기와 바쁜 시기는 같은 말이 아니므로 둘을 나눠서 읽습니다.";
  if(group==="DAEUN_OVERVIEW"||group.startsWith("DAEUN_"))return title+"은 몇 년 동안 반복되는 큰 생활 배경을 봅니다. 같은 사람이라도 시기가 바뀌면 맡는 역할과 돈·관계의 우선순위가 달라질 수 있습니다.";
  if(group==="SAMJAE"||group==="CHANGE")return title+"은 나쁜 일이 생긴다는 뜻이 아닙니다. 평소 모습과 그 시기의 변화를 함께 보면서 어디에서 선택할 일이 많아지는지를 살펴봅니다.";
  if(group==="SYNTHESIS")return "앞의 내용을 다시 나열하기보다, "+(facts.structure?structureMeaning(facts.structure)+", ":"")+(facts.strength?strengthMeaning(facts.strength):"전체적인 균형")+"을 함께 묶어 앞으로 선택할 때 남겨야 할 핵심만 정리합니다.";
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
      lead:"끝까지 읽고 나면 몇 가지 반복되는 모습이 남아요. 그게 오래 반복되는 핵심 성향이에요.",
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
  let result=text
    .replaceAll("일관성","__POSTPOST_CONSISTENCY__")
    .replaceAll("습관성","__POSTPOST_HABITUAL__");
  for(const [term,meaning] of Object.entries(CUSTOMER_NARRATION_TERM_MAP).sort(([left],[right])=>right.length-left.length)){
    result=result.split(term).join(meaning);
  }
  return result
    .replaceAll("__POSTPOST_CONSISTENCY__","일관성")
    .replaceAll("__POSTPOST_HABITUAL__","습관성");
}
function naturalizeNarration(text:string){
  return customerizeNarration(text)
    .replaceAll("자기준","자기 기준")
    .replaceAll("작동합니다","드러나요")
    .replaceAll("작동하고","드러나고")
    .replaceAll("작동하는","드러나는")
    .replaceAll("작동하기","드러나기")
    .replaceAll("이 장의 목적은 ","중요한 건 ")
    .replaceAll("이 장의 핵심은 ","중요한 건 ")
    .replaceAll("핵심은 ","중요한 건 ")
    .replaceAll("가장 중요한 것은 ","가장 중요한 건 ")
    .replaceAll("이 장에서는 ","")
    .replaceAll("보는 편이 더 정확합니다","실제 모습에 더 가까워요")
    .replaceAll("보는 편이 훨씬 정확합니다","실제 모습에 더 가까워요")
    .replaceAll("보는 편이 정확합니다","실제 모습에 더 가까워요")
    .replaceAll("보는 편이 맞습니다","그렇게 이해하면 자연스러워요")
    .replaceAll("읽는 편이 맞습니다","그렇게 이해하면 자연스러워요")
    .replaceAll("읽는 편이 정확합니다","실제 모습에 더 가까워요")
    .replaceAll("마음이 놓이는 편입니다","그래야 마음이 놓입니다")
    .replaceAll("마음이 놓이는 편이에요","그래야 마음이 놓여요")
    .replaceAll("중요하게 보는 편입니다","중요하게 봅니다")
    .replaceAll("중요하게 보는 편이에요","중요하게 봐요")
    .replaceAll("확인하는 편입니다","확인합니다")
    .replaceAll("확인하는 편이에요","확인해요")
    .replaceAll("정하는 편입니다","정합니다")
    .replaceAll("정하는 편이에요","정해요")
    .replaceAll("결정하는 편입니다","결정합니다")
    .replaceAll("결정하는 편이에요","결정해요")
    .replaceAll("챙기는 편입니다","챙깁니다")
    .replaceAll("챙기는 편이에요","챙겨요")
    .replaceAll("움직이는 편입니다","움직입니다")
    .replaceAll("움직이는 편이에요","움직여요")
    .replaceAll("생각하는 편입니다","생각합니다")
    .replaceAll("생각하는 편이에요","생각해요")
    .replaceAll("말하는 편입니다","말합니다")
    .replaceAll("말하는 편이에요","말해요")
    .replaceAll("수 있습니다.","수 있어요.")
    .replaceAll("가깝습니다.","가까워요.")
    .replaceAll("나옵니다.","나와요.")
    .replaceAll("드러납니다.","드러나요.")
    .replaceAll("중요합니다.","중요해요.")
    .replaceAll("좋습니다.","좋아요.")
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
      "직책이나 역할을 통해 만나는 사람은 친분보다 서로 맡은 일을 나눠둘 때 관계가 편해집니다.",
      "뜻밖의 제안을 받으면 좋은 인연이라는 이름보다 실제 조건과 역할을 먼저 확인하는 편이 안전합니다."
    ],
    consequences:[
      "도움을 받는 힘은 사람 수보다 필요한 순간에 맞는 연결을 쓰는 능력에 가깝습니다.",
      "혼자 버티려는 습관이 강하면 이미 있는 도움을 늦게 쓰게 될 수 있습니다.",
      "좋은 관계라도 서로 뭘 기대하는지 말하지 않으면 부담이 생길 수 있어요. 처음부터 솔직하게 맞춰두는 편이 좋아요.",
      "배움으로 만난 인연은 바로 결과보다 시간이 지나며 선택의 폭을 넓혀 줄 수 있습니다.",
      "도움을 받았을 때 본인의 책임 범위까지 정해두면 관계가 오래 가기 쉽습니다."
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
    scene:"회의나 첫 만남처럼 평가가 빠른 자리에서는 맡은 범위를 정하고 결과를 챙기는 모습이 먼저 드러납니다. 속으로 고민하는 시간보다 겉으로 확인되는 행동이 인상을 만듭니다.",
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
      "상황이 바뀌어도 끝까지 남는 기준이 무엇인지 보면 본인에게 오래 남는 기준을 찾기 쉬워집니다.",
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
      "내 기준을 지키되 모든 사람이 같은 속도로 움직이지 않는다는 점을 받아들이면, 관계에서도 일에서도 훨씬 여유가 생깁니다.",
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
      "재물 계획은 미래를 맞히는 일이 아니라 현재의 선택이 생활에 어떤 부담을 남기는지 점검하는 과정으로 이해하는 편이 자연스럽습니다."
    ]
  },
  RELATIONSHIP:{
    contextA:[
      "관계에서는 마음의 크기보다 가까워지는 속도와 불편함을 말하는 시점이 더 큰 차이를 만들 수 있습니다.",
      "처음 만났을 때의 태도와 오래 가까워진 뒤의 행동이 다를 수 있으므로 관계의 시간을 나눠 보는 편이 좋습니다.",
      "좋아하는 마음을 말로 표현하는 사람도 있고 약속을 지키고 챙기는 행동으로 보여 주는 사람도 있습니다.",
      "다툼이 생겼을 때 바로 말하는 사람인지, 혼자 생각할 시간이 필요한 사람인지에 따라 같은 일도 훨씬 다르게 느껴질 수 있어요.",
      "가까운 사람일수록 기대가 커지기 쉬워 배려와 책임의 경계를 정해두는 일이 중요해집니다."
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
      "도움을 받을수록 내가 책임질 몫까지 나눠두어야 관계가 오래 편하게 갑니다.",
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
      "사람에게 기대는 것과 관계를 활용하는 건 달라요. 서로의 역할이 분명할 때 좋은 인연의 도움을 가장 편하게 받을 수 있어요."
    ]
  },
  ROLES:{
    contextA:[
      "십성과 십이운성은 사람을 여러 조각으로 나누는 표가 아니라, 상황마다 어떤 역할과 에너지가 먼저 나오는지를 보는 도구예요.",
      "일할 때 앞에 나오는 성향과 가까운 사람 앞에서 나오는 성향이 다를 수 있는 이유도 역할이 달라지기 때문이에요.",
      "어떤 역할이 강하다고 해서 그 역할만 평생 쓰는 건 아니에요. 환경에 따라 앞에 나오는 힘이 달라집니다.",
      "배우는 힘, 표현하는 힘, 돈을 다루는 힘, 책임지는 힘은 서로 따로 움직이기도 하고 한 장면에서 같이 드러나기도 해요.",
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
      "한 가지 값만 보면 단순해 보이지만 전체 성향을 같이 보면 같은 특징도 상황에 따라 전혀 다르게 나타날 수 있어요.",
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
      "한 가지 모습으로만 설명되는 사람은 아닙니다. 낯선 사람 앞에서는 먼저 분위기를 읽고, 일을 할 때는 책임과 기준이 앞에 서며, 가까운 사람 앞에서는 감정과 신뢰가 훨씬 솔직하게 드러납니다.",
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
  const spine=personalitySpine(facts);

  if(id==="book-007"){
    return[
      `기본적으로 ${spine.core}`,
      spine.decision,
      spine.work,
      `장점이 과해질 때는 ${spine.shadow}`,
      "성격을 한두 단어로 고정하기보다, 어떤 상황에서 무엇을 먼저 보고 어떻게 결정하는지가 이 사람을 가장 잘 보여줍니다."
    ];
  }

  if(id==="book-008")return[
    "한마디로 보면, 충분히 생각한 뒤 한번 정하면 오래 가는 사람입니다.",
    "남이 좋다고 하는 답보다 스스로 납득할 수 있는 이유가 있어야 마음이 움직여요. 그래서 결정 전에는 시간이 걸려도 결론이 난 뒤에는 태도가 오히려 분명해집니다.",
    `이 힘이 장점으로 쓰이면 꾸준함과 책임감이 되지만, 과해지면 ${spine.shadow}`
  ];

  if(id==="book-009")return[
    "자리마다 보이는 모습은 조금 달라도 중심 기준까지 바뀌는 건 아니에요.",
    spine.firstMeeting,
    spine.work,
    spine.close,
    "낯선 곳에서는 먼저 살피고, 일에서는 맡은 몫을 보고, 가까운 관계에서는 자기 기준과 감정이 더 분명해집니다. 서로 다른 모습이라기보다 같은 사람이 상황에 맞게 힘을 쓰는 순서가 달라지는 거예요."
  ];

  if(id==="book-010")return[
    spine.firstMeeting,
    "처음부터 많은 이야기를 꺼내기보다 상대를 조금 더 본 뒤 편해지는 쪽입니다. 그래서 첫인상과 친해진 뒤의 모습에 차이가 날 수 있어요.",
    spine.close,
    "처음에는 거리를 두고 보는 시간이 필요하지만, 믿을 만하다고 느끼면 관계를 가볍게 대하지 않습니다.",
    "그래서 첫 만남에서 중요한 건 사람을 빨리 판단하는 게 아니라, 시간이 지나도 말과 행동이 비슷한 사람인지 확인하는 과정에 가깝습니다."
  ];

  if(id==="book-011")return[
    spine.work,
    spine.decision,
    "잘 맞는 환경에서는 맡은 범위가 분명하고, 그 안에서 자기 판단을 쓸 수 있어요. 반대로 책임만 커지고 결정할 수 있는 게 없으면 답답함이 빠르게 쌓일 수 있습니다.",
    "시간이 갈수록 단순히 일을 많이 하는 사람보다, 어떤 기준으로 끝을 내는지가 분명한 사람으로 보이기 쉬워요.",
    "사회생활에서의 강점은 무조건 앞에 나서는 데 있지 않습니다. 맡은 일의 흐름을 이해하고 자기 몫을 안정적으로 끝내는 데서 더 잘 드러나요."
  ];

  if(id==="book-012")return[
    spine.close,
    "가까워질수록 처음보다 자기 생각과 감정을 더 솔직하게 보여줍니다. 그래서 낯선 사람이 보는 모습과 오래 본 사람이 느끼는 모습이 꽤 다를 수 있어요.",
    spine.conflict,
    "한번 관계를 중요하게 생각하면 쉽게 끊어내기보다 충분히 생각해보는 쪽입니다. 다만 마음속 결론이 나기 전에 지금 무엇이 불편한지 조금씩 드러내는 편이 서로에게 덜 갑작스러워요.",
    "가까운 관계에서도 처음 만났을 때와 같은 기준이 이어집니다. 결국 오래 보는 건 말 한마디보다 반복되는 태도와 행동이에요."
  ];

  if(id==="book-013")return[
    spine.alone,
    "밖에서 바로 넘겼던 일도 혼자 있을 때 다시 생각해볼 수 있습니다. 사람과 일 사이에서 놓친 부분이 없는지 자기 방식으로 한 번 더 정리하려는 시간이 필요해요.",
    spine.decision,
    "이 과정은 다음 선택을 더 분명하게 만드는 장점이 있지만, 이미 결론이 난 일을 계속 확인하면 신중함이 피로로 바뀔 수 있습니다.",
    "혼자 있는 시간은 생각을 더 늘리는 시간이라기보다, 내 기준을 다시 정리하고 다음 행동을 정하는 시간으로 쓰는 게 잘 맞아요."
  ];

  if(id==="book-014")return[
    spine.conflict,
    spine.close,
    "그래서 겉으로는 별일 아닌 것처럼 보여도 속에서는 관계의 거리나 앞으로의 태도를 다시 생각하고 있을 때가 있습니다.",
    "반대로 상대의 태도가 다시 믿을 만하다고 느껴지면 감정을 오래 끌기보다 관계를 이어가려는 힘도 있습니다.",
    "감정을 처리하는 모습도 다른 챕터와 따로 떨어진 성향이 아니에요. 사람을 천천히 보고, 한번 중요해진 관계는 쉽게 넘기지 않는 같은 기준이 여기에서도 이어집니다."
  ];

  if(id==="book-016"){
    const missingLabel=facts.missing.length===1?elementPro(facts.missing[0]):"";
    return[
      elementFact(facts)||"다섯 기운의 분포를 보면 어느 쪽을 평소 더 많이 쓰는지 확인할 수 있습니다.",
      strongest?`${withParticle(elementPro(strongest),"은","는")} 다섯 기운 가운데 비중이 가장 커서 특별히 의식하지 않아도 관련된 행동이 자주 나오는 편입니다.`:"강한 기운은 평소 자연스럽게 자주 쓰는 방식에 가깝습니다.",
      facts.missing.length===1?`${withParticle(missingLabel,"이","가")} 비어 있다는 건 그 능력이 없다는 뜻은 아닙니다. 다만 그 방식이 저절로 익숙하게 나오지 않아 환경이나 습관으로 만들어줘야 한다는 뜻에 가깝습니다.`:weakest?`${withParticle(elementPro(weakest),"은","는")} 상대적으로 비중이 낮아 바쁠수록 뒤로 밀리기 쉬운 쪽입니다.`:"비율이 낮은 기운은 필요한 순간에 조금 더 의식해야 할 수 있습니다.",
      "여기서는 많고 적음을 좋고 나쁨으로 보지 않습니다. 지금 내게 익숙한 방식과 덜 익숙한 방식을 구분하는 정도로 보면 충분합니다."
    ];
  }

  if(id==="book-024"){
    const strongBehavior=strongest?elementBehavior(strongest):null,weakBehavior=weakest?elementBehavior(weakest):null;
    const missingLabel=facts.missing.length===1?elementPro(facts.missing[0]):"";
    const metalFire=strongest==="metal"&&weakest==="fire";
    return[
      metalFire?"생활에서는 정리하고 확인하는 속도와, 밖으로 보여주는 속도에 차이가 생기기 쉽습니다. 틀린 부분을 찾고 완성도를 높이는 건 빠른데, 아직 부족한 것 같아 공개나 시작을 미루는 식입니다.":"오행의 차이는 숫자보다 실제 행동의 속도 차이로 느껴지는 경우가 많습니다. 어떤 일은 별생각 없이 바로 하는데, 어떤 일은 필요하다는 걸 알아도 시작이 늦어질 수 있습니다.",
      strongBehavior?strongBehavior.natural:"익숙한 방식은 특별히 애쓰지 않아도 자연스럽게 나오는 편입니다.",
      weakBehavior?weakBehavior.weak:"덜 익숙한 방식은 필요해도 바로 나오지 않고 준비 시간이 더 필요할 수 있습니다.",
      facts.missing.length===1?`${withParticle(missingLabel,"이","가")} 비어 있다면 그 행동은 마음먹는다고 바로 익숙해지기보다, 실제로 말하고 보여주고 반복하는 경험이 쌓일수록 편해지는 쪽에 가깝습니다.`:"비중이 낮은 부분은 바쁠수록 더 쉽게 뒤로 밀릴 수 있습니다.",
      metalFire?"그래서 완성도를 더 높이는 것보다 '이 정도면 한번 보여줘도 된다'고 판단하는 시점을 조금 앞당기는 게 더 중요합니다. 준비한 것을 밖에 꺼내는 순간부터 새로운 경험이 붙습니다.":weakBehavior?weakBehavior.practice:"덜 익숙한 부분은 실제 행동으로 반복할수록 훨씬 편해집니다."
    ];
  }

  if(id==="book-017")return[
    "웬만한 일은 남에게 기대기 전에 먼저 혼자 해결해보려는 편입니다. 실제로 스스로 해낼 수 있는 일도 많아서, 주변에서는 독립적이고 버티는 힘이 좋은 사람으로 보기 쉽습니다.",
    "다만 문제는 힘든 일을 못 견디는 게 아니라, 힘들다는 걸 인정하는 시점이 늦다는 데 있습니다. 처음에는 괜찮다고 넘기다가 일정과 책임이 한꺼번에 겹치면 그때서야 피로가 크게 느껴질 수 있습니다.",
    dominantFamilySentence(facts)||"일단 내 방식으로 해본 뒤에야 다른 사람의 방법을 받아들이는 편입니다.",
    "그래서 도움은 누군가에게 기대는 문제가 아니라 역할을 나누는 문제에 가깝습니다. 잘 맞는 사람에게 일을 맡기거나, 필요한 정보만 먼저 받는 것만으로도 훨씬 오래 안정적으로 갈 수 있습니다.",
    "중요한 건 더 오래 혼자 버티는 게 아닙니다. 내가 직접 해야 결과가 좋아지는 일과, 다른 사람에게 맡겨도 되는 일을 구분하는 순간부터 훨씬 편해집니다."
  ];

  if(id==="book-018"){
    if(!facts.useful.length)return[
      "지금은 특정 기운 하나를 무조건 더해야 한다고 보기보다, 평소 자주 막히는 행동부터 보완하는 편이 좋습니다.",
      "이미 잘하는 부분을 더 세게 밀기보다 덜 익숙한 행동을 생활 안에 조금씩 넣는 쪽이 균형을 잡는 데 도움이 됩니다."
    ];
    return[
      usefulSentence(facts),
      ...facts.useful.slice(0,3).map((element,index)=>{
        const guide=usefulElementGuide(element);
        return `${index===0?"가장 먼저":index===1?"그다음":"이어서"} ${withParticle(elementPro(element),"은","는")} ${guide.why} ${guide.where}`;
      }),
      "순서가 앞선 기운일수록 지금 생활에서 우선적으로 보완할 가치가 크다는 뜻입니다. 색이나 물건을 찾기보다 실제 행동으로 연결하는 편이 훨씬 현실적입니다."
    ];
  }

  if(id==="book-025"){
    if(!facts.useful.length)return[
      "부족한 부분은 거창하게 바꾸기보다 실제 생활에서 자주 막히는 장면 하나부터 바꾸는 게 좋습니다.",
      "잘 안 되는 행동을 의지로 밀어붙이기보다, 그 행동이 자연스럽게 나올 환경을 만들어두는 편이 오래 갑니다."
    ];
    return[
      "도움이 되는 기운은 결국 생활 방식으로 바뀌어야 의미가 있습니다. 색이나 물건보다 평소 행동을 조금 바꾸는 쪽이 훨씬 직접적입니다.",
      ...facts.useful.slice(0,3).map((element,index)=>{
        const guide=usefulElementGuide(element),label=withParticle(elementPro(element),"은","는");
        if(index===0)return `가장 먼저 ${label} ${guide.practice}`;
        if(index===1)return `그다음 ${label} 평소 잘 안 되는 순간에 ${guide.practice}`;
        return `이어서 ${label} 생활에 오래 남기려면 ${guide.practice}`;
      }),
      "셋을 한꺼번에 바꾸려 하기보다 지금 가장 자주 막히는 장면 하나와 연결해서 시작하는 편이 좋습니다. 몸에 익기 시작하면 그다음 행동을 붙여도 늦지 않습니다."
    ];
  }

  if(id==="book-020"){
    const counseling=stemCounseling(facts);
    const weakBehavior=weakest?elementBehavior(weakest):null;
    const missingWeak=Boolean(weakest&&facts.missing.includes(weakest));
    return[
      `나를 대표하는 기운을 쉽게 풀면 ${stem.image}에 가깝습니다. ${counseling.opening}`,
      strongest?`${withParticle(elementPro(strongest),"이","가")} 강해서 ${elementBehavior(strongest).natural}`:"평소 자연스럽게 자주 쓰는 방식이 겉으로 보이는 성향을 더 선명하게 만듭니다.",
      missingWeak?`${withParticle(elementPro(weakest!),"이","가")} 비어 있다는 건 그 능력이 없다는 뜻은 아닙니다. 다만 ${weakBehavior?.weak??"그쪽 행동이 저절로 나오지 않을 수 있습니다."} 머리로는 필요하다는 걸 알아도 실제 행동으로 옮길 때 한 박자 늦을 수 있습니다.`:weakBehavior?`${withParticle(elementPro(weakest!),"은","는")} 상대적으로 약해서 ${weakBehavior.weak}`:"덜 익숙한 행동은 생각보다 시작이 늦어질 수 있습니다.",
      "그래서 이미 잘하는 부분을 더 강하게 만들기보다, 늘 한 박자 늦어지는 행동을 조금 앞당기는 게 더 중요합니다. 그 차이가 줄어들수록 성격도 일도 훨씬 부드럽게 풀립니다."
    ];
  }

  if(id==="book-021"){
    const counseling=stemCounseling(facts);
    return[
      `나를 대표하는 기운은 ${facts.dayStemName||"중심 기운"}입니다. ${stem.image}에 비유하는 이유는 한번 방향을 잡으면 쉽게 꺾이지 않고, 시간을 들여 자기 것을 키워가는 모습과 닮았기 때문입니다.`,
      counseling.opening,
      "그래서 중요한 일을 결정할 때는 남들이 좋다고 하는 답보다 스스로 납득할 수 있는 이유가 있어야 합니다. 마음이 정해지기 전에는 오래 생각하지만, 한번 결론이 나면 오히려 주변보다 오래 밀고 갈 수 있습니다.",
      `다만 장점이 가장 부담이 되는 순간도 비슷합니다. ${counseling.shadow} 방향을 바꿔야 할 때도 '조금만 더 하면 된다'고 버티면 피로가 길어질 수 있습니다.`,
      "이 성향에서 중요한 건 고집을 없애는 게 아니라, 끝까지 지켜야 할 일과 중간에 방향을 바꿔도 되는 일을 구분하는 것입니다. 그 구분이 잘 될수록 끈기가 훨씬 큰 장점이 됩니다."
    ];
  }

  if(id==="book-022"){
    const stemElement=facts.dayPillar?STEM_ELEMENT[facts.dayPillar[0]]:"";
    const branchElement=facts.dayPillar?BRANCH_ELEMENT[facts.dayPillar[1]]:"";
    const traits:Record<string,string>={
      wood:"한번 방향을 정하면 그 일을 키우고 오래 이어가려는 성향",
      fire:"생각한 것을 밖으로 보여주고 반응을 만들려는 성향",
      earth:"흐트러진 것을 현실적으로 정리하고 안정시키려는 성향",
      metal:"무엇을 지킬지 기준을 세우고 깔끔하게 정리하려는 성향",
      water:"상황을 읽고 여러 가능성을 오래 생각해보는 성향"
    };
    return[
      `나를 가장 가까이 보여주는 두 글자는 ${facts.dayPillarReading||facts.dayPillar}입니다.`,
      pillarElementSentence(facts.dayPillar)||"서로 다른 두 성향이 한 자리에서 같이 움직이는 조합입니다.",
      stemElement&&branchElement&&stemElement!==branchElement?`이 조합은 중요한 선택을 앞두면 먼저 ${traits[branchElement]??"여러 가능성을 살피는 성향"}이 움직이고, 마음이 정해진 뒤에는 ${traits[stemElement]??"자기 방향을 오래 밀고 가는 성향"}이 강해지는 식으로 나타날 수 있습니다.`:stemElement?"같은 성향이 안팎에서 겹쳐 좋아하는 것과 싫어하는 것이 비교적 분명하게 드러날 수 있습니다.":"가까운 관계와 중요한 선택에서 평소보다 본래 성향이 더 또렷하게 드러납니다.",
      closeRoleBehavior(dayRole),
      "그래서 가까운 사람에게는 충분히 이해해주려고 오래 생각하다가도, 마음속에서 결론이 나면 생각보다 단호해질 수 있습니다. 상대는 갑자기 마음이 바뀐 것처럼 느낄 수 있으니, 결론을 내리기 전에 내가 무엇을 고민하고 있는지 조금씩 말해두는 편이 관계에는 더 좋습니다."
    ];
  }

  if(id==="book-023")return[
    "밖에서 보이는 모습과 가까운 사람 앞의 모습이 조금 다른 편입니다. 사회에서는 해야 할 일을 먼저 챙기느라 감정을 뒤로 미루지만, 편한 사람 앞에서는 그동안 참았던 마음이 더 솔직하게 나올 수 있습니다.",
    roleBehavior(monthRole),
    closeRoleBehavior(dayRole),
    "그래서 밖에서는 웬만한 일을 잘 버티고 정리하는 사람처럼 보이는데, 정작 가까운 사람에게는 피곤하다거나 서운하다는 말을 더 많이 할 수 있습니다. 밖에서 감정을 숨겼다기보다 안전하다고 느끼는 관계에서 뒤늦게 풀리는 쪽에 가깝습니다.",
    "가까운 사람에게 한꺼번에 피로를 쏟고 나서 후회하지 않으려면, 힘들다는 말을 완전히 지친 뒤에 꺼내지 않는 게 중요합니다. 아직 괜찮을 때 '요즘 이게 좀 버겁다' 정도만 말해두어도 관계의 온도차가 훨씬 줄어듭니다."
  ];

  if(id==="book-026"){
    const overuse=strongest?elementOveruse(strongest):null;
    return[
      strongest?`${withParticle(elementPro(strongest),"이","가")} 강하다는 건 그 방식이 익숙하다는 뜻입니다. 문제는 잘하는 방식일수록 필요 이상으로 오래 붙잡기 쉽다는 데 있습니다.`:"잘하는 방식도 너무 오래 쓰면 장점이 피로로 바뀔 수 있습니다.",
      strongest?elementBehavior(strongest).natural:"평소 잘하는 방식은 특별히 의식하지 않아도 자연스럽게 나옵니다.",
      overuse?`처음에는 장점으로 보이지만 과해지면 ${overuse.sign}`:"익숙한 방식 하나로 모든 문제를 풀려고 하면 오히려 선택이 좁아질 수 있습니다.",
      overuse?overuse.reset:"무엇을 더 잘할지보다 어디에서 멈출지를 정해두는 편이 좋습니다.",
      "잘하는 걸 줄이라는 뜻은 아닙니다. 오히려 내가 잘하는 방식이 언제부터 고집이나 피로로 바뀌는지만 알아두면, 같은 장점을 훨씬 오래 편하게 쓸 수 있습니다."
    ];
  }

  if(["CORE","PILLARS","HIDDEN_STEMS","ELEMENTS","STRENGTH","STRUCTURE_USEFUL","IDENTITY"].includes(group))return[
    consultationOpening(row,facts)||"여러 성향이 실제 생활에서 어떻게 섞여 나타나는지를 함께 봅니다.",
    elementFact(facts)||dominantFamilySentence(facts),
    rowHasEvidencePrefix(row,"NATAL:STRUCTURE")&&facts.structure?`${structureMeaning(facts.structure)}과 ${facts.dayStemName||"중심 기운"}의 성향이 어떻게 함께 나타나는지를 살펴보는 게 중요합니다.`:`${facts.dayStemName||"중심 기운"}이 다른 오행과 어떻게 섞이는지 보는 것이 핵심입니다.`,
    "한 가지 값만 떼어 좋고 나쁘다고 판단하지 않고, 같은 방향을 가리키는 근거가 겹칠 때 그 특징을 더 중요하게 봅니다."
  ].filter(Boolean);

  return null;
}



function workConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="WORK")return null;
  const title=row.topic??row.title,structure=facts.structure,dominant=dominantFamily(facts),spine=personalitySpine(facts);
  const officer=familyCount(facts,"관성"),wealth=familyCount(facts,"재성"),peer=familyCount(facts,"비겁"),resource=familyCount(facts,"인성"),output=familyCount(facts,"식상");

  if(/직업운·학업운/.test(title))return[
    spine.work,
    spine.decision,
    structure?`${structureMeaning(structure)}이라 맡은 범위와 결과가 분명할수록 실력이 안정적으로 나오는 편입니다.`:"내가 어디까지 판단하고 책임지는지가 분명한 자리에서 실력이 더 오래 유지됩니다.",
    "시키는 일을 빨리 처리하는 것보다 왜 하는지 이해하고, 내 판단을 섞어 결과를 만들어낼 수 있을 때 만족도가 높아집니다.",
    "그래서 직업을 고를 때도 이름보다 실제로 어떤 결정을 맡게 되는지, 공부를 고를 때도 배운 뒤 어디에 써먹을 수 있는지를 먼저 보는 편이 잘 맞습니다."
  ];

  if(/나에게 잘 맞는 일/.test(title)){
    const roles=careerExamples(facts),jobs=careerOccupationExamples(facts);
    return[
      "잘 맞는 일은 내가 판단할 수 있는 범위가 있고, 한 일이 눈에 보이는 결과로 남는 일에 가깝습니다. 단순히 지시를 잘 따르는 자리보다 판단하고 정리하고 끝까지 책임질 수 있는 역할에서 실력이 더 잘 드러납니다.",
      roles.length?`일의 방향으로 보면 ${roles.join(" · ")} 쪽을 눈여겨볼 만합니다.`:"기획·운영·관리처럼 판단과 결과 책임이 함께 있는 일을 먼저 눈여겨볼 만합니다.",
      jobs.length?`실제 직업으로 넓혀보면 ${jobs.join(" · ")} 같은 선택지가 있습니다. 이 직업들이 무조건 정답이라는 뜻보다, 비슷한 방식으로 일하는 직업군이 잘 맞는다는 뜻입니다.`:"실제 직업으로는 프로젝트를 관리하거나 운영·기획·분석을 맡는 직군이 잘 맞는 편입니다.",
      facts.strongest?.element==="metal"?"금융 쪽에 관심이 있다면 펀드매니저·자산운용·리스크관리·회계·감사처럼 숫자와 기준을 함께 다루는 직업도 후보로 볼 수 있습니다.":"직업명보다 실제 업무 방식이 맞는지를 함께 보는 편이 좋습니다.",
      officer>=resource&&officer>=wealth?"특히 일정·품질·사람을 조율하고 결과 기준을 세우는 역할에서 강점이 살아나기 쉽습니다.":wealth>officer?"특히 시장 반응과 돈의 흐름을 직접 보고 운영·판매·수익을 연결하는 역할에서 강점이 살아나기 쉽습니다.":resource>=output?"특히 정보를 분석해 전문성이나 기획으로 바꾸는 역할이 잘 맞습니다.":"특히 아이디어를 콘텐츠·서비스·제품처럼 밖으로 만들어 반응을 확인하는 역할이 잘 맞습니다.",
      "반대로 책임은 큰데 결정권은 없거나, 이유 없이 지시가 계속 바뀌거나, 아무리 잘해도 결과가 내 것으로 남지 않는 환경에서는 실력보다 답답함이 먼저 커질 수 있습니다."
    ];
  }

  if(/직장과 사업/.test(title)){
    const monthWork=facts.branchMainTenGodByPosition.month||facts.stemTenGodByPosition.month;
    const laterWork=facts.stemTenGodByPosition.hour||facts.branchMainTenGodByPosition.hour;
    const organizationFirst=["정관","편관"].includes(monthWork);
    const independentLater=["정재","편재"].includes(laterWork);
    const verdict=organizationFirst&&independentLater
      ?"처음에는 조직 안에서 시스템과 운영을 익히고, 경험이 쌓인 뒤 결정권과 수입 구조를 넓혀가는 방식이 잘 맞습니다. 장기적으로는 사업이나 독립수입 쪽으로 확장할 여지도 있습니다."
      :wealth>officer
        ?"조직에만 머무르기보다 시장 반응과 돈의 흐름을 직접 볼 수 있는 일, 혹은 사업·독립수입을 함께 가져가는 방식이 더 잘 맞을 수 있습니다."
        :officer>wealth
          ?"처음부터 모든 걸 혼자 책임지는 사업보다 조직 안에서 역할과 권한을 넓혀가는 쪽이 더 안정적으로 강점을 쓰기 쉽습니다."
          :"직장이냐 사업이냐보다 내가 결정할 수 있는 범위가 있는지가 더 중요합니다. 조직에서 경험을 쌓고 이후 독립성을 넓히는 방식도 잘 맞습니다.";
    return[
      verdict,
      "직장에서는 시스템과 사람을 활용할 수 있다는 장점이 있고, 사업에서는 내 판단을 빠르게 결과로 연결할 수 있다는 장점이 있습니다.",
      wealth>0?"돈과 운영, 고객 반응을 직접 다루는 감각도 있어서 직장 경험을 사업이나 부수입으로 연결할 가능성이 있습니다.":"사업을 생각한다면 아이디어보다 먼저 매출이 생기는 구조와 반복 운영 방식을 만드는 게 중요합니다.",
      "어느 쪽을 택하든 가장 답답한 환경은 책임만 크고 결정권은 없는 자리입니다. 반대로 역할과 권한이 함께 커지는 곳에서는 시간이 갈수록 실력이 더 잘 드러납니다."
    ];
  }

  if(/^(직장운|직장에서 잘 풀리는 방식)$/.test(title))return[
    "직장에서는 처음부터 눈에 띄는 사람이라기보다, 맡은 일을 제대로 끝내면서 신뢰를 쌓을수록 자리가 커지는 쪽에 가깝습니다.",
    "업무 범위와 평가 기준이 분명하고, 내 판단을 어느 정도 쓸 수 있을 때 가장 편합니다. 반대로 이유 없이 지시가 바뀌거나 책임만 넘겨받는 구조에서는 스트레스가 빨리 쌓일 수 있습니다.",
    structure?`${structureMeaning(structure)}이라 시간이 갈수록 단순 실무보다 프로젝트를 맡거나 사람과 일정, 품질을 조율하는 역할에서 강점이 더 잘 드러납니다.`:"경력이 쌓일수록 단순 실행보다 판단과 조율이 필요한 역할이 더 잘 맞습니다.",
    "상사와의 관계에서도 무조건 부드러운 사람보다 말과 기준이 분명하고, 성과를 제대로 인정해주는 사람과 일할 때 능력이 더 안정적으로 나옵니다.",
    "좋은 직장은 편한 곳이라기보다 내가 무엇을 책임지는지 분명하고, 그 결과에 영향을 줄 권한도 함께 주어지는 곳에 가깝습니다."
  ];

  if(/책임이 커질 때/.test(title))return[
    "책임이 커지면 오히려 머릿속이 더 정리되는 편입니다. 누군가 해야 할 일이라고 판단하면 우선순위를 빠르게 세우고 마무리까지 끌고 가려 합니다.",
    "문제는 잘할수록 일이 본인에게 몰릴 수 있다는 점입니다. 처음에는 내가 하는 게 빠르지만, 시간이 지나면 확인할 것도 결정할 것도 전부 내 몫이 되기 쉽습니다.",
    peer>0?"특히 경쟁이나 압박이 붙으면 남에게 맡기기보다 직접 확인하려는 마음이 더 강해질 수 있습니다. 위기 대응에는 강하지만 일이 커질수록 병목이 될 수 있습니다.":"일이 커질수록 직접 처리할 일과 확인만 할 일을 나눠두는 게 중요합니다.",
    "책임이 커질수록 더 많이 하는 사람보다 기준을 설명하고 맡길 수 있는 사람이 되어야 오래 갑니다."
  ];

  if(/직장 인간관계/.test(title))return[
    "직장에서는 사람과 빨리 친해지는 것보다 서로 맡은 일과 약속이 분명할 때 훨씬 편합니다. 사적으로 아주 가깝지 않아도 일의 합이 맞으면 오래 좋은 관계를 유지할 수 있습니다.",
    peer>0?"적당한 경쟁은 오히려 집중력을 올려주지만, 역할이 겹치거나 누가 책임질지 애매해지면 불편함도 빨리 커질 수 있습니다.":"동료와의 관계에서는 친밀감보다 역할과 책임이 분명한지가 더 중요합니다.",
    "내가 중요하게 보는 기준을 상대도 당연히 알 거라고 생각할 때 갈등이 생기기 쉽습니다. 마감, 완성도, 역할 범위를 처음부터 말로 맞춰두는 편이 훨씬 편합니다.",
    "잘 맞는 동료는 내 일을 대신해주는 사람이 아니라 자기 몫을 해내면서 필요한 순간에 서로 연결될 수 있는 사람입니다.",
    "반대로 말은 잘 맞아도 약속을 자주 바꾸거나 뒷정리를 남기는 사람과는 시간이 갈수록 피로가 커질 수 있습니다."
  ];

  if(/^사업운$/.test(title))return[
    wealth>0?"사업에서는 좋은 아이디어보다 실제로 돈이 들어오고, 고객이 다시 찾고, 운영이 반복되는지를 확인할 때 판단이 빨라지는 편입니다.":"사업은 아이디어를 오래 품는 것보다 실제 고객에게 내놓고 반응을 확인하는 순간부터 방향이 선명해지는 편입니다.",
    "혼자 모든 걸 만드는 사업보다 내가 잘하는 판단·기획·운영을 잡고, 나머지는 사람이나 시스템을 붙이는 방식이 더 오래 갈 수 있습니다.",
    output>0?"콘텐츠·상품·서비스처럼 내가 만든 것을 밖에 보여주고 반응을 받는 사업과도 잘 맞습니다.":"처음부터 크게 벌이기보다 작은 상품이나 서비스로 시장 반응을 먼저 확인하는 편이 좋습니다.",
    wealth>0?"운영형 사업, 전문서비스, 판매·유통, 금융·자산관리처럼 결과와 숫자를 직접 확인할 수 있는 분야를 눈여겨볼 만합니다.":"전문성을 서비스로 만들거나, 반복해서 팔 수 있는 상품·콘텐츠 형태로 바꾸는 사업이 더 잘 맞습니다.",
    "가장 조심할 건 아이디어가 생길 때마다 판을 넓히는 것입니다. 하나가 자리 잡아 반복해서 굴러가는 걸 확인한 뒤 다음 확장으로 넘어가는 편이 돈과 체력을 같이 지키기 좋습니다."
  ];

  if(/^(학업운|어떤 공부가 잘 맞을까)$/.test(title)){
    const studies=studyExamples(facts);
    return[
      "공부는 오래 앉아 있는 것 자체보다 '이걸 배우면 어디에 써먹을 수 있는가'가 분명할 때 훨씬 잘 붙는 편입니다.",
      resource>0?"정보를 받아들이고 이해한 뒤 자기 말로 다시 정리하는 힘이 있어서, 단순 암기보다 원리를 이해하고 문제에 적용하는 공부에서 강점이 있습니다.":"목적과 적용처가 분명할수록 집중력이 올라가고, 실제로 써보면서 배우는 방식이 잘 맞습니다.",
      studies.length?`공부 분야로는 ${studies.join(" · ")} 같은 쪽을 눈여겨볼 만합니다. 특히 자격증이나 전문과정처럼 끝난 뒤 바로 일에 연결되는 공부가 잘 맞습니다.`:"업무에 바로 쓰는 자격증, 실무기술 과정, 전문성을 증명할 수 있는 공부가 잘 맞습니다.",
      "공부 방법도 책만 오래 보는 것보다 문제를 풀거나, 배운 내용을 설명하거나, 실제 작업으로 만들어보는 쪽이 기억에 오래 남습니다.",
      "학위나 점수 자체보다 앞으로 할 수 있는 일의 범위를 넓혀주는 공부를 선택할 때 투자한 시간의 만족도가 더 높아질 가능성이 큽니다."
    ];
  }
  if(row.evidenceGroup==="WORK")return[
    consultationOpening(row,facts)||"일에서는 직업 이름보다 어떤 책임을 맡고 얼마나 판단할 수 있는지가 더 중요합니다.",
    spine.work,
    spine.decision,
    structure?`${structureMeaning(structure)}이 일의 기준이 됩니다.`:"일의 기준과 책임 구조가 맞을수록 강점이 오래 유지됩니다.",
    "잘하는 일을 많이 맡는 것보다, 어떤 역할에서 실력이 안정적으로 반복되는지를 아는 것이 중요합니다."
  ].filter(Boolean);

  return null;
}



function wealthConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="WEALTH")return null;
  const title=row.topic??row.title,wealth=familyCount(facts,"재성"),peer=familyCount(facts,"비겁"),output=familyCount(facts,"식상");
  const fireMissing=facts.missing.includes("fire");

  if(/^재물운$/.test(title))return[
    "돈은 단순히 많이 모으는 대상이라기보다 내가 원하는 선택을 가능하게 만드는 수단에 가깝습니다. 그래서 쓸 이유가 분명하면 과감해질 수 있지만, 납득되지 않는 지출에는 쉽게 마음이 가지 않는 편입니다.",
    wealth>0?"돈이 들어오면 어디에 써야 다시 결과로 돌아오는지 생각하는 감각이 있는 편입니다. 그냥 쌓아두기보다 일·사업·경험·자산처럼 다음 결과로 이어지는 곳에 돈을 쓰려는 성향이 있습니다.":"돈은 저절로 굴러가기보다 내가 잘하는 일을 반복 가능한 수입으로 만드는 순간부터 안정되기 쉬운 편입니다.",
    fireMissing?"다만 돈을 벌 능력보다 밖으로 보여주고 제안하는 단계가 늦어질 수 있습니다. 준비가 충분해도 알리고, 말하고, 판매하는 시점을 늦추면 수입이 따라오는 속도도 같이 늦어질 수 있습니다.":output>0?"생각한 것을 실제 상품·서비스·콘텐츠·성과로 꺼냈을 때 돈과 연결되는 속도가 빨라질 수 있습니다.":"생각만 오래 하는 것보다 실제 고객이나 시장에 내놓고 반응을 확인할수록 돈이 되는 방식이 선명해집니다.",
    peer>0?"사람과 함께 움직이는 돈은 기회도 만들지만 새는 구멍도 만들 수 있습니다. 친분, 공동 프로젝트, 확장 때문에 쓰는 돈은 감정과 계산을 따로 보는 편이 좋습니다.":"수입이 늘어도 반복해서 나가는 비용이 많으면 체감은 달라집니다. 버는 것과 남기는 것을 따로 관리해야 합니다.",
    "결국 재물운에서 중요한 건 얼마가 들어오느냐 하나가 아니라, 번 돈이 다시 수입을 만들거나 내 선택권을 넓히는 형태로 남는가입니다."
  ];

  if(/돈을 대하는 방식|돈에 대한 기본 성향/.test(title))return[
    "돈을 쓸 때 무조건 싼 것을 고르기보다 '이 돈을 쓰고 나서 내가 얻는 게 분명한가'를 따지는 편에 가깝습니다. 납득만 되면 생각보다 시원하게 쓸 수 있지만, 이유가 애매하면 오래 비교하고 망설일 수 있습니다.",
    wealth>0?"특히 일의 효율을 높이거나 결과를 더 좋게 만들거나, 앞으로 다시 써먹을 수 있는 곳에는 지출을 아깝게만 보지 않는 편입니다. 반대로 쓰고 나서 아무것도 남지 않는 소비에는 만족도가 낮을 수 있습니다.":"돈을 쓸 때는 순간적인 기분보다 목적이 분명할수록 후회가 적은 편입니다.",
    peer>0?"사람에게 쓰는 돈은 조금 다릅니다. 친한 사람과 함께하는 비용이나 공동지출은 분위기에 맞추다 보면 나중에 '왜 내가 더 냈지' 같은 서운함이 남을 수 있습니다.":"사람과 얽힌 지출은 호의와 의무를 구분해두면 훨씬 편합니다.",
    "그래서 돈을 잘 쓰는 방법은 더 아끼는 게 아니라, 큰 지출일수록 '이 돈으로 무엇이 달라지는가'를 먼저 보는 것입니다.",
    "본인에게 맞는 소비 기준은 가격 자체보다 쓰고 난 뒤 남는 결과가 있는지 확인하는 쪽에 가깝습니다."
  ];

  if(/^(돈의 흐름|돈은 어디로 흘러갈까)$/.test(title))return[
    "돈이 들어오면 그대로 쌓여 있기보다 다시 일과 기회 쪽으로 움직이기 쉬운 편입니다. 그래서 실제로 버는 금액과 통장에 남는 금액의 체감이 다를 수 있습니다.",
    output>0?"새로운 결과물을 만들거나 더 잘 보여주기 위해 다시 돈을 쓰는 흐름이 생기기 쉽습니다.":"배운 것, 일하는 방식, 새로운 시도에 다시 돈을 넣으면서 다음 수입을 준비하는 흐름이 생기기 쉽습니다.",
    peer>0?"여기에 사람·협업·공동 프로젝트가 붙으면 돈의 이동이 더 빨라질 수 있습니다. 같이 벌 기회도 생기지만 정산이 흐려지면 생각보다 남는 돈이 줄 수 있습니다.":"혼자 관리하는 돈은 비교적 단순하지만 반복비용이 쌓이지 않는지 확인할 필요가 있습니다.",
    "그래서 들어온 돈을 전부 같은 돈으로 보지 않는 게 좋습니다. 다시 일에 넣을 돈, 생활에 쓸 돈, 건드리지 않고 남길 돈을 처음부터 나눠두면 흐름이 훨씬 안정됩니다.",
    "돈의 흐름을 좋게 만든다는 건 지출을 막는 게 아니라, 나간 돈이 다시 수입이나 자산으로 돌아오는 길을 분명하게 만드는 것입니다."
  ];

  if(/돈을 버는 힘|돈이 들어오는 방식/.test(title))return[
    fireMissing?"돈을 버는 데 가장 늦어질 수 있는 부분은 능력 자체보다 '보여주는 단계'입니다. 준비하고 정리하는 건 잘해도 말하고, 제안하고, 판매하는 시점이 늦으면 수입으로 연결되는 속도도 늦어질 수 있습니다.":output>0?"돈은 생각한 것을 실제 결과물로 만들어 시장에 내놓는 순간부터 더 잘 움직입니다. 반응을 받고 고치고 다시 내놓는 과정이 수입으로 이어지기 쉽습니다.":"돈을 버는 힘은 잘하는 것을 머릿속에 두는 것보다 실제 서비스나 결과물로 꺼내는 순간부터 커집니다.",
    "본인에게 잘 맞는 방식은 시간만 많이 투입해서 돈을 버는 것보다, 한번 만든 결과를 다시 활용할 수 있게 만드는 쪽입니다. 기획·운영 노하우, 전문서비스, 상품, 콘텐츠, 판매 구조처럼 반복 가능한 형태가 붙을수록 유리합니다.",
    wealth>0?"시장 반응과 숫자를 보면서 무엇이 돈이 되는지 구분하는 감각도 쓸 수 있습니다. 반응이 없는 것을 오래 붙드는 것보다 결과를 보고 빠르게 수정하는 편이 좋습니다.":"처음부터 큰 수익을 만들기보다 실제로 돈을 내는 고객이 무엇에 반응하는지 확인하는 과정이 중요합니다.",
    "그래서 많이 준비했다는 사실보다 실제로 제안하고, 판매하고, 계약하고, 다시 찾게 만드는 경험이 쌓일수록 돈 버는 힘도 훨씬 선명해집니다.",
    "잘하는 일을 수입으로 바꾸는 마지막 단계는 실력이 아니라 세상에 꺼내놓는 행동일 수 있습니다."
  ];

  if(/모으고 지키는 힘|돈이 남는 방식/.test(title))return[
    "돈을 버는 것과 통장에 남기는 것은 다른 능력입니다. 수입이 늘면 마음이 놓이기보다 오히려 더 좋은 장비, 더 큰 일, 새로운 기회, 사람에게 다시 돈을 쓰고 싶어질 수 있습니다.",
    peer>0?"특히 사람과 얽힌 비용은 처음에는 작아 보여도 반복되면 생각보다 커질 수 있습니다. 대신 내주거나, 같이 쓰거나, 정산을 미루는 돈은 따로 확인하는 편이 좋습니다.":"반복해서 빠져나가는 고정비와 습관성 지출을 눈에 보이게 만드는 것부터 시작하면 관리가 훨씬 쉬워집니다.",
    "돈을 지키는 데 의지를 많이 쓰기보다 애초에 남길 돈이 다른 돈과 섞이지 않게 구조를 만드는 편이 더 잘 맞습니다. 들어오는 곳과 쓰는 곳, 남기는 곳을 나누면 매번 결심하지 않아도 됩니다.",
    "큰 지출 하나를 참는 것보다 별생각 없이 계속 나가는 돈을 정리하는 쪽이 실제로는 더 큰 차이를 만들 수 있습니다.",
    "재물운을 오래 가져가려면 수입이 늘 때 생활비와 확장비도 같이 커지지 않도록, 먼저 남기는 습관을 만들어두는 게 중요합니다."
  ];

  if(/돈과 인간관계|사람과 돈이 얽힐 때/.test(title))return peer>=3?[
    "이 사주는 비겁이 비교적 강하게 보여 사람과 함께 움직이는 돈이 실제 재물운에서 중요한 포인트가 됩니다. 혼자 버는 돈보다 동업·협업·공동 프로젝트처럼 사람을 통해 돈의 규모가 커질 가능성과 새는 가능성이 같이 있습니다.",
    "좋은 사람과 손잡으면 속도가 빨라질 수 있지만 역할이 겹치거나 누가 더 많이 했는지가 애매해지면 돈 문제보다 감정 문제가 먼저 커질 수 있습니다.",
    facts.relationCounts.combination>0?"합도 함께 있어 마음이 맞는 사람과는 판이 빠르게 커질 수 있습니다. 그래서 더더욱 시작할 때 지분·역할·정산 기준을 먼저 정해두는 편이 좋습니다.":"사람과 함께 움직일 때는 친분과 계약을 따로 보는 편이 좋습니다.",
    "공동사업·지분·가족 간 돈거래처럼 관계가 걸린 돈에서는 기억보다 기록이 중요합니다. 누가 무엇을 맡고 언제 끝낼지를 적어두는 쪽이 오히려 관계를 오래 지켜줍니다.",
    "이 장의 핵심은 모든 사람이 돈거래를 조심하라는 일반론이 아니라, 이 사주에서는 사람과 돈이 함께 움직일 때 재물운의 변동폭이 커질 수 있다는 점입니다."
  ]:peer>0?[
    "비겁이 아주 강한 편은 아니지만 사람과 함께 움직이는 돈에서는 감정과 계산을 분리하는 게 좋습니다.",
    "동업 자체를 피할 사주는 아니고, 오히려 서로 역할이 분명하면 사람을 통해 기회가 커질 수 있습니다.",
    "다만 대신 내주거나 정산을 미루는 식의 작은 돈 문제가 반복되면 관계 피로가 생길 수 있으니 공동비용과 정산 시점만큼은 처음부터 말해두는 편이 좋습니다.",
    "즉 사람과 돈이 핵심 위험이라기보다, 관계가 좋은 만큼 계산을 뒤로 미루지 않는 게 중요한 정도로 보면 됩니다."
  ]:[
    "이 사주에서는 사람과 돈이 얽히는 문제가 재물운의 핵심 위험으로 강하게 잡히는 편은 아닙니다.",
    "동업·공동자금 자체를 특별히 피해야 한다기보다 돈의 흐름과 역할이 분명한지만 확인하면 되는 쪽에 가깝습니다.",
    "오히려 혼자 관리하는 수입·지출 구조를 얼마나 안정적으로 만드는지가 재물운에는 더 중요합니다.",
    "그래서 이 장은 사람을 의심하라는 의미보다 공동돈이 생길 때만 기본적인 정산 기준을 챙기는 정도로 보면 충분합니다."
  ];

  if(/큰 기회/.test(title))return[
    wealth>=3?"재성이 비교적 강하게 잡혀 큰 기회가 왔을 때 수익성과 현실 결과를 보는 감각은 쓸 수 있는 편입니다. 다만 숫자가 좋아 보인다고 바로 크게 들어가기보다 실제 회수 구조까지 확인해야 장점이 살아납니다.":wealth>0?"재성은 보이지만 돈 자체가 모든 판단의 중심은 아닙니다. 큰 기회에서는 수익보다 내가 이해하고 통제할 수 있는 구조인지가 더 중요합니다.":"재성이 강하게 앞서는 구조는 아니라 큰돈 기회일수록 분위기보다 계약과 회수 구조를 더 의식적으로 확인하는 편이 좋습니다.",
    fireMissing?"특히 화(火)가 비어 있어 준비는 충분한데 시장에 내놓는 시점이 늦어질 수 있습니다. 반대로 한번 기회가 보이면 그동안 미룬 걸 한꺼번에 크게 벌이지 않도록 단계적으로 검증하는 방식이 잘 맞습니다.":output>0?"식상이 살아 있어 결과물을 만들고 시장 반응을 보는 과정은 재물 기회와 잘 연결될 수 있습니다.":"아이디어보다 실제 고객 반응을 먼저 확인하는 편이 좋습니다.",
    peer>=3?"사람과 함께 커지는 기회는 속도도 빠르지만 역할과 돈이 같이 복잡해질 수 있습니다. 동업·투자·공동사업은 판의 크기보다 지분과 종료 조건을 먼저 봐야 합니다.":"혼자 통제할 수 있는 범위 안에서 작게 검증한 뒤 넓히는 방식이 더 안정적입니다.",
    "이 사주에 맞는 큰 기회는 처음부터 모든 걸 거는 기회보다, 이미 잘되는 걸 더 크게 반복할 수 있게 만드는 기회에 가깝습니다."
  ];

  if(/평생 재물운/.test(title))return[
    wealth>=3?"평생 재물운에서는 재성이 비교적 살아 있어 돈과 현실 결과를 완전히 외면하는 타입은 아닙니다. 경험이 쌓일수록 무엇이 실제 수익으로 이어지는지 구분하는 감각이 더 좋아질 수 있습니다.":wealth>0?"재성이 보이기 때문에 돈을 다루는 감각은 있지만, 돈만 보고 움직이는 구조는 아닙니다. 본인이 납득하는 일과 수익이 연결될 때 재물운이 더 안정적으로 이어집니다.":"재성이 앞에 강하게 드러나는 사주는 아니라 초반부터 돈만 좇기보다 전문성과 결과물을 먼저 만들고 뒤에서 수입 구조를 붙이는 방식이 더 잘 맞습니다.",
    fireMissing?"금(金)의 완성도는 잘 쓰는데 화(火)의 노출이 비어 있어, 재물운에서 가장 아쉬운 지점은 실력이 아니라 보여주고 판매하는 타이밍이 될 수 있습니다.":"만든 것을 실제 시장과 연결하는 과정이 재물운의 핵심입니다.",
    output>0?"식상이 함께 움직이면 내가 만든 결과를 상품·서비스·콘텐츠처럼 반복 가능한 형태로 바꿀수록 수입원이 넓어질 수 있습니다.":"시간을 그대로 돈으로 바꾸는 구조 하나에만 의존하지 않는 편이 좋습니다.",
    peer>=3?"사람과 함께 판을 키울 때는 수입도 커질 수 있지만 분배와 재투자 때문에 남는 돈이 달라질 수 있습니다. 확장과 보유를 따로 관리하는 게 중요합니다.":"좋은 시기에는 늘어난 수입을 생활비로 바로 키우기보다 반복수입이나 자산처럼 남는 형태로 굳히는 과정이 중요합니다.",
    "평생 재물운의 포인트는 한 번의 큰돈보다 실력 → 공개 → 거래 → 반복수입 → 남는 자산으로 이어지는 고리를 만드는 데 있습니다."
  ];

  if(row.evidenceGroup==="WEALTH")return[
    consultationOpening(row,facts)||"돈은 버는 방식과 쓰는 방식, 남기는 방식을 따로 볼 때 훨씬 선명해집니다.",
    "본인에게 맞는 돈 관리는 무조건 아끼는 방식보다 왜 쓰는지와 무엇이 남는지를 분명하게 하는 쪽에 가깝습니다.",
    peer>0?"사람과 함께 움직이는 돈일수록 역할과 정산을 먼저 맞춰두는 편이 좋습니다.":"반복비용과 남길 돈을 분리해두면 관리가 훨씬 편해집니다.",
    "한 번의 큰 금액보다 같은 선택이 반복될 때 결국 어떤 결과가 남는지를 보는 게 중요합니다."
  ];

  return null;
}

function relationshipConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  if(row.evidenceGroup!=="RELATIONSHIP")return null;
  const title=row.topic??row.title,dayRole=facts.branchMainTenGodByPosition.day||facts.stemTenGodByPosition.day,dayTone=tenGodTone(dayRole),spine=personalitySpine(facts);
  const relationshipStatus=input.minimalContext.relationshipStatus;

  if(/미래 배우자는 어떤 사람일까/.test(title)&&relationshipStatus==="SINGLE")return[
    "배우자 자리를 보면 처음부터 강하게 휘어잡는 사람보다, 자기 생활이 안정되어 있고 시간이 지나도 태도가 크게 흔들리지 않는 사람과 인연이 오래 가는 쪽입니다.",
    partnerAppearanceSentence(facts),
    "성격으로는 자기 일을 꾸준히 하고 약속한 걸 행동으로 보여주는 사람이 잘 맞습니다. 말은 많은데 생활이 따라오지 않는 사람보다, 말수는 적어도 맡은 몫을 해내는 사람에게 신뢰가 붙기 쉽습니다.",
    "일에서도 자기 분야가 있거나 전문성·책임이 분명한 사람과 연결될 가능성을 눈여겨볼 만합니다. 한쪽이 계속 챙기고 다른 한쪽이 기대는 관계보다 서로 각자 할 일이 있는 커플이 더 편합니다.",
    relationSentence(facts),
    "결국 배우자상에서 가장 중요한 건 화려함보다 '같이 살았을 때 내 생활이 더 안정되는 사람인가'입니다. 외형의 매력도 보지만, 오래 갈수록 생활 태도와 책임감이 더 큰 기준이 됩니다."
  ];

  if(/어디에서 인연이 시작되기 쉬울까/.test(title)&&relationshipStatus==="SINGLE")return[
    "인연은 처음부터 연애를 목적으로 만나는 자리보다, 일·배움·소개처럼 서로 무엇을 하는 사람인지 알 수 있는 환경에서 더 자연스럽게 시작될 가능성이 있습니다.",
    "짧게 강하게 끌리는 만남보다 몇 번 마주치며 태도와 신뢰를 확인할 수 있는 관계가 본인에게 더 잘 맞습니다.",
    "업무로 연결된 사람, 공부나 자격 과정에서 만난 사람, 지인의 소개처럼 기본적인 신뢰가 있는 연결도 잘 맞는 편입니다.",
    "처음부터 마음을 빨리 정하려 하기보다 대화가 계속 이어지는지, 약속을 지키는지, 서로의 생활을 존중하는지를 천천히 보는 편이 좋습니다.",
    "본인에게 좋은 만남은 설렘만 강한 사람보다 만난 뒤 생활이 더 편안해지는 사람에 가깝습니다."
  ];

  if(/결혼하면 잘 맞는 생활 방식/.test(title)&&relationshipStatus==="SINGLE")return[
    "결혼을 하더라도 모든 시간을 붙어 보내는 방식보다 함께할 것과 각자 할 것을 자연스럽게 나눌 수 있는 생활이 더 잘 맞습니다.",
    "돈, 집안일, 가족 문제처럼 현실적인 일은 누가 알아서 하겠지 하고 넘기기보다 처음부터 역할을 말로 정해두는 편이 좋습니다.",
    "서로의 일과 혼자 있는 시간을 인정해주면서도 중요한 결정은 함께 이야기하는 관계에서 답답함이 덜합니다.",
    "본인이 책임을 많이 가져오는 편이라 상대까지 수동적이면 시간이 갈수록 부담이 커질 수 있습니다. 자기 몫을 스스로 해내는 배우자가 더 잘 맞습니다.",
    "결혼생활에서 중요한 건 늘 같이 있는 게 아니라 서로 믿고 각자의 생활을 유지하면서 필요한 순간에는 확실히 같은 편이 되어주는 것입니다."
  ];

  if(/연애운·결혼운·자녀운/.test(title))return[
    "관계에서는 처음 얼마나 강하게 끌리느냐보다 시간이 지나도 믿을 수 있는지가 더 중요합니다. 가까워질수록 상대의 말보다 반복되는 태도와 생활 모습을 더 오래 보게 돼요.",
    spine.close,
    relationSentence(facts),
    "마음이 깊어지면 오래 챙기고 쉽게 관계를 놓지 않지만, 그만큼 약속이나 태도가 달라졌을 때 느끼는 서운함도 커질 수 있습니다.",
    "이 PART에서는 누구에게 끌리는지보다 가까워진 뒤 무엇을 중요하게 보고, 서운할 때 어떻게 반응하며, 결혼과 가족에서는 어떤 생활을 편하게 느끼는지를 나눠서 봅니다."
  ];

  if(/^연애 성향$/.test(title))return[
    "연애는 처음부터 빠르게 깊어지기보다 상대를 알아가는 시간이 어느 정도 필요한 쪽입니다. 대화가 잘 되는지도 보지만, 시간이 지나도 행동이 비슷한 사람인지가 더 큰 기준이 돼요.",
    "마음이 열리고 나면 관계를 가볍게 두기보다 실제 시간을 내고 상대를 챙기면서 오래 이어갈 방법을 생각합니다.",
    "설렘만 강한 관계보다 서로의 생활을 존중하면서 약속을 지키는 관계에서 마음이 더 편해질 수 있어요.",
    "반대로 말은 좋은데 행동이 자꾸 달라지면 처음에는 이유를 이해해보려 해도 신뢰가 조금씩 줄어들 수 있습니다.",
    "결국 연애에서 중요한 건 빨리 가까워지는 속도보다 가까워진 뒤에도 편하게 믿을 수 있는 관계를 만드는 것입니다."
  ];

  if(/반복되는 패턴/.test(title))return[
    "관계에서 반복되기 쉬운 흐름은 서운함이 생긴 직후보다 그다음입니다. 바로 부딪히기보다 먼저 혼자 이유를 생각하면서 상대의 이전 행동까지 함께 떠올릴 수 있어요.",
    "처음에는 한 번 더 이해해보려고 하지만 비슷한 일이 반복되면 '이번 일 하나'보다 '이 사람을 계속 믿어도 되는가' 쪽으로 생각이 커질 수 있습니다.",
    facts.relationCounts.wonjin||facts.relationCounts.harm||facts.relationCounts.break?"가까운 관계에서 작은 어긋남을 오래 생각하기 쉬운 표시도 함께 있어, 말하지 않은 서운함이 길어질수록 마음의 거리가 먼저 벌어질 수 있어요.":"가까운 관계일수록 상대가 알아서 이해해주길 기다리기보다 불편해진 이유를 말로 확인하는 과정이 중요합니다.",
    "이때 상대는 갑자기 문제가 커졌다고 느낄 수 있어요. 본인은 이미 여러 번 생각한 뒤이기 때문에 서로 문제를 느끼기 시작한 시점이 달라지는 겁니다.",
    "반복을 줄이는 데 가장 필요한 건 더 오래 참는 게 아니라, 아직 작은 불편일 때 지금 무엇이 달라졌는지를 짧게 말해두는 것입니다."
  ];

  if(/가까운 관계에서/.test(title))return[
    `가까운 사람에게는 ${dayTone.gift}이 애정의 방식으로 나옵니다. 믿는 사람일수록 챙기고 오래 책임지려는 마음이 커집니다.`,
    "문제는 챙김이 상대의 선택까지 대신하는 순간입니다. 좋은 뜻으로 시작했어도 상대에게는 관리받는 느낌으로 바뀔 수 있습니다.",
    relationSentence(facts),
    "가까울수록 역할을 나누고, 상대가 직접 해볼 몫을 남겨두는 편이 관계를 더 오래 편하게 만듭니다.",
    "사랑의 크기를 책임의 양으로 증명하려 하기보다, 필요할 때 연결되고 각자의 영역은 남겨두는 방식이 잘 맞습니다."
  ];

  if(/마음이 가는 상대/.test(title))return[
    "마음이 가는 상대는 화려한 말보다 생활 태도와 책임감이 일정한 사람에 가깝습니다.",
    "말이 자주 바뀌거나 중요한 약속을 가볍게 여기는 사람보다는 자기 일을 하고, 자기 몫을 책임지고, 대화가 통하는 사람에게 신뢰가 붙기 쉽습니다.",
    "관계에서도 말의 화려함보다 태도의 일관성과 책임감을 더 중요하게 보는 편입니다.",
    "다만 나와 비슷하게 기준이 강한 사람끼리는 맞는 부분만큼 부딪히는 부분도 커질 수 있습니다. 존중과 통제가 어디서 갈리는지 보는 게 중요합니다.",
    "결국 좋은 상대는 나를 대신 결정해주는 사람이 아니라, 각자의 기준을 지키면서도 서로의 선택을 설명할 수 있는 사람입니다."
  ];

  if(/현재 연인에게 끌리는 이유/.test(title)&&relationshipStatus==="DATING")return[
    "현재 연인에게 마음이 가는 이유는 단순한 설렘보다 '이 사람은 말과 행동이 얼마나 맞는가'와 연결되어 있을 가능성이 큽니다.",
    partnerAppearanceSentence(facts),
    "처음에는 분위기나 대화가 끌림을 만들더라도 관계가 깊어질수록 약속을 지키는지, 자기 일을 책임지는지, 갈등을 피하지 않는지를 더 크게 보게 됩니다.",
    "지금 관계를 오래 가져가고 싶다면 서로의 성격을 바꾸려 하기보다 돈·시간·일·가족처럼 실제 생활에서 중요한 기준을 얼마나 맞출 수 있는지를 보는 편이 좋습니다."
  ];

  if(/배우자에게 중요하게 보는 것/.test(title)&&relationshipStatus==="MARRIED")return[
    "배우자에게 가장 중요하게 보는 건 사랑 표현의 양보다 생활에서 믿을 수 있는 사람인가에 가깝습니다.",
    partnerAppearanceSentence(facts),
    "약속을 반복해서 어기거나 한쪽이 계속 책임을 떠안는 구조가 되면 감정보다 생활 피로가 먼저 커질 수 있습니다.",
    "반대로 서로 각자 할 일을 해내면서 중요한 순간에는 확실히 같은 편이 되어주는 관계에서는 시간이 갈수록 신뢰가 더 단단해질 수 있습니다."
  ];

  if(/애정 표현/.test(title))return[
    "애정 표현은 말만 많이 하는 방식보다 행동으로 챙기는 쪽에 가깝습니다. 필요한 것을 기억하고, 계획을 같이 세우고, 실제로 시간을 내는 식입니다.",
    "본인은 행동으로 충분히 표현했다고 생각해도 상대는 말로 확인받고 싶을 수 있습니다. 이 차이를 모르면 서로 좋아하면서도 서운함이 생길 수 있습니다.",
    "반대로 상대가 말은 잘하지만 행동이 따라오지 않으면 신뢰가 빠르게 떨어질 수 있습니다.",
    "그래서 가까운 관계에서는 '나는 이렇게 하고 있으니 알겠지'보다 짧게라도 마음을 말해주는 편이 좋습니다.",
    "가장 잘 맞는 표현은 거창한 이벤트보다 '고맙다, 서운했다, 필요하다'를 솔직하게 말하고 행동으로 이어주는 방식입니다."
  ];

  if(/다툴 때/.test(title))return[
    spine.conflict,
    relationSentence(facts),
    "갈등이 생겼을 때도 평소 사람을 보는 기준이 그대로 이어집니다. 무엇 때문에 마음이 달라졌는지 스스로 납득되어야 다음 태도도 정해져요.",
    "그래서 다툼을 푸는 핵심은 무조건 빨리 화해하는 데 있지 않습니다. 어떤 약속이나 기준이 어긋났는지를 서로 같은 말로 확인하는 게 먼저예요.",
    "이 부분이 확인되면 관계를 계속 가져갈지, 어디에서 거리를 둘지도 훨씬 분명해집니다."
  ];

  if(/결혼운|연애의 다음 단계와 결혼/.test(title))return relationshipStatus==="SINGLE"?[
    "결혼은 빨리 정하는 것보다 '이 사람과 실제 생활을 같이 해도 편한가'를 충분히 확인한 뒤 결정하는 쪽이 잘 맞습니다.",
    "연애할 때는 감정이 중요해도 결혼을 생각하기 시작하면 약속, 돈 쓰는 방식, 일에 대한 태도처럼 현실적인 부분을 더 꼼꼼히 보게 될 수 있습니다.",
    "미래 배우자는 본인의 일을 존중하면서도 자기 몫을 스스로 책임지는 사람이 잘 맞습니다. 한 사람이 계속 챙기고 다른 사람이 기대는 구조는 시간이 갈수록 피로가 커질 수 있습니다.",
    relationSentence(facts),
    "좋은 결혼은 모든 것을 함께하는 관계보다 서로의 생활은 지키면서 중요한 순간에는 확실히 한 팀이 되는 관계에 가깝습니다."
  ]:relationshipStatus==="DATING"?[
    "현재 관계가 결혼으로 이어질 수 있는지는 좋아하는 마음만큼 실제 생활의 합이 맞는지를 보는 게 중요합니다.",
    "돈 쓰는 방식, 일과 휴식, 가족과의 거리, 갈등을 풀어내는 속도가 맞을수록 함께 살 때의 부담이 줄어듭니다.",
    "상대를 바꾸려 하기보다 서로 꼭 지켜야 하는 것과 양보할 수 있는 것을 미리 이야기해보는 편이 좋습니다.",
    relationSentence(facts),
    "결혼을 생각한다면 더 오래 만나는 것보다 현실적인 문제를 함께 결정해봤을 때 어떤 팀이 되는지를 보는 게 더 중요합니다."
  ]:[
    "결혼생활에서는 사랑의 크기보다 역할과 생활의 균형이 더 중요하게 느껴질 수 있습니다.",
    "가족을 챙기면서도 자기 일과 혼자 쓸 시간이 완전히 사라지면 답답함이 커질 수 있습니다.",
    "돈, 집안일, 가족 문제를 한 사람이 알아서 책임지는 구조보다 서로 맡을 것을 나누고 필요할 때 연결되는 방식이 잘 맞습니다.",
    relationSentence(facts),
    "오래 함께할수록 말하지 않아도 알겠지보다 작은 불편과 고마움을 자주 말해주는 게 관계를 훨씬 편하게 만듭니다."
  ];

  if(row.evidenceGroup==="RELATIONSHIP")return[
    consultationOpening(row,facts)||"관계에서는 누구를 만나느냐만큼 가까워진 뒤 내가 어떻게 달라지는지가 중요합니다.",
    spine.close,
    spine.conflict,
    relationSentence(facts),
    "관계에서도 다른 장과 같은 성격 기준이 이어집니다. 처음 사람을 볼 때 중요하게 여긴 것이 가까워진 뒤에는 신뢰와 갈등의 기준이 돼요."
  ].filter(Boolean);

  return null;
}



function childrenConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="CHILDREN")return null;
  const title=row.topic??row.title,hourRole=facts.branchMainTenGodByPosition.hour||facts.stemTenGodByPosition.hour,hourTone=tenGodTone(hourRole);

  if(/부모가 되었을 때의 나|부모가 되었을 때 먼저 나오는 모습/.test(title))return[
    "부모가 되면 아이가 불편해지기 전에 먼저 챙겨주려는 모습이 강하게 나올 수 있습니다. 필요한 걸 미리 준비하고 생활을 안정시키는 데는 강점이 있는 편입니다.",
    "아이 입장에서는 문제가 생겼을 때 믿고 돌아갈 수 있는 부모로 느끼기 쉽습니다. 약속한 건 지키고, 해야 할 일은 끝까지 챙기는 모습이 안정감을 줄 수 있습니다.",
    "다만 걱정이 커지면 아이가 직접 해볼 일까지 먼저 해결해주고 싶어질 수 있습니다. 잘해주려는 마음이 커질수록 기다려주는 일이 더 어려워질 수 있습니다.",
    "아이에게 필요한 건 언제나 정답을 주는 부모보다, 실수해도 다시 돌아올 수 있는 안전한 사람일 때가 많습니다.",
    "부모 역할에서 중요한 건 더 많이 해주는 게 아니라 언제 도와주고 언제 한발 물러날지를 구분하는 것입니다."
  ];

  if(/아이에게 안정감을 주는 방식|겉으로 드러나는 자녀운/.test(title))return[
    "아이에게는 말보다 반복되는 행동으로 믿음을 주는 부모가 되기 쉽습니다. 약속한 시간을 지키고, 필요한 걸 챙기고, 생활을 정돈해주는 방식으로 마음을 보여줄 가능성이 큽니다.",
    "문제가 생겼을 때 같이 당황하기보다 먼저 무엇부터 해결할지 정리해주는 모습도 강점이 될 수 있습니다.",
    "다만 아이가 원하는 건 해결책보다 공감일 때도 있습니다. 바로 방법을 알려주기 전에 속상했는지, 무서웠는지부터 들어주는 시간이 필요할 수 있습니다.",
    "해결해주는 부모와 들어주는 부모 사이의 균형이 맞을수록 아이도 자기 생각을 더 편하게 꺼낼 수 있습니다."
  ];

  if(/걱정이 많아질 때|부모 역할이 버겁게|부담/.test(title))return[
    "아이에 대한 걱정이 커지면 작은 일도 그냥 두기 어려워질 수 있습니다. 준비가 부족해 보이면 챙겨주고, 실수할 것 같으면 미리 막아주고 싶은 마음이 앞설 수 있습니다.",
    `이때는 ${hourTone.shadow}이 더 강하게 느껴질 수 있습니다.`,
    "하지만 아이가 직접 해보는 몫까지 가져오면 본인은 지치고, 아이는 스스로 해볼 기회를 잃을 수 있습니다.",
    "이럴 때는 무엇을 더 해줄지보다 내가 하지 않아도 되는 일을 먼저 정하는 편이 좋습니다.",
    "부모 역할은 완벽하게 해내는 일이 아니라 오래 이어가는 일이기 때문에, 힘을 빼는 것도 중요한 능력입니다."
  ];

  if(/아이를 챙기는 방식|아이와 가까워지는 법/.test(title))return[
    "아이와 가까워지는 데는 많은 말을 하는 것보다 작은 약속을 반복해서 지켜주는 게 더 잘 맞을 수 있습니다.",
    "도와주고 싶은 마음이 들 때 바로 대신하기보다 어디까지 해봤는지 먼저 물어보면 챙김과 자율성을 같이 지킬 수 있습니다.",
    "아이의 선택이 내 기준과 달라도 위험하지 않은 일이라면 직접 경험하게 두는 편이 관계를 더 편하게 만들 수 있습니다.",
    "가족이니까 알아서 알겠지보다 왜 그런지 설명하고, 아이의 이유도 들어보는 시간이 중요합니다.",
    "가까워지는 데 가장 필요한 건 완벽한 조언보다 언제든 다시 이야기할 수 있다는 느낌입니다."
  ];

  if(/부모로서 잘하는 점|부모 역할의 장점/.test(title))return[
    `부모 역할에서는 ${hourTone.gift}이 장점으로 잘 살아날 수 있습니다.`,
    "한번 책임진 사람을 오래 챙기고 생활을 안정시키는 힘은 아이에게 큰 안전감이 될 수 있습니다.",
    "문제가 생겼을 때 감정만 따라가기보다 해결할 순서를 잡아주는 것도 강점입니다.",
    "아이에게 모든 답을 주기보다 문제를 같이 정리하는 방법을 보여주면 이 장점이 훨씬 건강하게 쓰입니다.",
    "혼자 다 책임지려 하지 않고 다른 가족과 역할을 나누면 이 장점을 더 오래 편하게 쓸 수 있습니다."
  ];

  if(/가족 안에서 내가 맡기 쉬운 역할|가족 안에서 맡는 역할|가족 안에서 맡게 되는 역할/.test(title))return[
    "가족 안에서는 자연스럽게 챙기는 사람, 정리하는 사람, 문제가 생겼을 때 마지막까지 확인하는 역할을 맡기 쉽습니다.",
    "가족에게 안정감을 주는 장점이 있지만, 익숙하다는 이유로 모든 일이 본인 몫이 되면 시간이 갈수록 피로가 커질 수 있습니다.",
    "가족을 사랑하는 마음과 가족의 모든 일을 책임지는 건 다른 일입니다.",
    "함께할 일, 각자 할 일, 도움만 줄 일을 나눠두면 관계가 훨씬 오래 편해집니다.",
    "가족 안에서 오래 좋은 역할을 하려면 책임을 더 가져오는 것보다 책임을 나누는 법도 같이 익혀야 합니다."
  ];

  if(/부모가 되었을 때 더 강해지는 모습/.test(title))return[
    "부모 역할이 생기면 평소보다 책임감과 보호하려는 마음이 더 강해질 수 있습니다.",
    "아이에게 필요한 걸 빨리 알아차리고 생활을 안정시키는 데는 강점이 있지만, 걱정이 커질수록 작은 선택까지 대신하고 싶어질 수 있습니다.",
    "잘해주고 싶은 마음이 클수록 기다리는 게 더 어려울 수 있다는 점만 기억하면 좋습니다.",
    "도움이 필요한 순간에는 확실히 잡아주고, 스스로 해볼 수 있는 순간에는 조금 물러나는 방식이 잘 맞습니다."
  ];

  if(/가족 관계에서 조심할 점/.test(title))return[
    "가족에게는 밖에서보다 기대가 커질 수 있습니다. 내가 이만큼 챙겼으니 상대도 알아주겠지 하는 마음이 쌓이면 서운함도 같이 커질 수 있습니다.",
    "가족일수록 설명을 줄이기 쉬운데, 가까운 사이일수록 작은 부탁과 불편을 말로 확인하는 편이 오해를 줄여줍니다.",
    "한 사람이 계속 참고 책임지는 구조가 오래되면 사랑보다 피로가 먼저 느껴질 수 있습니다.",
    "가족 관계를 오래 편하게 가져가려면 누가 더 많이 하느냐보다 무엇을 누구 몫으로 둘지 분명하게 하는 게 중요합니다."
  ];

  if(/가족 일이 많아지는 시기|앞으로 가족 관계/.test(title))return[
    "가족 일이 많아지는 시기에는 내 일정만 바빠지는 게 아니라 다른 사람의 일정과 책임까지 같이 들어올 수 있습니다.",
    "이때는 잘해주려는 마음으로 모든 일을 받아오기보다 내가 꼭 해야 하는 일과 도와주기만 할 일을 나누는 게 중요합니다.",
    "가족 변화가 생겨도 혼자 버티기보다 역할을 일찍 나누면 생활 리듬을 지키기 훨씬 쉽습니다.",
    "가족운이 좋아진다는 건 일이 없어진다는 뜻보다 함께 감당할 사람이 생기고 역할이 정리되는 쪽에 더 가깝습니다."
  ];

  if(/가족운/.test(title))return[
    "가족을 중요하게 여기지만 가족 때문에 자기 일과 자기 시간이 완전히 사라지는 방식은 오래 버티기 어렵습니다.",
    "필요한 걸 먼저 챙기는 건 잘하지만, 한 사람이 모든 생활을 책임지는 구조가 되면 생각보다 빨리 지칠 수 있습니다.",
    "함께할 일과 각자 할 일을 나누고, 필요한 순간에만 확실히 연결되는 가족 관계가 더 잘 맞습니다.",
    "가족을 위해 많이 희생하는 것보다 가족과 내 생활을 같이 오래 가져갈 수 있는 구조를 만드는 게 중요합니다."
  ];

  if(row.evidenceGroup==="CHILDREN")return[
    "가족과 아이를 챙길 때는 필요한 걸 빨리 알아보고 책임지는 모습이 먼저 나올 수 있습니다.",
    "이 장점이 오래 가려면 모든 일을 대신 해결해주기보다 상대가 직접 해볼 몫을 남겨두는 게 중요합니다.",
    "잘해주는 것과 대신 살아주는 건 다르기 때문에, 도와줄 순간과 기다릴 순간을 나누는 편이 관계를 더 편하게 만듭니다."
  ];

  return null;
}

function wellnessHabitSentence(guidance:string){
  const mapped:Record<string,string>={
    "낮 시간 활동":"낮에는 햇빛을 보고 가볍게 몸을 움직이는 시간을 일정하게 만들어두는 게 좋아요.",
    "적당한 유산소 운동":"무리하지 않는 범위에서 숨이 조금 차는 정도의 유산소 활동을 꾸준히 이어가는 게 좋아요.",
    "일정한 수면 리듬":"자는 시간과 일어나는 시간을 크게 흔들리지 않게 유지하는 게 좋아요.",
    "가벼운 스트레칭":"오래 같은 자세로 있지 말고 중간중간 가볍게 몸을 풀어주는 게 좋아요.",
    "규칙적인 움직임":"한 번에 많이 움직이기보다 매일 조금씩이라도 몸을 움직이는 시간을 만드는 게 좋아요.",
    "같은 자세 오래 유지하지 않기":"오래 앉아 있거나 같은 자세가 이어지면 중간에 자세를 바꾸고 몸을 풀어주세요.",
    "규칙적인 식사":"바쁜 날에도 식사 시간을 지나치게 미루지 않고 기본 리듬을 지키는 게 좋아요.",
    "과식 피하기":"한 번에 몰아서 먹기보다 배가 지나치게 부르기 전 멈추는 습관이 도움이 됩니다.",
    "급하게 먹지 않기":"식사 속도를 조금 늦추고 급하게 먹는 날이 반복되지 않게 하는 게 좋아요.",
    "환기":"실내에 오래 있다면 중간중간 환기하고 답답한 환경을 오래 끌지 않는 게 좋아요.",
    "편안한 호흡":"긴장이 올라올 때는 어깨에 힘을 빼고 호흡을 천천히 돌리는 시간을 잠깐이라도 가져보세요.",
    "지나치게 건조한 환경 피하기":"건조한 환경에 오래 있지 않도록 실내 습도와 환기를 함께 챙기는 게 좋아요.",
    "충분한 수면":"잠을 줄여서 버티기보다 회복할 수 있는 수면 시간을 먼저 확보하는 게 좋아요.",
    "과도한 피로 누적 피하기":"며칠씩 피로를 몰아두지 말고 바쁜 일정 사이에도 짧은 회복 시간을 넣어두는 게 좋아요.",
    "몸을 지나치게 차갑게 두지 않기":"몸이 오래 차가운 상태로 있지 않도록 생활 환경과 활동량을 무리 없는 범위에서 조절해보세요."
  };
  if(!guidance)return"";
  return mapped[guidance]??(/[.!?요다]$/.test(guidance)?guidance:`${guidance}을 생활 속에서 꾸준히 챙겨보세요.`);
}

function wellnessConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="WELLNESS")return null;
  const title=row.topic??row.title;
  const first=facts.wellnessAttention[0]??null,second=facts.wellnessAttention[1]??null;
  const firstLabel=first?elementPro(first.element):"",secondLabel=second?elementPro(second.element):"";
  const firstAreas=first?.traditionalAreas.slice(0,3).join(" · ")??"",secondAreas=second?.traditionalAreas.slice(0,2).join(" · ")??"";
  const firstHabit=first?wellnessHabitSentence(facts.wellnessHabits[first.element]??""):"",secondHabit=second?wellnessHabitSentence(facts.wellnessHabits[second.element]??""):"";
  const strongest=facts.strongest?elementPro(facts.strongest.element):"";

  if(/명리로 보는 건강 균형|^건강운$/.test(title))return[
    first?("명리적으로 건강 균형을 볼 때 가장 먼저 체크할 쪽은 "+firstLabel+"입니다. "+(facts.missing.includes(first.element)?firstLabel+"가 사주 안에서 비어 있어 저절로 채워지는 쪽보다 생활에서 의식적으로 보완해야 하는 편입니다.":(first.customerStatus||"균형을 조금 더 챙겨볼 필요가 있는 쪽으로 잡힙니다."))):"건강운은 오행의 많고 적음과 생활 리듬을 함께 봅니다.",
    facts.strongest?("반대로 "+strongest+"은 비중이 가장 커서 관련 성향을 오래 쓰기 쉽습니다. 강한 쪽은 장점이지만 과하게 쓰면 긴장과 피로가 한쪽에 몰릴 수 있어, 부족한 곳은 채우고 강한 곳은 과하지 않게 쓰는 게 중요합니다."):"강한 부분과 약한 부분의 균형을 같이 보는 편이 좋습니다.",
    firstAreas?("전통 명리에서는 "+firstLabel+"를 "+firstAreas+" 같은 영역과 연결해 살핍니다. 이건 질병이 있다는 뜻이 아니라 생활 관리에서 어느 쪽을 먼저 챙길지 보는 참고입니다."):"전통 명리의 신체 대응은 진단이 아니라 생활 관리의 참고로만 봅니다.",
    firstHabit||"바쁜 날에도 수면·식사·움직임 가운데 최소 한 가지는 무너지지 않게 지키는 게 좋습니다.",
    "실제 통증이나 증상은 반드시 검진과 의료 판단을 우선하고, 사주 건강운은 체질을 단정하기보다 평소 취약해지기 쉬운 생활 패턴을 미리 관리하는 데 쓰는 게 맞습니다."
  ];

  if(/약하게 보이는 부분과 주의할 점/.test(title))return[
    first?(firstLabel+" 쪽이 가장 먼저 주의해서 볼 부분입니다. "+(first.theme||first.customerStatus||"생활 리듬이 무너지면 이쪽의 부담을 더 크게 느낄 수 있습니다.")):"오행 가운데 상대적으로 약하거나 주의도가 높은 부분부터 봅니다.",
    firstAreas?("전통적으로는 "+withParticle(firstAreas,"과","와")+" 연결해 살피기 때문에, 이와 관련된 불편을 사주만으로 판단하기보다 평소 생활 습관과 실제 몸 상태를 같이 확인하는 편이 좋습니다."):"전통 신체 대응은 증상을 예언하는 용도가 아닙니다.",
    second?(("그다음으로는 "+secondLabel+"도 같이 봅니다. "+(second.theme||second.customerStatus||""))+(secondAreas?(" 전통적으로는 "+withParticle(secondAreas,"과","와")+" 연결해 봅니다."):"")):"한 부분만 떼어 보기보다 전체 균형을 같이 확인하는 게 중요합니다.",
    "특히 바쁠 때 잠·식사·활동량 가운데 무엇부터 무너지는지를 기록해보면 사주에서 말하는 약한 부분이 실제 생활에서 어떻게 나타나는지 훨씬 쉽게 확인할 수 있습니다.",
    "명리에서 약하게 보인다고 실제 장기나 기능이 약하다고 단정할 수는 없습니다. 반복되는 증상이 있다면 의료 평가가 우선입니다."
  ];

  if(/생활에서 보완하는 방법/.test(title))return[
    first?(firstLabel+"를 보완하는 가장 현실적인 방법은 물건이나 색을 찾는 것보다 생활 행동을 바꾸는 것입니다."):"보완은 상징물보다 실제 생활 습관으로 연결하는 편이 효과적입니다.",
    firstHabit||"가장 자주 무너지는 수면·식사·활동 패턴 하나를 먼저 고정해보세요.",
    secondHabit?(secondLabel+" 쪽은 "+secondHabit):"두 번째로 약한 부분은 한꺼번에 바꾸지 말고 첫 습관이 자리 잡은 뒤 붙이는 편이 좋습니다.",
    facts.missing.includes("fire")?"특히 화(火)가 비어 있다면 몸을 계속 정지 상태로 두기보다 햇빛을 보고 움직이는 시간, 사람과 대화하고 밖으로 표현하는 시간을 일정 안에 넣어두는 방식이 잘 맞습니다.":"부족한 부분은 의지로 버티기보다 일정과 환경 속에 자동으로 들어가게 만드는 게 오래 갑니다.",
    "보완은 완벽하게 하는 것보다 평소 가장 바쁜 날에도 유지할 수 있을 정도로 작게 시작하는 게 좋습니다."
  ];

  if(/어떻게 쉬어야 회복이 빠를까|휴식과 회복/.test(title))return[
    "회복에서는 오래 쉬는 시간보다 머릿속 일이 실제로 끊기는 시간이 중요합니다.",
    facts.strongest?.element==="metal"?"금(金)이 강한 편이면 쉬는 중에도 틀린 부분이나 남은 일을 계속 확인하려 할 수 있어, 완전히 끝내고 쉰다기보다 특정 시간 이후에는 확인을 멈추는 기준이 더 중요합니다.":"쉬는 중에도 생각이 계속 이어지면 몸은 멈춰 있어도 실제 회복감은 낮을 수 있습니다.",
    firstHabit||"화면과 일을 잠시 끊고 걷거나 장소를 바꾸는 식으로 생각의 흐름을 한번 끊어주는 편이 좋습니다.",
    "완전히 지친 뒤 길게 쉬기보다 바쁜 일정 사이에 짧은 회복 시간을 미리 넣어두는 쪽이 더 잘 맞습니다.",
    "휴식 후에도 피로·통증·수면 문제가 계속된다면 사주 해석보다 실제 검진을 우선해야 합니다."
  ];

  if(/스트레스가 쌓이는 방식|긴장과 스트레스/.test(title))return[
    facts.strongest?("평소 "+strongest+"의 방식이 익숙해서 스트레스를 받을 때도 그 방식을 더 세게 쓰려 할 수 있습니다. "+elementOveruse(facts.strongest.element).sign):"스트레스를 받을 때는 평소 잘하는 방식이 오히려 과해지는지 보는 게 중요합니다.",
    "겉으로 바로 무너지기보다 확인할 것과 생각할 것이 늘면서 머릿속 긴장이 길어지는 식으로 나타날 수 있습니다.",
    "이럴 때는 문제를 전부 해결한 뒤 쉬려고 하기보다 오늘 해결할 일과 내일로 넘길 일을 먼저 나누는 게 더 도움이 됩니다.",
    elementOveruse(facts.strongest?.element??"").reset,
    "스트레스가 오래 지속되면서 수면·식사·통증 같은 문제가 생기면 실제 의료·상담 도움을 우선하는 게 좋습니다."
  ];

  if(/활력이 떨어질 때 회복하는 법|기운이 떨어질 때 필요한 것/.test(title))return[
    facts.missing.includes("fire")?"화(火)가 비어 있는 경우에는 생각과 준비가 길어진 뒤 실제 움직임이 줄어들 때 활력이 더 떨어진 것처럼 느껴질 수 있습니다.":"활력이 떨어질 때는 무조건 더 쉬기보다 무엇 때문에 생활 리듬이 끊겼는지 보는 게 중요합니다.",
    "해야 할 일을 전부 조금씩 붙잡기보다 오늘 끝낼 일 하나만 정해두면 머릿속 부담이 줄어들 수 있습니다.",
    firstHabit||"가벼운 움직임과 규칙적인 식사·수면처럼 기본 리듬을 먼저 되찾는 편이 좋습니다.",
    "컨디션이 떨어진 상태에서 의지만 더 쓰면 회복 전에 다음 일정을 또 끌어올 수 있으니 해야 할 일의 양 자체를 줄이는 날도 필요합니다."
  ];

  if(/식사·수면·움직임에서 챙길 것|식사와 생활 습관/.test(title))return[
    "건강운에서 가장 중요한 건 특별한 보양법보다 바쁠 때도 유지되는 기본 리듬입니다.",
    firstHabit||"식사와 수면 가운데 가장 먼저 무너지는 한 가지를 정해 최소 기준을 만들어두는 편이 좋습니다.",
    secondHabit||"활동량이 줄어드는 시기에는 짧게라도 몸을 움직이는 시간을 일정에 넣어두면 리듬을 되찾기 쉽습니다.",
    "며칠 무리한 뒤 몰아서 회복하려 하기보다 일하는 날과 쉬는 날의 차이가 지나치게 커지지 않게 만드는 편이 오래 갑니다.",
    "특정 음식이나 운동이 치료 효과가 있다고 사주로 단정할 수는 없으니 개인 건강 상태에 맞춰 조절해야 합니다."
  ];

  if(/잘하는 관리와 놓치기 쉬운 관리|잘 지키는 것과 자꾸 놓치는 것/.test(title))return[
    "남과 한 약속이나 업무 마감은 잘 챙기면서 당장 문제가 없어 보이는 자기관리 일정은 뒤로 밀릴 수 있습니다.",
    facts.strongest?.element==="metal"?"특히 금(金)이 강하면 관리 기준을 세우는 건 잘하지만 기준을 너무 높게 잡아 며칠 못 지켰을 때 아예 포기하는 식이 될 수 있습니다.":"잘하는 관리가 완벽주의로 바뀌지 않게 기준을 현실적으로 잡는 게 중요합니다.",
    "건강 관리에서는 의지보다 예약·반복 일정처럼 자동으로 돌아가는 장치를 쓰는 편이 더 잘 맞습니다.",
    firstHabit||"잘 안 되는 관리 하나만 고정하고 나머지는 그다음에 붙이는 방식이 좋습니다."
  ];

  if(/생활 리듬이 크게 흔들리는 시기|대운에서 건강/.test(title))return[
    facts.wellnessPeriods.length?("건강 관리에 조금 더 신경 쓸 대운은 "+facts.wellnessPeriods.map(period=>period.ageRange).filter(Boolean).join(" · ")+" 구간입니다. 이 시기는 질병을 예고한다기보다 생활 변화와 활동량이 겹치면서 회복 관리의 중요도가 올라가는 때로 봅니다."):"생활환경이 크게 바뀌는 시기에는 평소보다 회복 시간을 더 의식적으로 확보하는 편이 좋습니다.",
    facts.wellnessPeriods[0]?.pillar?("그중 가장 먼저 보는 구간은 "+facts.wellnessPeriods[0].ageRange+"의 "+facts.wellnessPeriods[0].pillar+" 대운입니다. 일정·직업·가족 역할이 같이 움직이면 몸보다 생활 리듬이 먼저 흔들릴 수 있습니다."):"직업·거주·가족 역할 변화가 겹칠 때 생활 리듬이 먼저 흔들릴 수 있습니다.",
    "이 시기에는 새로운 일을 줄이라는 뜻이 아니라 수면·식사·회복 시간을 일정 안에서 먼저 확보하라는 의미에 가깝습니다.",
    "대운의 건강 주의도는 의료 예측이 아니므로 실제 증상은 검진과 의료 판단을 우선해야 합니다."
  ];

  if(row.evidenceGroup==="WELLNESS")return[
    first?("명리 건강에서는 "+firstLabel+" 쪽을 우선적으로 챙겨볼 만합니다."):"오행 균형과 생활 습관을 함께 봅니다.",
    firstHabit||"바쁜 날에도 기본 생활 리듬 하나는 지키는 편이 좋습니다.",
    "사주 건강운은 질병을 맞히는 용도가 아니라 평소 어떤 생활 패턴에서 더 쉽게 지치는지 이해하는 참고입니다."
  ];

  return null;
}

function nobleConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  if(row.evidenceGroup!=="NOBLE")return null;
  const title=row.topic??row.title;
  const noble=facts.starLabels.filter(label=>/귀인/.test(label));
  const years=fortuneSnapshots(input,row).filter(snapshot=>snapshot.year!=null)
    .sort((a,b)=>(b.favorabilityScore+b.activationScore*0.25)-(a.favorabilityScore+a.activationScore*0.25));
  const topYears=years.slice(0,2).map(snapshot=>snapshot.year as number);

  if(/내 사주의 귀인운|^귀인운$/.test(title))return[
    noble.length?("사주에 잡히는 귀인 표시는 "+noble.join(" · ")+"입니다. 이름만 보면 추상적이지만 실제로는 막힌 일을 풀어주는 사람, 정보를 연결해주는 사람, 결정권 있는 사람처럼 나타날 수 있습니다."):"뚜렷한 귀인 이름이 많지 않더라도 실제 운에서 도움받기 쉬운 시기는 따로 생길 수 있습니다.",
    dominantFamily(facts)==="인성"?"배우는 과정에서 만나는 선생·선배·전문가형 귀인이 특히 잘 맞습니다. 혼자 찾던 답을 훨씬 짧게 정리해주는 사람이 큰 도움이 될 수 있습니다.":"일·거래·프로젝트처럼 역할이 분명한 자리에서 실질적인 도움을 주는 사람이 귀인으로 들어오기 쉽습니다.",
    "귀인은 무조건 나를 편하게 해주는 사람이 아닙니다. 때로는 듣기 불편한 말을 해도 잘못 가는 방향을 빨리 끊어주거나, 내가 혼자 못 들어가던 문을 열어주는 사람이 더 큰 귀인일 수 있습니다.",
    "중요한 건 사람이 많아지는 복보다 필요한 순간에 맞는 사람과 연결되는 복입니다."
  ];

  if(/어떤 사람이 귀인으로 들어올까|내게 실제로 도움이 되기 쉬운 사람/.test(title))return[
    "귀인으로 들어오기 쉬운 사람은 감정적으로만 위로하는 사람보다 실제 경험과 방법을 가진 사람에 가깝습니다.",
    familyCount(facts,"인성")>=familyCount(facts,"재성")?"전문가·선배·강사·멘토처럼 지식과 경험을 정리해주는 사람이 도움이 되기 쉽습니다.":"고객·거래처·사업 파트너·결정권자처럼 현실적인 기회와 연결된 사람이 도움이 되기 쉽습니다.",
    "일에서는 이미 비슷한 문제를 해결해본 사람, 돈에서는 숫자를 냉정하게 볼 수 있는 사람, 관계에서는 감정에만 휩쓸리지 않고 상황을 정리해주는 사람이 잘 맞습니다.",
    "그 사람을 만난 뒤 내 선택지가 넓어지고 내가 해야 할 일이 더 분명해진다면 귀인 역할을 제대로 하는 관계에 가깝습니다."
  ];

  if(/배우는 과정에서 만나는 좋은 인연|배움에서 만나는 귀인/.test(title))return[
    "배움에서의 귀인은 많이 알려주는 사람보다 무엇을 먼저 익혀야 하는지 순서를 잡아주는 사람입니다.",
    "자격 과정, 전문 교육, 업무 인수인계, 선배와의 협업처럼 배운 것을 바로 써볼 수 있는 자리에서 이런 도움을 체감하기 쉽습니다.",
    "사람뿐 아니라 책·강의·자료·커뮤니티도 시행착오를 크게 줄여준다면 귀인 역할을 할 수 있습니다.",
    "배운 뒤 바로 써보는 구조가 있을수록 좋은 인연의 효과도 오래 남습니다."
  ];

  if(/기회를 연결해주는 사람|뜻밖의 기회를 주는 귀인/.test(title))return[
    "기회를 주는 귀인은 아주 친한 사람보다 바깥 연결에서 들어올 가능성을 더 눈여겨볼 만합니다.",
    familyCount(facts,"재성")>0?"고객·거래처·사업 파트너처럼 돈과 결과가 오가는 관계에서 새로운 판이 열릴 수 있습니다.":"프로젝트·소개·외부 제안처럼 내가 하던 일을 다른 곳에 연결해주는 사람이 기회를 만들 수 있습니다.",
    "좋은 제안이라도 역할·돈·책임 범위는 따로 확인해야 합니다. 귀인이 연결해준 기회와 좋은 계약은 같은 뜻이 아닙니다.",
    "본인에게 좋은 귀인은 아예 새로운 일을 떠미는 사람보다 이미 잘하는 걸 더 큰 자리로 연결해주는 사람에 가깝습니다."
  ];

  if(/좋은 인연은 어디에서 만나기 쉬울까|귀인은 어디에서 만날까/.test(title))return[
    familyCount(facts,"인성")>=familyCount(facts,"재성")?"귀인은 강의·자격 과정·전문가 모임·업무 네트워크처럼 배우고 전문성을 넓히는 자리에서 만나기 쉽습니다.":"귀인은 고객·거래·프로젝트·업무 네트워크처럼 실제 결과를 함께 만드는 자리에서 만나기 쉽습니다.",
    "처음부터 친한 관계보다 서로 무엇을 하는 사람인지 분명한 상태에서 시작한 인연이 오히려 오래 도움이 될 수 있습니다.",
    "사람을 많이 만나는 것보다 내가 무엇을 하고 있고 어떤 도움을 찾는지 분명하게 보여줄수록 맞는 연결이 들어오기 쉽습니다.",
    "소개를 받았을 때도 사람 자체보다 그 연결이 내 선택지를 실제로 넓혀주는지를 보는 편이 좋습니다."
  ];

  if(/귀인운이 강해지는 시기|도움을 받기 쉬운 시기/.test(title))return topYears.length?[
    "앞으로의 흐름 가운데 귀인운을 특히 눈여겨볼 해는 "+topYears.map(year=>year+"년").join(" · ")+"입니다.",
    "이 해들은 단순히 사람이 많이 생긴다는 뜻보다, 도움을 받기 쉬운 흐름과 실제 활동량이 같이 올라오는 쪽을 우선해서 고른 것입니다.",
    years[0]?.categories.length?("가장 먼저 보는 "+years[0].year+"년에는 "+(topSnapshotCategory(years[0],"support")?.label??"일")+" 쪽에서 도움을 받기 쉬운 흐름이 상대적으로 강합니다."):"이 시기에는 혼자 오래 검토하기보다 전문가·선배·소개를 적극적으로 활용하는 편이 좋습니다.",
    "귀인이 들어오는 해라도 모든 제안이 좋은 건 아니므로, 연결은 넓게 받고 결정은 평소 기준대로 하는 편이 좋습니다."
  ]:[
    "귀인운은 특정 연도를 억지로 찍기보다 실제 세운의 도움 정도와 움직임을 같이 봐야 합니다.",
    "도움이 커지는 시기에는 소개·협업·전문가 조언을 혼자 오래 미루지 않는 편이 좋습니다.",
    "좋은 연결이 들어와도 최종 선택은 본인 기준으로 확인하는 게 중요합니다."
  ];

  if(/좋은 인연을 알아보는 법|귀인을 알아보는 법/.test(title))return[
    "귀인은 나를 편하게만 해주는 사람이 아니라 만나고 난 뒤 내 판단과 선택을 더 좋아지게 만드는 사람입니다.",
    "그 사람 덕분에 해야 할 일이 선명해지고, 좋은 정보나 사람과 연결되고, 내가 혼자 하던 시행착오가 줄어든다면 귀인 역할을 하는 관계에 가깝습니다.",
    "반대로 내 판단을 계속 약하게 만들거나 의존하게 만드는 관계라면 친절해 보여도 오래 좋은 귀인은 아닐 수 있습니다.",
    "귀인을 알아보는 가장 현실적인 기준은 그 사람을 만난 뒤 내가 더 잘 결정할 수 있게 되었는가입니다."
  ];

  if(row.evidenceGroup==="NOBLE")return[
    noble.length?("사주에 "+noble.join(" · ")+" 같은 귀인 표시가 있습니다."):"귀인운은 사람 수보다 필요한 순간의 연결로 보는 편이 맞습니다.",
    "좋은 인연은 내 일을 대신해주는 사람이 아니라 내 선택과 결과를 더 좋아지게 만드는 사람입니다.",
    "언제 어떤 자리에서 연결되는지를 실제 세운과 함께 보는 편이 가장 구체적입니다."
  ];

  return null;
}

function starRelationConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="STARS_RELATIONS")return null;
  const title=row.topic??row.title;
  const has=(token:string)=>facts.starLabels.some(label=>label.includes(token));
  const present=facts.starLabels.filter(label=>["도화","화개","역마","천을귀인","귀문","원진","현침","양인","괴강","백호"].some(token=>label.includes(token)));
  const named=present.length?present.join(" · "):"뚜렷하게 강조되는 신살이 많지 않은 편";

  if(/내 사주에 들어온 신살/.test(title))return[
    present.length?("사주에서 먼저 눈에 띄는 신살은 "+named+"입니다. 신살은 운명을 결정하는 딱지가 아니라 기본 성향을 조금 더 세밀하게 설명해주는 보조 근거로 봅니다."):"특정 신살 하나가 강하게 사주 전체를 끌고 가는 구조라기보다 원래 성향과 관계를 중심으로 보는 편이 더 맞습니다.",
    has("도화")?"도화살은 사람에게 기억되는 인상과 매력, 보여지는 방식과 연결해서 봅니다.":"도화살이 강하지 않다면 사람의 시선을 끄는 힘보다 신뢰와 실력으로 관계가 쌓이는 쪽을 더 중요하게 봅니다.",
    has("화개")?"화개살은 혼자 깊이 파고들고 자기 세계를 만드는 힘과 연결됩니다.":has("귀문")?"귀문은 분위기와 미묘한 변화를 빠르게 감지하는 예민함으로 나타날 수 있습니다.":"신살보다 실제 합·충·형·파·해 관계가 생활에서 더 직접적으로 느껴질 수 있습니다.",
    "아래에서는 이름 하나씩 떼어서 장점과 과해졌을 때의 피로를 따로 보겠습니다."
  ];

  if(/도화살/.test(title))return has("도화")?[
    "도화살이 있습니다. 여기서 도화는 단순히 이성에게 인기 있다는 뜻보다 사람들에게 어떤 식으로 기억되는가와 더 가깝습니다.",
    "처음부터 튀는 스타일이 아니어도 말투·분위기·취향·표정처럼 본인만의 결이 보일 때 이상하게 기억에 남을 수 있습니다.",
    "연애에서는 상대가 먼저 관심을 보이거나 친해지고 나서 매력이 더 크게 느껴지는 식으로 나타날 수 있고, 일에서는 콘텐츠·브랜드·고객 응대·발표처럼 사람에게 기억되어야 하는 장면에서 장점이 됩니다.",
    "다만 반응을 너무 자주 확인하면 사람들의 시선에 맞춰 자기 방향을 바꾸기 쉬워질 수 있습니다.",
    "도화살을 잘 쓰는 방법은 더 화려해지는 게 아니라 본인에게 이미 있는 분위기와 취향을 꾸준히 보여주는 것입니다."
  ]:[
    "도화살이 강하게 잡히는 사주는 아닙니다. 그래서 첫인상의 화려함보다 시간이 지나면서 신뢰와 실력으로 매력이 커지는 쪽이 더 자연스럽습니다.",
    "사람의 관심을 끌기 위해 일부러 튀기보다 자기 취향과 잘하는 일을 꾸준히 보여주는 편이 더 잘 맞습니다.",
    "연애에서도 빠른 인기보다 반복해서 만나며 신뢰가 생기는 관계를 더 중요하게 볼 수 있습니다."
  ];

  if(/화개살/.test(title))return has("화개")?[
    "화개살이 있습니다. 화개는 혼자 있는 시간이 많다는 뜻으로만 보지 않고, 한 주제를 깊게 파고들어 자기 것으로 만드는 성향으로 봅니다.",
    "관심이 생긴 분야는 겉만 보고 넘기기보다 자료를 더 찾아보고 자기 방식으로 정리해야 마음이 놓일 수 있습니다.",
    "연구·기획·전문지식·창작처럼 바로 답이 나오지 않는 일에서는 큰 장점이 됩니다.",
    "반대로 혼자 정리하는 시간이 너무 길면 결과를 밖에 보여주는 시점이 늦어질 수 있습니다.",
    "화개살은 고립이 아니라 깊이의 장점으로 쓰되 일정 시점에는 결과를 세상 밖으로 꺼내는 기준을 같이 두는 게 좋습니다."
  ]:[
    "화개살이 강하게 잡히는 편은 아닙니다. 혼자 깊이 파고드는 힘은 신살보다 인성이나 오행 분포 같은 다른 근거를 함께 보는 편이 더 정확합니다.",
    "혼자 있는 시간이 필요하더라도 그것을 화개살 하나로 설명할 필요는 없습니다.",
    "관심 분야를 깊게 가져갈지 넓게 경험할지는 실제 생활 패턴을 더 중요하게 보면 됩니다."
  ];

  if(/귀문·원진/.test(title))return[
    has("귀문")?"귀문이 잡히면 사람의 말보다 말투·표정·평소와 다른 분위기를 먼저 알아차리는 편이 될 수 있습니다. 작은 차이를 빨리 감지하는 감각이 장점입니다.":"귀문이 강한 편은 아니라도 관계에서 예민함은 원진이나 다른 관계 구조에서 나타날 수 있습니다.",
    has("원진")?"원진도 함께 보이면 특히 가까운 사람에게 작은 어긋남을 더 크게 느끼거나, 서운한 일을 오래 생각하는 경향이 겹칠 수 있습니다.":"원진이 강하지 않다면 예민함이 관계 전체를 끌고 가는 핵심으로 보지는 않습니다.",
    "이 조합은 눈치가 빠르고 분위기를 잘 읽는 장점이 있지만 확인되지 않은 마음까지 미리 결론내리면 본인이 가장 피곤해질 수 있습니다.",
    "느낌이 들었을 때 바로 맞다고 믿기보다 실제로 무엇이 있었는지 한 번 확인하는 습관이 이 장점을 오래 쓰게 해줍니다."
  ];

  if(/^원진/.test(title)||/가까운 관계에서 예민해지는 이유/.test(title))return has("원진")?[
    "원진이 있다는 건 가까운 관계가 나쁘다는 뜻이 아니라 가까워질수록 기대와 감정의 밀도가 높아질 수 있다는 뜻입니다.",
    "남이라면 넘길 말도 믿는 사람에게서 나오면 오래 마음에 남고, 상대의 사소한 태도 변화를 더 크게 느낄 수 있습니다.",
    "좋아하는 마음이 큰 만큼 서운함도 커질 수 있기 때문에 말하지 않고 알아주길 기다리는 시간이 길어지면 관계가 더 복잡해질 수 있습니다.",
    "원진을 잘 다루는 방법은 참는 게 아니라 작은 서운함을 작을 때 확인하는 것입니다."
  ]:[
    "원진이 강하게 잡히는 구조는 아닙니다. 가까운 관계의 예민함은 합·충·파·해나 일주 관계를 함께 보는 편이 더 맞습니다.",
    relationSentence(facts),
    "특정 신살 하나보다 실제 관계에서 반복되는 장면을 기준으로 보는 게 좋습니다."
  ];

  if(/현침살/.test(title))return has("현침")||has("침")?[
    "현침살이 있습니다. 작은 오류나 미묘한 차이를 그냥 넘기지 않고 끝까지 확인하는 세밀함으로 나타날 수 있습니다.",
    "품질관리·검수·분석·글쓰기처럼 작은 차이가 결과를 바꾸는 일에서는 강점이 큽니다.",
    "말에서도 핵심을 정확히 찌르는 편이 될 수 있어 본인은 사실을 말했는데 상대는 날카롭게 느낄 때가 있을 수 있습니다.",
    "중요한 일에는 세밀함을 충분히 쓰고 덜 중요한 일에는 완료 기준을 낮추는 게 현침살을 편하게 쓰는 방법입니다."
  ]:[
    "현침살이 강한 편은 아닙니다. 세밀함이 있다면 금(金)의 강약이나 관성·인성 같은 다른 근거에서 더 크게 설명될 수 있습니다.",
    "사소한 오류에 얼마나 민감한지는 실제 일하는 습관과 함께 보는 편이 좋습니다.",
    "신살 하나가 없다고 꼼꼼함이 없다는 뜻은 아닙니다."
  ];

  if(/충·형·파·해|부딪힘/.test(title))return[
    relationSentence(facts),
    facts.relationCounts.clash>0?"충이 있어 변화나 이동이 생길 때 체감이 비교적 선명한 편입니다. 같은 자리에 오래 묶여 있기보다 환경이 바뀌면서 다음 선택이 생기는 식으로 나타날 수 있습니다.":"충이 강하지 않다면 큰 변화보다 작은 조정이 반복되는 쪽을 더 봅니다.",
    facts.relationCounts.punishment>0?"형이 있으면 같은 문제를 오래 붙잡거나 스스로 압박을 키우는 장면을 조심할 필요가 있습니다.":facts.relationCounts.break+facts.relationCounts.harm>0?"파·해가 있으면 큰 충돌보다 관계나 일정이 조금씩 어긋나는 장면을 더 주의해서 봅니다.":"형·파·해가 강하게 겹치는 편은 아닙니다.",
    "이 관계들은 나쁜 사건을 예고하는 표시가 아니라 변화가 생길 때 어떤 방식으로 체감하는지를 보는 근거입니다."
  ];

  if(/^합 ·|사람과 일이 모이는 방식/.test(title))return facts.relationCounts.combination>0?[
    "합이 있습니다. 합은 사람이나 일이 서로 끌려 한쪽으로 힘이 모이는 관계입니다.",
    "잘 맞는 사람이나 목표를 만나면 평소보다 빠르게 가까워지고 집중력이 크게 올라갈 수 있습니다.",
    "협업·계약·연애처럼 둘이 한 방향을 보는 장면에서는 강점이 되지만, 한 관계나 일에 너무 많이 묶이면 다른 선택지가 잘 안 보일 수 있습니다.",
    "합은 무조건 좋은 관계라는 뜻보다 무엇과 합쳐졌을 때 내 생활이 더 좋아지는지를 보는 게 중요합니다."
  ]:[
    "합이 강하게 잡히지 않는다면 사람이나 일에 한 번에 몰입하기보다 천천히 판단하고 거리를 조절하는 방식이 더 자연스러울 수 있습니다.",
    "관계의 깊이는 합 하나보다 실제 신뢰와 반복되는 행동을 더 중요하게 봅니다.",
    "합이 없다고 좋은 인연이 적다는 뜻은 아닙니다."
  ];

  if(/신살을 어떻게 활용/.test(title))return[
    "신살은 좋은 살과 나쁜 살을 나누는 표보다 내 성향을 세밀하게 읽는 보조 지도처럼 쓰는 게 좋습니다.",
    present.length?("이 사주에서는 "+named+"처럼 실제로 잡힌 신살만 중요하게 보고, 없는 신살을 억지로 끌어오지 않는 게 맞습니다."):"신살보다 기본 사주 구조를 중심으로 보는 편이 맞습니다.",
    "도화는 보여지는 매력으로, 화개는 깊이로, 귀문·원진은 예민한 감각으로, 현침은 세밀함으로 쓰면 장점이 됩니다.",
    "같은 특징이 생활을 편하게 만들 때는 장점으로 쓰고 사람과 나를 지나치게 지치게 만들 때만 조절하면 충분합니다."
  ];

  if(row.evidenceGroup==="STARS_RELATIONS")return[
    present.length?("사주에 보이는 신살은 "+named+"입니다."):"특정 신살보다 기본 성향과 관계 구조를 우선해서 봅니다.",
    relationSentence(facts),
    "이름을 외우는 것보다 실제 생활에서 언제 이 특징이 나오는지를 같이 보는 게 중요합니다."
  ];

  return null;
}

function twelveStageConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="TWELVE_STAGES")return null;
  const title=row.topic??row.title;
  const stage=(position:string)=>facts.stageByPosition[position]||"";
  const meaning=(position:string)=>STAGE_STORY[stage(position)]??"상황에 따라 역할을 조절하는 모습";
  const stageWithMeaning=(position:string)=>stage(position)?(stage(position)+" · "+meaning(position)):"계산된 단계 없음";

  if(/내 십이운성 한눈에 보기/.test(title))return[
    "십이운성은 같은 사람도 어린 시절·사회생활·가까운 관계·인생 후반에서 어떤 방식으로 에너지를 쓰는지가 달라지는 모습을 12단계로 나눠 보는 명리 기준입니다.",
    "년주는 "+stageWithMeaning("year")+", 월주는 "+stageWithMeaning("month")+"으로 잡힙니다.",
    "일주는 "+stageWithMeaning("day")+", 시주는 "+stageWithMeaning("hour")+"으로 잡힙니다.",
    "네 자리가 모두 같은 단계가 아니기 때문에 밖에서 보이는 모습과 가까운 사람 앞의 모습, 젊을 때와 후반의 모습이 조금씩 다르게 느껴질 수 있습니다.",
    "좋고 나쁨으로 줄 세우기보다 각 자리에서 어떤 역할이 자연스럽게 나오는지 보는 편이 맞습니다."
  ];

  if(/년주 십이운성/.test(title))return[
    stage("year")?("년주의 십이운성은 "+stage("year")+"입니다. "+meaning("year")+"으로 읽습니다."):"년주 십이운성은 계산 결과와 함께 봅니다.",
    "년주는 어린 시절의 환경과 처음 사회 규칙을 배우던 배경을 보는 자리라, 이 단계는 어릴 때 어떤 방식으로 적응했는지를 설명하는 데 더 가깝습니다.",
    ["장생","목욕","관대"].includes(stage("year"))?"어린 시절에는 새로운 환경을 받아들이고 사람 속에서 경험을 넓히는 일이 성향 형성에 크게 작용했을 수 있습니다.":["건록","제왕"].includes(stage("year"))?"어릴 때부터 자기 방식이나 책임감을 비교적 빨리 세우는 모습이 나타날 수 있습니다.":"어린 시절의 경험을 안에 오래 저장하고 조심스럽게 적응하는 쪽이 더 강했을 수 있습니다.",
    "지금 기억이 선명하지 않더라도 어린 시절에 익힌 적응 방식이 성인이 된 뒤 낯선 환경에서 자동으로 다시 나올 수 있습니다."
  ];

  if(/월주 십이운성/.test(title))return[
    stage("month")?("월주의 십이운성은 "+stage("month")+"입니다. 사회에서는 "+meaning("month")+"이 더 앞에 나올 수 있습니다."):"월주 십이운성은 사회생활의 역할과 함께 봅니다.",
    "월주는 직장·사회·부모와의 현실적인 관계처럼 바깥에서 맡는 역할을 보는 자리입니다.",
    ["건록","제왕","관대"].includes(stage("month"))?"사회생활에서는 책임과 주도권을 잡을수록 오히려 성향이 더 또렷하게 살아날 수 있습니다.":["쇠","병","묘"].includes(stage("month"))?"사회에서는 무조건 앞에 나서기보다 경험을 골라 쓰고 중요한 일에 집중하는 쪽이 더 잘 맞을 수 있습니다.":"새로운 일을 배우거나 환경이 바뀔 때 적응 과정 자체가 중요한 편입니다.",
    "직업운을 볼 때 월주 단계가 중요한 이유는 어떤 직함보다 실제 사회에서 어느 정도의 책임과 속도가 편한지를 보여주기 때문입니다."
  ];

  if(/일주 십이운성/.test(title))return[
    stage("day")?("일주의 십이운성은 "+stage("day")+"입니다. 가까운 관계에서는 "+meaning("day")+"이 더 직접적으로 드러날 수 있습니다."):"일주 십이운성은 가까운 관계와 자기 생활의 리듬을 함께 봅니다.",
    "일주는 나 자신과 배우자 자리까지 함께 보기 때문에 연애·결혼처럼 아주 가까운 관계에서 본래 반응이 어떻게 나오는지를 읽는 데 중요합니다.",
    ["건록","제왕"].includes(stage("day"))?"가까운 사이에서도 자기 영역과 판단을 잃지 않는 것이 중요하고, 상대가 지나치게 의존하면 답답함이 커질 수 있습니다.":["장생","양","태"].includes(stage("day"))?"가까운 관계에서는 함께 배우고 생활을 키워가는 느낌이 있을 때 안정감을 크게 느낄 수 있습니다.":"가까워질수록 감정과 관계를 안에서 오래 정리한 뒤 움직이는 편일 수 있습니다.",
    "그래서 사회에서 잘 맞는 사람과 실제로 함께 살기 편한 사람이 꼭 같지는 않을 수 있습니다."
  ];

  if(/시주 십이운성/.test(title))return[
    stage("hour")?("시주의 십이운성은 "+stage("hour")+"입니다. 인생 후반과 부모 역할에서는 "+meaning("hour")+"이 더 중요해질 수 있습니다."):"시주 십이운성은 후반의 생활과 부모 역할을 함께 봅니다.",
    "시주는 자녀·후반·내가 남기고 싶은 것을 보는 자리라, 젊을 때보다 나이가 들수록 어떤 역할이 편해지는지와 연결해 봅니다.",
    ["건록","제왕","관대"].includes(stage("hour"))?"후반에도 직접 결정하고 움직이는 역할이 남아 있을수록 활력이 살아날 수 있습니다.":["쇠","병","사","묘","절"].includes(stage("hour"))?"후반으로 갈수록 직접 모든 일을 처리하기보다 경험을 골라 쓰고 다른 사람에게 맡기는 쪽이 더 자연스러워질 수 있습니다.":"부모 역할이나 후반에는 작은 가능성을 키우고 지켜보는 역할이 더 중요해질 수 있습니다.",
    "자녀에게도 무조건 대신해주기보다 이 시주의 방식에 맞춰 도와줄 때와 기다릴 때를 나누는 게 중요합니다."
  ];

  if(/인생 초반/.test(title))return[
    "인생 초반은 년주 "+(stage("year")||"")+", 월주 "+(stage("month")||"")+"의 영향을 함께 봅니다.",
    "어린 시절에 익힌 적응 방식이 학교와 첫 사회생활에서 어떻게 바뀌었는지가 초반 흐름의 핵심입니다.",
    "이 시기는 결과를 빨리 만드는 것보다 어떤 환경에서 내가 편해지고 어떤 역할에서 지치는지 경험으로 알아가는 의미가 큽니다.",
    "초반의 시행착오는 나중에 직업과 관계를 고를 때 중요한 기준으로 남을 수 있습니다."
  ];

  if(/인생 중반/.test(title))return[
    "인생 중반은 월주 "+(stage("month")||"")+"와 일주 "+(stage("day")||"")+"의 차이가 실제 생활에서 가장 크게 느껴질 수 있는 시기입니다.",
    "사회에서 맡은 책임과 내가 원하는 생활 방식, 일과 가족의 균형을 동시에 맞춰야 하기 때문입니다.",
    "밖에서 잘하는 역할만 계속 밀어붙이면 가까운 관계나 회복 시간이 줄어들 수 있고, 관계만 챙기면 일의 성취감이 떨어질 수 있습니다.",
    "중반에는 더 많이 하는 것보다 오래 가져갈 일과 관계를 골라내는 선택이 중요해집니다."
  ];

  if(/인생 후반/.test(title))return[
    "인생 후반은 시주 "+(stage("hour")||"")+"의 성격이 점점 중요해지는 시기입니다.",
    "직접 모든 일을 해내는 사람에서 경험을 골라 쓰고 사람을 키우거나 맡기는 사람으로 역할이 바뀔 수 있습니다.",
    "후반의 만족도는 얼마나 많은 일을 하느냐보다 지금까지 쌓은 경험을 어디에 남기고 누구와 나누느냐와 연결되기 쉽습니다.",
    "시주의 단계와 맞지 않게 예전 방식만 붙잡으면 피로가 커질 수 있어 역할을 바꾸는 것도 중요한 흐름입니다."
  ];

  if(row.evidenceGroup==="TWELVE_STAGES")return[
    "십이운성은 단계 이름을 외우기보다 년·월·일·시 각각에서 어떤 모습이 다르게 나오는지를 보는 편이 좋습니다.",
    "현재 계산에서는 년주 "+(stage("year")||"")+" · 월주 "+(stage("month")||"")+" · 일주 "+(stage("day")||"")+" · 시주 "+(stage("hour")||"")+"로 잡힙니다.",
    "각 단계는 좋고 나쁨이 아니라 역할과 에너지 사용 방식의 차이입니다."
  ];

  return null;
}

function tenGodConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="TEN_GODS")return null;
  const title=row.topic??row.title,dominant=dominantFamily(facts);
  const visible=Object.values(facts.stemTenGodByPosition).filter(Boolean);
  const hidden=Object.values(facts.branchMainTenGodByPosition).filter(Boolean);

  if(/내가 일·돈·사람을 다루는 방식|내가 자주 쓰는 성향 한눈에 보기|어떤 성향을 자주 쓰는 편일까|^십성$|한눈에 보기|십성 분포/.test(title))return[
    "일할 때, 돈을 쓸 때, 사람을 대할 때 늘 같은 성향만 나오는 건 아닙니다. 어떤 상황에서는 직접 밀고 가고, 어떤 상황에서는 충분히 알아본 뒤 움직이는 식으로 역할이 달라집니다.",
    dominantFamilySentence(facts),
    "평소 가장 자주 쓰는 성향은 익숙해서 장점이 되기 쉽지만, 너무 많이 쓰면 같은 이유로 피로가 생길 수도 있습니다.",
    "반대로 덜 익숙한 성향은 능력이 없다는 뜻이 아니라 경험이 적어서 바로 나오지 않는 쪽에 가깝습니다.",
    "어려운 이름보다 어떤 상황에서 어떤 모습이 먼저 나오는지만 보면 충분합니다."
  ];

  if(/내 안의 여러 역할은 어떻게 다를까|십성 10가지 뜻/.test(title))return[
    "사람 안에는 여러 역할이 같이 있습니다. 직접 결정하고 밀고 가는 모습, 말과 결과물로 표현하는 모습, 돈과 현실을 챙기는 모습, 책임을 맡는 모습, 충분히 배우고 이해하는 모습이 상황에 따라 번갈아 나옵니다.",
    "같은 돈을 다루는 사람도 한쪽은 안정적으로 관리하려 하고, 다른 쪽은 기회를 빨리 잡으려 할 수 있습니다. 같은 책임감도 원칙을 지키는 방식과 압박 속에서 결단하는 방식이 다를 수 있습니다.",
    "중요한 건 이름을 외우는 게 아니라 어떤 역할을 자주 쓰고, 어떤 역할은 필요한 순간에 늦게 나오는지를 아는 것입니다.",
    dominantFamilySentence(facts),
    "내가 자주 쓰는 역할을 장점으로 살리고, 덜 쓰는 역할은 실제 생활에서 조금씩 경험해보는 식으로 보면 충분합니다."
  ];

  if(/스스로 결정하고 밀고 가는 모습|비겁/.test(title))return[
    familyPresence(facts,"비겁"),
    "중요한 일은 남이 정해준 답보다 본인이 납득한 방식대로 해야 오래 가는 편입니다.",
    "이 성향이 잘 쓰이면 독립성과 추진력이 되지만, 과해지면 도움을 받아야 할 때도 혼자 해결하려는 모습으로 바뀔 수 있습니다.",
    "의견이 갈릴 때 무조건 양보할 필요는 없지만, 상대가 틀렸다는 결론을 내리기 전에 다른 방식도 한번 들어보는 편이 좋습니다.",
    "직접 판단하는 힘을 줄이라는 뜻이 아니라, 혼자 해야 하는 일과 같이 해야 하는 일을 구분하는 게 중요합니다."
  ];

  if(/생각을 말과 결과로 꺼내는 모습|식상/.test(title))return[
    familyPresence(facts,"식상"),
    "생각을 밖에 꺼낼 때는 말, 콘텐츠, 결과물, 서비스처럼 다른 사람이 실제로 볼 수 있는 형태가 되어야 장점이 더 잘 살아납니다.",
    "머릿속에서 충분히 준비됐다고 느껴도 공개나 제안이 늦으면 실제 반응을 받을 기회도 같이 늦어질 수 있습니다.",
    "잘 쓰이면 표현력과 생산성이 되지만, 반응을 너무 빨리 확인하려 들면 사람들의 평가에 쉽게 지칠 수도 있습니다.",
    "완벽한 결과를 기다리기보다 중간 단계에서도 한번 보여주고 반응을 받는 경험이 도움이 됩니다."
  ];

  if(/돈과 현실 결과를 챙기는 모습|재성/.test(title))return[
    familyPresence(facts,"재성"),
    "돈만 보는 성향이라기보다 시간과 비용을 쓴 뒤 실제로 무엇이 남는지를 중요하게 보는 쪽에 가깝습니다.",
    "일에서도 결과가 숫자나 성과로 확인될수록 판단이 빨라지고, 반대로 끝이 보이지 않는 일은 답답하게 느낄 수 있습니다.",
    "잘 쓰이면 운영감각과 현실감이 되지만, 모든 선택을 손익으로만 보면 관계나 장기적인 가능성을 놓칠 수 있습니다.",
    "현실적인 감각을 유지하되 당장 숫자로 보이지 않는 가치까지 완전히 배제하지 않는 균형이 중요합니다."
  ];

  if(/책임과 약속을 지키는 모습|관성/.test(title))return[
    familyPresence(facts,"관성"),
    "맡은 일이 생기면 대충 넘기기보다 어디까지 해야 끝난 건지 확인하고 싶어하는 편입니다.",
    "이 성향이 잘 쓰이면 신뢰와 책임감이 되지만, 책임만 커지고 결정권이 없을 때는 스트레스도 크게 쌓일 수 있습니다.",
    "규칙 자체를 좋아한다기보다 납득할 수 있는 기준과 역할이 분명할 때 더 편하게 움직이는 쪽에 가깝습니다.",
    "책임감을 장점으로 오래 쓰려면 해야 할 일과 내가 책임지지 않아도 되는 일을 구분하는 게 중요합니다."
  ];

  if(/배우고 이해하는 모습|인성/.test(title))return[
    familyPresence(facts,"인성"),
    "낯선 일을 바로 시작하기보다 먼저 이해하고 자료를 확인한 뒤 자기 방식으로 정리해야 마음이 놓일 수 있습니다.",
    "이 성향이 잘 쓰이면 학습력과 전문성이 되지만, 준비가 길어지면 실행이 늦어질 수 있습니다.",
    "많이 아는 것보다 필요한 걸 정확히 배우고 실제 일에 써볼 때 장점이 더 선명해집니다.",
    "배우는 시간을 늘리는 것만큼 어느 시점에 직접 해볼지를 정해두는 편이 좋습니다."
  ];

  if(/남들이 먼저 보는 내 모습|겉으로 드러난 십성/.test(title))return[
    `처음 만난 사람이나 사회에서는 ${Array.from(new Set(visible)).join(" · ")||"몇 가지 역할"} 쪽 모습이 먼저 보일 수 있습니다.`,
    "밖에서는 해야 할 일을 먼저 챙기기 때문에 실제 속마음보다 더 단단하고 책임감 있어 보이거나, 반대로 더 현실적이고 차분해 보일 수 있습니다.",
    hidden.length?`하지만 가까워지면 ${Array.from(new Set(hidden)).join(" · ")}과 연결된 모습도 더 많이 드러날 수 있습니다.`:"가까워진 뒤의 모습은 다른 계산과 함께 봅니다.",
    "겉에서 잘하는 역할이 항상 편한 역할은 아닙니다. 잘해 보이는 모습과 실제로 에너지를 쓰는 방식이 다를 수 있다는 점을 알아두면 좋습니다."
  ];

  if(/가까워져야 보이는 내 모습|속에 숨은 십성/.test(title))return[
    `가까운 사람 앞에서는 ${Array.from(new Set(hidden)).join(" · ")||"평소보다 솔직한 모습"}이 더 잘 드러날 수 있습니다.`,
    "밖에서는 참거나 맞춰가던 일도 편한 관계에서는 내 생각을 더 분명하게 말하거나, 반대로 감정과 고민을 더 오래 꺼내놓을 수 있습니다.",
    visible.length?`사회에서는 ${Array.from(new Set(visible)).join(" · ")} 쪽 모습이 먼저 보이기 때문에 주변이 느끼는 나와 내가 느끼는 나 사이에 차이가 생길 수도 있습니다.`:"밖의 모습과 가까운 관계의 모습은 조금 다를 수 있습니다.",
    "이 차이를 이상하게 볼 필요는 없습니다. 안전한 관계에서 다른 면이 나오는 건 자연스러운 일입니다.",
    "다만 밖에서 참은 피로를 가까운 사람에게 한꺼번에 풀지 않도록 중간에서 마음을 설명하는 시간이 필요합니다."
  ];

  if(/밖에서 보이는 나와 가까운 사람 앞의 나|겉으로 보이는 나와 속마음/.test(title))return[
    "밖에서는 역할에 맞춰 정리된 모습이 먼저 나오고, 가까운 사람 앞에서는 감정과 본래 생각이 더 솔직해질 수 있습니다.",
    "사회에서는 책임을 먼저 챙기느라 감정을 뒤로 미루고, 편한 관계에서는 그동안 참았던 말이나 피로가 늦게 나오는 식입니다.",
    "이 차이는 가식이라기보다 상황마다 필요한 역할이 다르기 때문에 생기는 자연스러운 변화입니다.",
    "문제는 밖에서 너무 오래 참은 뒤 가까운 사람에게만 한꺼번에 풀 때 생길 수 있습니다.",
    "힘들다는 말을 완전히 지친 뒤에 꺼내지 말고, 아직 괜찮을 때 조금씩 설명해두는 편이 관계를 훨씬 편하게 만듭니다."
  ];

  if(/상황마다 달라지는 내 모습|상황마다 달라지는 십성/.test(title))return[
    "일할 때의 나, 돈을 다룰 때의 나, 가까운 사람 앞의 나는 조금씩 다를 수 있습니다.",
    "일에서는 책임과 마무리가 앞서고, 돈에서는 현실적인 결과를 보고, 관계에서는 신뢰와 감정이 더 중요해지는 식입니다.",
    "한 가지 모습만 진짜 나라고 정하기보다 어떤 상황에서 어떤 성향을 먼저 쓰는지 알아두는 편이 훨씬 현실적입니다.",
    "상황에 맞는 역할을 쓰되 한쪽 역할을 너무 오래 붙잡지 않는 게 피로를 줄이는 데 도움이 됩니다."
  ];

  if(row.evidenceGroup==="TEN_GODS")return[
    dominantFamilySentence(facts),
    "일·돈·관계에서 상황마다 앞에 나오는 역할이 조금씩 다를 수 있습니다.",
    "잘 쓰는 성향은 과해지는 순간만 조절하고, 덜 익숙한 성향은 필요한 장면에서 경험을 쌓는 정도로 보면 충분합니다."
  ];

  return null;
}

function timingConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  const title=row.topic??row.title,group=row.evidenceGroup??"",context=periodContext(input,row),axis=fortuneAxis(input,row);
  const favor=FAVORABILITY_LABELS[axis.favorabilityLevel]??"",activation=ACTIVATION_LABELS[axis.activationLevel]??"";
  const snapshots=uniqueYearSnapshots(fortuneSnapshots(input,row).filter(snapshot=>snapshot.year!=null));

  if(group==="FORTUNE_EXPLAIN")return[
    "운의 흐름은 미래 사건을 맞히는 표라기보다 언제 일·돈·관계의 선택이 몰리는지를 보는 시간표에 가깝습니다.",
    "대운은 몇 년 동안 반복되는 큰 배경, 세운은 그 안에서 해마다 어디가 움직이는지, 월운은 실제 일정이 어느 달에 몰리는지를 봅니다.",
    "도움이 되는 정도와 변화가 큰 정도는 따로 봅니다. 아주 바쁜 해가 반드시 좋은 해는 아니고, 조용한 해가 나쁜 해도 아닙니다.",
    "그래서 시기 해설은 좋은 날을 기다리는 용도보다 언제 무엇을 준비하고 무엇을 확인할지 정하는 데 쓰는 게 가장 현실적입니다."
  ];

  if(group==="YEARLY_OVERVIEW"&&/^앞으로 5년$/.test(title))return snapshots.length?[
    "앞으로 5년은 한 덩어리로 좋다 나쁘다를 말하기보다 해마다 중심이 어디로 옮겨가는지를 보는 게 중요합니다.",
    ...snapshots.slice(0,5).map(snapshot=>{const active=topSnapshotCategory(snapshot,"activity"),support=topSnapshotCategory(snapshot,"support");return (snapshot.year+"년은 "+(active?active.label+" 쪽 움직임이 가장 크고":"여러 분야가 비슷하게 움직이고")+(support&&(!active||support.key!==active.key)?", "+support.label+" 쪽은 상대적으로 도움을 받기 쉽습니다.":". ")+(active?categoryLifeSentence(active.label):"실제 선택이 어느 분야에 몰리는지 확인하는 해입니다."));}),
    "이 다섯 해를 이어서 보면 먼저 벌어지는 일, 그다음에 돈이나 자리로 굳어지는 일, 마지막에 남길 것을 정하는 순서가 보일 수 있습니다."
  ]:[
    "앞으로 5년은 해마다 움직이는 분야가 다를 수 있으므로 한 해씩 따로 보는 편이 좋습니다.",
    "각 해의 일·돈·관계·학업·변화 점수를 비교해 중심 분야를 정합니다.",
    "좋은 해를 기다리기보다 움직임이 큰 분야에 맞춰 준비 순서를 바꾸는 게 중요합니다."
  ];

  if(group==="YEARLY_OVERVIEW"&&/5년 동안 일·돈·관계는 어떻게 달라질까/.test(title))return snapshots.length?[
    "일·돈·관계가 동시에 좋아지거나 동시에 흔들리는 식으로 움직이지는 않습니다. 해마다 중심 분야가 바뀌는지 보는 게 핵심입니다.",
    ...snapshots.slice(0,5).map(snapshot=>{const active=topSnapshotCategory(snapshot,"activity");const support=topSnapshotCategory(snapshot,"support");return snapshot.year+"년: "+(active?active.label+"의 변화가 가장 큼":"변화가 분산됨")+(support?(", 도움은 "+support.label+" 쪽이 상대적으로 받기 쉬움"):"")+". ";}),
    "일이 먼저 움직이는 해에 역할을 만들고, 돈이 움직이는 해에 그 결과를 수입으로 굳히고, 관계가 움직이는 해에는 사람의 수보다 남길 관계를 고르는 식으로 연결해서 보면 좋습니다.",
    "한 해에 세 분야를 모두 잡으려 하기보다 그해 가장 크게 움직이는 한쪽에 시간을 먼저 쓰는 편이 결과가 더 선명합니다."
  ]:[
    "일·돈·관계는 같은 속도로 움직이지 않기 때문에 해마다 중심을 따로 봅니다.",
    "움직임이 큰 분야와 도움을 받기 쉬운 분야를 구분하는 게 중요합니다.",
    "그해 가장 크게 움직이는 한쪽을 중심에 두는 편이 현실적입니다."
  ];

  if(group==="YEARLY_OVERVIEW"&&/앞으로 5년에서 가장 중요한 것/.test(title))return snapshots.length?[
    "앞으로 5년에서 중요한 건 해마다 같은 목표를 반복하는 게 아니라 그해 강하게 움직이는 분야에 맞춰 역할을 바꾸는 것입니다.",
    "초반 해에는 새로 벌이는 일이 많다면 검증을 우선하고, 중간 해에는 실제 수입·자리·관계로 굳힐 것을 고르고, 뒤쪽 해에는 다음 흐름으로 가져갈 것을 남기는 식으로 보면 좋습니다.",
    "특히 "+(snapshots[0]?.year??"초반")+"년부터 "+(snapshots.at(-1)?.year??"후반")+"년까지 무엇이 반복해서 상위에 올라오는지 보면 앞으로 몇 년의 핵심 과제가 더 선명해집니다.",
    "해마다 결과를 새로 만들기보다 앞 해에 만든 것을 다음 해에 이어 쓰는 구조를 만드는 게 가장 중요합니다."
  ]:[
    "앞으로 몇 해는 해마다 다른 분야가 움직일 수 있습니다.",
    "기회가 많은 해에는 결과를 남기고 변화가 큰 해에는 선택지를 줄이는 편이 좋습니다.",
    "앞 해의 경험을 다음 해에 이어 쓰는 구조를 만드는 게 중요합니다."
  ];

  if(group==="YEARLY_OVERVIEW")return snapshots.length?[
    "앞으로의 해를 비교하면 중심이 어디로 옮겨가는지가 보입니다.",
    ...snapshots.slice(0,5).map(snapshot=>{const active=topSnapshotCategory(snapshot,"activity");return snapshot.year+"년은 "+(active?active.label+" 쪽이 가장 바쁘게 움직입니다.":"여러 분야가 비슷하게 움직입니다.");}),
    "같은 계획을 매년 반복하기보다 그해 가장 많이 움직이는 분야에 맞춰 순서를 조정하는 편이 좋습니다."
  ]:["앞으로 몇 해는 해마다 중심 분야가 달라질 수 있습니다.","움직임이 큰 분야를 먼저 보고 준비 순서를 조정하는 편이 좋습니다."];

  if(/^YEAR_[1-5]$/.test(group)){
    const snapshot=snapshots[0]??null;
    const year=snapshot?.year??context.seunYear;
    const active=snapshot?topSnapshotCategory(snapshot,"activity"):null,support=snapshot?topSnapshotCategory(snapshot,"support"):null;
    return[
      (year?year+"년은 ":"이 해는 ")+(active?active.label+" 쪽 움직임이 가장 크게 잡힙니다. ":"여러 분야가 비슷하게 움직입니다. ")+(active?categoryLifeSentence(active.label):""),
      support?("상대적으로 도움을 받기 쉬운 분야는 "+support.label+" 쪽입니다. "+(active&&support.key===active.key?"바쁘면서도 결과를 만들기 좋은 쪽이 같은 분야에 겹치는 해입니다.":"바쁜 분야와 유리한 분야가 다르기 때문에 에너지 배분을 나눠볼 필요가 있습니다.")):"도움을 받는 정도와 실제 움직임은 따로 확인하는 편이 좋습니다.",
      context.seunPillar?fortunePillarSentence(context.seunPillar):"그해의 세운 글자는 원래 사주와 만나 어느 분야의 움직임을 키우는지 함께 봅니다.",
      favor&&activation?("전체적으로는 "+favor+", 움직임은 "+activation+"에 가깝습니다. 즉 결과가 잘 붙는지와 실제 일이 많아지는지를 따로 보는 해입니다."):favor?("전체 도움 정도는 "+favor+"에 가깝습니다."):activation?("실제 움직임은 "+activation+"에 가깝습니다."):"지원과 활동량을 따로 봅니다.",
      categoryActionSentence(active?.label??"")
    ];
  }

  if(group==="MONTHLY")return[
    "월운은 한 해 안에서도 실제 일정과 선택이 어느 달에 몰리는지 보는 부분입니다.",
    "변화가 큰 달이라고 나쁜 달은 아니고 해야 할 일과 결정이 많아지는 달에 가깝습니다.",
    "큰 계약·이동처럼 되돌리기 어려운 선택이 겹치면 확인 절차를 하나 더 두고, 수정 가능한 일은 지나치게 겁내지 않는 편이 좋습니다.",
    "달별 흐름은 운에 맞춰 모든 일을 정하는 용도보다 바쁜 시기를 미리 알아두는 일정표로 쓰는 게 좋습니다."
  ];

  return null;
}

function changeConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  const title=row.topic??row.title,group=row.evidenceGroup??"";

  if(group==="CHANGE"){
    if(/^(변화가 커지는 시기|삼재·변화운|변화운은 어느 정도)$/.test(title))return[
      "변화가 많다는 건 나쁜 일이 생긴다는 뜻이 아니라, 그대로 두기보다 선택하거나 조정해야 할 일이 평소보다 늘어나는 때라는 뜻입니다.",
      "직장·돈·관계·생활환경 가운데 한곳만 움직일 때보다 여러 분야가 같이 바뀔 때 체감이 더 커질 수 있어요.",
      facts.relationCounts.clash||facts.relationCounts.break||facts.relationCounts.harm?"원래 사주에도 부딪힘이나 어긋남을 조정하는 관계가 있어, 변화가 들어오면 '참고 유지할지, 기준을 다시 정할지'를 고민하는 장면이 생기기 쉽습니다.":"원래 큰 충돌이 강하지 않더라도 시기의 활동량이 커지면 평소보다 선택할 일이 많아질 수 있습니다.",
      "이럴 때는 새로 시작할 것만 보는 것보다 먼저 끝낼 것, 그대로 가져갈 것, 시험해볼 것을 나누는 게 중요해요.",
      "좋은 변화도 한꺼번에 몰리면 부담이 될 수 있고, 부담스러운 변화도 오래 막혀 있던 구조를 정리하는 계기가 될 수 있습니다."
    ];
    if(/지금은 변화가 많은 시기일까/.test(title)){
      const year=input.minimalContext.requestedYear;
      const yearly=uniqueYearSnapshots(fortuneSnapshots(input,row).filter(snapshot=>snapshot.year!=null));
      const now=typeof year==="number"?yearly.find(snapshot=>snapshot.year===year)??null:yearly[0]??null;
      const active=now?topSnapshotCategory(now,"activity"):null;
      const activation=now?ACTIVATION_LABELS[now.activationLevel]??"": "";
      return[
        now&&year?`${year}년은 ${activation||"움직임을 따로 확인해야 하는 흐름"}입니다. ${active?active.label+" 쪽에서 선택할 일이 상대적으로 많이 생기기 쉬워요.":"한 분야에만 변화가 몰리기보다 여러 선택이 섞일 수 있어요."}`:"지금의 변화 크기는 현재 대운과 올해 흐름을 함께 놓고 보는 게 가장 정확합니다.",
        active?categoryLifeSentence(active.label):"직장·돈·관계·생활환경 중 실제로 무엇이 움직이는지를 먼저 확인하는 게 중요합니다.",
        "변화가 크다는 이유만으로 일을 벌이거나 멈출 필요는 없습니다. 되돌리기 어려운 선택인지, 해보고 수정할 수 있는 선택인지를 나눠보는 쪽이 더 현실적이에요.",
        "이미 진행 중인 일이 많다면 새 선택을 하나 더 얹기보다 지금 벌어진 일 가운데 무엇을 먼저 정리할지를 정하는 게 좋습니다."
      ];
    }

    if(/변화가 커질 때 실제로 생기는 일|변화운이 커진다는 뜻/.test(title))return[
      "변화가 커질 때 가장 먼저 늘어나는 건 사건보다 선택입니다. 그대로 둘지 바꿀지, 계속할지 멈출지 결정해야 하는 일이 많아질 수 있습니다.",
      "일, 거주, 관계, 계약처럼 생활의 틀을 건드리는 선택이 겹치면 체감이 더 커질 수 있습니다.",
      "이럴 때 모든 변화를 기회라고 밀어붙일 필요도 없고, 불안하다고 전부 막을 필요도 없습니다.",
      "되돌리기 어려운 선택만 한 번 더 확인하고, 수정 가능한 일은 움직이면서 고칠 여지를 남겨두는 편이 좋습니다."
    ];

    if(/부딪히면서 방향이 바뀌는 때|부딪힘이 변화를 만드는 때/.test(title))return[
      "평소 방식으로 해결되지 않는 일이 생기면 억지로 버티기보다 방향을 바꾸거나 역할을 다시 나눠야 할 수 있습니다.",
      facts.relationCounts.clash?"변화가 생기면 체감이 비교적 크게 오는 편이라, 이동이나 역할 변경이 생길 때 마음의 준비가 먼저 필요할 수 있습니다.":"평소 변화가 크지 않아도 특정 시기에는 이동이나 역할 변경이 더 선명하게 느껴질 수 있습니다.",
      "이 흐름이 들어온다고 무조건 이별·퇴사·이사를 뜻하는 건 아닙니다. 일정, 업무, 사람 관계를 다시 맞추는 작은 변화로도 나타날 수 있습니다.",
      "기존 방식을 지키는 데만 힘을 쓰기보다 무엇을 바꾸면 다음 단계가 편해지는지 보는 편이 좋습니다."
    ];

    if(/사람과 일이 한쪽으로 몰리는 때|서로 모이며 일이 커지는 때/.test(title))return[
      "사람과 일이 한쪽으로 몰리는 때에는 잘 맞는 프로젝트나 관계 하나에 집중력이 크게 올라갈 수 있습니다.",
      facts.relationCounts.combination?"사람이나 목표와 연결되면 집중력이 강해지는 편이라, 이 시기에는 한 관계나 일에 에너지가 빠르게 모일 수 있습니다.":"평소에는 여러 일을 나눠 하더라도 특정 시기에는 한쪽에 집중력이 크게 몰릴 수 있습니다.",
      "잘 쓰이면 협업과 계약, 몰입으로 이어지지만 한 가지에 너무 많이 묶이면 다른 선택지가 잘 보이지 않을 수 있습니다.",
      "무엇이 커지는지만 보지 말고 그만큼 무엇을 줄여야 하는지도 같이 보는 편이 좋습니다."
    ];

    if(/같은 문제가 자꾸 신경 쓰일 때|반복해서 신경 쓰이게 하는 압박/.test(title))return[
      "큰 사건 하나보다 사소한 불편이 계속 반복될 때 더 피곤해질 수 있습니다.",
      facts.relationCounts.punishment?"비슷한 부담을 오래 신경 쓰는 면이 있어, 바쁜 시기에는 작은 문제를 미리 정리하는 편이 좋습니다.":"평소에는 괜찮아도 특정 시기에는 사소한 일까지 압박으로 느껴질 수 있습니다.",
      "반복 업무, 애매한 관계, 계속 미뤄둔 문제가 쌓이면 실제 일보다 머릿속 부담이 더 커질 수 있습니다.",
      "한꺼번에 다 해결하려 하기보다 계속 반복되는 원인 하나부터 줄이는 게 좋습니다."
    ];

    if(/사람과 환경 때문에 방향이 바뀌는 때|기운이 실제로 옮겨 가는 관계/.test(title))return[
      "사람이나 환경이 바뀌면 평소 성향도 조금 다른 모습으로 나올 수 있습니다.",
      "혼자 할 때보다 누군가와 함께할 때 속도가 더 빨라지거나, 반대로 한 관계에 너무 몰입해 다른 일을 놓치는 식입니다.",
      "중요한 건 누가 좋은 사람인가보다 그 사람과 있을 때 내가 어떤 선택을 더 많이 하게 되는지 보는 것입니다.",
      "관계가 내 생활을 더 넓혀주는지, 오히려 한쪽으로 좁히는지 보면 그 연결의 의미가 더 선명해집니다."
    ];

    if(/큰 변화가 들어오는 때|변화가 큰 시기/.test(title))return[
      "큰 변화는 여러 분야가 한꺼번에 움직일 때 더 크게 느껴집니다. 일과 돈, 관계가 같이 바뀌면 하나씩 바꿀 때보다 피로도 커질 수 있습니다.",
      "이럴 때 모든 결정을 같은 시기에 몰아넣기보다 가장 먼저 바꿀 것과 마지막까지 지킬 것을 나누는 편이 좋아요.",
      "일이 바뀌면 돈 쓰는 방식이 달라지고, 생활환경이 바뀌면 관계의 거리도 달라지는 식으로 한 선택이 다른 분야까지 이어질 수 있습니다.",
      "그래서 변화의 수보다 서로 연결된 변화가 몇 개인지를 보는 게 더 중요해요.",
      "큰 변화가 꼭 나쁜 운이라서 생기는 건 아닙니다. 기존 방식이 더 이상 맞지 않아 다음 구조로 넘어가는 과정일 수도 있습니다."
    ];

    if(/변화가 클수록 기억할 점|기억할 점/.test(title))return[
      "변화가 클수록 들뜨지도 겁먹지도 않는 게 중요합니다.",
      "좋은 제안이 와도 시간과 돈, 사람 관계에서 실제로 감당할 비용이 무엇인지 먼저 확인하는 편이 좋습니다.",
      "반대로 부담스러운 변화가 생겨도 모든 걸 지키려 하기보다 정말 남겨야 할 것만 구분하면 생각보다 빨리 정리될 수 있습니다.",
      "되돌리기 어려운 선택은 확인을 늘리고, 수정 가능한 선택은 여지를 남겨두는 방식이 가장 현실적입니다."
    ];

    return[
      "변화가 많은 시기에는 평소보다 선택할 일이 많아지고, 같은 문제도 더 크게 느껴질 수 있습니다.",
      relationSentence(facts),
      "움직임이 큰 것과 결과가 좋은 것은 같은 뜻이 아니기 때문에 따로 보는 편이 좋습니다.",
      "이럴 때는 선택 기준을 미리 정해두는 것만으로도 흔들림을 많이 줄일 수 있습니다."
    ];
  }

  if(group==="SAMJAE"){
    const root=asRecord(evidenceValue(input,"FORTUNE:SAMJAE"));
    const cycles=Array.isArray(root?.samjaeCycles)?root?.samjaeCycles:[];
    const requestedYear=typeof input.minimalContext.requestedYear==="number"?input.minimalContext.requestedYear:null;
    const normalized=cycles.map(item=>asRecord(item)).filter((item):item is LooseRecord=>Boolean(item));
    const cycle=(requestedYear!=null?normalized.filter(item=>(asNumber(item.endYear)??-Infinity)>=requestedYear).sort((a,b)=>(asNumber(a.startYear)??0)-(asNumber(b.startYear)??0))[0]:normalized[0])??null;
    if(cycle){
      const start=asNumber(cycle.startYear),middle=asNumber(cycle.middleYear),end=asNumber(cycle.endYear);
      const years=[start,middle,end].filter((year):year is number=>year!=null);
      return[
        years.length===3?("다음 삼재 흐름은 "+start+"년 들삼재 · "+middle+"년 눌삼재 · "+end+"년 날삼재로 이어집니다."):"삼재는 세 해가 이어지는 변화 구간으로 봅니다.",
        "삼재라고 세 해 모두 나쁜 일이 생긴다는 뜻은 아닙니다. 원래 사주의 합·충·형·파·해와 그해 활동량이 같이 커질 때 체감이 더 커질 수 있습니다.",
        facts.relationCounts.clash+facts.relationCounts.punishment+facts.relationCounts.break+facts.relationCounts.harm>0?"평소에도 사람이나 일에서 같은 문제가 반복되거나 부딪힘을 오래 붙드는 면이 있어, 삼재 기간에는 일정·계약·관계 변화를 한꺼번에 몰지 않는 편이 좋습니다.":"평소에는 큰 충돌이 여러 겹으로 이어지는 편은 아니라, 삼재 자체를 크게 겁내기보다 실제로 바빠지는 분야를 보는 게 더 중요합니다.",
        "들삼재에는 새 변화가 시작되는지, 눌삼재에는 벌인 일을 어떻게 유지·정리할지, 날삼재에는 무엇을 남기고 끝낼지를 보는 식으로 쓰면 됩니다.",
        "즉 삼재는 공포의 시기표가 아니라 변화가 몰릴 수 있는 세 해를 미리 알고 중요한 결정의 확인 절차를 조금 늘리는 참고에 가깝습니다."
      ];
    }
    return[
      "삼재는 세 해가 이어지는 변화 구간을 보는 전통 기준입니다.",
      "현재 계산에서 구체 연도 정보가 잡히지 않으면 억지로 날짜를 찍기보다 실제 세운의 변화량과 함께 보는 편이 맞습니다.",
      "삼재 자체보다 중요한 계약·이동·관계 변화가 겹치는지 확인하는 게 더 현실적입니다."
    ];
  }

  return null;
}

function daeunConsultation(row:Row,facts:ConsultationFacts,input:InterpretationInput):string[]|null{
  const title=row.topic??row.title,group=row.evidenceGroup??"";
  const snapshots=fortuneSnapshots(input,row).filter(snapshot=>snapshot.daeunIndex!=null).sort((a,b)=>(a.daeunIndex??0)-(b.daeunIndex??0));
  const requestedYear=typeof input.minimalContext.requestedYear==="number"?input.minimalContext.requestedYear:null;
  const current=requestedYear!=null?snapshots.find(snapshot=>snapshot.startYear!=null&&snapshot.endYear!=null&&snapshot.startYear<=requestedYear&&requestedYear<snapshot.endYear)??null:null;

  if(group==="DAEUN_OVERVIEW"&&/대운 · 평생 10년 흐름|10년 단위 큰 흐름|^대운$/.test(title))return[
    "대운은 약 10년씩 이어지는 큰 생활 배경입니다. 같은 사람이라도 어느 대운을 지나느냐에 따라 일·돈·관계 가운데 자주 부딪히는 분야가 달라질 수 있습니다.",
    current?("현재는 "+current.ageRange+"의 "+current.daeunPillar+" 대운을 지나고 있습니다. "+(topSnapshotCategory(current,"activity")?topSnapshotCategory(current,"activity")?.label+" 쪽 움직임이 가장 크게 잡힙니다.":"여러 분야가 비슷하게 움직이는 구간입니다.")):"현재 대운은 기준연도의 세운과 함께 확인합니다.",
    "대운이 좋다는 말은 10년 내내 좋은 일만 생긴다는 뜻이 아니고, 어떤 선택에 결과가 붙기 쉬운지와 어떤 분야가 바빠지는지를 보는 의미에 가깝습니다.",
    "평생 흐름에서는 과거 대운을 기억하려 하기보다 지금까지 어떤 성향이 만들어졌고 앞으로 어느 분야가 커지는지를 보는 게 더 유용합니다."
  ];

  if(group==="DAEUN_OVERVIEW"&&/지금 지나고 있는 10년|현재 대운/.test(title))return current?[
    "지금 지나고 있는 대운은 "+current.ageRange+" · "+current.daeunPillar+" 대운입니다.",
    (topSnapshotCategory(current,"activity")?("이 구간에서 가장 많이 움직이는 분야는 "+topSnapshotCategory(current,"activity")?.label+"입니다. "+categoryLifeSentence(topSnapshotCategory(current,"activity")?.label??"")):"한 분야에만 변화가 몰리기보다 여러 선택이 섞여 들어오는 구간입니다."),
    topSnapshotCategory(current,"support")?("상대적으로 도움을 받기 쉬운 쪽은 "+topSnapshotCategory(current,"support")?.label+"입니다. 바쁜 분야와 유리한 분야가 다르면 무조건 바쁜 쪽에만 힘을 쓰지 않는 게 중요합니다."):"도움을 받는 정도와 활동량을 따로 보는 편이 좋습니다.",
    current.daeunPillar?fortunePillarSentence(current.daeunPillar):"대운의 글자는 원래 사주와 만나 어떤 역할이 커지는지 함께 봅니다.",
    categoryActionSentence(topSnapshotCategory(current,"activity")?.label??"")
  ]:[
    "현재 대운은 기준연도에 해당하는 대운 구간을 먼저 찾아서 봅니다.",
    "현재 구간에서 일·돈·관계 중 어느 쪽이 가장 많이 움직이는지를 세운과 함께 확인하는 게 중요합니다.",
    "지금 반복해서 생기는 선택이 무엇인지 보면 현재 대운의 성격을 체감하기 쉽습니다."
  ];

  if(group==="DAEUN_OVERVIEW"&&/평생 10년 흐름 한눈에 보기|평생 대운/.test(title))return snapshots.length?[
    "대운을 한눈에 보면 시기마다 중심 분야가 어디로 옮겨가는지 볼 수 있습니다.",
    ...snapshots.map(snapshot=>{const active=topSnapshotCategory(snapshot,"activity");return snapshot.ageRange+" · "+snapshot.daeunPillar+" 대운은 "+(active?active.label+" 쪽 움직임이 상대적으로 큽니다.":"여러 분야가 비슷하게 움직입니다.");}),
    "어린 시절 구간은 사건을 기억하는 장이 아니라 가족·학교 환경 속에서 어떤 적응 습관이 만들어졌는지 보는 배경이고, 성인 이후부터는 직업·재물·관계의 실제 선택과 더 직접적으로 연결해서 봅니다."
  ]:[
    "대운은 각 나이 구간마다 일·돈·관계의 중심이 어떻게 바뀌는지를 보는 흐름표입니다.",
    "과거를 맞히는 용도보다 앞으로 어느 역할이 커질지를 준비하는 데 쓰는 게 좋습니다."
  ];

  if(group==="DAEUN_OVERVIEW"&&/10년 흐름이 바뀔 때 느껴지는 변화/.test(title))return[
    "대운은 생일 하루를 기준으로 성격이 갑자기 바뀌듯 넘어가는 게 아니라 앞 구간과 다음 구간이 겹치면서 생활의 우선순위가 서서히 달라지는 식으로 체감되는 경우가 많습니다.",
    "처음에는 만나는 사람이나 관심사가 달라지고, 이후 직업·돈·생활 방식이 따라 움직이는 식으로 나타날 수 있습니다.",
    current?("현재 "+current.ageRange+" 구간에서는 "+(topSnapshotCategory(current,"activity")?.label??"생활 전반")+" 쪽 변화가 중심이라, 다음 구간으로 갈수록 이 경험이 무엇으로 남는지를 보는 게 중요합니다."):"현재 구간에서 반복되는 선택이 다음 대운의 준비가 될 수 있습니다.",
    "대운 전환기에는 모든 걸 새로 시작하기보다 계속 가져갈 것, 수정할 것, 끝낼 것을 먼저 나눠보는 편이 좋습니다."
  ];

  if(group==="DAEUN_OVERVIEW"&&/인생 초반·중반·후반의 큰 변화/.test(title))return snapshots.length?[
    "초반 대운은 어떤 환경에서 적응했고 무엇을 빨리 배우게 되었는지가 중요합니다. 기억나는 사건의 수보다 성향과 습관이 만들어진 배경으로 보는 게 맞습니다.",
    "중반 대운은 직업·재물·가족이 실제 선택으로 굳어지는 시기라, 움직임이 큰 분야와 도움을 받기 쉬운 분야의 차이가 훨씬 중요해집니다.",
    "후반 대운은 직접 모든 걸 하는 것보다 쌓아온 경험·자산·관계를 어떻게 남기고 배치하는지가 중요해질 수 있습니다.",
    "같은 사주라도 초·중·후반의 역할이 달라지는 이유가 대운 흐름에 있습니다."
  ]:["초반은 경험, 중반은 현실화, 후반은 정리와 배치의 의미가 더 커질 수 있습니다.","대운마다 같은 방식으로 살기보다 그 시기에 맞는 역할을 쓰는 편이 좋습니다."];

  if(/^DAEUN_[1-9]$/.test(group)||group==="DAEUN_10"){
    const snapshot=snapshots[0]??null;
    if(!snapshot)return["이 대운은 해당 구간의 계산 결과를 기준으로 봅니다.","같은 10년이라도 실제 활동량과 도움 정도를 따로 확인하는 편이 좋습니다."];
    const active=topSnapshotCategory(snapshot,"activity"),support=topSnapshotCategory(snapshot,"support");
    const childhood=snapshot.endAge!=null&&snapshot.endAge<=15;
    const youth=!childhood&&snapshot.startAge!=null&&snapshot.startAge<30;
    const lifeContext=childhood
      ?"이 구간은 본인이 사건을 세세하게 기억하는지보다 가족·학교·생활환경 속에서 어떤 적응 방식이 만들어졌는지를 보는 시기입니다."
      :youth
        ?"이 구간은 공부·첫 직장·독립처럼 내가 어떤 일을 선택하고 사회에서 어떤 역할을 맡을지 만들어가는 의미가 큽니다."
        :"이 구간은 이미 쌓은 경험을 직업·재물·관계에서 실제 결과로 굳히는 선택이 더 중요해지는 시기입니다.";
    return[
      snapshot.ageRange+"의 "+snapshot.daeunPillar+" 대운입니다. "+lifeContext,
      snapshot.daeunPillar?fortunePillarSentence(snapshot.daeunPillar):"대운의 글자는 원래 사주와 만나 어느 성향이 커지는지 봅니다.",
      active?("이 대운에서 가장 많이 움직이는 분야는 "+active.label+"입니다. "+categoryLifeSentence(active.label)):"이 대운은 한 분야에 변화가 몰리기보다 여러 역할이 함께 움직이는 편입니다.",
      support?("상대적으로 도움을 받기 쉬운 분야는 "+support.label+" 쪽입니다. "+(active&&support.key===active.key?"움직임과 지원이 같은 곳에 겹쳐 결과를 만들기 좋은 편입니다.":"바쁜 분야와 유리한 분야가 다르므로 힘을 쓰는 순서를 나눠보는 게 좋습니다.")):"도움을 받는 정도는 다른 대운 근거와 함께 봅니다.",
      (FAVORABILITY_LABELS[snapshot.favorabilityLevel]&&ACTIVATION_LABELS[snapshot.activationLevel])?("전체적으로는 "+FAVORABILITY_LABELS[snapshot.favorabilityLevel]+", 활동량은 "+ACTIVATION_LABELS[snapshot.activationLevel]+"에 가깝습니다."):"지원 정도와 활동량은 별개로 봅니다.",
      childhood?"이 시기를 잘 기억하려고 애쓰기보다 지금도 남아 있는 습관과 가족·학교에서 배운 대응 방식이 무엇인지 돌아보는 정도면 충분합니다.":categoryActionSentence(active?.label??"")
    ];
  }

  return null;
}

function synthesisConsultation(row:Row,facts:ConsultationFacts):string[]|null{
  if(row.evidenceGroup!=="SYNTHESIS")return null;
  const title=row.topic??row.title,stem=stemStory(facts),dominant=dominantFamily(facts);

  if(/내 사주를 한 번에 정리하면|^총정리$/.test(title))return[
    "전체를 한 번에 묶으면, 스스로 납득한 방향에서 오래 가고 맡은 일은 끝을 확인하려는 힘이 가장 크게 남습니다.",
    "일에서는 책임과 판단권이 함께 있을 때, 돈에서는 쓴 뒤 무엇이 남는지가 보일 때, 관계에서는 말과 행동이 꾸준한 사람과 함께할 때 본래 장점이 편하게 살아나요.",
    "반대로 모든 걸 직접 확인하거나 충분히 준비될 때까지 시작을 늦추면 같은 장점이 피로로 바뀔 수 있습니다.",
    "그래서 이 사주의 중요한 과제는 더 강해지는 게 아니라, 오래 가져갈 것과 내려놓을 것을 구분하면서 결과를 밖으로 꺼내는 것입니다."
  ];

  if(/결국 나는 어떤 사람인가/.test(title))return[
    `결국 ${stem.image}처럼 자기 기준이 생기면 쉽게 흔들리지 않고, 시간을 들여 자기 것을 키워가는 사람에 가까워요.`,
    "처음부터 무조건 빠르게 움직이는 사람이라기보다 충분히 확인하고 마음이 정해진 뒤 오래 밀고 가는 쪽입니다.",
    "그래서 주변에서는 신중하다고 느낄 때도 있고, 이미 결정을 끝낸 뒤에는 생각보다 단호하다고 느낄 때도 있어요.",
    `다만 ${stem.shadow}이 강해지면 장점이 고집이나 피로로 바뀔 수 있습니다.`,
    "결국 중요한 건 성격을 바꾸는 게 아니라 어느 일에 이 끈기를 쓸지 고르는 것입니다."
  ];

  if(/강점이 가장 잘 살아나는 때/.test(title))return[
    "강점은 머릿속에서만 기준을 세울 때보다 실제 결과를 만들고 다음 단계로 연결할 때 가장 선명해집니다.",
    facts.missing.includes("fire")?"특히 준비한 것을 말하고 보여주고 제안하는 단계까지 넘어갔을 때, 안에서 쌓아둔 실력이 비로소 밖의 반응과 연결돼요.":"생각한 것을 실제 결과물로 꺼내 사람의 반응을 확인할 때 성장 속도가 붙습니다.",
    "혼자 잘하는 데서 끝나지 않고 역할을 나누고 반복할 수 있는 구조를 만들면 책임감도 훨씬 큰 장점이 됩니다.",
    "잘되는 때일수록 새 일을 계속 늘리기보다 이미 반응이 좋은 한두 가지를 반복 가능하게 만드는 편이 오래 갑니다."
  ];

  if(/강점이 부담으로 바뀌는 순간/.test(title))return[
    "장점이 가장 피곤해지는 순간은 잘하는 걸 너무 오래 혼자 붙잡을 때입니다.",
    "책임감은 모든 일을 직접 가져오는 모습으로, 신중함은 준비가 끝나지 않는 모습으로, 독립심은 도움을 너무 늦게 받는 모습으로 바뀔 수 있습니다.",
    "이럴 때는 더 잘하려 하기보다 여기까지면 충분하다는 기준과 다른 사람에게 넘길 기준을 먼저 정하는 편이 좋습니다.",
    "장점을 줄이는 게 아니라 장점이 나를 소모하기 전에 멈추는 지점을 아는 것이 중요합니다."
  ];

  if(/일과 돈에서 가장 중요한 것|직업운·재물운 핵심/.test(title))return[
    "일에서는 내가 판단할 수 있는 범위가 있고 결과를 끝까지 확인할 수 있을 때 강점이 가장 잘 살아납니다.",
    "돈에서는 많이 버는 것만큼 그 돈이 다음 기회나 자산으로 남는지가 중요합니다.",
    familyPresence(facts,"재성"),
    "장기적으로는 시간을 쓴 만큼만 돈을 받는 구조보다 경험과 결과물을 반복해서 쓸 수 있는 서비스·상품·운영 방식으로 바꾸는 쪽이 더 유리합니다.",
    "일과 돈에서 공통으로 중요한 건 바쁘게 움직이는 게 아니라 시간이 지나도 남는 결과를 만드는 것입니다."
  ];

  if(/연애와 가족에서 가장 중요한 것|연애·가족운 핵심/.test(title))return[
    "관계에서는 처음의 끌림보다 시간이 지나도 믿을 수 있는지가 더 중요한 기준입니다.",
    "가까워질수록 오래 챙기고 책임지려는 마음이 커질 수 있지만, 상대의 몫까지 대신하는 순간 관계가 무거워질 수 있습니다.",
    "좋은 관계는 서로의 생활과 일을 존중하면서도 불편한 마음과 중요한 약속은 말로 설명할 수 있는 관계에 가깝습니다.",
    "가족을 중요하게 여기되 자기 일과 자기 시간을 완전히 포기하지 않는 구조가 오래 갈수록 더 안정적입니다.",
    "사랑을 책임의 양으로 증명하기보다 필요할 때 확실히 연결되고 각자의 몫은 남겨두는 편이 잘 맞습니다."
  ];

  if(/몸과 생활에서 가장 중요한 것|건강운 핵심/.test(title))return[
    "몸과 생활에서 가장 중요한 건 버티는 힘보다 회복하는 습관입니다.",
    "해야 할 일이 많아지면 쉬는 시간부터 줄이기 쉬운 편이라, 본인은 괜찮다고 느끼는 동안에도 피로가 쌓일 수 있습니다.",
    "완전히 지친 뒤 몰아서 쉬기보다 바쁜 날에도 지킬 수 있는 수면·식사·휴식 기준 하나를 먼저 만들어두는 편이 좋습니다.",
    "쉬는 시간에도 계속 일을 생각하면 몸은 멈춰 있어도 머리는 쉬지 못할 수 있으니 생각을 끊는 휴식이 필요합니다.",
    "몸의 불편이나 증상은 실제 의료 판단을 우선하고, 여기서는 생활 습관을 돌아보는 참고 정도로 이해하면 됩니다."
  ];

  if(/나에게 도움이 되는 선택/.test(title))return[
    "도움이 되는 선택은 잘하는 걸 더 세게 밀어붙이는 쪽보다 자주 늦어지는 행동을 조금 앞당기는 쪽에 가깝습니다.",
    "생각이 충분한데 시작이 늦어진다면 먼저 보여주고, 혼자 오래 끌고 있다면 필요한 사람에게 묻고, 일이 너무 몰렸다면 역할을 나누는 식입니다.",
    "결정을 앞두고 완벽한 답을 찾기보다 지금 꼭 확인할 것과 움직이면서 수정해도 될 것을 나누는 편이 좋습니다.",
    "내 강점을 없애는 선택보다 강점을 결과로 이어주고 피로를 줄여주는 선택이 결국 더 도움이 됩니다."
  ];

  if(/평생 기억할 다섯 가지/.test(title))return[
    "첫째, 남이 정한 답보다 스스로 납득한 방향에서 오래 갑니다. 중요한 선택일수록 왜 하는지부터 분명하게 해두는 편이 좋습니다.",
    "둘째, 책임감이 장점이지만 모든 일을 직접 가져오면 장점이 피로로 바뀝니다. 사람과 역할을 나누는 능력도 실력입니다.",
    "셋째, 일과 돈에서는 시작하는 기준만큼 언제 멈추고 무엇을 남길지 정하는 기준이 중요합니다.",
    "넷째, 가까운 관계에서는 마음을 오래 참기보다 작은 불편을 작을 때 말하는 편이 신뢰를 오래 지키는 데 도움이 됩니다.",
    "다섯째, 좋은 시기를 기다리기보다 지금 맡은 일을 제대로 끝내고 다음에도 남는 경험과 구조를 만드는 게 가장 현실적인 운 관리입니다."
  ];

  if(row.evidenceGroup==="SYNTHESIS")return[
    "앞의 내용을 전부 반복하기보다 앞으로 선택할 때 실제로 기억할 기준만 남겨보면 충분합니다.",
    dominantFamilySentence(facts),
    "잘하는 건 결과로 연결하고, 과해지는 순간에는 속도를 줄이고, 혼자 오래 끄는 일은 필요한 도움을 쓰는 편이 좋습니다.",
    "결국 좋은 선택은 본래 장점을 살리면서도 같은 장점 때문에 지치지 않게 만드는 선택에 가깝습니다."
  ];

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
    relationshipConsultation(row,facts,input),
    childrenConsultation(row,facts),
    wellnessConsultation(row,facts),
    nobleConsultation(row,facts,input),
    starRelationConsultation(row,facts),
    twelveStageConsultation(row,facts),
    tenGodConsultation(row,facts),
    timingConsultation(row,facts,input),
    changeConsultation(row,facts,input),
    daeunConsultation(row,facts,input),
    synthesisConsultation(row,facts)
  ];
  const selected=candidates.find((paragraphs):paragraphs is string[]=>Array.isArray(paragraphs)&&paragraphs.length>0);
  const fallback=[
    consultationOpening(row,facts)||"평소 비슷한 상황에서 어떤 선택과 반응이 반복되는지를 살펴보면 성향이 더 분명해집니다.",
    elementFact(facts)||dominantFamilySentence(facts),
    rowHasEvidencePrefix(row,"NATAL:STRUCTURE")&&facts.structure?`${structureMeaning(facts.structure)}이 실제 선택에서 자주 드러납니다.`:"한 가지 특징만 떼어 보기보다 여러 상황에서 비슷한 선택이 반복되는지를 보면 이해하기 쉽습니다.",
    "앞에서 나온 성향이 이 상황에서는 어떻게 달라지는지만 이어서 살펴보면 됩니다."
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
      keyPoints:[],
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
    headline:"나를 중심으로 읽는 평생사주",
    summary:"성격, 일, 돈, 관계와 앞으로의 변화를 실제 생활에서 어떻게 느끼고 선택하는지 한 사람의 이야기로 이어서 풀었습니다.",
    sections,
    highlights:["같은 성향도 일, 돈, 관계에서는 서로 다른 행동으로 나타납니다."],
    cautions:["움직임이 크다는 말과 유리하다는 말은 같은 뜻이 아닙니다."],
    timeline:[],
    disclaimer:"전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다."
  };
}

export class MockInterpretationProvider implements InterpretationProvider{
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{
    const facts=consultationFacts(request.input),spine=personalitySpine(facts);
    const fixedCore={
      corePatterns:[spine.core],
      contradictions:[spine.conflict],
      dominantStrengths:[spine.decision],
      shadowPatterns:[spine.shadow],
      relationshipPattern:spine.close,
      workPattern:spine.work,
      decisionPattern:spine.decision
    };
    if("corePatterns" in ((request.schema.properties??{}) as Record<string,unknown>))
      return {output:fixedCore,provider:"mock",model:"deterministic-fixture-v5",tokenUsage:{input:0,output:0}};
    const wantsPlan="planVersion" in ((request.schema.properties??{}) as Record<string,unknown>);
    return {output:wantsPlan?plan(request.input):report(request.input),provider:"mock",model:"deterministic-fixture-v5",tokenUsage:{input:0,output:0}};
  }
}
