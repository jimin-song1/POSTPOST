export const USEFUL_GOD_SYNTHESIS_V1 = {
  ruleVersion: "useful-god-synthesis-v1", normalizationVersion: "useful-god-normalization-v1",
  weightVersion: "useful-god-weight-v1",
  baseWeights: { eokbu: 0.30, structure: 0.25, johu: 0.20, byeongyak: 0.15, tonggwan: 0.10 },
  confidenceFactors: { HIGH: 1, MEDIUM: 0.85, LOW: 0.65 },
  johuUrgencyFactors: { CRITICAL: 1.30, HIGH: 1.15, MEDIUM: 1, LOW: 0.85 },
  specialStructureFactors: { QUALIFIED_CANDIDATE: 0.60, CONDITIONAL: 0.80 },
  coverageThresholds: { high: 0.60, medium: 0.35 },
  strongPositive: 70, strongNegative: 35,
  consensus: { two: 3, threeOrMore: 5 }, conflictPenalty: -3,
  roleMinimums: { PRIMARY: 80, SECONDARY: 70, FAVORABLE: 60, CONDITIONAL: 45, NEUTRAL: 35 },
  normalization: { eokbu: { min: -40, max: 40 }, johu: { min: -15, pivot: 0, max: 50 },
    tonggwan: { max: 35 }, byeongyak: { max: 60 }, structure: { max: 50 } },
  order: ["wood", "fire", "earth", "metal", "water"]
} as const;
