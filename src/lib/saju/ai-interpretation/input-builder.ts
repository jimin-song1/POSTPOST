import type { SajuAnalysis } from "@/types/saju-analysis";
import type { CategoryFortunePeriod,CategoryFortuneResult } from "@/types/category-fortune";
import type { FortuneSynthesisPeriod,FortuneSynthesisResult } from "@/types/fortune-synthesis";
import type { FortuneResult } from "@/types/fortune";
import type { InterpretationBuildOptions,InterpretationEvidence,InterpretationInput,InterpretationReportType } from "@/types/ai-interpretation";
import {LIFETIME_BOOK_V1,type LifetimeBookEvidenceGroup} from "@/rules/lifetime-report.v3";
import {buildDynamicLifetimeBook,type LifetimeEvidenceGroup} from "@/rules/lifetime-report.v4";
import {customerElement} from "@/rules/customer-terminology.v1";
import type {WellnessResult} from "@/types/wellness";
import type {ChildrenFortuneResult} from "@/types/children-fortune";

export class InterpretationInputError extends Error {
  readonly code="MISSING_REQUIRED_EVIDENCE" as const;
  constructor(message:string){super(message);this.name="InterpretationInputError";}
}
export class AnalysisNotCompletedError extends Error {readonly code="ANALYSIS_NOT_COMPLETED" as const;
  constructor(message:string){super(message);this.name="AnalysisNotCompletedError";}}
const fact=(id:string,kind:InterpretationEvidence["kind"],value:unknown):InterpretationEvidence=>({id,kind,value});
const contains=(period:{startInstant:string;endInstant:string},instant:string)=>period.startInstant<=instant&&instant<period.endInstant;
const categoryNames={WEALTH:"wealth",BUSINESS:"business",CAREER:"career",RELATIONSHIP:"relationship",STUDY:"study"} as const;

