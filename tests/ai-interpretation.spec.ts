import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";
import { buildInterpretationInput,AnalysisNotCompletedError,InterpretationInputError } from "@/lib/saju/ai-interpretation/input-builder";
import { validateGrounding,GroundingValidationError } from "@/lib/saju/ai-interpretation/grounding";
import { INTERPRETATION_SYSTEM_PROMPT,LIFETIME_INTERPRETATION_PLANNER_PROMPT } from "@/lib/saju/ai-interpretation/prompt";
import { lifetimeInterpretationPlanSchema,structuredInterpretationSchema } from "@/lib/saju/ai-interpretation/schema";
import { interpretationHashes,MemoryInterpretationCache } from "@/lib/saju/ai-interpretation/cache";
import { interpretSajuAnalysis } from "@/lib/saju/ai-interpretation/service";
import { OpenAIInterpretationProvider } from "@/lib/saju/ai-interpretation/openai-provider";
import { MockInterpretationProvider as DeterministicMockInterpretationProvider } from "@/lib/saju/ai-interpretation/mock-provider";
import { auditLifetimeEditorialQuality } from "@/lib/saju/ai-interpretation/editorial-audit";
import { validateLifetimeContentContract } from "@/lib/saju/ai-interpretation/lifetime-content-contract";
import { InterpretationProviderError,InterpretationProviderTimeoutError } from "@/lib/saju/ai-interpretation/provider";
import type { InterpretationInput,InterpretationProvider,InterpretationProviderRequest,InterpretationProviderResponse,
  InterpretationReportType,StructuredInterpretation } from "@/types/ai-interpretation";
import type { FortuneResult } from "@/types/fortune";
import type { FortuneSynthesisResult } from "@/types/fortune-synthesis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const analysis=calculateSaju(SYNTHETIC_INPUT),fortune=analysis.fortune as FortuneResult,synthesis=fortune.synthesis as FortuneSynthesisResult;
const referenceInstant=synthesis.wolun[0].period.startInstant,year=Array.from(new Set(synthesis.wolun.map(row=>row.context.seunYear!)))
  .find(candidate=>synthesis.wolun.filter(row=>row.context.seunYear===candidate).length>=12)!;
const options=(reportType:InterpretationReportType)=>reportType==="YEARLY"?{reportType,year}:reportType==="LIFETIME_GENERAL"?{reportType,relationshipStatus:"SINGLE" as const,year}:{reportType,referenceInstant};
function validOutput(input:InterpretationInput):StructuredInterpretation {const first=input.evidence[0].id,timeline=input.timeline[0],sections=input.reportType==="LIFETIME_GENERAL"?input.reportPlan!.map(row=>({id:row.id,chapterNumber:row.chapterNumber,title:row.title,headline:"삶의 구조를 읽는 문장",lead:"확정된 근거를 쉬운 말로 연결합니다.",body:"확정된 엔진 근거를 설명합니다.",paragraphs:[`${row.title}에서는 입력된 근거 안에서 생활 모습을 풀어봅니다.`,`${row.title}에 필요한 핵심만 골라 같은 말을 되풀이하지 않습니다.`],keyPoints:["계산 결과를 바꾸지 않습니다."],evidenceIds:[row.evidenceIds[0]],partNumber:row.partNumber,partTitle:row.partTitle,evidenceGroup:row.evidenceGroup,contentKind:row.contentKind,noveltyElements:["NEW_CLAIM","NEW_SCENE","NEW_ACTION"],...(row.contentKind==="PROFESSIONAL"?{professionalDetails:{summary:"같은 계산 결과의 전문 근거입니다.",evidenceIds:[row.evidenceIds[0]]}}:{})})): [{id:"summary",title:"핵심 흐름",body:"확정된 엔진 근거를 설명합니다.",evidenceIds:[first]}];return{
  status:"completed",reportType:input.reportType,headline:"근거 중심 해석",summary:"지원 흐름과 활동성을 분리해 살펴봅니다.",
  sections,highlights:["지원되는 흐름을 확인합니다."],
  cautions:["활성도는 결과 확률이 아닙니다."],timeline:timeline?[{periodId:timeline.id,title:"선택 기간",body:"선택된 기간의 흐름입니다.",evidenceIds:[timeline.evidenceIds[0]]}]:[],
  disclaimer:"이 해석은 확정적 사건 예측이 아닙니다."};}
