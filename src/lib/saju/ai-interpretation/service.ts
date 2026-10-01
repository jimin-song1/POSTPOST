import type { SajuAnalysis } from "@/types/saju-analysis";
import type { InterpretationBuildOptions,InterpretationErrorCode,InterpretationProvider,InterpretationResult,StructuredInterpretation } from "@/types/ai-interpretation";
import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";
import { INTERPRETATION_JSON_SCHEMA,LIFETIME_INTERPRETATION_PLAN_JSON_SCHEMA,lifetimeInterpretationPlanSchema,structuredInterpretationSchema,type LifetimeInterpretationPlan } from "./schema";
import { INTERPRETATION_SYSTEM_PROMPT,LIFETIME_INTERPRETATION_PLANNER_PROMPT,LIFETIME_REPORT_SYSTEM_ADDENDUM } from "./prompt";
import { AnalysisNotCompletedError,buildInterpretationInput,InterpretationInputError } from "./input-builder";
import { GroundingValidationError,validateGrounding } from "./grounding";
import { interpretationHashes,type InterpretationCache } from "./cache";
import { InterpretationProviderError,InterpretationProviderTimeoutError } from "./provider";
import {copyEditInterpretation} from "./copy-edit";

export interface InterpretationServiceOptions extends InterpretationBuildOptions {modelConfigVersion?:string;cache?:InterpretationCache;}
const failure=(code:InterpretationErrorCode,message:string):InterpretationResult=>({status:"failed",ruleVersion:RULE.ruleVersion,error:{code,message}});
function validate(output:unknown,input:ReturnType<typeof buildInterpretationInput>){const parsed=structuredInterpretationSchema.safeParse(output);
  if(!parsed.success)return{ok:false as const,code:"SCHEMA_VALIDATION_FAILED" as const,message:parsed.error.message};
  const edited=copyEditInterpretation(parsed.data as StructuredInterpretation);
  try{validateGrounding(edited,input);return{ok:true as const,report:edited};}
  catch(error){return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:error instanceof Error?error.message:"grounding failed"};}}

function planClaims(plan:LifetimeInterpretationPlan){
  return[
    ...plan.coreIdentity,...plan.outerVsInner,...plan.decisionPattern,...plan.strengths,...plan.strengthTradeoffs,
    ...plan.workPattern,...plan.moneyPattern,...plan.relationshipPattern,...plan.wellnessPattern,...plan.familyChildrenPattern,
    ...plan.lifeFlowTheme,...plan.chapterClaims.flatMap(row=>row.claims),
  ];
}
function validatePlan(output:unknown,input:ReturnType<typeof buildInterpretationInput>){
  const parsed=lifetimeInterpretationPlanSchema.safeParse(output);
  if(!parsed.success)return{ok:false as const,code:"SCHEMA_VALIDATION_FAILED" as const,message:parsed.error.message};
  if(!input.reportPlan)return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:"평생총운 report plan이 없습니다."};
  const evidenceIds=new Set(input.evidence.map(row=>row.id)),sectionIds=new Set(input.reportPlan.map(row=>row.id));
  const expectedSections=input.reportPlan.map(row=>row.id),actualSections=parsed.data.chapterClaims.map(row=>row.sectionId);
  if(JSON.stringify(actualSections)!==JSON.stringify(expectedSections))
    return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:"interpretation plan의 동적 section 순서가 다릅니다."};
  for(const claim of planClaims(parsed.data)){
    for(const id of claim.evidenceIds)if(!evidenceIds.has(id))
      return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:`interpretation plan의 알 수 없는 evidence ID: ${id}`};
    for(const sectionId of [...claim.allowedChapters,...claim.avoidRepeatingIn])if(!sectionIds.has(sectionId))
      return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:`interpretation plan의 알 수 없는 section ID: ${sectionId}`};
  }
  for(const chapter of parsed.data.chapterClaims){
    const allowedEvidence=new Set(input.reportPlan.find(row=>row.id===chapter.sectionId)!.evidenceIds);
    for(const claim of chapter.claims){
      if(!claim.allowedChapters.includes(chapter.sectionId))
        return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:`${claim.claimId} claim이 ${chapter.sectionId} 장에 허용되지 않았습니다.`};
      for(const id of claim.evidenceIds)if(!allowedEvidence.has(id))
        return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:`${chapter.sectionId} 범위를 벗어난 plan evidence ID: ${id}`};
    }
  }
  return{ok:true as const,plan:parsed.data};
}
function sumUsage(...values:Array<{input:number;output:number}|undefined>){
  const present=values.filter((value):value is {input:number;output:number}=>Boolean(value));
  if(!present.length)return undefined;
  return present.reduce((total,value)=>({input:total.input+value.input,output:total.output+value.output}),{input:0,output:0});
}