function requireCompleted(analysis:SajuAnalysis,reportType:InterpretationReportType){
  if(!analysis.dayMaster)throw new AnalysisNotCompletedError("완성된 SajuAnalysis만 해석할 수 있습니다.");
  if(analysis.strength.status!=="implemented"||analysis.structure.status!=="implemented"||analysis.usefulGods.synthesis.status!=="implemented")
    throw new InterpretationInputError("완성된 원국·강약·격국·용신 종합 결과가 필요합니다.");
  if(!("status" in analysis.fortune)||analysis.fortune.status!=="partial")throw new InterpretationInputError("완성된 운세 결과가 필요합니다.");
  const fortune=analysis.fortune as FortuneResult;
  if(fortune.synthesis.status!=="implemented"||fortune.categories.status!=="implemented")
    throw new InterpretationInputError(`${reportType} 해석에 fortune synthesis와 category 결과가 필요합니다.`);
  return{fortune,synthesis:fortune.synthesis as FortuneSynthesisResult,categories:fortune.categories as CategoryFortuneResult};
}
function addUsefulGodFacts(analysis:SajuAnalysis,evidence:InterpretationEvidence[],comprehensive=false){
  const synthesis=analysis.usefulGods.synthesis;
  if(synthesis.status!=="implemented")return;
  for(const row of synthesis.elements)evidence.push(fact(`USEFUL_GOD:SYNTHESIS:${row.element.toUpperCase()}`,"USEFUL_GOD",{
    element:row.element,score:row.score,role:row.role,confidence:row.confidence,engines:row.coverage.engines,conflictingSignals:row.conflictingSignals}));
  if(comprehensive){
    evidence.push(fact("USEFUL_GOD:EOKBU","USEFUL_GOD",analysis.usefulGods.eokbu),fact("USEFUL_GOD:JOHU","USEFUL_GOD",analysis.usefulGods.johu),
      fact("USEFUL_GOD:TONGGWAN","USEFUL_GOD",analysis.usefulGods.tonggwan),fact("USEFUL_GOD:BYEONGYAK","USEFUL_GOD",analysis.usefulGods.byeongyak),
      fact("USEFUL_GOD:STRUCTURE","USEFUL_GOD",analysis.usefulGods.structure));
  }
}
function addFortuneFacts(row:FortuneSynthesisPeriod,evidence:InterpretationEvidence[]){
  evidence.push(fact(`FORTUNE:${row.synthesisId}:FAVORABILITY`,"FORTUNE",row.favorability),
    fact(`FORTUNE:${row.synthesisId}:ACTIVATION`,"FORTUNE",row.activation),
    fact(`FORTUNE:${row.synthesisId}:ALIGNMENT`,"FORTUNE",row.transformationAlignment),
    fact(`FORTUNE:${row.synthesisId}:TEN_GOD_FLOW`,"FORTUNE",row.tenGodFlow),
    fact(`FORTUNE:${row.synthesisId}:TAGS`,"CONTEXT",row.tags));
}
function addPillarContext(row:FortuneSynthesisPeriod,fortune:FortuneResult,evidence:InterpretationEvidence[]){
  const daeun=fortune.daeun.status==="implemented"?fortune.daeun.periods.find(item=>item.index===row.context.daeunIndex):undefined;
  const seun=fortune.seun.status==="implemented"?fortune.seun.periods?.find(item=>item.year===row.context.seunYear):undefined;
  const wolun=fortune.wolun.status==="implemented"?fortune.wolun.periods?.find(item=>item.seunYear===row.context.seunYear&&
    item.period.startInstant===row.period.startInstant&&item.period.endInstant===row.period.endInstant):undefined;
  evidence.push(fact(`FORTUNE:${row.synthesisId}:PERIOD_CONTEXT`,"FORTUNE",{
    daeunIndex:row.context.daeunIndex,daeunPillar:daeun?`${daeun.pillar.stem}${daeun.pillar.branch}`:null,
    daeunAgeRange:daeun?.sourcePeriod.ageRange??null,startAgeYears:daeun?.sourcePeriod.startAgeYears??null,endAgeYears:daeun?.sourcePeriod.endAgeYears??null,
    seunYear:row.context.seunYear??null,seunPillar:seun?`${seun.pillar.stem}${seun.pillar.branch}`:null,
    wolunPillar:wolun?`${wolun.pillar.stem}${wolun.pillar.branch}`:null,period:row.period}));
}
function addCategoryFact(row:CategoryFortunePeriod,name:keyof typeof categoryNames|"COMPREHENSIVE",evidence:InterpretationEvidence[]){
  if(name==="COMPREHENSIVE")for(const key of ["overallFlow","wealth","business","career","relationship","study","change"] as const)
    evidence.push(fact(`CATEGORY:${row.synthesisId}:${key.toUpperCase()}`,"CATEGORY",row[key]));
  else {const key=categoryNames[name];evidence.push(fact(`CATEGORY:${row.synthesisId}:${key.toUpperCase()}`,"CATEGORY",row[key]));}
}
function selectCurrent(rows:FortuneSynthesisPeriod[],referenceInstant:string,label:string){
  const selected=rows.filter(row=>contains(row.period,referenceInstant));
  if(!selected.length)throw new InterpretationInputError(`${referenceInstant}에 해당하는 ${label} synthesis가 없습니다.`);
  return selected;
}
function pairRows(synthesisRows:FortuneSynthesisPeriod[],categoryRows:CategoryFortunePeriod[]){
  const map=new Map(categoryRows.map(row=>[row.synthesisId,row]));
  return synthesisRows.map(row=>{const category=map.get(row.synthesisId);if(!category)throw new InterpretationInputError(`${row.synthesisId} category가 없습니다.`);return{row,category};});
}

