import { WELLNESS_V1 as RULE } from "@/rules/wellness.v1";
import type { FiveElementsResult, Element } from "@/types/saju-analysis";
import type { FortuneResult } from "@/types/fortune";
import type { UsefulGodsResult } from "@/types/useful-gods";
import type { WellnessAttentionLevel, WellnessResult } from "@/types/wellness";
const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export const wellnessAttentionLevel = (score: number): WellnessAttentionLevel => score >= RULE.thresholds.veryHighAttention ? "VERY_HIGH_ATTENTION" : score >= RULE.thresholds.highAttention ? "HIGH_ATTENTION" : score >= RULE.thresholds.needSupport ? "NEED_SUPPORT" : score >= RULE.thresholds.watch ? "WATCH" : "BALANCED";
const customerStatus: Record<WellnessAttentionLevel, string> = { BALANCED: "안정적인 편", WATCH: "조금 신경 쓰면 좋은 편", NEED_SUPPORT: "보완이 필요한 편", HIGH_ATTENTION: "생활 관리가 중요한 편", VERY_HIGH_ATTENTION: "꾸준한 관리가 특히 중요한 편" };
export function calculateElementWellness(percentage: number) { const deficiencyIndex = percentage < RULE.idealElementPercent ? (RULE.idealElementPercent - percentage) / RULE.idealElementPercent * 100 : 0;
  const excessIndex = percentage > RULE.idealElementPercent ? (percentage - RULE.idealElementPercent) / RULE.idealElementPercent * 100 : 0;
  const attentionIndex = clamp(Math.max(deficiencyIndex, excessIndex * RULE.excessAttentionFactor));
  return { deficiencyIndex, excessIndex, attentionIndex, attentionLevel: wellnessAttentionLevel(attentionIndex) }; }
export function calculateConstitutionalBalance(percentages: Record<Element, number>) { const totalDeviation = elements.reduce((sum, element) => sum + Math.abs(percentages[element] - RULE.idealElementPercent), 0); return clamp(100 - totalDeviation / RULE.maximumReferenceDeviation * 100); }
export function evaluateWellness(fiveElements: FiveElementsResult, usefulGods: UsefulGodsResult, fortune: FortuneResult): WellnessResult {
  if (!fiveElements.nativeStrength || fiveElements.adjustedStrength.status !== "implemented" || !fiveElements.adjustedStrength.elements) throw new Error("Implemented native and adjusted element profiles are required");
  const adjusted = fiveElements.adjustedStrength.elements, percentages = Object.fromEntries(elements.map(element => [element, adjusted[element].percentage])) as Record<Element, number>;
  const urgency = usefulGods.johu.status === "implemented" ? usefulGods.johu.urgency : null;
  const resultElements = Object.fromEntries(elements.map(element => { const calculated = calculateElementWellness(percentages[element]);
    const johu = usefulGods.johu.status === "implemented" ? usefulGods.johu.elementPreferences.find(row => row.element === element) : undefined, theme = RULE.themes[element];
    return [element, { element, label: theme.label, percentage: percentages[element], nativePercentage: fiveElements.nativeStrength![element].percentage, ...calculated,
      customerStatus: customerStatus[calculated.attentionLevel], theme: theme.customerTheme, traditionalAreas: theme.traditionalAreas,
      johuContext: { hasSignal: Boolean(johu), rawPreferenceScore: johu?.score ?? null, urgency }, evidence: [`adjusted-strength-v1:${element}:${percentages[element]}`, ...(johu ? [`johu-useful-god-v1:${element}:${johu.score}:context-only`] : [])] }]; })) as unknown as WellnessResult["elements"];
  const ranked = [...elements].sort((a, b) => resultElements[b].attentionIndex - resultElements[a].attentionIndex || elements.indexOf(a) - elements.indexOf(b));
  const transformation = fortune.transformation.status === "implemented" ? fortune.transformation : null;
  const daeunPeriods = fortune.daeun.status === "implemented" ? fortune.daeun.periods.map(period => { const snapshot = transformation?.daeunSnapshots.find(row => row.context.daeunIndex === period.index), profile = snapshot?.layerProfiles.find(row => row.layer === "DAEUN");
    const elementProfile = profile?.percentages ?? Object.fromEntries(elements.map(element => [element, 0])) as Record<Element, number>;
    const elementAttention = clamp(elements.reduce((sum, element) => sum + elementProfile[element] / 100 * resultElements[element].attentionIndex, 0));
    const transformedShare = clamp((snapshot?.transfers.reduce((sum, row) => sum + row.actualAmount, 0) ?? 0) / 22 * 100);
    const factors = [{ factor: "FORTUNE_ELEMENT_X_NATAL_ATTENTION", value: elementAttention, weight: RULE.periodWeights.elementAttention }, { factor: "EXISTING_ACTIVATION", value: period.activation.score, weight: RULE.periodWeights.activation }, { factor: "FORTUNE_TRANSFORMED_SHARE", value: transformedShare, weight: RULE.periodWeights.transformedShare }].map(row => ({ ...row, contribution: row.value * row.weight }));
    const wellnessPeriodAttention = clamp(factors.reduce((sum, row) => sum + row.contribution, 0));
    return { daeunIndex: period.index, ageRange: period.sourcePeriod.ageRange, pillar: `${period.pillar.stem}${period.pillar.branch}`, startInstant: period.sourcePeriod.startInstant, endInstant: period.sourcePeriod.endInstant,
      wellnessPeriodAttention, attentionLevel: wellnessAttentionLevel(wellnessPeriodAttention), elementAttention, activationScore: period.activation.score, transformedShare, elementProfile, evidence: factors }; }) : [];
  const attentionAreas = ranked.filter(element => resultElements[element].attentionLevel !== "BALANCED"), habitElements = (attentionAreas.length ? attentionAreas : ranked).slice(0, 3);
  return { status: "implemented", versions: { ruleVersion: RULE.ruleVersion, elementBalanceVersion: RULE.elementBalanceVersion, themeVersion: RULE.themeVersion, habitVersion: RULE.habitVersion, periodVersion: RULE.periodVersion }, constitutionalBalanceScore: calculateConstitutionalBalance(percentages), elements: resultElements,
    strengths: elements.filter(element => resultElements[element].attentionLevel === "BALANCED"), attentionAreas, habits: habitElements.map((element, index) => ({ element, guidance: RULE.themes[element].habits[index % RULE.themes[element].habits.length] })), daeunPeriods,
    evidence: ["adjusted-strength-v1 normalized percentages are read-only source", "johu-useful-god-v1 is context only and is not added to wellness scores", "daeun activation and fortune transformation are read-only period inputs", "indices describe traditional wellness attention, not disease probability"], disclaimer: { interpretationType: "traditional_wellness", medicalDiagnosis: false } }; }
