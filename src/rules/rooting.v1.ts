import type { QiRole } from "@/lib/saju/interpretation/hidden-stems";

export const ROOTING_V1 = {
  rulesetVersion: "rooting-v1",
  points: { mainQi: 8, middleQi: 5, residualQi: 3 } satisfies Record<QiRole, number>,
  cap: 20
} as const;
