import { USEFUL_GOD_SYNTHESIS_V1 as RULE } from "@/rules/useful-god-synthesis.v1";
import type { Element } from "@/types/saju-analysis";
import type { SynthesisElement, SynthesisEngine, SynthesisResult, SynthesisRole, SynthesisSignal, UsefulGodsResult } from "@/types/useful-gods";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function normalizeSignal(engine: SynthesisEngine, raw: number): number {
  const n = RULE.normalization;
  switch (engine) {
    case "eokbu": return (clamp(raw, n.eokbu.min, n.eokbu.max) + 40) / 80 * 100;
    case "johu": return raw < 0 ? 50 + clamp(raw, n.johu.min, 0) / 15 * 50 : 50 + clamp(raw, 0, n.johu.max);
    case "tonggwan": return 50 + clamp(raw, 0, n.tonggwan.max) / n.tonggwan.max * 50;
    case "byeongyak": return 50 + clamp(raw, 0, n.byeongyak.max) / n.byeongyak.max * 50;
    case "structure": return 50 + clamp(raw, 0, n.structure.max);
  }
}
export function synthesisRole(score: number): SynthesisRole {
  const t = RULE.roleMinimums;
  return score >= t.PRIMARY ? "PRIMARY" : score >= t.SECONDARY ? "SECONDARY" :
    score >= t.FAVORABLE ? "FAVORABLE" : score >= t.CONDITIONAL ? "CONDITIONAL" :
    score >= t.NEUTRAL ? "NEUTRAL" : "UNFAVORABLE";
}
export function synthesizeUsefulGods(input: UsefulGodsResult): SynthesisResult {
  const base = RULE.baseWeights;
  const qualified = input.eokbu.specialCandidates.some(row => row.state === "QUALIFIED_CANDIDATE");
  const conditional = input.eokbu.specialCandidates.some(row => row.state === "CONDITIONAL");
  const applicable = {
    eokbu: input.eokbu.status === "implemented",
    structure: input.structure.status === "implemented" && input.structure.applicability !== "NOT_APPLICABLE",
    johu: input.johu.status === "implemented",
    byeongyak: input.byeongyak.status === "implemented" && input.byeongyak.applicability !== "NOT_APPLICABLE",
    tonggwan: input.tonggwan.status === "implemented" && input.tonggwan.applicability !== "NOT_APPLICABLE"
  };
  // Effective weights are absolute fractions of the original full engine budget.
  // An excluded engine contributes neither a signal nor a denominator.
  const effective: Record<SynthesisEngine, number> = {
    eokbu: applicable.eokbu ? base.eokbu * RULE.confidenceFactors[input.eokbu.confidence] *
      (qualified ? RULE.specialStructureFactors.QUALIFIED_CANDIDATE : conditional ? RULE.specialStructureFactors.CONDITIONAL : 1) : 0,
    structure: applicable.structure ? base.structure * RULE.confidenceFactors[input.structure.confidence] : 0,
    johu: applicable.johu ? base.johu * RULE.johuUrgencyFactors[input.johu.urgency ?? "MEDIUM"] : 0,
    byeongyak: applicable.byeongyak ? base.byeongyak : 0,
    tonggwan: applicable.tonggwan ? base.tonggwan * RULE.confidenceFactors[input.tonggwan.confidence] : 0
  };
  const raw: Record<SynthesisEngine, Array<{ element: Element; score: number }>> = {
    eokbu: input.eokbu.elements.map(row => ({ element: row.element, score: row.finalScore })),
    structure: input.structure.elementPreferences.map(row => ({ element: row.element, score: row.score })),
    johu: input.johu.elementPreferences.map(row => ({ element: row.element, score: row.score })),
    byeongyak: input.byeongyak.elementPreferences.map(row => ({ element: row.element, score: row.score })),
    tonggwan: input.tonggwan.elementPreferences.map(row => ({ element: row.element, score: row.score }))
  };
  const engines = Object.keys(base) as SynthesisEngine[];
  const conflicts: SynthesisResult["conflicts"] = [];
  const elements: SynthesisElement[] = RULE.order.map((element): SynthesisElement => {
    const signals: SynthesisSignal[] = engines.flatMap(engine => {
      if (!applicable[engine]) return [];
      const match = raw[engine].find(row => row.element === element);
      return match ? [{ engine, rawScore: match.score, normalizedScore: normalizeSignal(engine, match.score),
        baseWeight: base[engine], effectiveWeight: effective[engine] }] : [];
    });
    const weight = signals.reduce((sum, row) => sum + row.effectiveWeight, 0);
    const baseScore = weight ? signals.reduce((sum, row) => sum + row.normalizedScore * row.effectiveWeight, 0) / weight : 50;
    const positives = signals.filter(row => row.normalizedScore >= RULE.strongPositive);
    const negatives = signals.filter(row => row.normalizedScore <= RULE.strongNegative);
    const bonus = positives.length >= 3 ? RULE.consensus.threeOrMore : positives.length === 2 ? RULE.consensus.two : 0;
    const conflict = positives.length > 0 && negatives.length > 0;
    if (conflict) conflicts.push({ element, positive: positives, negative: negatives });
    const penalty = conflict ? RULE.conflictPenalty : 0;
    const score = clamp(baseScore + bonus + penalty, 0, 100);
    const coverage = weight; // denominator is the original total base weight, 1.00
    return { element, score, baseSynthesisScore: baseScore, role: synthesisRole(score),
      confidence: coverage >= RULE.coverageThresholds.high ? "HIGH" : coverage >= RULE.coverageThresholds.medium ? "MEDIUM" : "LOW",
      coverage: { engineCount: signals.length, effectiveWeight: coverage, engines: signals.map(row => row.engine) },
      engineSignals: signals, consensusBonus: bonus, conflictPenalty: penalty,
      conflictingSignals: conflict,
      evidence: signals.map(row => `${row.engine}: raw=${row.rawScore}, normalized=${row.normalizedScore}, effectiveWeight=${row.effectiveWeight}`)
        .concat(`base=${baseScore}; consensus=${bonus}; conflict=${penalty}; final=${score}`) };
  }).sort((a, b) => b.score - a.score || RULE.order.indexOf(a.element) - RULE.order.indexOf(b.element));
  const group = (role: SynthesisRole) => elements.filter(row => row.role === role).map(row => row.element);
  return { status: "implemented", ruleVersion: RULE.ruleVersion, normalizationVersion: RULE.normalizationVersion,
    weightVersion: RULE.weightVersion, baseEngineWeights: { ...base }, effectiveEngineWeights: effective,
    elements, primaryElements: group("PRIMARY"), secondaryElements: group("SECONDARY"),
    favorableElements: group("FAVORABLE"), conditionalElements: group("CONDITIONAL"),
    neutralElements: group("NEUTRAL"), unfavorableElements: group("UNFAVORABLE"),
    highestElement: elements[0]?.element ?? null, conflicts,
    evidence: [`effective weights use confidence, urgency and special structure factors; excluded engines have weight zero`,
      `element scores divide by their own signal weights; coverage divides by original base weight total 1.00`],
    stemPreferences: input.johu.stemPreferences.map(row => structuredClone(row)) };
}
