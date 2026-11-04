import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { getTenGod } from "@/lib/saju/interpretation/ten-gods";
import { SYNTHETIC_INPUT } from "./synthetic-input";
import {
  createPersonalityWritingBrief,selectPersonalityInterpretations,validatePersonalityBriefEvidence,
} from "@/lib/saju/ai-interpretation/personality-editorial.v1";
import { buildPersonalityCandidatePlan } from "@/lib/saju/ai-interpretation/personality-candidates.v1";
import type { PersonalityCandidate } from "@/lib/saju/ai-interpretation/personality-candidates.v1";

function fixture() {
  const a = structuredClone(calculateSaju(SYNTHETIC_INPUT));
  if(!a.tenGods.value)throw new Error("requires ten gods");
  a.dayMaster="甲";a.tenGods.value.dayMaster="甲";
  a.pillars.year.stem="乙";a.pillars.month.stem="乙";
  a.pillars.month.branch="酉";a.pillars.day.stem="甲";a.pillars.day.branch="子";a.pillars.hour.stem="戊";
  for(const [pos,stem] of [["year","乙"],["month","乙"],["day","甲"],["hour","戊"]] as const)
    a.tenGods.value.heavenlyStems[pos]=getTenGod("甲",stem);
  a.tenGods.value.hiddenStems.month=[{role:"mainQi",stem:"辛",tenGod:getTenGod("甲","辛")}];
  a.tenGods.value.hiddenStems.day=[{role:"mainQi",stem:"癸",tenGod:getTenGod("甲","癸")}];
  a.strength.adjusted.status="implemented";a.strength.adjusted.level="중화신약";
  return a;
}

describe("V5.6 editorial comparison before writing",()=>{
  it("compares multiple candidates and records the nonchosen interpretation",()=>{
    const a=fixture();const plan=selectPersonalityInterpretations(a);
    expect(plan.sections).toHaveLength(10);
    const first=plan.sections[0];
    expect(first.assessments.length).toBeGreaterThanOrEqual(3);
    expect(first.selected).not.toBeNull();
    const selectedAssessment=first.assessments.find(row=>row.candidateId===first.selected?.id)!;
    expect(selectedAssessment.prioritySignals.some(s=>s.impact>0)).toBe(true);
    expect(selectedAssessment.prioritySignals.some(s=>s.code==="STRENGTH_CONTEXT")).toBe(true);
    expect(first.alternatives.length).toBeGreaterThan(0);
    expect(first.assessments.map(a=>a.decision)).toContain("ALTERNATIVE");
    expect(plan.audit.singleCandidateSections).toEqual([]);
    expect(first.assessments.some(a=>a.flags.includes("SINGLE_CANDIDATE"))).toBe(false);
  });
  it("rejects stale source and non-existent evidence, instead of inventing a reading",()=>{
    const a=fixture();
    const original=buildPersonalityCandidatePlan(a).sections[0].candidates[0];
    const fake:PersonalityCandidate={...original,id:"BAD-SOURCE",narrativeKey:"different-one",sourceIds:["PILLAR:month:stem:甲","PILLAR:day:branch:子"],evidenceIds:["USEFUL_GOD:UNCONFIRMED"]};
    const result=selectPersonalityInterpretations(a,[fake]);
    const row=result.sections[0].assessments.find(c=>c.candidateId==="BAD-SOURCE")!;
    expect(row.decision).toBe("REJECTED");
    expect(row.flags).toContain("STALE_PROVENANCE");
    expect(row.flags).toContain("INSUFFICIENT_EVIDENCE");
  });
  it("rejects semantic theme re-use across chapters",()=>{
    const a=fixture();
    const original=selectPersonalityInterpretations(a).sections[0].selected!;
    const sameTheme:PersonalityCandidate={...original,id:"COPY-SECOND-CHAPTER",sectionId:"P01-02",sourceIds:[...original.sourceIds],narrativeKey:original.narrativeKey};
    const result=selectPersonalityInterpretations(a,[sameTheme]);
    expect(result.audit.repeatedThemes.some(t=>t.candidateIds.includes("COPY-SECOND-CHAPTER"))).toBe(true);
    expect(result.audit.droppedCandidateIds).toContain("COPY-SECOND-CHAPTER");
  });
  it("rejects copied interpretation text even if a different narrative key is supplied",()=>{
    const a=fixture();
    const first=selectPersonalityInterpretations(a).sections[0].selected!;
    const copy:PersonalityCandidate={...first,id:"COPY-WITH-NEW-KEY",sectionId:"P01-02",narrativeKey:"different-key"};
    const result=selectPersonalityInterpretations(a,[copy]);
    expect(result.audit.droppedCandidateIds).toContain("COPY-WITH-NEW-KEY");
    expect(result.sections[1].assessments.find(c=>c.candidateId==="COPY-WITH-NEW-KEY")?.flags)
      .toContain("DUPLICATE_NARRATIVE");
  });
  it("marks derived scores as non-independent rather than a second personality proof",()=>{
    const p=selectPersonalityInterpretations(fixture());
    const challenge=p.sections.find(s=>s.sectionId==="P01-08")!;
    const derived=challenge.assessments.find(x=>x.candidateId==="V56-P01-H")!;
    expect(derived.flags).toContain("DERIVED_FACT_NOT_INDEPENDENT");
    expect(derived.independentSourcePositions).toEqual(["month"]);
    expect(derived.decision).toBe("REJECTED");
    expect(challenge.selected?.id).toBeDefined();
    expect(challenge.selected?.id).not.toBe("V56-P01-H");
  });
  it("exposes a writing brief without asserting real personal facts or adding scores",()=>{
    const a=fixture(); const before=structuredClone(a);
    const brief=createPersonalityWritingBrief(selectPersonalityInterpretations(a));
    expect(brief.sections).toHaveLength(10);
    expect(brief.sections.every(s=>s.status==="READY_FOR_REVIEW")).toBe(true);
    const serialized=JSON.stringify(brief);
    expect(serialized).not.toContain(SYNTHETIC_INPUT.name);
    expect(serialized).not.toContain("주용신 수 확정");
    expect(a).toEqual(before);
  });
  it("does not repeat the same ten-god contrast as a V2 headline across chapters",()=>{
    const plan=selectPersonalityInterpretations(fixture());
    const pairKeys=plan.sections.map(s=>s.selected?.behaviorHypothesis?.semanticPairKey).filter((key):key is string=>!!key);
    expect(new Set(pairKeys).size).toBe(pairKeys.length);
    for(const section of plan.sections){
      const h=section.selected?.behaviorHypothesis;
      if(h) expect(h.observableBehavior).not.toMatch(/을\(를\)|과\(와\)/);
    }
  });
  it("prevents writing against missing evidence inventory",()=>{
    const brief=createPersonalityWritingBrief(selectPersonalityInterpretations(fixture()));
    expect(validatePersonalityBriefEvidence(brief,[]).length).toBeGreaterThan(0);
    const ids=Array.from(new Set(brief.sections.flatMap(s=>s.primary?.evidenceIds??[])));
    expect(validatePersonalityBriefEvidence(brief,ids.map(id=>({id,kind:"NATAL",value:null})))).toEqual([]);
  });
});
