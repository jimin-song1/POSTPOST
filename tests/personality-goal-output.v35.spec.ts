import { describe, expect, it } from "vitest";
import { behavioralOverlap, goalOutputRelation } from "@/lib/saju/ai-interpretation/personality-claim-guard.v1";
import { extractGoalOutputV34, goalOutputForScene } from "@/lib/saju/ai-interpretation/personality-behavior.v2";
import type { PersonalityCandidate } from "@/lib/saju/ai-interpretation/personality-candidates.v1";

type Hypothesis = NonNullable<PersonalityCandidate["behaviorHypothesis"]>;
const hypothesis = (extra: Partial<Hypothesis>): Hypothesis => ({
  axis: "a", trigger: "t", observableBehavior: "행동", decisionBasis: "b", possibleMotive: null,
  counterCondition: "c", structuralContext: [], inferenceSteps: [], inferenceLevel: "CONDITIONAL_INTERPRETATION",
  semanticPairKey: "x|y", actionGoal: null, observableOutput: null, goalOutputEvidence: "INSUFFICIENT_SCENE", ...extra,
});
const candidate = (id: string, sourceIds: string[], h: Hypothesis) =>
  ({ id, sectionId: "P01-09", sourceIds, evidenceIds: [], behaviorHypothesis: h }) as unknown as PersonalityCandidate;
const rule = (goalKey: Hypothesis["goalKey"], outputKey: string): Partial<Hypothesis> => ({
  actionGoal: `goal:${goalKey}`, observableOutput: `out:${outputKey}`, goalOutputEvidence: "EXPLICIT_SCENE",
  goalKey, outputKey, goalOutputSource: "SCENE_RULE",
});
const motifs = ["role-boundary", "verification", "rules"];

describe("V35 goal/output overlap (selection contract, not personality accuracy)", () => {
  it("does not read 기회비용 followed by 합의 as a cost-sharing agreement", () => {
    expect(extractGoalOutputV34("대안별 기회비용과 활용 가능성을 검토한 다음 합의된 기준과 절차를 확인하는 모습", "선택할 때").goalOutputEvidence)
      .toBe("INSUFFICIENT_SCENE");
    expect(extractGoalOutputV34("누가 지출을 맡을지 합의하는 모습", "여럿이 비용을 나눌 때").goalOutputEvidence).toBe("EXPLICIT_SCENE");
  });

  it("treats the same goal with different wording as a duplicate", () => {
    const a = candidate("a", ["PILLAR:a", "PILLAR:b"], hypothesis({ observableBehavior: "선택지를 좁히는 모습", ...rule("CHOOSE_OPTION", "narrowed-options") }));
    const b = candidate("b", ["PILLAR:c", "PILLAR:d"], hypothesis({ observableBehavior: "우선 조건을 고르는 모습", ...rule("CHOOSE_OPTION", "priority-conditions") }));
    expect(goalOutputRelation(a.behaviorHypothesis!, b.behaviorHypothesis!)).toBe("SAME_GOAL_OR_OUTPUT");
    expect(behavioralOverlap(a, b, { allowGoalOutputDistinct: true }).nearDuplicate).toBe(true);
  });

  it("clears a motif-only duplicate only when distinct goal/output is explicitly allowed", () => {
    const a = candidate("a", ["PILLAR:a", "PILLAR:b"], hypothesis({ observableBehavior: "A", semanticMotifs: motifs, ...rule("APPLY_PROCEDURE_SCOPE", "procedure-application-scope") }));
    const b = candidate("b", ["PILLAR:a", "PILLAR:c"], hypothesis({ observableBehavior: "B", semanticMotifs: motifs, ...rule("START_ORDER", "start-sequence") }));
    expect(behavioralOverlap(a, b).nearDuplicate).toBe(true);
    expect(behavioralOverlap(a, b, { allowGoalOutputDistinct: true })).toMatchObject({ nearDuplicate: false, motifNearDuplicate: true, goalOutput: "DISTINCT_GOAL_AND_OUTPUT" });
  });

  it("never proves independence from a missing or text-extracted goal", () => {
    const a = candidate("a", ["PILLAR:a", "PILLAR:b"], hypothesis({ observableBehavior: "A", semanticMotifs: motifs, ...rule("APPLY_PROCEDURE_SCOPE", "procedure-application-scope") }));
    const b = candidate("b", ["PILLAR:c", "PILLAR:d"], hypothesis({ observableBehavior: "B", semanticMotifs: motifs, actionGoal: "g", observableOutput: "o", goalOutputEvidence: "EXPLICIT_SCENE", goalOutputSource: "TEXT_EXTRACTION" }));
    expect(behavioralOverlap(a, b, { allowGoalOutputDistinct: true })).toMatchObject({ goalOutput: "UNVERIFIED", nearDuplicate: true });
  });

  it("keeps chapters without a tangible output at null", () => {
    for (const id of ["P01-02", "P01-03", "P01-10"] as const) {
      expect(goalOutputForScene(id, "officer|resource", false, false, false, false, false, "책임을 먼저 확인", "문제").goalOutputSource).toBeNull();
    }
    expect(goalOutputForScene("P01-09", "officer|resource", false, false, true, false, false, "x", "y").goalKey).toBe("APPLY_PROCEDURE_SCOPE");
  });
});
