import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { buildPersonalityCandidatePlan } from "@/lib/saju/ai-interpretation/personality-candidates.v1";
import { selectPersonalityInterpretations } from "@/lib/saju/ai-interpretation/personality-editorial.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const SIX = [
  ["1995-09-30", "08:29"], ["1991-02-14", "18:40"],
  ["1988-07-02", "05:15"], ["2000-11-18", "22:05"],
  ["1998-05-26", "11:35"], ["2002-01-09", "13:20"],
] as const;
function analyze(date:string,time:string) {
  return calculateSaju({...SYNTHETIC_INPUT,name:"가상인물",birthDate:date,birthTime:time});
}

describe("V5.6 diverse-chart coverage (development quality, not psychological accuracy)",()=>{
  it("provides competing hypotheses for all ten headings in six contrasting charts",()=>{
    const plans=SIX.map(([date,time])=>selectPersonalityInterpretations(analyze(date,time)));
    for (const plan of plans) {
      expect(plan.status).toBe("reviewable");
      expect(plan.audit.emptySections).toEqual([]);
      expect(plan.audit.singleCandidateSections).toEqual([]);
      expect(plan.sections.every(s=>s.selected && s.alternatives.length>=1)).toBe(true);
      const pairSignatures=plan.sections.map(s=>s.selected!.sourceIds.filter(x=>x.startsWith("PILLAR:")).sort().join("|"));
      expect(new Set(pairSignatures).size).toBe(10);
    }
    const descriptions=plans.flatMap(p=>p.sections.map(s=>s.selected!.claim));
    expect(new Set(descriptions).size).toBeGreaterThanOrEqual(45);
    // Previously identical 'intake vs expression' selection in C/D/E.
    const expressions=plans.slice(2,5).map(p=>p.sections[3].selected!.claim);
    expect(new Set(expressions).size).toBe(3);
  },60000);

  it("does not treat invalid natal data as permission to produce missing sections",()=>{
    const analysis=analyze("1991-02-14","18:40");
    analysis.tenGods={status:"not_implemented",value:null,evidence:[]};
    const plan=buildPersonalityCandidatePlan(analysis);
    expect(plan.diagnostics.emptySectionIds).toHaveLength(10);
    expect(selectPersonalityInterpretations(analysis).status).toBe("needs_more_evidence");
  });

  it("checks 36 extra nonrepresentative month/year combinations for empty topics",()=>{
    const rows=Array.from({length:36},(_,i)=>({
      date:String(1982+i)+"-"+String(1+(i*7)%12).padStart(2,"0")+"-15",
      time:String(4+(i*3)%19).padStart(2,"0")+":15",
    }));
    const plans=rows.map(row=>selectPersonalityInterpretations(analyze(row.date,row.time)));
    const counts=plans.map(p=>p.sections.filter(s=>!!s.selected).length);
    const alternatives=plans.map(p=>p.sections.reduce((n,s)=>n+s.alternatives.length,0));
    expect(counts.every(n=>n===10)).toBe(true);
    expect(alternatives.every(n=>n>=10)).toBe(true);
    expect(plans.every(p=>p.audit.emptySections.length===0)).toBe(true);
  },120000);
});
