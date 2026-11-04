import { describe, expect, it } from "vitest";
import type { SajuAnalysis } from "@/types/saju-analysis";
import synthetic from "../samples/SYNTHETIC_CORE_001.json";
import { selectPersonalityInterpretations, createPersonalityWritingBrief } from "@/lib/saju/ai-interpretation/personality-editorial.v1";
import { generateConditionalBehaviorCandidates } from "@/lib/saju/ai-interpretation/personality-behavior.v2";

const chart=synthetic.response as unknown as SajuAnalysis;
const publicPosition=(source:string) => /^PILLAR:(year|month):/.test(source);

describe("V5.6 section-specific depth checks, not personality accuracy", () => {
  it("selects grounded behavior hypotheses for formerly abstract 02, 08, 10", () => {
    const plan=selectPersonalityInterpretations(chart);
    expect(plan.sections).toHaveLength(10);
    for(const id of ["P01-02","P01-08","P01-10"]){
      const chosen=plan.sections.find(s=>s.sectionId===id)?.selected;
      expect(chosen?.behaviorHypothesis?.inferenceLevel).toBe("CONDITIONAL_INTERPRETATION");
      expect(chosen?.confidence).toBe("LOW_CONFIDENCE_HYPOTHESIS");
      expect(chosen?.behaviorHypothesis?.possibleMotive).toBeNull();
    }
    const pairs=plan.sections.map(s=>s.selected?.behaviorHypothesis?.semanticPairKey).filter(Boolean);
    expect(new Set(pairs).size).toBe(pairs.length);
  });
  it("requires different natal positions for public versus private context", () => {
    const selected=selectPersonalityInterpretations(chart).sections.find(s=>s.sectionId==="P01-02")!.selected!;
    expect(selected.sourceIds).toHaveLength(2);
    expect(selected.sourceIds.some(publicPosition)).toBe(true);
    expect(selected.sourceIds.some(id=>!publicPosition(id))).toBe(true);
    expect(selected.behaviorHypothesis?.axis).toContain("사적인");
  });
  it("makes problem responses a contrast of constraint and response, not stress tolerance", () => {
    const selected=selectPersonalityInterpretations(chart).sections.find(s=>s.sectionId==="P01-08")!.selected!;
    expect(selected.behaviorHypothesis?.axis).toContain("문제");
    expect(selected.behaviorHypothesis?.observableBehavior).toContain("먼저 확인할지");
    expect(selected.behaviorHypothesis?.counterCondition).toContain("급하면");
    expect(JSON.stringify(selected.behaviorHypothesis)).not.toContain("스트레스 내성");
  });
  it("connects the weakness to the preceding strength with one new source", () => {
    const sections=selectPersonalityInterpretations(chart).sections;
    const strength=sections.find(s=>s.sectionId==="P01-09")!.selected!;
    const weakness=sections.find(s=>s.sectionId==="P01-10")!.selected!;
    expect(weakness.behaviorHypothesis?.linkedStrengthCandidateId).toBe(strength.id);
    expect(weakness.sourceIds.filter(id=>strength.sourceIds.includes(id))).toHaveLength(1);
    expect(weakness.sourceIds.some(id=>!strength.sourceIds.includes(id))).toBe(true);
    expect(weakness.behaviorHypothesis?.observableBehavior).toContain("부담");
    const brief=createPersonalityWritingBrief(selectPersonalityInterpretations(chart));
    expect(brief.sections.find(s=>s.id==="P01-10")?.primary?.behaviorHypothesis?.linkedStrengthCandidateId).toBe(strength.id);
  });
  it("does not infer behaviors when ten-god computation is missing", () => {
    const missing=structuredClone(chart);
    missing.tenGods={status:"not_implemented",value:null,evidence:[]};
    expect(generateConditionalBehaviorCandidates(missing)).toEqual([]);
  });
});

describe("V4: grounded strength and semantic repetition control", () => {
  it("matches the strength scene to the actual ten-god families", () => {
    const plan=selectPersonalityInterpretations(chart);
    const strength=plan.sections.find(s=>s.sectionId==="P01-09")!.selected!;
    const h=strength.behaviorHypothesis!;
    expect(h.scenarioRuleId).toBe("P01-09:"+h.semanticFamilyPairKey);
    if(h.semanticFamilyPairKey!=="output|resource") {
      expect(h.trigger).not.toContain("새로 배운");
      expect(h.trigger).not.toContain("새로 익힌");
      expect(h.observableBehavior).not.toContain("배운 내용을 실천");
    }
    expect(h.observableBehavior.length).toBeGreaterThan(12);
  });
  it("rejects fabricated strength learning scenes before they reach the writer", () => {
    const original=selectPersonalityInterpretations(chart).sections[8].selected!;
    const forged={...original,id:"FORGED-STRENGTH-SCENE",narrativeKey:"forged-learning-scene",
      editorialPriority:999,behaviorHypothesis:{...original.behaviorHypothesis!,
        trigger:"새로 배운 것을 실전에 옮길 때",scenarioRuleId:"P01-09:output|resource"}};
    const audited=selectPersonalityInterpretations(chart,[forged]);
    const row=audited.sections[8].assessments.find(row=>row.candidateId===forged.id)!;
    expect(row.flags).toContain("SCENE_MISMATCH");
    expect(row.decision).toBe("REJECTED");
  });
  it("checks cross-chapter behavioral meaning, not only literal ten-god pair keys", () => {
    const plan=selectPersonalityInterpretations(chart);
    expect(plan.audit.semanticOverlapReviews.length).toBeGreaterThan(0);
    for(const row of plan.audit.semanticOverlapReviews) {
      expect(row.overlappingMotifs.length).toBeGreaterThanOrEqual(1);
      const section=plan.sections.find(s=>s.selected?.id===row.candidateId)!;
      expect(section.assessments.find(a=>a.candidateId===row.candidateId)?.flags)
        .toContain("SEMANTIC_OVERLAP");
    }
    // Reviewer warnings must survive into the writing plan.
    const brief=createPersonalityWritingBrief(plan);
    expect(brief.instructions.join(" ")).toContain("의미 중복");
  });
  it("keeps P01-10 linked to a validated P01-09 strength scene", () => {
    const plan=selectPersonalityInterpretations(chart);
    const strength=plan.sections[8].selected!;
    const burden=plan.sections[9].selected!;
    expect(strength.behaviorHypothesis?.scenarioRuleId).toBeTruthy();
    expect(burden.behaviorHypothesis?.linkedStrengthCandidateId).toBe(strength.id);
  });
});
