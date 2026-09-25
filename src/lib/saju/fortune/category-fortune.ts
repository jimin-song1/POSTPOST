import { CATEGORY_FORTUNE_V1 as RULE,type FlowMatrix } from "@/rules/category-fortune.v1";
import type { TenGodCategory } from "@/rules/structure-useful-god.v1";
import type { CategoryAxis,CategoryFortunePeriod,CategoryFortuneResult,CategoryPeriodSummary,FlowCalculation,
  ScoreEvidence,SupportMetric } from "@/types/category-fortune";
import type { FortunePeriodSummary,FortuneSynthesisPeriod,FortuneSynthesisResult } from "@/types/fortune-synthesis";
import type { SajuInput } from "@/types/saju-input";

const categories:TenGodCategory[]=["companion","resource","output","wealth","officer"],clamp=(value:number)=>Math.max(0,Math.min(100,value));
export const categorySupportLevel=(score:number)=>score>=80?"VERY_SUPPORTIVE" as const:score>=70?"SUPPORTIVE" as const:
  score>=60?"MODERATELY_SUPPORTIVE" as const:score>=45?"MIXED" as const:score>=35?"LOW_SUPPORT" as const:"PRESSURED" as const;
export const categoryActivityLevel=(score:number)=>score>=50?"VERY_HIGH" as const:score>=30?"HIGH" as const:score>=15?"MODERATE" as const:"LOW" as const;
export const categoryPressureLevel=(score:number)=>score>=75?"VERY_HIGH" as const:score>=50?"HIGH" as const:score>=25?"MODERATE" as const:"LOW" as const;
export function calculateFlow(flow:Record<TenGodCategory,number>,matrix:FlowMatrix):FlowCalculation{const signedFlow=categories.reduce((sum,key)=>sum+flow[key]*matrix[key],0),
  flowActivityScore=categories.reduce((sum,key)=>sum+flow[key]*Math.abs(matrix[key]),0);
  return{signedFlow,flowQualityScore:clamp(50+signedFlow/2),flowActivityScore:clamp(flowActivityScore)};}
const evidence=(factor:string,value:number,weight:number):ScoreEvidence=>({factor,value,weight,contribution:value*weight});
export const categorySupportScore=(favorability:number,alignment:number,flowQuality:number)=>clamp(
  favorability*RULE.weights.categorySupport.favorability+alignment*RULE.weights.categorySupport.alignment+flowQuality*RULE.weights.categorySupport.flowQuality);
export const categoryActivityScore=(activation:number,flowActivity:number)=>clamp(
  activation*RULE.weights.categoryActivity.activation+flowActivity*RULE.weights.categoryActivity.flowActivity);
const genericSupport=(row:FortuneSynthesisPeriod,flow:FlowCalculation):SupportMetric=>{const rows=[evidence("FAVORABILITY",row.favorability.score,RULE.weights.categorySupport.favorability),
  evidence("TRANSFORMATION_ALIGNMENT",row.transformationAlignment.adjustedScore,RULE.weights.categorySupport.alignment),
  evidence("TEN_GOD_FLOW_QUALITY",flow.flowQualityScore,RULE.weights.categorySupport.flowQuality)],score=clamp(rows.reduce((sum,item)=>sum+item.contribution,0));
  return{semanticType:"SUPPORT",score,level:categorySupportLevel(score),...flow,evidence:rows};};
const activity=(activation:number,flowActivityScore:number)=>{const rows=[evidence("ACTIVATION",activation,RULE.weights.categoryActivity.activation),
  evidence("TEN_GOD_FLOW_ACTIVITY",flowActivityScore,RULE.weights.categoryActivity.flowActivity)],score=clamp(rows.reduce((sum,item)=>sum+item.contribution,0));
  return{score,level:categoryActivityLevel(score),evidence:rows};};
const axis=(row:FortuneSynthesisPeriod,matrix:FlowMatrix):CategoryAxis=>{const flow=calculateFlow(row.tenGodFlow,matrix),support=genericSupport(row,flow),active=activity(row.activation.score,flow.flowActivityScore);
  return{supportScore:support.score,supportLevel:support.level,activityScore:active.score,activityLevel:active.level,flow,
    supportEvidence:support.evidence,activityEvidence:active.evidence};};
const weighted=(rows:Array<{score:number;weight:number}>)=>clamp(rows.reduce((sum,item)=>sum+item.score*item.weight,0));
function neutralAxis(row:FortuneSynthesisPeriod,kind:"overall"|"change"):CategoryAxis{const weights=kind==="overall"?RULE.weights.overallSupport:RULE.weights.changeSupport,
  supportEvidence=[evidence("FAVORABILITY",row.favorability.score,weights.favorability),evidence("TRANSFORMATION_ALIGNMENT",
    row.transformationAlignment.adjustedScore,weights.alignment)],supportScore=weighted(supportEvidence.map(item=>({score:item.value,weight:item.weight})));
  return{supportScore,supportLevel:categorySupportLevel(supportScore),activityScore:row.activation.score,activityLevel:categoryActivityLevel(row.activation.score),
    flow:{signedFlow:0,flowQualityScore:50,flowActivityScore:0},supportEvidence,
    activityEvidence:[evidence("ACTIVATION",row.activation.score,1)]};}