function idsByPrefix(evidence:InterpretationEvidence[],...prefixes:string[]){return evidence.filter(row=>prefixes.some(prefix=>row.id.startsWith(prefix))).map(row=>row.id);}
function idsByContains(evidence:InterpretationEvidence[],...tokens:string[]){return evidence.filter(row=>tokens.some(token=>row.id.includes(token))).map(row=>row.id);}
function bookPurpose(group:LifetimeEvidenceGroup){
  const purposes:Record<LifetimeEvidenceGroup,string>={
    COVER:"책의 표지와 읽는 방향만 안내한다.",INTRO:"사주를 읽는 방법과 계산/해석의 경계를 쉬운 말로 설명한다.",
    CORE:"원국의 핵심 특징을 여러 근거로 묶어 한 사람의 중심 이야기로 설명한다.",PILLARS:"년·월·일·시 각 자리의 역할과 차이를 설명한다.",
    HIDDEN_STEMS:"겉으로 바로 보이지 않는 속기운과 겉/속 차이를 설명한다.",TEN_GODS:"경쟁·표현·돈·책임·배움의 역할이 어디에 드러나는지 설명한다.",
    ELEMENTS:"다섯 기운의 실제 비율을 성적표가 아니라 자주 쓰는 힘과 덜 익숙한 힘으로 설명한다.",STRENGTH:"혼자 밀어붙이는 힘과 주변 도움을 쓰는 방식의 차이를 설명한다.",
    STRUCTURE_USEFUL:"타고난 삶의 틀과 도움이 되는 기운을 서로 다른 계산 관점까지 포함해 설명한다.",FORTUNE_EXPLAIN:"10년·1년·한 달의 시간축과 support/activity 차이를 설명한다.",
    IDENTITY:"겉과 속, 결정 전후, 장점과 부담이 어떻게 함께 나타나는지 설명한다.",WORK:"직장·사업·배움에서 책임·자율성·협업 방식이 어떻게 달라지는지 설명한다.",
    WEALTH:"돈을 벌고 쓰고 지키는 방식과 사람·기회가 얽힐 때의 패턴을 설명한다.",RELATIONSHIP:"가까운 관계의 자리, 표현 방식, 반복되는 갈등 장면을 관계 상태에 맞게 설명한다.",
    CHILDREN:"자녀 현실을 가정하지 않고 부모 역할·관계 방식·가족 역할 활성화를 설명한다.",WELLNESS:"의학 진단 없이 생활 리듬·휴식·과로·회복 습관을 설명한다.",
    NOBLE:"귀인·도움 표시가 사람·배움·직책·관계에서 어떤 모습으로 나타나는지 설명한다.",STARS_RELATIONS:"신살과 합충형파해를 사건 예언이 아닌 성향·관계·변화 문맥으로 설명한다.",
    TWELVE_STAGES:"네 자리의 12운성 에너지를 초반·중반·후반 흐름과 연결해 설명한다.",YEARLY_OVERVIEW:"요청 기준연도부터 5년을 support와 activity를 분리해 큰 흐름으로 설명한다.",
    YEAR_1:"첫 번째 해의 deterministic 세운과 분야별 흐름을 설명한다.",YEAR_2:"두 번째 해의 deterministic 세운과 분야별 흐름을 설명한다.",
    YEAR_3:"세 번째 해의 deterministic 세운과 분야별 흐름을 설명한다.",YEAR_4:"네 번째 해의 deterministic 세운과 분야별 흐름을 설명한다.",
    YEAR_5:"다섯 번째 해의 deterministic 세운과 분야별 흐름을 설명한다.",MONTHLY:"기준연도 안에서 움직임이 커지는 달을 deterministic 월운으로 설명한다.",
    CHANGE:"합·충·형·파·해·변환과 fortune activation이 만드는 움직임을 유불과 분리해 설명한다.",DAEUN_OVERVIEW:"10개 대운의 전체 순서와 현재 큰 흐름을 설명한다.",
    DAEUN_1:"첫 번째 대운을 설명한다.",DAEUN_2:"두 번째 대운을 설명한다.",DAEUN_3:"세 번째 대운을 설명한다.",DAEUN_4:"네 번째 대운을 설명한다.",DAEUN_5:"다섯 번째 대운을 설명한다.",
    DAEUN_6:"여섯 번째 대운을 설명한다.",DAEUN_7:"일곱 번째 대운을 설명한다.",DAEUN_8:"여덟 번째 대운을 설명한다.",DAEUN_9:"아홉 번째 대운을 설명한다.",DAEUN_10:"열 번째 대운을 설명한다.",
    SAMJAE:"삼재 여부, 관계 활성, 변화량과 유불을 분리해 생애 주기를 설명한다.",SYNTHESIS:"앞의 여러 장에서 반복해서 확인된 근거만 다시 묶어 평생 패턴을 설명한다.",PROFESSIONAL:"같은 계산 결과를 전문용어와 evidence로 확인한다."
  };return purposes[group];
}
function evidenceForBookGroup(group:LifetimeEvidenceGroup,evidence:InterpretationEvidence[],currentYear:number){
  const allNatal=()=>idsByPrefix(evidence,"NATAL:");
  switch(group){
    case"COVER":case"INTRO":return idsByPrefix(evidence,"NATAL:PILLARS","NATAL:VERSIONS");
    case"CORE":return idsByPrefix(evidence,"NATAL:PILLARS","NATAL:DAY_MASTER","NATAL:STRENGTH","NATAL:STRUCTURE","NATAL:TEN_GODS");
    case"PILLARS":return idsByPrefix(evidence,"NATAL:PILLARS","NATAL:TEN_GODS","NATAL:HIDDEN_STEMS","NATAL:TWELVE_STAGES");
    case"HIDDEN_STEMS":return idsByPrefix(evidence,"NATAL:HIDDEN_STEMS","NATAL:TEN_GODS");
    case"TEN_GODS":return idsByPrefix(evidence,"NATAL:TEN_GODS","NATAL:HIDDEN_STEMS","NATAL:STRUCTURE");
    case"ELEMENTS":return idsByPrefix(evidence,"NATAL:FIVE_ELEMENTS:");
    case"STRENGTH":return idsByPrefix(evidence,"NATAL:STRENGTH");
    case"STRUCTURE_USEFUL":return idsByPrefix(evidence,"NATAL:STRUCTURE","USEFUL_GOD:");
    case"FORTUNE_EXPLAIN":return idsByPrefix(evidence,"FORTUNE:DAEUN-","NATAL:VERSIONS");
    case"IDENTITY":return idsByPrefix(evidence,"NATAL:DAY_MASTER","NATAL:PILLARS","NATAL:STRENGTH","NATAL:STRUCTURE","NATAL:TEN_GODS","NATAL:RELATIONS","NATAL:FIVE_ELEMENTS:");
    case"WORK":return Array.from(new Set([...idsByPrefix(evidence,"NATAL:STRUCTURE","NATAL:TEN_GODS","NATAL:STRENGTH","NATAL:RELATIONS","USEFUL_GOD:"),...idsByContains(evidence,"CATEGORY:DAEUN-")]));
    case"WEALTH":return Array.from(new Set([...idsByPrefix(evidence,"NATAL:TEN_GODS","NATAL:PILLARS","NATAL:FIVE_ELEMENTS:","NATAL:STRUCTURE","USEFUL_GOD:"),...idsByContains(evidence,"CATEGORY:DAEUN-")]));
    case"RELATIONSHIP":return Array.from(new Set([...idsByPrefix(evidence,"CONTEXT:RELATIONSHIP_STATUS","NATAL:PILLARS","NATAL:TEN_GODS","NATAL:HIDDEN_STEMS","NATAL:RELATIONS","NATAL:STRUCTURE"),...idsByContains(evidence,"CATEGORY:DAEUN-")]));
    case"CHILDREN":return idsByPrefix(evidence,"CHILD:","CONTEXT:CHILD_REALITY_UNKNOWN");
    case"WELLNESS":return idsByPrefix(evidence,"WELLNESS:","NATAL:FIVE_ELEMENTS:");
    case"NOBLE":return idsByPrefix(evidence,"NATAL:STARS","FORTUNE:DAEUN-","FORTUNE:SEUN-");
    case"STARS_RELATIONS":return idsByPrefix(evidence,"NATAL:STARS","NATAL:RELATIONS","NATAL:SAMJAE");
    case"TWELVE_STAGES":return idsByPrefix(evidence,"NATAL:TWELVE_STAGES","NATAL:PILLARS");
    case"YEARLY_OVERVIEW":return Array.from(new Set([...idsByPrefix(evidence,"FORTUNE:SEUN-","CATEGORY:SEUN-"),...idsByContains(evidence,"REQUEST:LIFETIME_YEAR_RANGE")]));
    case"YEAR_1":case"YEAR_2":case"YEAR_3":case"YEAR_4":case"YEAR_5":{
      const offset=Number(group.slice(-1))-1,year=currentYear+offset;return idsByContains(evidence,`SEUN-${year}`);
    }
    case"MONTHLY":return idsByContains(evidence,`WOLUN-${currentYear}`);
    case"CHANGE":return idsByPrefix(evidence,"NATAL:RELATIONS","FORTUNE:DAEUN-","FORTUNE:SEUN-");
    case"DAEUN_OVERVIEW":return idsByPrefix(evidence,"FORTUNE:DAEUN-");
    case"DAEUN_1":case"DAEUN_2":case"DAEUN_3":case"DAEUN_4":case"DAEUN_5":case"DAEUN_6":case"DAEUN_7":case"DAEUN_8":case"DAEUN_9":case"DAEUN_10":{
      const index=Number(group.split("_")[1]);return idsByContains(evidence,`DAEUN-${index}`);
    }
    case"SAMJAE":return idsByPrefix(evidence,"FORTUNE:SAMJAE","NATAL:SAMJAE","NATAL:RELATIONS");
    case"SYNTHESIS":return Array.from(new Set([...allNatal(),...idsByPrefix(evidence,"USEFUL_GOD:","WELLNESS:BALANCE","CHILD:BOND","FORTUNE:DAEUN-","FORTUNE:SAMJAE")]));
    case"PROFESSIONAL":return evidence.map(row=>row.id);
  }
}
function buildLifetimeInput(analysis:SajuAnalysis,options:InterpretationBuildOptions,fortune:FortuneResult,synthesis:FortuneSynthesisResult,categories:CategoryFortuneResult):InterpretationInput{
  if(!options.relationshipStatus)throw new InterpretationInputError("LIFETIME_GENERAL report에는 relationshipStatus가 필요합니다.");
  const currentYear=Number.isInteger(options.year)?options.year as number:new Date().getUTCFullYear();
  if(analysis.wellness.status!=="implemented"||!("elements" in analysis.wellness))throw new InterpretationInputError("평생총운에는 wellness-v1 결과가 필요합니다.");
  if(analysis.childrenFortune.status!=="implemented"||!("bond" in analysis.childrenFortune))throw new InterpretationInputError("평생총운에는 children-fortune-v1 결과가 필요합니다.");
  const wellness=analysis.wellness as WellnessResult,children=analysis.childrenFortune as ChildrenFortuneResult,evidence:InterpretationEvidence[]=[],timeline:InterpretationInput["timeline"]=[];
  evidence.push(fact("NATAL:PILLARS","NATAL",analysis.pillars),fact("NATAL:DAY_MASTER","NATAL",analysis.dayMaster),fact("NATAL:TEN_GODS","NATAL",analysis.tenGods),
    fact("NATAL:HIDDEN_STEMS","NATAL",analysis.hiddenStems),fact("NATAL:TWELVE_STAGES","NATAL",analysis.twelveStages),fact("NATAL:STRENGTH:ADJUSTED","NATAL",analysis.strength.adjusted),
    fact("NATAL:STRUCTURE:PRIMARY","NATAL",analysis.structure.primary),fact("NATAL:STRUCTURE:QUALITY","NATAL",analysis.structure.qualityEvaluation),
    fact("NATAL:RELATIONS","NATAL",analysis.relations),fact("NATAL:STARS","CONTEXT",analysis.nobleAndSpecialStars),fact("NATAL:SAMJAE","CONTEXT",analysis.samjae),
    fact("NATAL:VERSIONS","CONTEXT",{schemaVersion:analysis.schemaVersion,rulesetVersion:analysis.rulesetVersion,engineVersion:analysis.engineMetadata.engineVersion}));
  if(analysis.fiveElements.adjustedStrength.elements)for(const [element,row] of Object.entries(analysis.fiveElements.adjustedStrength.elements))
    evidence.push(fact(`NATAL:FIVE_ELEMENTS:ELEMENT:${element.toUpperCase()}`,"NATAL",{element,customerLabel:customerElement(element as keyof typeof analysis.fiveElements.adjustedStrength.elements),percentage:row.percentage,adjustedScore:row.adjustedScore}));
  addUsefulGodFacts(analysis,evidence,true);
  evidence.push(fact("NATAL:STEM_PREFERENCES","NATAL",analysis.stemPreferences),fact("NATAL:BRANCH_PREFERENCES","NATAL",analysis.branchPreferences));
  evidence.push(fact("WELLNESS:BALANCE","WELLNESS",{score:wellness.constitutionalBalanceScore,disclaimer:wellness.disclaimer}),
    fact("WELLNESS:STRENGTHS","WELLNESS",wellness.strengths),fact("WELLNESS:ATTENTION_AREAS","WELLNESS",wellness.attentionAreas),fact("WELLNESS:HABITS","WELLNESS",wellness.habits));
  for(const [element,row] of Object.entries(wellness.elements))evidence.push(fact(`WELLNESS:ELEMENT:${element.toUpperCase()}`,"WELLNESS",row));
  const wellnessPeriods=[...wellness.daeunPeriods].sort((a,b)=>b.wellnessPeriodAttention-a.wellnessPeriodAttention||a.daeunIndex-b.daeunIndex).slice(0,3);
  evidence.push(fact("WELLNESS:LIFETIME_CONTEXT","WELLNESS",wellnessPeriods.map(row=>({daeunIndex:row.daeunIndex,ageRange:row.ageRange,pillar:row.pillar,attention:row.wellnessPeriodAttention,level:row.attentionLevel}))));
  evidence.push(fact("CHILD:BOND","CHILD",children.bond),fact("CHILD:COUNT_TENDENCY","CHILD",children.countTendency),fact("CHILD:GENDER_ENERGY","CHILD",children.genderEnergy),
    fact("CHILD:PARENTING_STYLE","CHILD",children.parentingStyle),fact("CHILD:STRENGTHS","CHILD",children.strengths),fact("CHILD:ATTENTION_AREAS","CHILD",children.attentionAreas));
  evidence.push(fact("CHILD:TEN_GOD_SIGNALS","CHILD",{visibleStems:analysis.tenGods.value?.heavenlyStems,hiddenStems:analysis.tenGods.value?.hiddenStems}),
    fact("CHILD:HOUR_PILLAR","CHILD",analysis.pillars.hour),fact("CHILD:HOUR_STAGE","CHILD",analysis.twelveStages.value?.stages.hour),
    fact("CHILD:RELATION_CONTEXT","CHILD",analysis.relations.evidence.filter(row=>row.positions.includes("hour"))));
  const childPeriods=[...children.daeunPeriods].sort((a,b)=>b.activationScore-a.activationScore||a.periodIndex-b.periodIndex).slice(0,3);
  evidence.push(fact("CHILD:LIFETIME_CONTEXT","CHILD",childPeriods.map(row=>({periodIndex:row.periodIndex,ageRange:row.ageRange,pillar:row.pillar,activationScore:row.activationScore,activationLevel:row.activationLevel,themes:row.themes}))));
  const relationship=LIFETIME_BOOK_V1.relationship[options.relationshipStatus];
  evidence.push(fact("CONTEXT:RELATIONSHIP_STATUS","CONTEXT",{status:options.relationshipStatus,label:relationship.label,interpretationFocus:relationship.focus,calculationEffect:false}),
    fact("CONTEXT:CHILD_REALITY_UNKNOWN","CONTEXT",{hasChildren:null,count:null,gender:null,pregnancy:null}),
    fact("REQUEST:LIFETIME_YEAR_RANGE","CONTEXT",{startYear:currentYear,endYear:currentYear+4}));
  if(fortune.samjae.status==="implemented")evidence.push(fact("FORTUNE:SAMJAE","FORTUNE",fortune.samjae));

  const daeunCategoryById=new Map(categories.daeun.map(row=>[row.synthesisId,row]));
  for(const row of synthesis.daeun){addFortuneFacts(row,evidence);addPillarContext(row,fortune,evidence);const category=daeunCategoryById.get(row.synthesisId);if(category)addCategoryFact(category,"COMPREHENSIVE",evidence);
    const ids=evidence.filter(item=>item.id.includes(row.synthesisId)).map(item=>item.id);timeline.push({id:row.synthesisId,period:row.period,evidenceIds:ids});}

  const selectedSeun=synthesis.seun.filter(row=>row.context.seunYear!=null&&row.context.seunYear>=currentYear&&row.context.seunYear<=currentYear+4);
  const seunCategoryById=new Map(categories.seun.map(row=>[row.synthesisId,row]));
  for(const row of selectedSeun){addFortuneFacts(row,evidence);addPillarContext(row,fortune,evidence);const category=seunCategoryById.get(row.synthesisId);if(category)addCategoryFact(category,"COMPREHENSIVE",evidence);
    const ids=evidence.filter(item=>item.id.includes(row.synthesisId)).map(item=>item.id);timeline.push({id:row.synthesisId,period:row.period,evidenceIds:ids});}
  evidence.push(fact("CHILD:NEAR_TERM_CONTEXT","CHILD",selectedSeun.map(row=>({year:row.context.seunYear,favorability:row.favorability.score,activation:row.activation.score,
    daeunIndex:row.context.daeunIndex,tags:row.tags}))));

  const selectedWolun=synthesis.wolun.filter(row=>row.context.seunYear===currentYear);
  const wolunCategoryById=new Map(categories.wolun.map(row=>[row.synthesisId,row]));
  for(const row of selectedWolun){addFortuneFacts(row,evidence);addPillarContext(row,fortune,evidence);const category=wolunCategoryById.get(row.synthesisId);if(category)addCategoryFact(category,"COMPREHENSIVE",evidence);
    const ids=evidence.filter(item=>item.id.includes(row.synthesisId)).map(item=>item.id);timeline.push({id:row.synthesisId,period:row.period,evidenceIds:ids});}

  const unique=Array.from(new Map(evidence.map(item=>[item.id,item])).values());
  const book=buildDynamicLifetimeBook({includeSamjae:fortune.samjae.status==="implemented",year:currentYear,relationshipStatus:options.relationshipStatus});
  const fullPlan=book.sections.map(section=>{
    const evidenceIds=Array.from(new Set(evidenceForBookGroup(section.evidenceGroup,unique,currentYear)));
    if(!evidenceIds.length)evidenceIds.push("NATAL:PILLARS");
    return{id:section.id,chapterNumber:String(section.sequence).padStart(3,"0"),title:section.title,evidenceIds,pageNumber:section.sequence,partNumber:section.partNumber,partTitle:section.partTitle,
      purpose:bookPurpose(section.evidenceGroup),evidenceGroup:section.evidenceGroup,contentKind:section.contentKind,density:section.density,topic:section.topic};
  });
  const plan=options.lifetimePartNumber?fullPlan.filter(row=>row.partNumber===options.lifetimePartNumber):fullPlan;
  if(!plan.length)throw new InterpretationInputError(`알 수 없는 lifetime part: ${options.lifetimePartNumber}`);
  const requiredIds=new Set(plan.flatMap(row=>row.evidenceIds));
  const scopedEvidence=options.lifetimePartNumber?unique.filter(row=>requiredIds.has(row.id)):unique;
  const scopedTimeline=options.lifetimePartNumber?timeline.filter(row=>row.evidenceIds.some(id=>requiredIds.has(id))):timeline;
  return{version:"lifetime-interpretation-input-v4",reportVersion:"dynamic-lifetime-book-v4",reportType:"LIFETIME_GENERAL",reportPlan:plan,evidence:scopedEvidence,timeline:scopedTimeline,
    minimalContext:{requestedYear:currentYear,relationshipStatus:options.relationshipStatus,relationshipLabel:relationship.label,relationshipFocus:relationship.focus}};
}

