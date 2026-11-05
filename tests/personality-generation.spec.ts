import {describe,it,expect} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import {getTenGod} from "@/lib/saju/interpretation/ten-gods";
import {SYNTHETIC_INPUT} from "./synthetic-input";
import {
  generatePersonalityV56Draft, validatePersonalityDraft, buildPersonalityEvidence,
  type PersonalityWritingProvider,type PersonalityWritingRequest,
} from "@/lib/saju/ai-interpretation/personality-generation.v1";
import {OpenAIPersonalityWriter} from "@/lib/saju/ai-interpretation/personality-openai.v1";

// Controlled editorial fixture: natal components are intentionally overwritten
// to exercise a rule combination; this is not a recomputed birth chart.
function fixture() {
  const a=structuredClone(calculateSaju(SYNTHETIC_INPUT));
  const gods=a.tenGods.value;
  if(!gods)throw new Error("fixture needs ten-god output");
  a.dayMaster="甲";gods.dayMaster="甲";
  a.pillars.year.stem="乙";a.pillars.month.stem="乙";a.pillars.month.branch="酉";
  a.pillars.day.stem="甲";a.pillars.day.branch="子";a.pillars.hour.stem="戊";
  gods.heavenlyStems.year=getTenGod("甲","乙");gods.heavenlyStems.month=getTenGod("甲","乙");
  gods.heavenlyStems.day=getTenGod("甲","甲");gods.heavenlyStems.hour=getTenGod("甲","戊");
  gods.hiddenStems.month=[{role:"mainQi",stem:"辛",tenGod:getTenGod("甲","辛")}];
  gods.hiddenStems.day=[{role:"mainQi",stem:"癸",tenGod:getTenGod("甲","癸")}];
  a.strength.adjusted.status="implemented";a.strength.adjusted.level="중화신약";
  return a;
}
function validDraft(request:PersonalityWritingRequest) {
  return {version:"personality-v56-draft-v1",sections:request.brief.sections.map(s=>({
    id:s.id,title:s.title,headline:s.title + "에서 읽는 " + s.primary!.claim,
    lead:s.primary!.unexpected,
    paragraphs:[
      "이 항목에서 살펴볼 기본 가설은 " + s.primary!.claim + " " + s.primary!.strength + " 명식의 요소를 생활에서 해석하는 예시이며 실제 고객의 행동을 관찰했다는 뜻은 아닙니다.",
      "이 특징에는 부담도 연결됩니다. " + s.primary!.drawback + " " + s.primary!.unexpected + " 예를 들어 " + s.primary!.exampleScene + " 같은 경우를 생각해 볼 수 있어요.",
    ],evidenceIds:[...s.primary!.evidenceIds],
  }))};
}
class ScriptedProvider implements PersonalityWritingProvider {
  calls:PersonalityWritingRequest[]=[];
  constructor(private readonly produce:(req:PersonalityWritingRequest,n:number)=>unknown){}
  async generate(req:PersonalityWritingRequest) {this.calls.push(req);return this.produce(req,this.calls.length);}
}

