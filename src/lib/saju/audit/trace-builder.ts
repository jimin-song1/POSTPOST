import { buildInterpretationInput } from "@/lib/saju/ai-interpretation/input-builder";
import { reconstructAnalysis } from "./reconstruction";
import type { RelationshipStatus } from "@/types/ai-interpretation";
import type { CalibrationTrace, CaseAssessment, ExternalComparison, ReconstructionCheck, TraceContribution, TraceStep } from "@/types/calibration-trace";
import type { FortuneResult } from "@/types/fortune";
import type { SajuAnalysis } from "@/types/saju-analysis";

export interface TraceBuildOptions {
  caseId: string;
  synthetic?: boolean;
  includeSensitiveInput?: boolean;
  relationshipStatus?: RelationshipStatus;
  assessments?: CaseAssessment[];
  externalComparisons?: ExternalComparison[];
}

const versionEntries = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([key, row]) => /version$/i.test(key) && typeof row === "string")
    .map(([key, row]) => `${key}:${row}`);
};
const evidenceIds = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return [];
  const rows: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { for (const item of node) visit(item); return; }
    if (!node || typeof node !== "object") return;
    const object = node as Record<string, unknown>;
    for (const key of ["id", "evidenceId", "relationId", "sourceContributionId", "snapshotId", "synthesisId", "categoryId"])
      if (typeof object[key] === "string") rows.push(object[key] as string);
    if (Array.isArray(object.evidenceIds)) rows.push(...object.evidenceIds.filter((row): row is string => typeof row === "string"));
    for (const child of Object.values(object)) if (typeof child === "object") visit(child);
  };
  visit(value);
  return Array.from(new Set(rows));
};
const contributions = (value: unknown): TraceContribution[] => {
  const rows = new Map<string,TraceContribution>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { for (const item of node) visit(item); return; }
    if (!node || typeof node !== "object") return;
    const object = node as Record<string, unknown>;
    const factor = typeof object.factor === "string" ? object.factor : typeof object.sourceType === "string" ? object.sourceType : null;
    if (factor) {
      const amount=typeof object.contribution==="number"?object.contribution:typeof object.scoreDelta==="number"?object.scoreDelta:typeof object.delta==="number"?object.delta:typeof object.actualAmount==="number"?object.actualAmount:typeof object.finalContribution==="number"?object.finalContribution:null;
      const coefficient=typeof object.weight==="number"?object.weight:typeof object.seasonalMultiplier==="number"?object.seasonalMultiplier:typeof object.transferRatio==="number"?object.transferRatio:null;
      const id=String(object.id??object.evidenceId??object.relationId??`${factor}:${amount}:${coefficient}`),key=`${id}|${factor}|${amount}|${coefficient}`;
      if(!rows.has(key))rows.set(key,{id,factor,amount,coefficient,source:{id:object.id??object.evidenceId??object.relationId??null}});
    }
    for (const child of Object.values(object)) if (child !== node && typeof child === "object") visit(child);
  };
  visit(value);
  return Array.from(rows.values());
};
const statusOf = (value: unknown) => value && typeof value === "object" && typeof (value as Record<string, unknown>).status === "string" ? String((value as Record<string, unknown>).status) : "implemented";
const step = (index: number, id: string, title: string, input: unknown, output: unknown, checks: ReconstructionCheck[] = [], appliedRules: string[] = []): TraceStep => {
  const tracedContributions=contributions(output),ids=evidenceIds(output),versions=versionEntries(output);
  return { index,id,title,status:statusOf(output),ruleVersions:versions,configVersions:versions.filter((row)=>/config|weight|matrix|threshold/i.test(row)),
    input,appliedRules:appliedRules.length?appliedRules:versions,coefficients:tracedContributions.filter((row)=>row.coefficient!==null).map(({id:rowId,factor,coefficient})=>({id:rowId,factor,coefficient})),
    intermediateValues:{contributionCount:tracedContributions.length,evidenceCount:ids.length},contributions:tracedContributions,evidenceIds:ids,output,reconstructionChecks:checks };
};
const checksFor = (all: ReconstructionCheck[], ...prefixes: string[]) => all.filter((row) => prefixes.some((prefix) => row.id.startsWith(prefix)));
const pick=(value:unknown,keys:string[])=>{const object=value as Record<string,unknown>;return Object.fromEntries(keys.filter((key)=>key in object).map((key)=>[key,object[key]]));};
const compactActivationModule=(value:unknown)=>{const object=value as Record<string,unknown>,periods=Array.isArray(object.periods)?object.periods:[];return{...pick(object,["status","ruleVersion","evidence"]),periodCount:periods.length,periods:periods.map((row)=>pick(row,["index","year","seunYear","indexInSeun","solarMonthBranch","sourcePeriod","period","pillar","activeDaeunIndex","activeDaeunPillar","daeunSegments","preference","activation","samjaeActivation","samjaeContext","evidence"]))};};
const compactTransformation=(value:unknown)=>{const object=value as Record<string,unknown>,compactSnapshots=(rows:unknown)=>Array.isArray(rows)?rows.map((row)=>{const snapshot=row as Record<string,unknown>;return{...pick(snapshot,["snapshotId","context","combinedProfile","layerProfiles","evidence"]),transferCount:Array.isArray(snapshot.transfers)?snapshot.transfers.length:0,evaluationCount:Array.isArray(snapshot.evaluations)?snapshot.evaluations.length:0,transferTotals:Array.isArray(snapshot.transfers)?snapshot.transfers.reduce((sum:number,item:unknown)=>sum+Number((item as Record<string,unknown>).actualAmount??0),0):0};}):[];return{...pick(object,["status","ruleVersion","profileRuleVersion","transferRuleVersion","evidence"]),daeunSnapshots:compactSnapshots(object.daeunSnapshots),seunSnapshots:compactSnapshots(object.seunSnapshots),wolunSnapshots:compactSnapshots(object.wolunSnapshots)};};
const compactSynthesis=(value:unknown)=>{const object=value as Record<string,unknown>,compactRows=(rows:unknown)=>Array.isArray(rows)?rows.map((row)=>pick(row,["synthesisId","period","context","layers","layerWeights","favorability","activation","transformationAlignment","tenGodFlow","tags","topInteractions","evidence"])):[];return{...pick(object,["status","ruleVersion","layerWeightVersion","transformationAlignmentVersion","periodSummaryVersion","evidence"]),daeun:compactRows(object.daeun),seun:compactRows(object.seun),wolun:compactRows(object.wolun),seunPeriodSummaries:object.seunPeriodSummaries,wolunPeriodSummaries:object.wolunPeriodSummaries};};
const compactCategories=(value:unknown)=>{const object=value as Record<string,unknown>,axis=(row:unknown)=>pick(row,["supportScore","supportLevel","activityScore","activityLevel"]),compactRows=(rows:unknown)=>Array.isArray(rows)?rows.map((value)=>{const row=value as Record<string,unknown>,wealth=row.wealth as Record<string,unknown>;return{...pick(row,["categoryId","synthesisId","period","tags","context","evidence"]),overallFlow:axis(row.overallFlow),wealth:{...axis(wealth),incomeOpportunity:pick(wealth.incomeOpportunity,["score","level"]),businessRevenue:pick(wealth.businessRevenue,["score","level"]),stableCashflow:pick(wealth.stableCashflow,["score","level"]),expensePressure:pick(wealth.expensePressure,["score","level"]),expansionInvestment:pick(wealth.expansionInvestment,["score","level"]),assetAccumulation:pick(wealth.assetAccumulation,["score","level"])},business:axis(row.business),career:axis(row.career),relationship:axis(row.relationship),study:axis(row.study),change:axis(row.change)};}):[];return{...pick(object,["status","ruleVersion","scoreVersion","flowMatrixVersion","wealthVersion","relationshipVersion","evidence"]),daeun:compactRows(object.daeun),seun:compactRows(object.seun),wolun:compactRows(object.wolun),seunPeriodSummaries:object.seunPeriodSummaries,wolunPeriodSummaries:object.wolunPeriodSummaries};};

