import type { SeasonalState } from "./seasonal-element-state.v1";

/** POSTPOST evaluation coefficients; these are not classical numeric constants. */
export const TRANSFORMATION_V1 = {
  rulesetVersion: "transformation-v1",
  seasonal: { 旺: 3, 相: 3, 休: 0, 囚: -1, 死: -2 } satisfies Record<SeasonalState, number>,
  targetRoot: 2,
  targetExposure: 1,
  adjacentPair: 1,
  generatingSupport: 1,
  generatingPercentageMinimum: 10,
  originalStrongRootPenalty: -1,
  originalStrongRootRole: "mainQi",
  thresholds: { transformed: 5, partial: 3, combinationOnly: 0 },
  partialGroupMaximumState: "PARTIAL"
} as const;
