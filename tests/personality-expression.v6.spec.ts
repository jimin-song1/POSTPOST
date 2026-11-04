import { describe, expect, it } from "vitest";
import type { SajuAnalysis } from "@/types/saju-analysis";
import synthetic from "../samples/SYNTHETIC_CORE_001.json";
import { generateConditionalBehaviorCandidates } from "@/lib/saju/ai-interpretation/personality-behavior.v2";
import { selectPersonalityInterpretations, createPersonalityWritingBrief } from "@/lib/saju/ai-interpretation/personality-editorial.v1";

const chart = synthetic.response as unknown as SajuAnalysis;
const outputGods = new Set(["식신", "상관"]);

describe("V5.6 V6: expression scenes need a real output signal", () => {
  it("selects a new, traceable expression hypothesis for section 04", () => {
    const plan = selectPersonalityInterpretations(chart);
    const chosen = plan.sections.find(s => s.sectionId === "P01-04")?.selected;
    expect(plan.sections).toHaveLength(10);
    expect(chosen?.id).toMatch(/^V56-B2-P01-04-/);
    expect(chosen?.behaviorHypothesis?.scenarioRuleId).toMatch(/^P01-04:output\|/);
    expect(chosen?.sourceIds).toHaveLength(2);
    expect(chosen?.behaviorHypothesis?.observableBehavior).toContain("전달");
    expect(chosen?.behaviorHypothesis?.possibleMotive).toBeNull();
    const relevant = generateConditionalBehaviorCandidates(chart).find(c => c.id === chosen?.id);
    expect(relevant?.behaviorHypothesis).toEqual(chosen?.behaviorHypothesis);
  });

  it("does not invent expression behavior when no output signal is present", () => {
    const withoutOutput = structuredClone(chart);
    if (!withoutOutput.tenGods.value) throw new Error("requires ten-god fixture");
    // Deliberately altered signal fixture, NOT a coherent recalculated natal chart.
    for (const position of ["year", "month", "day", "hour"] as const) {
      const stemGod = withoutOutput.tenGods.value.heavenlyStems[position];
      if (stemGod && outputGods.has(stemGod.korean)) {
        stemGod.korean = "정인";
      }
      for (const stem of withoutOutput.tenGods.value.hiddenStems[position] ?? []) {
        if (outputGods.has(stem.tenGod.korean)) stem.tenGod.korean = "정인";
      }
    }
    expect(generateConditionalBehaviorCandidates(withoutOutput).filter(c => c.sectionId === "P01-04")).toEqual([]);
  });

  it("refuses tampered expression claims despite valid source identifiers", () => {
    const original = generateConditionalBehaviorCandidates(chart).find(c => c.sectionId === "P01-04")!;
    const tampered = { ...original, behaviorHypothesis: {
      ...original.behaviorHypothesis!,
      observableBehavior: "처음 본 사람의 거짓말을 단번에 알아내는 능력",
    } };
    const plan = selectPersonalityInterpretations(chart, [tampered]);
    const reviewed = plan.sections[3].assessments.find(a => a.candidateId === original.id);
    expect(reviewed?.decision).toBe("REJECTED");
    expect(reviewed?.flags).toContain("UNSUPPORTED_BEHAVIOR_CONTRACT");
  });

  it("does not assert a psychological fact in the writing brief", () => {
    const brief = createPersonalityWritingBrief(selectPersonalityInterpretations(chart));
    const chapter = brief.sections.find(s => s.id === "P01-04");
    expect(chapter?.primary?.behaviorHypothesis?.inferenceLevel).toBe("CONDITIONAL_INTERPRETATION");
    expect(chapter?.primary?.claim).toContain("가설");
    expect(chapter?.primary?.claim).not.toContain("타고난 언변 능력");
  });
});