export function buildInterpretationInput(analysis:SajuAnalysis,options:InterpretationBuildOptions):InterpretationInput{
  const {fortune,synthesis,categories}=requireCompleted(analysis,options.reportType),evidence:InterpretationEvidence[]=[],timeline:InterpretationInput["timeline"]=[];
  if(options.reportType==="LIFETIME_GENERAL")return buildLifetimeInput(analysis,options,fortune,synthesis,categories);
  if(options.reportType==="COMPREHENSIVE"){
    evidence.push(fact("NATAL:PILLARS","NATAL",analysis.pillars),fact("NATAL:DAY_MASTER","NATAL",analysis.dayMaster),
      fact("NATAL:FIVE_ELEMENTS:ADJUSTED","NATAL",analysis.fiveElements.adjustedStrength),
      fact("NATAL:STRENGTH:ADJUSTED","NATAL",analysis.strength.adjusted),fact("NATAL:STRUCTURE:PRIMARY","NATAL",analysis.structure.primary),
      fact("NATAL:STRUCTURE:QUALITY","NATAL",analysis.structure.qualityEvaluation),fact("NATAL:STARS","CONTEXT",analysis.nobleAndSpecialStars));
    addUsefulGodFacts(analysis,evidence,true);
  } else if(options.reportType!=="YEARLY") addUsefulGodFacts(analysis,evidence);

  let pairs:Array<{row:FortuneSynthesisPeriod;category:CategoryFortunePeriod}>=[];
  if(options.reportType==="YEARLY"){
    if(!Number.isInteger(options.year))throw new InterpretationInputError("YEARLY report에는 year가 필요합니다.");
    const seun=synthesis.seun.filter(row=>row.context.seunYear===options.year),wolun=synthesis.wolun.filter(row=>row.context.seunYear===options.year);
    if(!seun.length)throw new InterpretationInputError(`${options.year}년 세운 결과가 없습니다.`);
    evidence.push(fact(`REQUEST:YEAR:${options.year}`,"CONTEXT",options.year));
    const activeDaeunIndexes=new Set(seun.map(row=>row.context.daeunIndex)),daeun=synthesis.daeun.filter(row=>activeDaeunIndexes.has(row.context.daeunIndex));
    pairs=[...pairRows(daeun,categories.daeun),...pairRows(seun,categories.seun),...pairRows(wolun,categories.wolun)];
  } else {
    if(!options.referenceInstant)throw new InterpretationInputError(`${options.reportType} report에는 referenceInstant가 필요합니다.`);
    pairs=[...pairRows(selectCurrent(synthesis.daeun,options.referenceInstant,"대운"),categories.daeun),
      ...pairRows(selectCurrent(synthesis.seun,options.referenceInstant,"세운"),categories.seun),
      ...pairRows(selectCurrent(synthesis.wolun,options.referenceInstant,"월운"),categories.wolun)];
  }
  for(const {row,category} of pairs){
    addFortuneFacts(row,evidence);addPillarContext(row,fortune,evidence);
    addCategoryFact(category,options.reportType==="YEARLY"?"COMPREHENSIVE":options.reportType,evidence);
    const ids=evidence.filter(item=>item.id.includes(row.synthesisId)).map(item=>item.id);
    timeline.push({id:row.synthesisId,period:row.period,evidenceIds:ids});
  }
  const unique=Array.from(new Map(evidence.map(item=>[item.id,item])).values());
  return{version:"interpretation-input-v1",reportType:options.reportType,evidence:unique,timeline,
    minimalContext:{...(options.reportType==="RELATIONSHIP"?{gender:analysis.person.gender}:{}),...(options.reportType==="YEARLY"?{requestedYear:options.year}: {})}};
}
