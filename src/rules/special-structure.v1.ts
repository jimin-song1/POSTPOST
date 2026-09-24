/** POSTPOST의 보수적 후보 탐지 규칙. These are custom thresholds, not school consensus. */
export const SPECIAL_STRUCTURE_V1 = {
  rulesetVersion: "special-structure-v1",
  strongRootMinimum: 5,
  visibleSupportPercentageMinimum: 10,
  visibleSupportCountMinimum: 2,
  resourceDominanceMinimum: 20,
  competingDominanceMinimum: 25,
  competingDominanceCountMinimum: 2,
  seasonalSupportStates: ["旺", "相"],
  score: { baseline: 0, requirementPassed: 2, requirementFailed: -4,
    hardBlocker: -4, boundaryBlocker: -2, monthSupport: 2 },
  conditionalMaximumFailed: 1,
} as const;
export const FOLLOW_STRUCTURE_V1 = {
  rulesetVersion: "follow-structure-v1",
  strengthMaximum: 27, rootingMaximum: 3, supportMaximum: 20,
  targetMinimum: 50, targetBoundaryMinimum: 45,
} as const;
export const DOMINANT_STRUCTURE_V1 = {
  rulesetVersion: "dominant-structure-v1",
  strengthMinimum: 73, extremeStrengthMinimum: 86,
  supportMinimum: 70, strongRootingMinimum: 12,
  strongVisibleSupportMinimum: 1,
  oppositionMinimum: 20, boundaryOppositionMinimum: 10,
  multipleOppositionCountMinimum: 2,
} as const;
export const TRANSFORMED_QI_STRUCTURE_V1 = {
  rulesetVersion: "transformed-qi-structure-v1",
  targetMinimum: 45, targetBoundaryMinimum: 40,
  dominanceMarginMinimum: 10, dominanceMarginBoundaryMinimum: 5,
  rootingMaximum: 3, severeInteractionCountMinimum: 2,
} as const;
