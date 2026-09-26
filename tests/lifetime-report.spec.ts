import {describe,expect,it} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import {buildInterpretationInput} from "@/lib/saju/ai-interpretation/input-builder";
import {validateGrounding,GroundingValidationError} from "@/lib/saju/ai-interpretation/grounding";
import {interpretSajuAnalysis} from "@/lib/saju/ai-interpretation/service";
import {LIFETIME_REPORT_SYSTEM_ADDENDUM} from "@/lib/saju/ai-interpretation/prompt";
import {CUSTOMER_TERMINOLOGY_V1,customerElement,customerTerm} from "@/rules/customer-terminology.v1";
import {LIFETIME_REPORT_V2} from "@/rules/lifetime-report.v2";
import type {InterpretationInput,InterpretationProvider,InterpretationProviderRequest,StructuredInterpretation,RelationshipStatus} from "@/types/ai-interpretation";
import {InterpretationProviderError} from "@/lib/saju/ai-interpretation/provider";
import {SYNTHETIC_INPUT} from "./synthetic-input";
import type {FortuneResult} from "@/types/fortune";
import type {FortuneSynthesisResult} from "@/types/fortune-synthesis";

const analysis=calculateSaju(SYNTHETIC_INPUT);
const synthesis=(analysis.fortune as FortuneResult).synthesis as FortuneSynthesisResult,referenceInstant=synthesis.wolun[0].period.startInstant;
function input(status:RelationshipStatus="SINGLE"){return buildInterpretationInput(analysis,{reportType:"LIFETIME_GENERAL",relationshipStatus:status});}
function report(source:InterpretationInput):StructuredInterpretation{return{status:"completed",reportType:"LIFETIME_GENERAL",headline:"내 삶의 큰 지도를 읽습니다",summary:"도움 흐름과 변화 움직임을 서로 다른 축으로 살펴봅니다.",
  sections:source.reportPlan!.map(plan=>({id:plan.id,chapterNumber:plan.chapterNumber,title:plan.title,headline:"익숙한 나를 새롭게 읽는 문장",lead:"확정된 계산 근거를 쉬운 한국어로 연결합니다.",body:"서버가 확정한 결과를 바꾸지 않고 설명합니다.",paragraphs:["한 가지 판정으로 단정하지 않고 여러 근거를 함께 봅니다.","이 내용은 입력된 근거 범위 안의 경향을 설명합니다."],keyPoints:["숫자와 판정은 엔진 결과를 그대로 사용합니다."],evidenceIds:[plan.evidenceIds[0]],...(plan.id==="professional"?{professionalDetails:{summary:"기본 보고서와 같은 원국 및 규칙 버전을 확인합니다.",evidenceIds:[plan.evidenceIds[0]]}}:{})})),
  highlights:["큰 흐름을 먼저 읽습니다."],cautions:["변화가 크다는 말은 좋고 나쁨과 다릅니다."],timeline:source.timeline.map(row=>({periodId:row.id,title:"큰 흐름",body:"도움 흐름과 변화 움직임을 따로 살펴봅니다.",evidenceIds:[row.evidenceIds[0]]})),disclaimer:"계산된 경향을 설명하며 확정적 사건을 예측하지 않습니다."};}
class Mock implements InterpretationProvider{calls:InterpretationProviderRequest[]=[];constructor(private value?:unknown|Error){}async generate(request:InterpretationProviderRequest){this.calls.push(request);if(this.value instanceof Error)throw this.value;return{output:this.value??report(request.input),provider:"mock",model:"mock-v2"};}}

