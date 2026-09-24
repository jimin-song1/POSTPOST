/** POSTPOST custom adjustment model. Coefficients are explanatory, not universal values. */
export const ADJUSTED_DAYMASTER_STRENGTH_V1 = {
  rulesetVersion: "adjusted-daymaster-strength-v1",
  evaluationRuleVersion: "adjusted-strength-evaluation-v1",
  percentagePointsPerStrengthPoint: 5,
  elementBalanceAdjustmentCap: 10,
  minimum: 0,
  maximum: 100,
} as const;