export function buildCalibrationTrace(analysis: SajuAnalysis, options: TraceBuildOptions): CalibrationTrace {
  const reconstruction = reconstructAnalysis(analysis), fortune = analysis.fortune as FortuneResult;
  const safeBirthInput = options.includeSensitiveInput ? analysis.birthInput : { ...analysis.birthInput, name: "[REDACTED]", birthDate: "[REDACTED]", birthTime: "[REDACTED]", birthCity: analysis.birthInput.birthCity ? "[REDACTED]" : null };
  const interpretation = buildInterpretationInput(analysis, { reportType: "LIFETIME_GENERAL", relationshipStatus: options.relationshipStatus ?? "SINGLE" });
  const steps: TraceStep[] = [
    step(1,"INPUT_NORMALIZATION","입력 normalization",safeBirthInput,{birthInput:safeBirthInput,birthPlace:analysis.birthNormalized.birthPlace},[],[analysis.rulesetVersion]),
    step(2,"LEGAL_BIRTH_DATETIME","legal birth datetime",safeBirthInput,analysis.birthNormalized.legalDateTime),
    step(3,"ABSOLUTE_BIRTH_INSTANT","absoluteBirthInstant",analysis.birthNormalized.legalDateTime,analysis.birthNormalized.absoluteBirthInstant),
    step(4,"KOREAN_NATURAL_TIME","Korean natural time",analysis.birthNormalized.legalDateTime,{adjustedDateTime:analysis.birthNormalized.adjustedDateTime,offsetMinutes:analysis.birthNormalized.offsetMinutes,timezone:analysis.birthNormalized.timezone},[],[analysis.rulesetVersion]),
    step(5,"YEAR_PILLAR","year pillar",analysis.birthNormalized,analysis.pillars.year),
    step(6,"MONTH_PILLAR","month pillar",{instant:analysis.birthNormalized.absoluteBirthInstant,solarTerms:analysis.solarTerms},analysis.pillars.month),
    step(7,"DAY_PILLAR","day pillar",analysis.birthNormalized.adjustedDateTime,analysis.pillars.day),
    step(8,"HOUR_PILLAR","hour pillar",{adjustedDateTime:analysis.birthNormalized.adjustedDateTime,dayStem:analysis.pillars.day.stem},analysis.pillars.hour),
    step(9,"HIDDEN_STEMS","hidden stems",analysis.pillars,analysis.hiddenStems),
    step(10,"TEN_GODS","ten gods",{dayMaster:analysis.dayMaster,pillars:analysis.pillars,hiddenStems:analysis.hiddenStems},analysis.tenGods),
    step(11,"TWELVE_STAGES","twelve stages",{dayMaster:analysis.dayMaster,pillars:analysis.pillars},analysis.twelveStages),
    step(12,"NATIVE_FIVE_ELEMENTS","native five elements",{pillars:analysis.pillars,hiddenStems:analysis.hiddenStems},{rawCount:analysis.fiveElements.rawCount,nativeStrength:analysis.fiveElements.nativeStrength,evidence:analysis.fiveElements.evidence},checksFor(reconstruction,"ELEMENT:NATIVE")),
    step(13,"SEASON_ADJUSTMENT","season adjustment",analysis.fiveElements.evidence,analysis.fiveElements.evidence.map(({id,element,seasonalState,seasonalMultiplier,baseContribution,finalContribution})=>({id,element,seasonalState,seasonalMultiplier,baseContribution,finalContribution}))),
    step(14,"RELATIONS","relations",analysis.pillars,{...analysis.relations,transformation:undefined}),
    step(15,"TRANSFORMATION","transformation",{relations:analysis.relations.evidence,nativeStrength:analysis.fiveElements.nativeStrength},analysis.relations.transformation),
    step(16,"ADJUSTED_FIVE_ELEMENTS","adjusted five elements",{nativeStrength:analysis.fiveElements.nativeStrength,transformation:analysis.relations.transformation},analysis.fiveElements.adjustedStrength,checksFor(reconstruction,"ELEMENT:ADJUSTED","ELEMENT:CONSERVATION")),
    step(17,"ROOT_DAMAGE","root damage",{rooting:analysis.strength.rooting,relations:analysis.relations},analysis.strength.adjustments),
    step(18,"STRENGTH","strength",{pillars:analysis.pillars,fiveElements:analysis.fiveElements.nativeStrength},analysis.strength,checksFor(reconstruction,"STRENGTH:")),
    step(19,"STRUCTURE","structure",{monthHiddenStems:analysis.hiddenStems,tenGods:analysis.tenGods},{primary:analysis.structure.primary,secondary:analysis.structure.secondary,exposures:analysis.structure.exposures,evidence:analysis.structure.evidence}),
    step(20,"STRUCTURE_QUALITY","structure quality",analysis.structure.primary,analysis.structure.qualityEvaluation,checksFor(reconstruction,"STRUCTURE:")),
    step(21,"SPECIAL_STRUCTURE","special structure",{structure:analysis.structure.primary,strength:analysis.strength.adjusted},analysis.structure.specialStructure),
    step(22,"ADJUSTED_DAY_MASTER_STRENGTH","adjusted day-master strength",{strength:analysis.strength.score,rootDamage:analysis.strength.adjustments,adjustedElements:analysis.fiveElements.adjustedStrength},analysis.strength.adjusted),
    step(23,"EOKBU","eokbu",{strength:analysis.strength.adjusted,specialStructure:analysis.structure.specialStructure},analysis.usefulGods.eokbu),
    step(24,"JOHU","johu",{pillars:analysis.pillars,adjustedElements:analysis.fiveElements.adjustedStrength},analysis.usefulGods.johu),
    step(25,"TONGGWAN","tonggwan",{adjustedElements:analysis.fiveElements.adjustedStrength,relations:analysis.relations},analysis.usefulGods.tonggwan),
    step(26,"BYEONGYAK","byeongyak",{structure:analysis.structure,relations:analysis.relations,tonggwan:analysis.usefulGods.tonggwan},analysis.usefulGods.byeongyak),
    step(27,"STRUCTURE_USEFUL_GOD","structure useful god",analysis.structure,analysis.usefulGods.structure),
    step(28,"USEFUL_GOD_SYNTHESIS","useful-god synthesis",{eokbu:analysis.usefulGods.eokbu,johu:analysis.usefulGods.johu,tonggwan:analysis.usefulGods.tonggwan,byeongyak:analysis.usefulGods.byeongyak,structure:analysis.usefulGods.structure},analysis.usefulGods.synthesis,checksFor(reconstruction,"USEFUL:")),
    step(29,"STEM_PREFERENCES","stem preferences",analysis.usefulGods.synthesis,analysis.stemPreferences),
    step(30,"BRANCH_PREFERENCES","branch preferences",analysis.stemPreferences,analysis.branchPreferences),
    step(31,"STARS","stars",{pillars:analysis.pillars,relations:analysis.relations},analysis.nobleAndSpecialStars),
    step(32,"DAEUN_GENERATION","daeun generation",{gender:analysis.person.gender,yearPillar:analysis.pillars.year,monthPillar:analysis.pillars.month,solarTerms:analysis.solarTerms},analysis.daeun),
    step(33,"DAEUN_ACTIVATION","daeun activation",{daeun:analysis.daeun,stemPreferences:analysis.stemPreferences,branchPreferences:analysis.branchPreferences},compactActivationModule(fortune.daeun)),
    step(34,"SEUN","seun",{daeunPeriodIds:fortune.daeun.status==="implemented"?fortune.daeun.periods.map((row)=>row.index):[]},compactActivationModule(fortune.seun)),
    step(35,"WOLUN","wolun",{seunYears:fortune.seun.status==="implemented"?fortune.seun.periods?.map((row)=>row.year):[]},compactActivationModule(fortune.wolun)),
    step(36,"FORTUNE_TRANSFORMATION","fortune transformation",{daeunCount:fortune.daeun.status==="implemented"?fortune.daeun.periods.length:0,seunCount:fortune.seun.status==="implemented"?fortune.seun.periods?.length:0,wolunCount:fortune.wolun.status==="implemented"?fortune.wolun.periods?.length:0},compactTransformation(fortune.transformation)),
    step(37,"FORTUNE_SYNTHESIS","fortune synthesis",{transformationSnapshotIds:fortune.transformation.status==="implemented"?[...fortune.transformation.daeunSnapshots,...fortune.transformation.seunSnapshots,...fortune.transformation.wolunSnapshots].map((row)=>row.snapshotId):[],usefulGodScores:analysis.usefulGods.synthesis.status==="implemented"?analysis.usefulGods.synthesis.elements.map((row)=>({element:row.element,score:row.score})):[]},compactSynthesis(fortune.synthesis),checksFor(reconstruction,"FORTUNE:")),
    step(38,"CATEGORY_FORTUNE","category fortune",{synthesisIds:fortune.synthesis.status==="implemented"?[...fortune.synthesis.daeun,...fortune.synthesis.seun,...fortune.synthesis.wolun].map((row)=>row.synthesisId):[]},compactCategories(fortune.categories),checksFor(reconstruction,"CATEGORY:")),
    step(39,"WELLNESS","wellness",{adjustedElements:analysis.fiveElements.adjustedStrength.elements,usefulGodHighest:analysis.usefulGods.synthesis.status==="implemented"?analysis.usefulGods.synthesis.highestElement:null,daeunCount:analysis.daeun.periods.length},analysis.wellness,checksFor(reconstruction,"WELLNESS:")),
    step(40,"CHILDREN_FORTUNE","children fortune",{dayMaster:analysis.dayMaster,hourPillar:analysis.pillars.hour,daeunCount:analysis.daeun.periods.length},analysis.childrenFortune,checksFor(reconstruction,"CHILD:")),
    step(41,"LIFETIME_GENERAL_INPUT","LIFETIME_GENERAL interpretation input",{relationshipStatus:options.relationshipStatus??"SINGLE",analysisHashScope:"deterministic analysis"},interpretation),
  ];
  return { schemaVersion:"calibration-trace-v1",caseId:options.caseId,synthetic:Boolean(options.synthetic),engineVersion:analysis.engineMetadata.engineVersion,
    analysisSchemaVersion:analysis.schemaVersion,privacy:{sensitiveInputIncluded:Boolean(options.includeSensitiveInput),repositorySafe:Boolean(options.synthetic)&&!options.includeSensitiveInput},
    steps,reconstruction,assessments:options.assessments??[],externalComparisons:(options.externalComparisons??[]).map((row)=>({...row,automaticErrorConclusion:false})) };
}

export function stableTraceJson(trace: CalibrationTrace) {
  const sort = (value: unknown): unknown => Array.isArray(value) ? value.map(sort) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,row])=>[key,sort(row)])) : value;
  return JSON.stringify(sort(trace)) + "\n";
}
