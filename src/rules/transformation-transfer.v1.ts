import type { TransformationState } from "@/types/saju-analysis";

/** POSTPOST custom energy-transfer ratios, not classical absolute values. */
export const TRANSFORMATION_TRANSFER_V1 = {
  rulesetVersion: "transformation-transfer-v1",
  ratios: {
    TRANSFORMED: 0.60, PARTIAL: 0.30, COMBINATION_ONLY: 0,
    WEAK: 0, NOT_APPLICABLE: 0
  } satisfies Record<TransformationState, number>,
  partialGroupMaximumRatio: 0.30
} as const;
