import type { Element } from "./saju-analysis";
export type WellnessAttentionLevel = "BALANCED" | "WATCH" | "NEED_SUPPORT" | "HIGH_ATTENTION" | "VERY_HIGH_ATTENTION";
export interface WellnessElementResult { element: Element; label: string; percentage: number; nativePercentage: number;
  deficiencyIndex: number; excessIndex: number; attentionIndex: number; attentionLevel: WellnessAttentionLevel;
  customerStatus: string; theme: string; traditionalAreas: readonly string[];
  johuContext: { hasSignal: boolean; rawPreferenceScore: number | null; urgency: string | null }; evidence: string[]; }
export interface WellnessPeriodResult { daeunIndex: number; ageRange: string; pillar: string; startInstant?: string; endInstant?: string;
  wellnessPeriodAttention: number; attentionLevel: WellnessAttentionLevel; elementAttention: number; activationScore: number;
  transformedShare: number; elementProfile: Record<Element, number>;
  evidence: Array<{ factor: string; value: number; weight: number; contribution: number }>; }
export interface WellnessResult { status: "implemented"; versions: { ruleVersion: "wellness-v1";
  elementBalanceVersion: "wellness-element-balance-v1"; themeVersion: "wellness-theme-v1";
  habitVersion: "wellness-habit-v1"; periodVersion: "wellness-period-v1" }; constitutionalBalanceScore: number;
  elements: Record<Element, WellnessElementResult>; strengths: Element[]; attentionAreas: Element[];
  habits: Array<{ element: Element; guidance: string }>; daeunPeriods: WellnessPeriodResult[]; evidence: string[];
  disclaimer: { interpretationType: "traditional_wellness"; medicalDiagnosis: false }; }
