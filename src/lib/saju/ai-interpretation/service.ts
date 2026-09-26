import type { SajuAnalysis } from "@/types/saju-analysis";
import type { InterpretationBuildOptions,InterpretationErrorCode,InterpretationProvider,InterpretationResult,StructuredInterpretation } from "@/types/ai-interpretation";
import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";
import { INTERPRETATION_JSON_SCHEMA,structuredInterpretationSchema } from "./schema";
import { INTERPRETATION_SYSTEM_PROMPT,LIFETIME_REPORT_SYSTEM_ADDENDUM } from "./prompt";
import { AnalysisNotCompletedError,buildInterpretationInput,InterpretationInputError } from "./input-builder";
import { GroundingValidationError,validateGrounding } from "./grounding";
import { interpretationHashes,type InterpretationCache } from "./cache";
import { InterpretationProviderError,InterpretationProviderTimeoutError } from "./provider";

export interface InterpretationServiceOptions extends InterpretationBuildOptions {modelConfigVersion?:string;cache?:InterpretationCache;}
const failure=(code:InterpretationErrorCode,message:string):InterpretationResult=>({status:"failed",ruleVersion:RULE.ruleVersion,error:{code,message}});
function validate(output:unknown,input:ReturnType<typeof buildInterpretationInput>){const parsed=structuredInterpretationSchema.safeParse(output);
  if(!parsed.success)return{ok:false as const,code:"SCHEMA_VALIDATION_FAILED" as const,message:parsed.error.message};
  try{validateGrounding(parsed.data,input);return{ok:true as const,report:parsed.data as StructuredInterpretation};}
  catch(error){return{ok:false as const,code:"GROUNDING_VALIDATION_FAILED" as const,message:error instanceof Error?error.message:"grounding failed"};}}

export async function interpretSajuAnalysis(analysis:SajuAnalysis,provider:InterpretationProvider,options:InterpretationServiceOptions):Promise<InterpretationResult>{
  let input:ReturnType<typeof buildInterpretationInput>;
  try{input=buildInterpretationInput(analysis,options);}catch(error){
    if(error instanceof AnalysisNotCompletedError)return failure(error.code,error.message);
    if(error instanceof InterpretationInputError)return failure(error.code,error.message);throw error;}
  const {analysisHash,cacheKey}=interpretationHashes(input,options.reportType,options.modelConfigVersion);
  const cached=await options.cache?.get(cacheKey);if(cached)return cached;
  const systemPrompt=options.reportType==="LIFETIME_GENERAL"?`${INTERPRETATION_SYSTEM_PROMPT}\n${LIFETIME_REPORT_SYSTEM_ADDENDUM}`:INTERPRETATION_SYSTEM_PROMPT;
  let response;try{response=await provider.generate({systemPrompt,input,analysisHash,schema:INTERPRETATION_JSON_SCHEMA as unknown as Record<string,unknown>});}
  catch(error){return providerFailure(error);}
  let checked=validate(response.output,input),repaired=false;
  if(!checked.ok){
    try{const repair=await provider.generate({systemPrompt,input,analysisHash,schema:INTERPRETATION_JSON_SCHEMA as unknown as Record<string,unknown>,
      repair:{validationError:checked.code,previousOutput:response.output}});response=repair;checked=validate(repair.output,input);repaired=true;}
    catch(error){return providerFailure(error);}
  }
  if(!checked.ok)return failure(checked.code,checked.message);
  const result={status:"completed" as const,ruleVersion:RULE.ruleVersion,promptVersion:RULE.promptVersion,groundingVersion:RULE.groundingVersion,
    analysisHash,cacheKey,report:checked.report,metadata:{provider:response.provider,model:response.model,repaired,...(response.tokenUsage?{tokenUsage:response.tokenUsage}: {})}};
  await options.cache?.set(cacheKey,result);return result;
}
function providerFailure(error:unknown):InterpretationResult{
  if(error instanceof InterpretationProviderTimeoutError)return failure(error.code,error.message);
  if(error instanceof InterpretationProviderError)return failure(error.code,error.message);
  return failure("PROVIDER_ERROR",error instanceof Error?error.message:"provider failed");
}
