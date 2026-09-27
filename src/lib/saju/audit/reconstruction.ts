import type { CategoryAxis, CategoryFortuneResult, ScoreEvidence } from "@/types/category-fortune";
import type { ChildrenFortuneResult } from "@/types/children-fortune";
import type { FortuneResult } from "@/types/fortune";
import type { FortuneSynthesisPeriod, FortuneSynthesisResult } from "@/types/fortune-synthesis";
import type { Element, SajuAnalysis } from "@/types/saju-analysis";
import type { ReconstructionCheck } from "@/types/calibration-trace";
import type { SynthesisResult } from "@/types/useful-gods";
import type { WellnessResult } from "@/types/wellness";

const EPSILON = 1e-9;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
function check(id: string, label: string, expected: number, reconstructed: number, evidenceIds: string[] = []): ReconstructionCheck {
  const difference = reconstructed - expected;
  return { id, label, status: Math.abs(difference) <= EPSILON ? "PASS" : "FAIL", expected, reconstructed, difference, evidenceIds };
}
const notApplicable = (id: string, label: string): ReconstructionCheck => ({ id, label, status: "NOT_APPLICABLE", expected: null, reconstructed: null, difference: null, evidenceIds: [] });
const rebuildEvidence = (rows: ScoreEvidence[]) => sum(rows.map((row) => row.value * row.weight));

