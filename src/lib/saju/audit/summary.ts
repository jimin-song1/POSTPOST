import type { CalibrationSummaryRow, CaseAssessment } from "@/types/calibration-trace";
import type { CategoryFortuneResult } from "@/types/category-fortune";
import type { FortuneResult } from "@/types/fortune";
import type { SajuAnalysis } from "@/types/saju-analysis";
import type { SynthesisResult } from "@/types/useful-gods";
import type { WellnessResult } from "@/types/wellness";
import type { ChildrenFortuneResult } from "@/types/children-fortune";

export function buildCalibrationSummary(caseId: string, analysis: SajuAnalysis, assessments: CaseAssessment[] = []): CalibrationSummaryRow {
  const useful = analysis.usefulGods.synthesis.status === "implemented" ? analysis.usefulGods.synthesis as SynthesisResult : null;
  const fortune = analysis.fortune as FortuneResult;
  const categories = fortune.categories.status === "implemented" ? fortune.categories as CategoryFortuneResult : null;
  const wellness = analysis.wellness.status === "implemented" && "constitutionalBalanceScore" in analysis.wellness ? analysis.wellness as WellnessResult : null;
  const children = analysis.childrenFortune.status === "implemented" && "bond" in analysis.childrenFortune ? analysis.childrenFortune as ChildrenFortuneResult : null;
  return {
    caseId, dayMaster: analysis.dayMaster,
    strength: { score: analysis.strength.adjusted.score, level: analysis.strength.adjusted.level },
    structure: { type: analysis.structure.primary?.type ?? null, status: analysis.structure.classificationStatus, quality: analysis.structure.qualityEvaluation.qualityScore },
    usefulElements: useful?.elements.slice(0, 5).map(({ element, score, role }) => ({ element, score, role })) ?? [],
    elementDistribution: analysis.fiveElements.adjustedStrength.elements ? Object.fromEntries(Object.entries(analysis.fiveElements.adjustedStrength.elements).map(([element,row])=>[element,row.percentage])) : null,
    categoryBaseline: categories?.daeun[0] ? Object.fromEntries((["wealth","business","career","relationship","study","change"] as const).map((key)=>[key,{support:categories.daeun[0][key].supportScore,activity:categories.daeun[0][key].activityScore}])) : null,
    wellness: wellness ? { constitutionalBalanceScore: wellness.constitutionalBalanceScore, strengths: wellness.strengths, attentionAreas: wellness.attentionAreas } : null,
    children: children ? { bond: children.bond, countTendency: children.countTendency, symbolicEnergy: children.genderEnergy, parentingStyle: children.parentingStyle } : null,
    majorDaeun: fortune.synthesis.status === "implemented" ? fortune.synthesis.daeun.map((row)=>({ id:row.synthesisId,period:row.period,support:row.favorability.score,activation:row.activation.score,alignment:row.transformationAlignment.adjustedScore })) : [],
    assessments,
  };
}

export function buildSummaryTable(rows: CalibrationSummaryRow[]) {
  return { schemaVersion: "calibration-summary-v1", purpose: "ENGINE_PATTERN_AND_MISMATCH_AUDIT", comparisonIsRanking: false, cases: rows } as const;
}