export function evaluateCategorySnapshot(row:FortuneSynthesisPeriod,gender:SajuInput["gender"]|undefined,structureType:string|null,usefulGodHighestElement:string|null):CategoryFortunePeriod{
  const flow=(name:keyof Pick<typeof RULE.matrices,"incomeOpportunity"|"businessRevenue"|"stableCashflow"|"assetAccumulation">)=>calculateFlow(row.tenGodFlow,RULE.matrices[name]),
    incomeOpportunity=genericSupport(row,flow("incomeOpportunity")),businessRevenue=genericSupport(row,flow("businessRevenue")),
    stableCashflow=genericSupport(row,flow("stableCashflow")),assetAccumulation=genericSupport(row,flow("assetAccumulation")),
    wealthParts=[{score:incomeOpportunity.score,weight:RULE.weights.wealthAggregate.incomeOpportunity},
      {score:businessRevenue.score,weight:RULE.weights.wealthAggregate.businessRevenue},{score:stableCashflow.score,weight:RULE.weights.wealthAggregate.stableCashflow},
      {score:assetAccumulation.score,weight:RULE.weights.wealthAggregate.assetAccumulation}],wealthSupport=weighted(wealthParts),
    wealthFlowActivity=weighted([{score:incomeOpportunity.flowActivityScore,weight:RULE.weights.wealthAggregate.incomeOpportunity},
      {score:businessRevenue.flowActivityScore,weight:RULE.weights.wealthAggregate.businessRevenue},{score:stableCashflow.flowActivityScore,weight:RULE.weights.wealthAggregate.stableCashflow},
      {score:assetAccumulation.flowActivityScore,weight:RULE.weights.wealthAggregate.assetAccumulation}]),wealthActive=activity(row.activation.score,wealthFlowActivity),
    pressureFlow=calculateFlow(row.tenGodFlow,RULE.matrices.expensePressure),pressureEvidence=[
      evidence("ACTIVATION",row.activation.score,RULE.weights.expensePressure.activation),evidence("FLOW_PRESSURE",pressureFlow.flowQualityScore,RULE.weights.expensePressure.flowPressure),
      evidence("INVERSE_FAVORABILITY",100-row.favorability.score,RULE.weights.expensePressure.inverseFavorability),
      evidence("INVERSE_ALIGNMENT",100-row.transformationAlignment.adjustedScore,RULE.weights.expensePressure.inverseAlignment)],
    pressureScore=clamp(pressureEvidence.reduce((sum,item)=>sum+item.contribution,0)),expansionFlow=calculateFlow(row.tenGodFlow,RULE.matrices.expansionInvestment),
    expansionEvidence=[evidence("ACTIVATION",row.activation.score,RULE.weights.expansionInvestment.activation),
      evidence("EXPANSION_FLOW_ACTIVITY",expansionFlow.flowActivityScore,RULE.weights.expansionInvestment.flowActivity)],
    expansionScore=clamp(expansionEvidence.reduce((sum,item)=>sum+item.contribution,0));
  const relationshipKey=gender??"generic",relationshipMatrices=RULE.matrices.relationship[relationshipKey],opportunity=genericSupport(row,calculateFlow(row.tenGodFlow,relationshipMatrices.opportunity)),
    stability=genericSupport(row,calculateFlow(row.tenGodFlow,relationshipMatrices.stability)),formalizationSupport=genericSupport(row,calculateFlow(row.tenGodFlow,relationshipMatrices.formalizationSupport)),
    relationParts=[{score:opportunity.score,weight:RULE.weights.relationshipAggregate.opportunity},{score:stability.score,weight:RULE.weights.relationshipAggregate.stability},
      {score:formalizationSupport.score,weight:RULE.weights.relationshipAggregate.formalizationSupport}],relationshipSupport=weighted(relationParts),
    relationshipFlowActivity=weighted([{score:opportunity.flowActivityScore,weight:RULE.weights.relationshipAggregate.opportunity},
      {score:stability.flowActivityScore,weight:RULE.weights.relationshipAggregate.stability},{score:formalizationSupport.flowActivityScore,weight:RULE.weights.relationshipAggregate.formalizationSupport}]),
    relationshipActive=activity(row.activation.score,relationshipFlowActivity),business=axis(row,RULE.matrices.business),career=axis(row,RULE.matrices.career),study=axis(row,RULE.matrices.study);
  return{categoryId:`CATEGORY:${row.synthesisId}`,synthesisId:row.synthesisId,period:row.period,overallFlow:neutralAxis(row,"overall"),
    wealth:{supportScore:wealthSupport,supportLevel:categorySupportLevel(wealthSupport),activityScore:wealthActive.score,activityLevel:wealthActive.level,
      flow:{signedFlow:0,flowQualityScore:weighted(wealthParts),flowActivityScore:wealthFlowActivity},supportEvidence:wealthParts.map((item,index)=>evidence(
        ["INCOME_OPPORTUNITY","BUSINESS_REVENUE","STABLE_CASHFLOW","ASSET_ACCUMULATION"][index],item.score,item.weight)),activityEvidence:wealthActive.evidence,
      incomeOpportunity,businessRevenue,stableCashflow,assetAccumulation,
      expensePressure:{semanticType:"PRESSURE",score:pressureScore,level:categoryPressureLevel(pressureScore),flowPressureScore:pressureFlow.flowQualityScore,evidence:pressureEvidence},
      expansionInvestment:{semanticType:"ACTIVITY",score:expansionScore,level:categoryActivityLevel(expansionScore),flowActivityScore:expansionFlow.flowActivityScore,evidence:expansionEvidence}},
    business,career,relationship:{supportScore:relationshipSupport,supportLevel:categorySupportLevel(relationshipSupport),activityScore:relationshipActive.score,
      activityLevel:relationshipActive.level,flow:{signedFlow:0,flowQualityScore:weighted(relationParts),flowActivityScore:relationshipFlowActivity},
      supportEvidence:relationParts.map((item,index)=>evidence(["OPPORTUNITY","STABILITY","FORMALIZATION_SUPPORT"][index],item.score,item.weight)),activityEvidence:relationshipActive.evidence,
      opportunity,stability,formalizationSupport,traditionalPartnerCategory:gender==="male"?"wealth":gender==="female"?"officer":"GENERIC"},study,
    change:neutralAxis(row,"change"),tags:[...row.tags],context:{transformationDelta:row.transformationAlignment.delta,structureType,usefulGodHighestElement},
    evidence:["Milestone 15 score/tenGodFlow read-only consumer","structure/usefulGod/transformation delta/tag는 별도 재가산하지 않음","score는 사건 확률이 아닌 support/activity/pressure 지표"]};
}

