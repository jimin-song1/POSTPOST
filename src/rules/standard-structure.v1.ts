import type { TenGodName } from "@/lib/saju/interpretation/ten-gods";

/** POSTPOST v1: the eight conventional main-qi standard candidates. */
export const STANDARD_STRUCTURE_V1 = {
  rulesetVersion: "standard-structure-v1",
  byTenGod: {
    정관: "정관격", 편관: "편관격", 정재: "정재격", 편재: "편재격",
    식신: "식신격", 상관: "상관격", 정인: "정인격", 편인: "편인격"
  } as const satisfies Partial<Record<TenGodName, `${TenGodName}격`>>
} as const;