function validPlan(input:InterpretationInput){
  const rows=input.reportPlan!;const first=rows[0],claim=(claimId:string,evidenceId:string,sectionId:string)=>({claimId,plainMeaning:"생활에서 반복되는 모습을 설명하는 근거입니다.",evidenceIds:[evidenceId],sourceFields:["evidence.value"],confidence:"HIGH" as const,allowedChapters:[sectionId],avoidRepeatingIn:[] as string[]});
  return{planVersion:"interpretation-plan-v1" as const,characterCore:{corePatterns:["확인 후 움직입니다."],contradictions:[],dominantStrengths:["마무리"],shadowPatterns:[],relationshipPattern:"천천히 가까워집니다.",workPattern:"기준을 세웁니다.",decisionPattern:"확인 뒤 결정합니다."},
    coreIdentity:[claim("CORE-1",first.evidenceIds[0],first.id)],outerVsInner:[claim("OUTER-1",first.evidenceIds[0],first.id)],decisionPattern:[claim("DECISION-1",first.evidenceIds[0],first.id)],
    strengths:[claim("STRENGTH-1",first.evidenceIds[0],first.id)],strengthTradeoffs:[claim("TRADEOFF-1",first.evidenceIds[0],first.id)],workPattern:[claim("WORK-1",first.evidenceIds[0],first.id)],
    moneyPattern:[claim("MONEY-1",first.evidenceIds[0],first.id)],relationshipPattern:[claim("REL-1",first.evidenceIds[0],first.id)],wellnessPattern:[claim("WELLNESS-1",first.evidenceIds[0],first.id)],
    familyChildrenPattern:[claim("CHILD-1",first.evidenceIds[0],first.id)],lifeFlowTheme:[claim("FLOW-1",first.evidenceIds[0],first.id)],
    chapterClaims:rows.map((row,index)=>({sectionId:row.id,claims:[claim(`CHAPTER-${index+1}`,row.evidenceIds[0],row.id)]}))};
}
class MockProvider implements InterpretationProvider {calls:InterpretationProviderRequest[]=[];constructor(private readonly scripted:Array<unknown|Error>=[]){}
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{this.calls.push(request);const next=this.scripted.shift();if(next instanceof Error)throw next;
    const isPlan=Boolean((request.schema as {properties?:Record<string,unknown>}).properties?.planVersion);
    return{output:next??(isPlan?validPlan(request.input):validOutput(request.input)),provider:"mock",model:"mock-v1"};}}

