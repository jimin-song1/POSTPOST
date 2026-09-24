import type { SeasonalState } from "./seasonal-element-state.v1";
export const SEASONAL_STRENGTH_V1 = {
  rulesetVersion: "seasonal-strength-v1",
  multipliers: { 旺: 1.10, 相: 1.05, 休: 1.00, 囚: 0.95, 死: 0.90 } satisfies Record<SeasonalState, number>
} as const;