describe("V5.6 full PART01 writing draft (isolated, not V2)",()=>{
  it("generates ten ordered review-only sections with exact approved references",async()=>{
    const a=fixture();const before=structuredClone(a);
    const writer=new ScriptedProvider(validDraft);
    const result=await generatePersonalityV56Draft(a,writer,"MARRIED");
    expect(result.status).toBe("draft_needs_review");
    if(result.status!=="draft_needs_review")throw new Error(JSON.stringify(result));
    expect(result.draft.sections.length).toBe(10);
    expect(result.repaired).toBe(false);
    expect(writer.calls.length).toBe(1);
    expect(a).toEqual(before);
    const payload=JSON.stringify(writer.calls[0]);
    expect(payload).not.toContain(SYNTHETIC_INPUT.name);
    expect(payload).not.toContain(SYNTHETIC_INPUT.birthDate);
  });
  it("builds personality facts even when unrelated fortune, wellness and children modules are unavailable",async()=>{
    const a=fixture();
    a.wellness={status:"not_implemented",value:null,evidence:[]};
    a.childrenFortune={status:"not_implemented",value:null,evidence:[]};
    a.fortune={status:"not_implemented",value:null,evidence:[]};
    const facts=buildPersonalityEvidence(a);
    expect(new Set(facts.map(f=>f.id))).toEqual(new Set([
      "NATAL:PILLARS","NATAL:TEN_GODS","NATAL:STRENGTH:ADJUSTED","NATAL:STRUCTURE:PRIMARY",
      "NATAL:RELATIONS","NATAL:STRUCTURE:QUALITY"
    ]));
    const provider=new ScriptedProvider(validDraft);
    const result=await generatePersonalityV56Draft(a,provider,"SINGLE");
    expect(result.status).toBe("draft_needs_review");
    expect(provider.calls).toHaveLength(1);
  });
  it("does not invent structure or strength evidence when a required module is unavailable",async()=>{
    const a=fixture(); a.structure.status="not_implemented";
    const facts=buildPersonalityEvidence(a);
    expect(facts.some(f=>f.id==="NATAL:STRUCTURE:PRIMARY")).toBe(false);
    const provider=new ScriptedProvider(validDraft);
    const result=await generatePersonalityV56Draft(a,provider,"SINGLE");
    if (result.status==="draft_needs_review") {
      expect(provider.calls[0].evidence.some(f=>f.id==="NATAL:STRUCTURE:PRIMARY")).toBe(false);
      expect(result.draft.sections.every(s=>!s.evidenceIds.includes("NATAL:STRUCTURE:PRIMARY"))).toBe(true);
    } else expect(result.status).toBe("needs_more_evidence");
  });
  it("repairs invalid source references only once",async()=>{
    const writer=new ScriptedProvider((req,n)=>{
      const draft=validDraft(req);
      if(n===1)draft.sections[0].evidenceIds=["FAKE:NOT_FROM_ENGINE"];
      return draft;
    });
    const result=await generatePersonalityV56Draft(fixture(),writer,"SINGLE");
    expect(result.status).toBe("draft_needs_review");
    if(result.status==="draft_needs_review")expect(result.repaired).toBe(true);
    expect(writer.calls).toHaveLength(2);
    expect(writer.calls[1].repair?.errors.some(s=>s.includes("unapproved evidence"))).toBe(true);
  });
  it("never delivers fabricated metrics or internal booleans even after repair",async()=>{
    const writer=new ScriptedProvider(req=>{
      const draft=validDraft(req);
      draft.sections[1].paragraphs[0]="직감력 99점 true "+draft.sections[1].paragraphs[0];
      return draft;
    });
    const result=await generatePersonalityV56Draft(fixture(),writer,"MARRIED");
    expect(result.status).toBe("failed_validation");
    if(result.status==="failed_validation"){
      expect(result.attempts).toBe(2);
      expect(result.errors.join(" ")).toMatch(/internal data|ungrounded number/);
    }
  });
  it("rejects leaked computation variables and categorical life predictions",async()=>{
    const writer=new ScriptedProvider(validDraft);
    const result=await generatePersonalityV56Draft(fixture(),writer,"SINGLE");
    expect(result.status).toBe("draft_needs_review");
    const request=writer.calls[0];
    const leaked=validDraft(request);
    leaked.sections[0].paragraphs[0]="dayJiHap true. "+leaked.sections[0].paragraphs[0];
    const checkLeak=validatePersonalityDraft(leaked,request.brief,request.evidence);
    expect(checkLeak.ok).toBe(false);
    if(!checkLeak.ok)expect(checkLeak.errors.join(" ")).toContain("leaked internal data");
    const semanticLeak=validDraft(request);
    semanticLeak.sections[0].paragraphs[0]="semanticPairKey 비견|정인. "+semanticLeak.sections[0].paragraphs[0];
    const checkedSemantic=validatePersonalityDraft(semanticLeak,request.brief,request.evidence);
    expect(checkedSemantic.ok).toBe(false);
    if(!checkedSemantic.ok)expect(checkedSemantic.errors.join(" ")).toContain("leaked internal data");
    const predicted=validDraft(request);
    predicted.sections[0].paragraphs[0]="반드시 임신에 성공합니다. "+predicted.sections[0].paragraphs[0];
    const checkPrediction=validatePersonalityDraft(predicted,request.brief,request.evidence);
    expect(checkPrediction.ok).toBe(false);
    if(!checkPrediction.ok)expect(checkPrediction.errors.join(" ")).toContain("unsupported real-world prediction");
  });
  it("repairs V5.6 Korean style violations without changing the evidence",async()=>{
    const writer=new ScriptedProvider((req,n)=>{
      const draft=validDraft(req);
      if(n===1)draft.sections[0].paragraphs[0]="이것은 중요합니다—"+draft.sections[0].paragraphs[0];
      return draft;
    });
    const result=await generatePersonalityV56Draft(fixture(),writer,"SINGLE");
    expect(result.status).toBe("draft_needs_review");
    if(result.status==="draft_needs_review")expect(result.repaired).toBe(true);
    expect(writer.calls[1].repair?.errors.join(" ")).toContain("korean writing style EM_DASH");
  });
  it("does not authorize numeric claims using facts outside the cited section",async()=>{
    const writer=new ScriptedProvider(validDraft);
    const result=await generatePersonalityV56Draft(fixture(),writer,"SINGLE");
    expect(result.status).toBe("draft_needs_review");
    const request=writer.calls[0];
    const draft=validDraft(request);
    const externalEvidence=[...request.evidence,{id:"OUTSIDE:METRIC",kind:"CONTEXT" as const,value:{score:97.31}}];
    draft.sections[0].paragraphs[0]="실제 수치 97.31점. "+draft.sections[0].paragraphs[0];
    const validated=validatePersonalityDraft(draft,request.brief,externalEvidence);
    expect(validated.ok).toBe(false);
    if(!validated.ok)expect(validated.errors.join(" ")).toMatch(/ungrounded number/);
  });
  it("checks actual cross-section paragraph duplication",async()=>{
    const writer=new ScriptedProvider(req=>{
      const draft=validDraft(req);
      draft.sections[1].paragraphs[0]=draft.sections[0].paragraphs[0];
      return draft;
    });
    const result=await generatePersonalityV56Draft(fixture(),writer,"SINGLE");
    expect(result.status).toBe("failed_validation");
    if(result.status==="failed_validation")expect(result.errors.join(" ")).toContain("repeats paragraph");
  });
  it("does not ask an AI to invent ten chapters when a rule has no grounding",async()=>{
    const a=fixture();a.tenGods={status:"not_implemented",value:null,evidence:[]};
    const writer=new ScriptedProvider(validDraft);
    const result=await generatePersonalityV56Draft(a,writer,"SINGLE");
    expect(result.status).toBe("needs_more_evidence");
    expect(writer.calls).toHaveLength(0);
  });
  it("sends strict OpenAI Responses payload without persistent storage",async()=>{
    let sent="";
    const adapter=new OpenAIPersonalityWriter({apiKey:"test-only",model:"mock-model",fetchImpl:async (_url,init)=>{
      sent=String(init?.body);return new Response(JSON.stringify({output_text:JSON.stringify({success:true})}),{status:200});
    }});
    const provider=new ScriptedProvider(validDraft);
    const req=await generatePersonalityV56Draft(fixture(),provider,"SINGLE");
    expect(req.status).toBe("draft_needs_review");
    const output=await adapter.generate(provider.calls[0]);
    expect(output).toEqual({success:true});
    const payload=JSON.parse(sent) as {store?:boolean;text?:{format?:{type?:string}}};
    expect(payload.store).toBe(false);
    expect(payload.text?.format?.type).toBe("json_schema");
  });
});
