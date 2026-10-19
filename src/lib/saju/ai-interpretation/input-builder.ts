import type { SajuAnalysis } from "@/types/saju-analysis";
import type { CategoryFortunePeriod,CategoryFortuneResult } from "@/types/category-fortune";
import type { FortuneSynthesisPeriod,FortuneSynthesisResult } from "@/types/fortune-synthesis";
import type { FortuneResult } from "@/types/fortune";
import type { ChildStatus,InterpretationBuildOptions,InterpretationEvidence,InterpretationInput,InterpretationReportType } from "@/types/ai-interpretation";
import {getLifetimeReportSections,LIFETIME_REPORT_V2} from "@/rules/lifetime-report.v2";
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
function familyContext(relationshipStatus:NonNullable<InterpretationBuildOptions["relationshipStatus"]>,childStatus:ChildStatus){
  if(relationshipStatus!=="MARRIED")return LIFETIME_REPORT_V2.family.SINGLE;
  return childStatus==="HAS_CHILDREN"?LIFETIME_REPORT_V2.family.MARRIED_WITH_CHILDREN:LIFETIME_REPORT_V2.family.MARRIED_NO_CHILDREN;
}
function buildLifetimeInput(analysis:SajuAnalysis,options:InterpretationBuildOptions,fortune:FortuneResult,synthesis:FortuneSynthesisResult):InterpretationInput{
  if(!options.relationshipStatus)throw new InterpretationInputError("LIFETIME_GENERAL report에는 relationshipStatus가 필요합니다.");
  const childStatus:ChildStatus=options.relationshipStatus==="MARRIED"?(options.childStatus??"NO_CHILDREN"):"NOT_APPLICABLE";
  if(options.relationshipStatus==="MARRIED"&&childStatus==="NOT_APPLICABLE")throw new InterpretationInputError("기혼 평생총운에는 childStatus가 필요합니다.");
  if(analysis.wellness.status!=="implemented"||!("elements" in analysis.wellness))throw new InterpretationInputError("평생총운에는 wellness-v1 결과가 필요합니다.");
  if(analysis.childrenFortune.status!=="implemented"||!("bond" in analysis.childrenFortune))throw new InterpretationInputError("평생총운에는 children-fortune-v1 결과가 필요합니다.");
  const wellness=analysis.wellness as WellnessResult,children=analysis.childrenFortune as ChildrenFortuneResult,evidence:InterpretationEvidence[]=[],timeline:InterpretationInput["timeline"]=[];
  evidence.push(fact("NATAL:PILLARS","NATAL",analysis.pillars),fact("NATAL:DAY_MASTER","NATAL",analysis.dayMaster),fact("NATAL:TEN_GODS","NATAL",analysis.tenGods),
    fact("NATAL:HIDDEN_STEMS","NATAL",analysis.hiddenStems),fact("NATAL:TWELVE_STAGES","NATAL",analysis.twelveStages),fact("NATAL:STRENGTH:ADJUSTED","NATAL",analysis.strength.adjusted),
    fact("NATAL:STRUCTURE:PRIMARY","NATAL",analysis.structure.primary),fact("NATAL:STRUCTURE:QUALITY","NATAL",analysis.structure.qualityEvaluation),
    fact("NATAL:RELATIONS","NATAL",analysis.relations),fact("NATAL:STARS","CONTEXT",analysis.nobleAndSpecialStars),fact("NATAL:VERSIONS","CONTEXT",{schemaVersion:analysis.schemaVersion,rulesetVersion:analysis.rulesetVersion,engineVersion:analysis.engineMetadata.engineVersion}));
  if(analysis.fiveElements.adjustedStrength.elements)for(const [element,row] of Object.entries(analysis.fiveElements.adjustedStrength.elements))
    evidence.push(fact(`NATAL:FIVE_ELEMENTS:ELEMENT:${element.toUpperCase()}`,"NATAL",{element,customerLabel:customerElement(element as keyof typeof analysis.fiveElements.adjustedStrength.elements),percentage:row.percentage,adjustedScore:row.adjustedScore}));
  addUsefulGodFacts(analysis,evidence,true);
  evidence.push(fact("NATAL:STEM_PREFERENCES","NATAL",analysis.stemPreferences),fact("NATAL:BRANCH_PREFERENCES","NATAL",analysis.branchPreferences));
  evidence.push(fact("WELLNESS:BALANCE","WELLNESS",{score:wellness.constitutionalBalanceScore,disclaimer:wellness.disclaimer}),
    fact("WELLNESS:STRENGTHS","WELLNESS",wellness.strengths),fact("WELLNESS:ATTENTION_AREAS","WELLNESS",wellness.attentionAreas),fact("WELLNESS:HABITS","WELLNESS",wellness.habits));
  for(const [element,row] of Object.entries(wellness.elements))evidence.push(fact(`WELLNESS:ELEMENT:${element.toUpperCase()}`,"WELLNESS",row));
  const wellnessPeriods=[...wellness.daeunPeriods].sort((a,b)=>b.wellnessPeriodAttention-a.wellnessPeriodAttention||a.daeunIndex-b.daeunIndex).slice(0,LIFETIME_REPORT_V2.selectedContextPeriods);
  evidence.push(fact("WELLNESS:LIFETIME_CONTEXT","WELLNESS",wellnessPeriods.map(row=>({daeunIndex:row.daeunIndex,ageRange:row.ageRange,pillar:row.pillar,attention:row.wellnessPeriodAttention,level:row.attentionLevel}))));
  if(options.relationshipStatus==="MARRIED"){
    evidence.push(fact("CHILD:BOND","CHILD",children.bond),fact("CHILD:PARENTING_STYLE","CHILD",children.parentingStyle),fact("CHILD:STRENGTHS","CHILD",children.strengths),fact("CHILD:ATTENTION_AREAS","CHILD",children.attentionAreas));
    const childPeriods=[...children.daeunPeriods].sort((a,b)=>b.activationScore-a.activationScore||a.periodIndex-b.periodIndex).slice(0,LIFETIME_REPORT_V2.selectedContextPeriods);
    evidence.push(fact("CHILD:LIFETIME_CONTEXT","CHILD",childPeriods.map(row=>({periodIndex:row.periodIndex,ageRange:row.ageRange,pillar:row.pillar,activationScore:row.activationScore,activationLevel:row.activationLevel,themes:row.themes}))));
  }
  const relationship=LIFETIME_REPORT_V2.relationship[options.relationshipStatus];
  const family=familyContext(options.relationshipStatus,childStatus);
  evidence.push(fact("CONTEXT:RELATIONSHIP_STATUS","CONTEXT",{status:options.relationshipStatus,label:relationship.label,interpretationFocus:relationship.focus,calculationEffect:false}),
    fact("CONTEXT:FAMILY_STATUS","CONTEXT",{childStatus,sectionTitle:family.title,interpretationFocus:family.focus,calculationEffect:false}));
  if(fortune.seun.status==="implemented")evidence.push(fact("FORTUNE:SEUN:PERIODS","FORTUNE",fortune.seun.periods));
  if(fortune.wolun.status==="implemented")evidence.push(fact("FORTUNE:WOLUN:PERIODS","FORTUNE",fortune.wolun.periods));
  for(const row of synthesis.daeun){addFortuneFacts(row,evidence);addPillarContext(row,fortune,evidence);const ids=evidence.filter(item=>item.id.includes(row.synthesisId)).map(item=>item.id);timeline.push({id:row.synthesisId,period:row.period,evidenceIds:ids});}
  const starResult=analysis.nobleAndSpecialStars.status==="implemented"&&"nobleStars" in analysis.nobleAndSpecialStars?analysis.nobleAndSpecialStars:null;
  const starLabels=starResult?[...starResult.nobleStars,...starResult.peachBlossom,...starResult.travelHorse,...starResult.flowerCanopy].map(row=>row.label).slice(0,2):[];
  const seun=fortune.seun.status==="implemented"?fortune.seun.periods?.[0]:undefined,wolun=fortune.wolun.status==="implemented"?fortune.wolun.periods?.[0]:undefined;
  const daeun=fortune.daeun.status==="implemented"?fortune.daeun.periods:[];
  const plan=getLifetimeReportSections(options.relationshipStatus,childStatus).map(section=>{let evidenceIds:string[]=[];let title=section.title;switch(section.id){
    case"prologue":evidenceIds=idsByPrefix(evidence,"NATAL:PILLARS","NATAL:DAY_MASTER","NATAL:STRENGTH","NATAL:STRUCTURE");break;
    case"personality":evidenceIds=idsByPrefix(evidence,"NATAL:TEN_GODS","NATAL:STRENGTH","NATAL:FIVE_ELEMENTS");break;
    case"career-study":case"workplace":case"business":case"wealth":evidenceIds=idsByPrefix(evidence,"NATAL:TEN_GODS","NATAL:STRUCTURE","USEFUL_GOD:SYNTHESIS","FORTUNE:");break;
    case"love-marriage":evidenceIds=idsByPrefix(evidence,"CONTEXT:RELATIONSHIP_STATUS","NATAL:TEN_GODS","NATAL:RELATIONS","FORTUNE:");break;
    case"family":evidenceIds=idsByPrefix(evidence,"CONTEXT:FAMILY_STATUS","NATAL:RELATIONS",...(options.relationshipStatus==="MARRIED"?["CHILD:"]:[]));break;
    case"benefactor":evidenceIds=idsByPrefix(evidence,"NATAL:STARS","USEFUL_GOD:");break;
    case"health":evidenceIds=idsByPrefix(evidence,"WELLNESS:");break;
    case"deep-reading":evidenceIds=idsByPrefix(evidence,"NATAL:","USEFUL_GOD:");break;
    case"special":evidenceIds=idsByPrefix(evidence,"NATAL:STARS","NATAL:RELATIONS","FORTUNE:");title=`신살·삼재 · ${starLabels.join("·")||"명식의 보조 지표"}`;break;
    case"yearly":evidenceIds=idsByPrefix(evidence,"FORTUNE:");title=`연운 · ${seun?`${seun.year}년 ${seun.pillar.stem}${seun.pillar.branch}`:"계산된 해의 흐름"}${wolun?` · 월운 ${wolun.pillar.stem}${wolun.pillar.branch}`:""}`;break;
    case"daeun":evidenceIds=idsByPrefix(evidence,"FORTUNE:DAEUN-");title=`평생 대운 · ${daeun.length?`${daeun[0].sourcePeriod.ageRange}~${daeun.at(-1)!.sourcePeriod.ageRange}`:"10년 흐름"}`;break;
    case"epilogue":evidenceIds=idsByPrefix(evidence,"NATAL:STRENGTH","NATAL:STRUCTURE","USEFUL_GOD:SYNTHESIS","WELLNESS:BALANCE");break;}
    return{...section,title,evidenceIds:Array.from(new Set(evidenceIds))};});
  return{version:LIFETIME_REPORT_V2.inputVersion,reportVersion:LIFETIME_REPORT_V2.reportVersion,reportType:"LIFETIME_GENERAL",reportPlan:plan,evidence,timeline,
    minimalContext:{relationshipStatus:options.relationshipStatus,relationshipLabel:relationship.label,relationshipFocus:relationship.focus,childStatus,familyFocus:family.focus}};
}

export function buildInterpretationInput(analysis:SajuAnalysis,options:InterpretationBuildOptions):InterpretationInput{
  const {fortune,synthesis,categories}=requireCompleted(analysis,options.reportType),evidence:InterpretationEvidence[]=[],timeline:InterpretationInput["timeline"]=[];
  if(options.reportType==="LIFETIME_GENERAL")return buildLifetimeInput(analysis,options,fortune,synthesis);
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