export async function interpretSajuAnalysis(analysis:SajuAnalysis,provider:InterpretationProvider,options:InterpretationServiceOptions):Promise<InterpretationResult>{
  let input:ReturnType<typeof buildInterpretationInput>;
  try{input=buildInterpretationInput(analysis,options);}catch(error){
    if(error instanceof AnalysisNotCompletedError)return failure(error.code,error.message);
    if(error instanceof InterpretationInputError)return failure(error.code,error.message);throw error;}
  const {analysisHash,cacheKey}=interpretationHashes(input,options.reportType,options.modelConfigVersion);
  const cached=await options.cache?.get(cacheKey);if(cached)return cached;

  let plan:LifetimeInterpretationPlan|undefined,planUsage:{input:number;output:number}|undefined;
  if(options.reportType==="LIFETIME_GENERAL"){
    const planningInput=options.lifetimePartNumber?{...buildInterpretationInput(analysis,{...options,lifetimePartNumber:undefined}),reportPlan:input.reportPlan}:input;
    let planResponse;
    try{planResponse=await provider.generate({
      systemPrompt:`${INTERPRETATION_SYSTEM_PROMPT}\n\n${LIFETIME_INTERPRETATION_PLANNER_PROMPT}${options.characterCore?`\n\n이미 확정한 Global Character Core를 바꾸지 마라:\n${JSON.stringify(options.characterCore)}`:""}`,
      input:planningInput,analysisHash,schema:LIFETIME_INTERPRETATION_PLAN_JSON_SCHEMA as unknown as Record<string,unknown>,
    });}catch(error){return providerFailure(error);}
    const checkedPlan=validatePlan(planResponse.output,planningInput);
    if(!checkedPlan.ok)return failure(checkedPlan.code,checkedPlan.message);
    plan={...checkedPlan.plan,characterCore:options.characterCore??checkedPlan.plan.characterCore};planUsage=planResponse.tokenUsage;
  }

  const systemPrompt=options.reportType==="LIFETIME_GENERAL"
    ?`${INTERPRETATION_SYSTEM_PROMPT}\n\n${LIFETIME_REPORT_SYSTEM_ADDENDUM}\n\n확정된 interpretationPlan JSON:\n${JSON.stringify(plan)}`
    :INTERPRETATION_SYSTEM_PROMPT;
  let response;try{response=await provider.generate({systemPrompt,input,analysisHash,schema:INTERPRETATION_JSON_SCHEMA as unknown as Record<string,unknown>});}
  catch(error){return providerFailure(error);}
  const initialNarrativeUsage=response.tokenUsage;
  let checked=validate(response.output,input),repaired=false,repairUsage:{input:number;output:number}|undefined;
  if(!checked.ok){
    try{const repair=await provider.generate({systemPrompt,input,analysisHash,schema:INTERPRETATION_JSON_SCHEMA as unknown as Record<string,unknown>,
      repair:{validationError:checked.code,previousOutput:response.output}});response=repair;checked=validate(repair.output,input);repaired=true;repairUsage=repair.tokenUsage;}
    catch(error){return providerFailure(error);}
  }
  if(!checked.ok)return failure(checked.code,checked.message);
  const tokenUsage=sumUsage(planUsage,initialNarrativeUsage,repairUsage);
  const result={status:"completed" as const,ruleVersion:RULE.ruleVersion,promptVersion:RULE.promptVersion,groundingVersion:RULE.groundingVersion,
    analysisHash,cacheKey,report:checked.report,metadata:{provider:response.provider,model:response.model,repaired,...(tokenUsage?{tokenUsage}: {})}};
  await options.cache?.set(cacheKey,result);return result;
}
function providerFailure(error:unknown):InterpretationResult{
  if(error instanceof InterpretationProviderTimeoutError)return failure(error.code,error.message);
  if(error instanceof InterpretationProviderError)return failure(error.code,error.message);
  return failure("PROVIDER_ERROR",error instanceof Error?error.message:"provider failed");
}
