import type { Element } from "@/types/saju-analysis";
import type { TenGodName } from "@/lib/saju/interpretation/ten-gods";

export type ElementRelation = "same" | "resource" | "output" | "wealth" | "officer";
export type StrengthLevel = "극약" | "태약" | "신약" | "중화신약" | "중화신강" | "신강" | "태강" | "극왕";

/** POSTPOST custom interpretation coefficients, not traditional absolute values. */
export const STRENGTH_V1 = {
  rulesetVersion: "strength-v1",
  baseline: 50,
  minimum: 0,
  maximum: 100,
  monthCommand: { same: 18, resource: 14, output: -10, wealth: -8, officer: -18 },
  deukRyeongMinimumExclusive: 0,
  deukJiBonus: 5,
  deukSiBonus: 3,
  deukSe: { bonus: 5, penalty: -5, neutralDifferenceInclusive: 1 },
  visibleStem: {
    비견: 5, 겁재: 5, 편인: 5, 정인: 5,
    식신: -4, 상관: -4, 편재: -4, 정재: -4,
    편관: -6, 정관: -6
  } satisfies Record<TenGodName, number>,
  levels: [
    { minimum: 0, level: "극약" }, { minimum: 15, level: "태약" },
    { minimum: 28, level: "신약" }, { minimum: 40, level: "중화신약" },
    { minimum: 50, level: "중화신강" }, { minimum: 60, level: "신강" },
    { minimum: 73, level: "태강" }, { minimum: 86, level: "극왕" }
  ] satisfies Array<{ minimum: number; level: StrengthLevel }>
} as const;

/** Follows the wood→fire→earth→metal→water generating cycle. */
export const DAY_MASTER_SUPPORT_V1 = {
  rulesetVersion: "day-master-support-v1",
  elements: ["wood", "fire", "earth", "metal", "water"] as const satisfies readonly Element[],
  relationByForwardDistance: ["same", "output", "wealth", "officer", "resource"] as const satisfies readonly ElementRelation[],
  categories: { same: "support", resource: "support", output: "drain", wealth: "drain", officer: "control" } as const
} as const;
