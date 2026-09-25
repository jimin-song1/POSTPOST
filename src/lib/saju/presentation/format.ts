export const roundPresentationScore = (value: number, digits = 0) => Number(value.toFixed(digits));

export const FAVORABILITY_LABELS = {
  PRIMARY_FAVORABLE: "매우 우호적",
  STRONG_FAVORABLE: "우호적",
  FAVORABLE: "우호적",
  CONDITIONAL: "조건부",
  NEUTRAL: "중립",
  UNFAVORABLE: "부담",
} as const;

export const ACTIVATION_LABELS = {
  LOW: "낮음",
  MODERATE: "보통",
  HIGH: "높음",
  VERY_HIGH: "매우 높음",
} as const;
