import type { PillarPosition } from "@/types/saju-analysis";
import type { QiRole } from "@/lib/saju/interpretation/hidden-stems";

/** POSTPOST custom coefficients; not canonical numerical values of traditional myeongri. */
export const ELEMENT_WEIGHT_V1 = {
  rulesetVersion: "element-weight-v1",
  stems: { year: 10, month: 10, day: 10, hour: 10 } satisfies Record<PillarPosition, number>,
  branches: { year: 12, month: 24, day: 12, hour: 12 } satisfies Record<PillarPosition, number>,
  allocations: {
    one: { mainQi: 1, middleQi: 0, residualQi: 0 },
    two: { mainQi: 0.75, middleQi: 0, residualQi: 0.25 },
    three: { mainQi: 0.70, middleQi: 0.20, residualQi: 0.10 }
  } satisfies Record<string, Record<QiRole, number>>
} as const;