export function reconstructAnalysis(analysis: SajuAnalysis): ReconstructionCheck[] {
  const checks: ReconstructionCheck[] = [], elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  if (analysis.fiveElements.nativeStrength) for (const element of elements) {
    const rows = analysis.fiveElements.evidence.filter((row) => row.element === element);
    checks.push(check(`ELEMENT:NATIVE:${element}`, `${element} native contribution`, analysis.fiveElements.nativeStrength[element].score,
      sum(rows.map((row) => row.finalContribution)), rows.map((row) => row.id)));
  } else checks.push(notApplicable("ELEMENT:NATIVE", "native five elements"));
  const adjusted = analysis.fiveElements.adjustedStrength;
  if (adjusted.elements) {
    for (const element of elements) checks.push(check(`ELEMENT:ADJUSTED:${element}`, `${element} adjusted score`, adjusted.elements[element].adjustedScore,
      adjusted.elements[element].nativeScore + adjusted.elements[element].adjustment, adjusted.evidence.filter((row) => row.fromElement === element || row.toElement === element).map((row) => row.relationId)));
    checks.push(check("ELEMENT:CONSERVATION", "before/after element total conservation",
      sum(elements.map((element) => adjusted.elements![element].nativeScore)), sum(elements.map((element) => adjusted.elements![element].adjustedScore)), adjusted.transferLedger.map((row) => row.relationId)));
  }
  checks.push(check("STRENGTH:FINAL", "strength evidence reconstruction", analysis.strength.score ?? 0,
    sum(analysis.strength.evidence.map((row) => row.scoreDelta)), analysis.strength.evidence.map((row, index) => `STRENGTH:${row.factor}:${index}`)));
  if (analysis.structure.qualityEvaluation.qualityScore !== null) checks.push(check("STRUCTURE:QUALITY", "structure quality reconstruction",
    analysis.structure.qualityEvaluation.qualityScore, sum(analysis.structure.qualityEvaluation.evidence.map((row) => row.delta)), analysis.structure.qualityEvaluation.evidence.map((row, index) => `STRUCTURE:${row.factor}:${index}`)));
  if (analysis.usefulGods.synthesis.status === "implemented") {
    const useful = analysis.usefulGods.synthesis as SynthesisResult;
    for (const row of useful.elements) {
      const weight = sum(row.engineSignals.map((signal) => signal.effectiveWeight));
      const base = weight ? sum(row.engineSignals.map((signal) => signal.normalizedScore * signal.effectiveWeight)) / weight : 50;
      checks.push(check(`USEFUL:${row.element}:BASE`, `${row.element} useful-god weighted base`, row.baseSynthesisScore, base, row.evidence));
      checks.push(check(`USEFUL:${row.element}:FINAL`, `${row.element} useful-god final`, row.score, Math.max(0, Math.min(100, base + row.consensusBonus + row.conflictPenalty)), row.evidence));
    }
  }
  const fortune = analysis.fortune as FortuneResult;
  if (fortune.synthesis.status === "implemented") for (const row of [...fortune.synthesis.daeun, ...fortune.synthesis.seun, ...fortune.synthesis.wolun] as FortuneSynthesisPeriod[]) {
    checks.push(check(`FORTUNE:${row.synthesisId}:FAVORABILITY`, "fortune favorability", row.favorability.score, sum(row.favorability.layerContributions.map((item) => item.weightedScore)), row.evidence));
    checks.push(check(`FORTUNE:${row.synthesisId}:ACTIVATION`, "fortune activation", row.activation.score, sum(row.activation.layerContributions.map((item) => item.weightedScore)), row.evidence));
    const base = sum(row.transformationAlignment.layerAlignments.map((item) => item.baseAlignment * row.layerWeights[item.layer.toLowerCase() as "daeun" | "seun" | "wolun"]!));
    const after = sum(row.transformationAlignment.layerAlignments.map((item) => item.adjustedAlignment * row.layerWeights[item.layer.toLowerCase() as "daeun" | "seun" | "wolun"]!));
    checks.push(check(`FORTUNE:${row.synthesisId}:ALIGNMENT_BASE`, "fortune base alignment", row.transformationAlignment.baseScore, base, row.evidence));
    checks.push(check(`FORTUNE:${row.synthesisId}:ALIGNMENT_ADJUSTED`, "fortune adjusted alignment", row.transformationAlignment.adjustedScore, after, row.evidence));
  }
  if (fortune.categories.status === "implemented") for (const row of (fortune.categories as CategoryFortuneResult).daeun) for (const name of ["overallFlow", "business", "career", "study", "change"] as const) {
    const axis = row[name] as CategoryAxis;
    checks.push(check(`CATEGORY:${row.synthesisId}:${name}:SUPPORT`, `${name} support`, axis.supportScore, rebuildEvidence(axis.supportEvidence), row.evidence));
    checks.push(check(`CATEGORY:${row.synthesisId}:${name}:ACTIVITY`, `${name} activity`, axis.activityScore, rebuildEvidence(axis.activityEvidence), row.evidence));
  }
  if (analysis.wellness.status === "implemented" && "daeunPeriods" in analysis.wellness) for (const row of (analysis.wellness as WellnessResult).daeunPeriods)
    checks.push(check(`WELLNESS:DAEUN:${row.daeunIndex}`, "wellness period attention", row.wellnessPeriodAttention, sum(row.evidence.map((item) => item.value * item.weight)), row.evidence.map((item) => item.factor)));
  if (analysis.childrenFortune.status === "implemented" && "bond" in analysis.childrenFortune) {
    const child = analysis.childrenFortune as ChildrenFortuneResult, rebuild = (rows: typeof child.bond.contributions) => sum(rows.map((row) => row.value * row.weight));
    checks.push(check("CHILD:BOND", "child bond", child.bond.score, rebuild(child.bond.contributions), child.bond.evidenceIds));
    checks.push(check("CHILD:COUNT", "child count tendency", child.countTendency.score, rebuild(child.countTendency.contributions), child.countTendency.evidenceIds));
    checks.push(check("CHILD:SON", "symbolic son energy", child.genderEnergy.sonScore, sum(child.genderEnergy.scoreEvidence.filter((row) => row.target === "SON").map((row) => row.value)), child.genderEnergy.evidenceIds));
    checks.push(check("CHILD:DAUGHTER", "symbolic daughter energy", child.genderEnergy.daughterScore, sum(child.genderEnergy.scoreEvidence.filter((row) => row.target === "DAUGHTER").map((row) => row.value)), child.genderEnergy.evidenceIds));
    for (const row of child.daeunPeriods) checks.push(check(`CHILD:DAEUN:${row.periodIndex}`, "child period activation", row.activationScore, rebuild(row.contributions), row.evidenceIds));
  }
  return checks;
}
