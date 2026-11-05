import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { SYNTHETIC_INPUT } from "./synthetic-input";
import { generateConditionalBehaviorCandidates } from "@/lib/saju/ai-interpretation/personality-behavior.v2";
import { selectPersonalityInterpretations, createPersonalityWritingBrief } from "@/lib/saju/ai-interpretation/personality-editorial.v1";

const chart = (birthDate:string,birthTime:string) =>
  calculateSaju({...SYNTHETIC_INPUT,name:"익명 테스트",birthDate,birthTime});
const cases = [
  ["1995-09-30","08:29"],["1991-02-14","18:40"],["1988-07-02","05:15"],
  ["2000-11-18","22:05"],["1998-05-26","11:35"],["2002-01-09","13:20"],
] as const;

describe("V5.6 conditional behavior hypotheses (not personality truth)",()=>{
  it("builds distinct, grounded conditional hypotheses on six different charts",()=>{
    const results=cases.map(([date,time])=>generateConditionalBehaviorCandidates(chart(date,time)));
    expect(results.some(rows=>rows.length>0)).toBe(true);
    for(const rows of results){
      // V2 must not manufacture a contrast for an unrelated subsection.
      // A chart with no relevant cross-family signal may correctly get no V2 candidates.
      for(const row of rows){
        expect(row.sourceIds).toHaveLength(2);
        expect(new Set(row.sourceIds.map(x=>x.split(":")[1])).size).toBe(2);
        expect(row.behaviorHypothesis?.trigger.length).toBeGreaterThan(8);
        expect(row.behaviorHypothesis?.observableBehavior.length).toBeGreaterThan(20);
        expect(row.behaviorHypothesis?.counterCondition.length).toBeGreaterThan(12);
        expect(row.behaviorHypothesis?.possibleMotive).toBeNull();
        expect(row.behaviorHypothesis?.inferenceSteps.length).toBeGreaterThanOrEqual(3);
        expect(row.behaviorHypothesis?.semanticPairKey.split("|")).toHaveLength(2);
        expect(row.behaviorHypothesis?.semanticPairKey.split("|")[0]).not.toBe(row.behaviorHypothesis?.semanticPairKey.split("|")[1]);
        expect(row.behaviorHypothesis?.observableBehavior).not.toContain("을(를)");
        expect(row.claim).not.toContain("과(와)");
        expect(row.evidenceIds).toContain("NATAL:PILLARS");
        expect(row.evidenceIds).toContain("NATAL:TEN_GODS");
      }
    }
    const firstNarratives=results.map(rows=>rows.filter(x=>x.sectionId==="P01-05").map(x=>x.behaviorHypothesis?.decisionBasis).join("|"));
    expect(new Set(firstNarratives).size).toBeGreaterThanOrEqual(2);
  });
  it("does not create predictions when natal ten-god inputs are unavailable",()=>{
    const a=chart("1995-09-30","08:29");
    a.tenGods={status:"not_implemented",value:null,evidence:[]};
    expect(generateConditionalBehaviorCandidates(a)).toEqual([]);
  });
  it("never promotes derived structure to an independent pillar source",()=>{
    const a=chart("1995-09-30","08:29");
    const rows=generateConditionalBehaviorCandidates(a);
    for(const r of rows){
      if(r.evidenceIds.includes("NATAL:STRUCTURE:PRIMARY")){
        expect(r.sourceIds.every(id=>id.startsWith("PILLAR:"))).toBe(true);
        expect(r.behaviorHypothesis?.structuralContext.some(x=>x.includes("독립")||x.includes("격국"))).toBe(true);
      }
    }
    const altered=structuredClone(a);
    altered.structure.primary=null;
    expect(generateConditionalBehaviorCandidates(altered).every(r=>!r.evidenceIds.includes("NATAL:STRUCTURE:PRIMARY"))).toBe(true);
  });
  it("passes real engine evidence into the review brief without user identity or invented motives",()=>{
    const a=chart("1995-09-30","08:29"),before=structuredClone(a);
    const plan=selectPersonalityInterpretations(a),brief=createPersonalityWritingBrief(plan);
    expect(plan.sections).toHaveLength(10);
    expect(plan.sections.filter(s=>s.selected?.id.startsWith("V56-B2-")).length).toBeGreaterThanOrEqual(2);
    const pairs=plan.sections.map(s=>s.selected?.behaviorHypothesis?.semanticPairKey).filter(Boolean);
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(brief.sections.some(s=>s.primary?.behaviorHypothesis)).toBe(true);
    for(const section of brief.sections){
      const h=section.primary?.behaviorHypothesis;
      if(!h)continue;
      expect(h.possibleMotive).toBeNull();
      expect(h.inferenceLevel).toBe("CONDITIONAL_INTERPRETATION");
      expect(h.counterCondition).toBeTruthy();
    }
    expect(JSON.stringify(brief)).not.toContain(SYNTHETIC_INPUT.name);
    expect(a).toEqual(before);
  });
});
