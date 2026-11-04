import { describe, expect, it } from "vitest";
import type { SajuAnalysis } from "@/types/saju-analysis";
import sample from "../samples/SYNTHETIC_CORE_001.json";
import { generateConditionalBehaviorCandidates } from "@/lib/saju/ai-interpretation/personality-behavior.v2";
import { selectPersonalityInterpretations } from "@/lib/saju/ai-interpretation/personality-editorial.v1";
import { findUnsupportedPersonalityClaims, behavioralOverlap } from "@/lib/saju/ai-interpretation/personality-claim-guard.v1";

const analysis=sample.response as unknown as SajuAnalysis;

describe("V5 editorial source-to-claim contract", () => {
  it("rejects a changed behavior even when its original evidence IDs are valid", () => {
    const selected=generateConditionalBehaviorCandidates(analysis).find(c=>c.sectionId==="P01-09")!;
    const forged={...selected,editorialPriority:999,behaviorHypothesis:{
      ...selected.behaviorHypothesis!,observableBehavior:"처음 본 사람의 거짓말을 단번에 알아내는 능력이 있습니다.",
    }};
    const review=selectPersonalityInterpretations(analysis,[forged]);
    const entry=review.sections[8].assessments.find(a=>a.candidateId===selected.id)!;
    expect(entry.flags).toContain("UNSUPPORTED_BEHAVIOR_CONTRACT");
    expect(entry.decision).toBe("REJECTED");
  });
  it("rejects unsupported exceptional personality claims regardless of evidence ID", () => {
    expect(findUnsupportedPersonalityClaims("처음 본 사람의 거짓말을 단번에 알아내는 능력이 있습니다.")).toContain("CLAIM_MIND_READING");
    expect(findUnsupportedPersonalityClaims("당신은 공황장애가 있습니다.")).toContain("CLAIM_CLINICAL_DIAGNOSIS");
    expect(findUnsupportedPersonalityClaims("타고난 독심술이 있습니다.")).toContain("CLAIM_UNVERIFIED_GIFT");
    expect(findUnsupportedPersonalityClaims("책임을 나누는 조건을 비교할 수도 있습니다.")).toEqual([]);
  });
  it("uses novelty penalties before choosing; never invents a replacement trait", () => {
    const pool=generateConditionalBehaviorCandidates(analysis);
    const a=pool.find(c=>c.sectionId==="P01-01")!;
    const b=pool.find(c=>c.sectionId==="P01-07" && c.behaviorHypothesis?.semanticMotifs?.length)!;
    const same={...b,behaviorHypothesis:{...b.behaviorHypothesis!,
      semanticMotifs:[...(a.behaviorHypothesis?.semanticMotifs ?? [])],
      semanticFamilyPairKey:a.behaviorHypothesis?.semanticFamilyPairKey}};
    expect(behavioralOverlap(a,same).nearDuplicate).toBe(true);
    expect(behavioralOverlap(a,same).penalty).toBeGreaterThan(0);
    const plan=selectPersonalityInterpretations(analysis);
    expect(plan.sections).toHaveLength(10);
    expect(plan.audit.warnings.some(w=>w.includes("별도 작업"))).toBe(true);
  });
});