const categoryNames=["overallFlow","wealth","business","career","relationship","study","change"] as const;
function summarize(summary:FortunePeriodSummary,byId:Map<string,CategoryFortunePeriod>):CategoryPeriodSummary{const segments=summary.segmentWeights.map(weight=>({weight,row:byId.get(`CATEGORY:${weight.synthesisId}`)!}));
  const average=(get:(row:CategoryFortunePeriod)=>number)=>segments.reduce((sum,item)=>sum+get(item.row)*item.weight.weight,0),
    resultCategories=Object.fromEntries(categoryNames.map(name=>[name,{supportScore:average(row=>row[name].supportScore),activityScore:average(row=>row[name].activityScore)}])) as CategoryPeriodSummary["categories"],
    activityPeaks=segments.flatMap(item=>categoryNames.map(name=>({score:item.row[name].activityScore,category:name,id:item.row.categoryId}))).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)),
    pressurePeaks=segments.map(item=>({score:item.row.wealth.expensePressure.score,id:item.row.categoryId})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return{periodId:`CATEGORY:${summary.periodId}`,period:summary.period,segmentIds:segments.map(item=>item.row.categoryId),
    segmentWeights:segments.map(item=>({categoryId:item.row.categoryId,durationMilliseconds:item.weight.durationMilliseconds,weight:item.weight.weight})),
    categories:resultCategories,wealth:{expensePressureScore:average(row=>row.wealth.expensePressure.score),expansionInvestmentScore:average(row=>row.wealth.expansionInvestment.score)},
    peakActivityScore:activityPeaks[0].score,peakActivityCategory:activityPeaks[0].category,peakActivitySegmentId:activityPeaks[0].id,
    peakPressureScore:pressurePeaks[0].score,peakPressureSegmentId:pressurePeaks[0].id};}

export function evaluateCategoryFortune(synthesis:FortuneSynthesisResult,gender:SajuInput["gender"]|undefined,
  context:{structureType:string|null;usefulGodHighestElement:string|null}):CategoryFortuneResult{
  const convert=(rows:FortuneSynthesisPeriod[])=>rows.map(row=>evaluateCategorySnapshot(row,gender,context.structureType,context.usefulGodHighestElement)),
    daeun=convert(synthesis.daeun),seun=convert(synthesis.seun),wolun=convert(synthesis.wolun),seunMap=new Map(seun.map(row=>[row.categoryId,row])),wolunMap=new Map(wolun.map(row=>[row.categoryId,row]));
  return{status:"implemented",ruleVersion:RULE.ruleVersion,scoreVersion:RULE.scoreVersion,flowMatrixVersion:RULE.flowMatrixVersion,
    wealthVersion:RULE.wealthVersion,relationshipVersion:RULE.relationshipVersion,daeun,seun,wolun,
    seunPeriodSummaries:synthesis.seunPeriodSummaries.map(row=>summarize(row,seunMap)),wolunPeriodSummaries:synthesis.wolunPeriodSummaries.map(row=>summarize(row,wolunMap)),
    evidence:["support/activity/pressure semantic axes separated","all coefficient/matrix/threshold values are category-fortune-v1 config",
      "no event probability, star scoring, structure/usefulGod double counting, or AI interpretation"]};}
