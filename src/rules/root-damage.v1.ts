import type { QiRole } from "@/lib/saju/interpretation/hidden-stems";

/** Clash-only weakening of day-master roots; element contributions are untouched. */
export const ROOT_DAMAGE_V1 = {
  rulesetVersion: "root-damage-v1",
  clashRatio: { mainQi: 0.25, middleQi: 0.20, residualQi: 0.15 } satisfies Record<QiRole, number>,
  cumulativeDamageRatioCap: 0.50
} as const;
