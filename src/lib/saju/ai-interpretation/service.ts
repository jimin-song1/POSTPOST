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
function customerHonorific(name:string){
  const trimmed=name.trim();
  if(!trimmed)return"고객님";
  return trimmed.endsWith("님")?trimmed:`${trimmed}님`;
}
function sanitizeCustomerWording(text:string){
  return text
    .replaceAll("속에는 꽤 분명한 자기준이 있습니다","속에는 꽤 분명한 생각이 있습니다")
    .replaceAll("속에는 꽤 분명한 자기기준이 있습니다","속에는 꽤 분명한 생각이 있습니다")
    .replaceAll("속에는 꽤 분명한 자기 기준이 있습니다","속에는 꽤 분명한 생각이 있습니다")
    .replaceAll("속에는 꽤 분명한 본인 기준이 있습니다","속에는 꽤 분명한 생각이 있습니다")
    .replaceAll("일책임감","일관성")
    .replaceAll("습책임감","습관성")
    .replaceAll("관계까지키기","관계까지 지키기")
    .replaceAll("자기준","본인 기준")
    .replaceAll("자기기준","본인 기준");
}
function personalizeCustomerReport(report:StructuredInterpretation,name:string):StructuredInterpretation{
  const label=customerHonorific(name);
  const sections=report.sections.map(section=>{
    const source=(section.paragraphs??(section.body?[section.body]:[])).map(sanitizeCustomerWording);
    if(!source.length)return section;
    const id=section.id.replace(/^legacy-/,"");
    const first=source[0];
    let personalized=first;
    if(id==="book-007")personalized=first.replace(/^이 사주는 기본적으로\s*/,`${label}은 기본적으로 `);
    else if(id==="book-008")personalized=first.replace(/^한 문장으로 줄이면,\s*/,`한 문장으로 줄이면, ${label}은 `);
    else if(["book-009","book-010","book-011","book-012","book-013","book-014","book-017"].includes(id)&&!first.startsWith(label))
      personalized=`${label}은 ${first}`;
    else if(id==="book-020")personalized=first.replace(/^나를 대표하는 기운을 쉽게 풀면\s*/,`${label}을 대표하는 기운을 쉽게 풀면 `);
    else if(id==="book-021")personalized=first.replace(/^나를 대표하는 기운은\s*/,`${label}을 대표하는 기운은 `);
    else if(id==="book-022")personalized=first.replace(/^나를 가장 가까이 보여주는 두 글자는\s*/,`${label}을 가장 가까이 보여주는 두 글자는 `);
    else if(id==="book-023"&&!first.startsWith(label))personalized=`${label}은 ${first}`;
    else if(id==="book-027")personalized=first.replace(/^일에서는\s*/,`${label}은 일에서 `);
    else if(id==="book-028")personalized=first.replace(/^잘 맞는 일은\s*/,`${label}에게 잘 맞는 일은 `);
    else if(id==="book-032")personalized=first.replace(/^직장에서는\s*/,`${label}은 직장에서 `);
    else if(id==="book-033")personalized=first.replace(/^사업을 할 때는\s*/,`${label}은 사업을 할 때 `);
    else if(id==="book-035"){
      if(first.startsWith("돈을 대할 때 "))personalized=first.replace(/^돈을 대할 때\s*/,`${label}은 돈을 대할 때 `);
      else if(first.startsWith("돈은 "))personalized=first.replace(/^돈은\s*/,`${label}에게 돈은 `);
    }
    else if(id==="book-036"&&!first.startsWith(label))personalized=`${label}은 ${first}`;
    else if(id==="book-043")personalized=first.replace(/^사람을 좋아할 때\s*/,`${label}은 사람을 좋아할 때 `);
    else if(id==="book-047"){
      if(first.startsWith("배우자 자리를 보면 "))personalized=first.replace(/^배우자 자리를 보면\s*/,`${label}의 배우자 자리를 보면 `);
      else if(first.startsWith("현재 연인에게 "))personalized=first.replace(/^현재 연인에게\s*/,`${label}이 현재 연인에게 `);
      else if(first.startsWith("배우자에게 "))personalized=first.replace(/^배우자에게\s*/,`${label}이 배우자에게 `);
    }
    else if(id==="book-051")personalized=first.replace(/^부모가 되면\s*/,`${label}은 부모가 되면 `);
    else if(id==="book-053"){
      if(first.startsWith("명리적으로 건강 균형을 볼 때 "))personalized=first.replace(/^명리적으로 건강 균형을 볼 때\s*/,`${label}의 건강 균형을 명리적으로 보면 `);
      else if(!first.startsWith(label))personalized=`${label}은 ${first}`;
    }
    else if(id==="book-064"&&!first.startsWith(label))personalized=`${label}은 ${first}`;
    const paragraphs=[sanitizeCustomerWording(personalized),...source.slice(1).map(sanitizeCustomerWording)];
    return{...section,paragraphs,body:paragraphs.join("\n\n")};
  });
  return{...report,sections};
}
function personalizeCompletedResult(result:InterpretationResult,name:string):InterpretationResult{
  return result.status==="completed"?{...result,report:personalizeCustomerReport(result.report,name)}:result;
}

export async function interpretSajuAnalysis(analysis:SajuAnalysis,provider:InterpretationProvider,options:InterpretationServiceOptions):Promise<InterpretationResult>{
  let input:ReturnType<typeof buildInterpretationInput>;
  try{input=buildInterpretationInput(analysis,options);}catch(error){
    if(error instanceof AnalysisNotCompletedError)return failure(error.code,error.message);
    if(error instanceof InterpretationInputError)return failure(error.code,error.message);throw error;}
  const {analysisHash,cacheKey}=interpretationHashes(input,options.reportType,options.modelConfigVersion);
  const cached=await options.cache?.get(cacheKey);if(cached)return personalizeCompletedResult(cached,analysis.person.name);

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
  await options.cache?.set(cacheKey,result);return personalizeCompletedResult(result,analysis.person.name);
}
function providerFailure(error:unknown):InterpretationResult{
  if(error instanceof InterpretationProviderTimeoutError)return failure(error.code,error.message);
  if(error instanceof InterpretationProviderError)return failure(error.code,error.message);
  return failure("PROVIDER_ERROR",error instanceof Error?error.message:"provider failed");
}