describe("LIFETIME_GENERAL_REPORT_V2",()=>{
  it("keeps the canonical 01~18 report order and centralized customer terminology",()=>{const built=input();expect(built.version).toBe("lifetime-interpretation-input-v2");expect(built.reportPlan?.map(row=>[row.chapterNumber,row.title])).toEqual(LIFETIME_REPORT_V2.sections.map(row=>[row.chapterNumber,row.title]));
    expect(customerTerm("일간")).toBe("나를 대표하는 기운");expect(customerTerm("대운")).toBe("10년마다 바뀌는 큰 흐름");expect(customerTerm("충")).toBe("강하게 부딪혀 변화를 만드는 힘");expect(customerElement("metal")).toBe("쇠");expect(customerElement("metal",true)).toBe("금(金)");expect(Object.values(CUSTOMER_TERMINOLOGY_V1.elements).map(row=>row.customer)).toEqual(["나무","불","흙","쇠","물"]);});

  it.each(["SINGLE","DATING","MARRIED"] as const)("uses %s only as interpretation context",status=>{const before=structuredClone(analysis),built=input(status),context=built.evidence.find(row=>row.id==="CONTEXT:RELATIONSHIP_STATUS")!;expect(built.minimalContext.relationshipStatus).toBe(status);expect(JSON.stringify(context.value)).toContain(LIFETIME_REPORT_V2.relationship[status].label);expect(analysis).toEqual(before);});

  it("minimizes personal data and never assumes current children reality",()=>{const serialized=JSON.stringify(input("MARRIED"));expect(serialized).not.toContain(SYNTHETIC_INPUT.name);expect(serialized).not.toContain(SYNTHETIC_INPUT.birthDate);expect(serialized).not.toContain(SYNTHETIC_INPUT.birthCity!);expect(serialized).not.toContain("birthInput");expect(input("MARRIED").evidence.find(row=>row.id==="CONTEXT:CHILD_REALITY_UNKNOWN")?.value).toEqual({hasChildren:null,count:null,gender:null,pregnancy:null});});

  it("integrates grounded wellness and children evidence with only selected high-level periods",()=>{const built=input();expect(built.evidence.some(row=>row.id==="WELLNESS:BALANCE")).toBe(true);expect(built.evidence.filter(row=>row.id.startsWith("WELLNESS:ELEMENT:")).length).toBe(5);expect(built.evidence.some(row=>row.id==="CHILD:BOND")).toBe(true);expect(built.evidence.some(row=>row.id==="CHILD:GENDER_ENERGY")).toBe(true);
    expect((built.evidence.find(row=>row.id==="WELLNESS:LIFETIME_CONTEXT")?.value as unknown[]).length).toBe(LIFETIME_REPORT_V2.selectedContextPeriods);expect((built.evidence.find(row=>row.id==="CHILD:LIFETIME_CONTEXT")?.value as unknown[]).length).toBe(LIFETIME_REPORT_V2.selectedContextPeriods);expect(built.timeline.length).toBe((analysis.daeun.periods).length);});

  it("validates section order, evidence scope, professional details and exact engine metrics",()=>{const built=input(),output=report(built);expect(validateGrounding(output,built)).toBe(true);const wrongOrder=structuredClone(output);wrongOrder.sections.reverse();expect(()=>validateGrounding(wrongOrder,built)).toThrow(GroundingValidationError);
    const wellness=output.sections.find(row=>row.id==="wellness")!,balance=built.evidence.find(row=>row.id==="WELLNESS:BALANCE")!,value=(balance.value as {score:number}).score;wellness.evidenceIds=[balance.id];wellness.metrics=[{id:"wellness-balance",label:"타고난 컨디션 균형",value,unit:"SCORE",evidenceId:balance.id}];expect(validateGrounding(output,built)).toBe(true);wellness.metrics[0].value=value+1;expect(()=>validateGrounding(output,built)).toThrow(GroundingValidationError);});

  it("rejects children assertions, fetal probability, disease claims and support/activity confusion",()=>{const built=input();for(const phrase of ["자녀는 두 명입니다","첫째는 아들입니다","임신이 어렵습니다","심장이 약합니다","질병 확률이 높습니다","활성도가 높아 좋은 운입니다"]){const output=report(built);output.sections[0].paragraphs=[phrase];expect(()=>validateGrounding(output,built)).toThrow(GroundingValidationError);}});

  it("uses lifetime prompt locks, rejects invented numbers, and keeps legacy reports valid",async()=>{expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain("실제 태아 성별");expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain("support와 activation");const built=input(),invented=report(built);invented.sections[0].paragraphs=["책임감은 82점입니다."];expect(()=>validateGrounding(invented,built)).toThrow(GroundingValidationError);
    const provider=new Mock(),result=await interpretSajuAnalysis(analysis,provider,{reportType:"LIFETIME_GENERAL",relationshipStatus:"DATING"});expect(result.status).toBe("completed");expect(provider.calls[0].systemPrompt).toContain("lifetime-report-v2");for(const reportType of ["COMPREHENSIVE","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY"] as const){const legacy=buildInterpretationInput(analysis,{reportType,referenceInstant});expect(legacy.version).toBe("interpretation-input-v1");}});

  it("isolates provider failure without changing deterministic analysis",async()=>{const before=structuredClone(analysis),result=await interpretSajuAnalysis(analysis,new Mock(new InterpretationProviderError("down")),{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE"});expect(result).toMatchObject({status:"failed",error:{code:"PROVIDER_ERROR"}});expect(analysis).toEqual(before);});
});