describe("AI_INTERPRETATION_V1",()=>{
  it("A-B: rejects incomplete analysis and missing deterministic modules",()=>{
    const incomplete=structuredClone(analysis);incomplete.dayMaster=null;
    expect(()=>buildInterpretationInput(incomplete,{reportType:"WEALTH",referenceInstant})).toThrow(AnalysisNotCompletedError);
    const missing=structuredClone(analysis);missing.usefulGods.synthesis={status:"not_implemented"};
    expect(()=>buildInterpretationInput(missing,{reportType:"WEALTH",referenceInstant})).toThrow(InterpretationInputError);
  });

  it("C-D: filters each report and removes direct personal data",()=>{
    for(const reportType of RULE.supportedReports){const input=buildInterpretationInput(analysis,options(reportType)),serialized=JSON.stringify(input);
      expect(serialized).not.toContain(SYNTHETIC_INPUT.name);expect(serialized).not.toContain(SYNTHETIC_INPUT.birthDate);
      expect(serialized).not.toContain(SYNTHETIC_INPUT.birthCity!);expect(serialized).not.toContain("birthInput");
      if(reportType==="RELATIONSHIP")expect(input.minimalContext.gender).toBe("female");else expect(input.minimalContext.gender).toBeUndefined();
      if(["WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY"].includes(reportType)){
        const wanted=reportType;expect(input.evidence.some(row=>row.id.endsWith(`:${wanted}`))).toBe(true);
        expect(input.evidence.some(row=>row.id.includes(":PILLARS"))).toBe(false);}
    }
  });

  it("E-F: prompt prohibits calculation and evidence IDs are stable",()=>{
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("재계산하거나 수정하거나 대체하지 마라");
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("입력에 없는 숫자 점수");
    const a=buildInterpretationInput(analysis,{reportType:"WEALTH",referenceInstant}),b=buildInterpretationInput(analysis,{reportType:"WEALTH",referenceInstant});
    expect(a).toEqual(b);expect(a.evidence.map(row=>row.id)).toEqual(b.evidence.map(row=>row.id));
    expect(a.evidence.some(row=>row.id.startsWith("CATEGORY:"))).toBe(true);
    expect(RULE.promptVersion).toBe("interpretation-prompt-v3");
  });

  it("plans LIFETIME_GENERAL claims before writing the customer narrative",async()=>{
    const input=buildInterpretationInput(analysis,{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year}),plan=validPlan(input);
    expect(lifetimeInterpretationPlanSchema.parse(plan)).toEqual(plan);
    const provider=new MockProvider(),result=await interpretSajuAnalysis(analysis,provider,{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year});
    expect(result.status).toBe("completed");expect(provider.calls).toHaveLength(2);expect(input.reportPlan!.length).toBeGreaterThanOrEqual(130);
    expect(provider.calls[0].systemPrompt).toContain(LIFETIME_INTERPRETATION_PLANNER_PROMPT);
    expect((provider.calls[0].schema as {properties?:Record<string,unknown>}).properties?.planVersion).toBeTruthy();
    expect(provider.calls[1].systemPrompt).toContain("확정된 interpretationPlan JSON");
  });

  it("G-I: validates schema and rejects unknown evidence/malformed output",()=>{
    const input=buildInterpretationInput(analysis,{reportType:"WEALTH",referenceInstant}),valid=validOutput(input);
    expect(structuredInterpretationSchema.parse(valid)).toEqual(valid);expect(validateGrounding(valid,input)).toBe(true);
    const unknown=structuredClone(valid);unknown.sections[0].evidenceIds=["UNKNOWN:EVIDENCE"];
    expect(()=>validateGrounding(unknown,input)).toThrow(GroundingValidationError);
    expect(structuredInterpretationSchema.safeParse({status:"completed"}).success).toBe(false);
    const emptyIds=structuredClone(valid);emptyIds.sections[0].evidenceIds=[];
    expect(structuredInterpretationSchema.safeParse(emptyIds).success).toBe(false);
  });

  it("rejects AI-report boilerplate and technical leakage in customer lifetime prose",()=>{
    const input=buildInterpretationInput(analysis,{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year});
    const aiTone=validOutput(input);aiTone.sections[0].body="첫 문장은 이렇게 해석됩니다.";aiTone.sections[0].lead="다음 내용도 그렇게 해석됩니다.";aiTone.sections[0].paragraphs![0]="마지막 특징 역시 그렇게 해석됩니다.";
    expect(()=>validateGrounding(aiTone,input)).toThrow(GroundingValidationError);
    const technical=validOutput(input);technical.sections[0].body="용신을 먼저 설명합니다.";
    expect(()=>validateGrounding(technical,input)).toThrow(GroundingValidationError);
  });

  it("locks numbers and labels to each section's cited evidence and each timeline period",()=>{
    const input:InterpretationInput={version:"interpretation-input-v1",reportType:"COMPREHENSIVE",minimalContext:{},
      evidence:[{id:"NATAL:A",kind:"NATAL",value:{score:58.26,strength:"중화신약"}},
        {id:"NATAL:B",kind:"NATAL",value:{score:85,strength:"신강"}}],
      timeline:[{id:"PERIOD:A",period:{startInstant:"2035-01-01",endInstant:"2036-01-01"},evidenceIds:["NATAL:A"]},
        {id:"PERIOD:B",period:{startInstant:"2036-01-01",endInstant:"2037-01-01"},evidenceIds:["NATAL:B"]}]};
    const output=validOutput(input);output.sections[0].body="85점 신강 흐름입니다.";
    expect(()=>validateGrounding(output,input)).toThrow(GroundingValidationError);
    output.sections[0].body="약 58점 중화신약 흐름입니다.";
    output.timeline[0].evidenceIds=["NATAL:B"];
    expect(()=>validateGrounding(output,input)).toThrow(GroundingValidationError);
  });

  it("J-K: repairs once and fails after exactly one unsuccessful repair",async()=>{
    const repairedProvider=new MockProvider([{bad:true},undefined]),repaired=await interpretSajuAnalysis(analysis,repairedProvider,{reportType:"WEALTH",referenceInstant});
    expect(repaired.status).toBe("completed");if(repaired.status==="completed")expect(repaired.metadata.repaired).toBe(true);expect(repairedProvider.calls).toHaveLength(2);
    expect(repairedProvider.calls[1].repair?.validationError).toBe("SCHEMA_VALIDATION_FAILED");
    const failedProvider=new MockProvider([{bad:true},{stillBad:true}]),failed=await interpretSajuAnalysis(analysis,failedProvider,{reportType:"WEALTH",referenceInstant});
    expect(failed).toMatchObject({status:"failed",error:{code:"SCHEMA_VALIDATION_FAILED"}});expect(failedProvider.calls).toHaveLength(2);
  });

  it("L: isolates provider errors and timeouts from deterministic analysis",async()=>{
    const before=structuredClone(analysis),error=await interpretSajuAnalysis(analysis,new MockProvider([new InterpretationProviderError("down")]),{reportType:"WEALTH",referenceInstant});
    const timeout=await interpretSajuAnalysis(analysis,new MockProvider([new InterpretationProviderTimeoutError("slow")]),{reportType:"WEALTH",referenceInstant});
    expect(error).toMatchObject({status:"failed",error:{code:"PROVIDER_ERROR"}});expect(timeout).toMatchObject({status:"failed",error:{code:"PROVIDER_TIMEOUT"}});
    expect(analysis).toEqual(before);
  });

  it("M-S: locks pillars, years, scores, strength, structure, useful-god labels and evidence",()=>{
    const input:InterpretationInput={version:"interpretation-input-v1",reportType:"COMPREHENSIVE",minimalContext:{},timeline:[{id:"SEUN-2035",period:{startInstant:"2035-01-01",endInstant:"2036-01-01"},evidenceIds:["NATAL:FACT"]}],
      evidence:[{id:"NATAL:FACT",kind:"NATAL",value:{pillar:"甲子",score:58.26,strength:"중화신약",structure:"정관격",role:"FAVORABLE",year:2035}}]};
    const base=validOutput(input),assertBad=(text:string)=>{const output=structuredClone(base);output.sections[0].body=text;expect(()=>validateGrounding(output,input)).toThrow(GroundingValidationError);};
    assertBad("乙丑 흐름입니다.");assertBad("2040년 흐름입니다.");assertBad("재물운 85점입니다.");assertBad("신강 흐름입니다.");assertBad("편관격입니다.");assertBad("UNFAVORABLE입니다.");
    const rounded=structuredClone(base);rounded.sections[0].body="약 58점 흐름입니다.";expect(validateGrounding(rounded,input)).toBe(true);
  });

  it("T-U: rejects deterministic event and star-based medical/accident claims",()=>{
    const input=buildInterpretationInput(analysis,{reportType:"RELATIONSHIP",referenceInstant});
    for(const phrase of ["결혼한다","사고난다","신살 때문에 질병"]){const output=validOutput(input);output.sections[0].body=phrase;
      expect(()=>validateGrounding(output,input)).toThrow(GroundingValidationError);}
  });

  it("V-Y: creates deterministic cache keys separated by prompt/model/report",()=>{
    const input=buildInterpretationInput(analysis,{reportType:"BUSINESS",referenceInstant}),same=interpretationHashes(input,"BUSINESS"),again=interpretationHashes(input,"BUSINESS");
    expect(same).toEqual(again);expect(interpretationHashes(input,"WEALTH").cacheKey).not.toBe(same.cacheKey);
    expect(interpretationHashes(input,"BUSINESS","model-config-v2").cacheKey).not.toBe(same.cacheKey);
    expect(interpretationHashes(input,"BUSINESS",RULE.modelConfigVersion,"interpretation-prompt-v1").cacheKey).not.toBe(same.cacheKey);
    const changed=structuredClone(input);changed.version="interpretation-input-v1";changed.evidence=[...changed.evidence].reverse();
    expect(interpretationHashes(changed,"BUSINESS").analysisHash).not.toBe(same.analysisHash);
  });

  it("audits the full deterministic lifetime mock narrative and all Core 9 domains",async()=>{
    const result=await interpretSajuAnalysis(analysis,new DeterministicMockInterpretationProvider(),{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year});
    expect(result.status).toBe("completed");
    if(result.status!=="completed")return;
    const stats=validateLifetimeContentContract(result.report),audit=auditLifetimeEditorialQuality(result.report);
    expect(stats.contentSections).toBeGreaterThanOrEqual(130);
    expect(stats.totalCharacters).toBeGreaterThanOrEqual(90_000);
    expect(audit.metrics).toEqual({
      aiToneHits:0,reportToneHits:0,technicalLeakageHits:0,longSentenceWarnings:0,
      duplicateClaimWarnings:0,duplicateSceneWarnings:0,sectionsWithoutConcreteScene:0,
      sectionsWithoutUpsideShadowPair:0,repeatedEndingWarnings:0,characterConsistencyWarnings:0
    });
    expect(audit.coreNine).toHaveLength(9);
    expect(audit.coreNine.every(row=>row.pass)).toBe(true);
  });

  it.each(RULE.supportedReports)("Z-AF: mock %s report completes with grounded structured JSON",async reportType=>{
    const provider=new MockProvider(),result=await interpretSajuAnalysis(analysis,provider,options(reportType));
    expect(result.status).toBe("completed");if(result.status==="completed"){expect(result.report.reportType).toBe(reportType);expect(result.metadata.provider).toBe("mock");}
  });

  it("YEARLY selects only requested seun and its wolun segments",()=>{
    const input=buildInterpretationInput(analysis,{reportType:"YEARLY",year});
    expect(input.minimalContext.requestedYear).toBe(year);expect(input.timeline.length).toBeGreaterThanOrEqual(14);
    expect(input.evidence.some(row=>row.id===`REQUEST:YEAR:${year}`)).toBe(true);
    expect(input.timeline.some(row=>row.id.startsWith("DAEUN-"))).toBe(true);
    expect(input.evidence.filter(row=>row.id.includes(":PERIOD_CONTEXT")&&!row.id.includes("DAEUN-"))
      .every(row=>JSON.stringify(row.value).includes(String(year)))).toBe(true);
  });

  it("AG-AH: leaves engine result unchanged and preserves all prior regression output",async()=>{
    const before=structuredClone(analysis);await interpretSajuAnalysis(analysis,new MockProvider(),{reportType:"COMPREHENSIVE",referenceInstant});expect(analysis).toEqual(before);
    expect((analysis.fortune as FortuneResult).categories.status).toBe("implemented");
  });

  it("uses cache without a second provider call",async()=>{
    const cache=new MemoryInterpretationCache(),provider=new MockProvider(),request={reportType:"WEALTH" as const,referenceInstant,cache};
    const first=await interpretSajuAnalysis(analysis,provider,request),second=await interpretSajuAnalysis(analysis,provider,request);
    expect(second).toEqual(first);expect(provider.calls).toHaveLength(1);
  });

  it("OpenAI adapter uses Responses structured output without a live API call",async()=>{
    let captured:Record<string,unknown>|null=null;const input=buildInterpretationInput(analysis,{reportType:"WEALTH",referenceInstant}),output=validOutput(input);
    const fakeFetch=async(_url:RequestInfo|URL,init?:RequestInit)=>{captured=JSON.parse(String(init?.body));return new Response(JSON.stringify({output_text:JSON.stringify(output),usage:{input_tokens:10,output_tokens:20}}),{status:200});};
    const provider=new OpenAIInterpretationProvider({apiKey:"synthetic-key",model:"synthetic-model",fetchImpl:fakeFetch as typeof fetch});
    const response=await provider.generate({systemPrompt:INTERPRETATION_SYSTEM_PROMPT,input,analysisHash:"synthetic-analysis-hash",schema:{type:"object"}});
    expect(response.output).toEqual(output);expect(response.tokenUsage).toEqual({input:10,output:20});expect(captured).toMatchObject({store:false,text:{format:{type:"json_schema",strict:true}}});
  });
});
