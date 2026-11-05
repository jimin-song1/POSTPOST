import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluatePersonalityPriority } from "@/lib/saju/ai-interpretation/personality-priority.v1";
import { buildPersonalityCandidatePlan } from "@/lib/saju/ai-interpretation/personality-candidates.v1";
import { selectPersonalityInterpretations,createPersonalityWritingBrief } from "@/lib/saju/ai-interpretation/personality-editorial.v1";
import { buildPersonalityEvidence } from "@/lib/saju/ai-interpretation/personality-generation.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const calculate=(date:string,time:string)=>calculateSaju({...SYNTHETIC_INPUT,birthDate:date,birthTime:time});

const sample=()=>calculate("1995-09-30","08:29");

describe("V5.6 priority: computed structural context, not personality score",()=>{
  it("prioritizes calendar month main-qi and private day branch only when actually cited",()=>{
    const a=sample();
    const candidates=buildPersonalityCandidatePlan(a).sections[0].candidates;
    const month=candidates.find(c=>c.sourceIds.some(id=>id.startsWith("PILLAR:month:branch:")))!;
    const without=candidates.find(c=>!c.sourceIds.some(id=>id.startsWith("PILLAR:month:branch:")))!;
    expect(month).toBeDefined();expect(without).toBeDefined();
    expect(evaluatePersonalityPriority(a,month).signals.some(s=>s.code==="MONTH_COMMAND" && s.impact===2)).toBe(true);
    expect(evaluatePersonalityPriority(a,without).signals.some(s=>s.code==="MONTH_COMMAND")).toBe(false);
  });
  it("keeps strength and useful-god disagreements contextual, not points",()=>{
    const a=sample(),candidate=buildPersonalityCandidatePlan(a).sections[0].candidates[0];
    const baseline=evaluatePersonalityPriority(a,candidate);
    const other=structuredClone(a);
    other.strength.adjusted.level="극왕";
    if(other.usefulGods.synthesis.status!=="implemented")throw new Error("expected synthesis");
    other.usefulGods.synthesis.primaryElements=[];
    expect(evaluatePersonalityPriority(other,candidate).adjustment).toBe(baseline.adjustment);
    const signals=evaluatePersonalityPriority(other,candidate).signals;
    expect(signals.find(s=>s.code==="STRENGTH_CONTEXT")?.impact).toBe(0);
    expect(signals.find(s=>s.code==="USEFUL_GOD_CONTEXT")?.impact).toBe(0);
  });
  it("penalizes an unestablished structure without inventing new chart facts",()=>{
    const a=sample();
    const candidate=buildPersonalityCandidatePlan(a).sections[0].candidates.find(c=>c.sourceIds.some(id=>id.startsWith("PILLAR:month:branch:")))!;
    const base=evaluatePersonalityPriority(a,candidate);
    const altered=structuredClone(a);
    if(altered.structure.primary)altered.structure.primary.status="UNRESOLVED";
    else altered.structure.primary=null;
    const next=evaluatePersonalityPriority(altered,candidate);
    expect(next.signals.some(s=>s.code==="STRUCTURE_UNCERTAIN"&&s.impact<0)).toBe(true);
    expect(next.adjustment).toBeLessThanOrEqual(base.adjustment);
    expect(next.counterConsiderations.join(" ")).toContain("격국");
  });
  it("derives explanatory notes from actual citations and never leaks identity",()=>{
    const a=sample();const before=structuredClone(a);
    const plan=selectPersonalityInterpretations(a),brief=createPersonalityWritingBrief(plan);
    const evidence=new Set(buildPersonalityEvidence(a).map(x=>x.id));
    for(const section of brief.sections){
      if(!section.primary)continue;
      expect(section.primary.editorialContext.length).toBeGreaterThan(0);
      expect(section.primary.evidenceIds.every(id=>evidence.has(id))).toBe(true);
      expect(section.primary.counterConsiderations.every(note=>typeof note==="string")).toBe(true);
    }
    expect(JSON.stringify(brief)).not.toContain(SYNTHETIC_INPUT.name);
    expect(a).toEqual(before);
  });

  it("does not cite nonexistent primary structure while noting the uncertainty",()=>{
    const a=sample();
    a.structure.primary=null;
    const plan=selectPersonalityInterpretations(a);
    const brief=createPersonalityWritingBrief(plan);
    const allow=new Set(buildPersonalityEvidence(a).map(e=>e.id));
    expect(allow.has("NATAL:STRUCTURE:PRIMARY")).toBe(false);
    expect(brief.sections.some(s=>s.primary?.counterConsiderations.some(x=>x.includes("격국")))).toBe(true);
    for(const section of brief.sections){
      if(section.primary)expect(section.primary.evidenceIds.every(id=>allow.has(id))).toBe(true);
    }
  });

  it("changes ranking when source-position relevance changes, with no new natal scores",()=>{
    const a=sample(),p=buildPersonalityCandidatePlan(a).sections[0].candidates;
    const candidate=p.find(c=>c.sourceIds.some(id=>id.startsWith("PILLAR:month:branch:")))!;
    const original=evaluatePersonalityPriority(a,candidate);
    const sanitized=structuredClone(candidate);
    sanitized.sourceIds=sanitized.sourceIds.map(id=>id.startsWith("PILLAR:month:branch:") ? id.replace("PILLAR:month:branch:","INVALID:") : id);
    const modified=evaluatePersonalityPriority(a,sanitized);
    expect(modified.signals.some(x=>x.code==="MONTH_COMMAND")).toBe(false);
    const supports=(signals: typeof original.signals)=>signals.filter(s=>s.status==="SUPPORT").reduce((n,s)=>n+s.impact,0);
    expect(supports(modified.signals)).toBeLessThan(supports(original.signals));
  });
});
