import type { StructureType } from "@/types/saju-analysis";

export type TenGodCategory = "resource" | "companion" | "output" | "wealth" | "officer";
export type StandardStructure = Extract<StructureType,
  "정관격" | "편관격" | "정재격" | "편재격" | "식신격" | "상관격" | "정인격" | "편인격">;

export const STRUCTURE_CORE_V1: Readonly<Record<StandardStructure, TenGodCategory>> = {
  정관격: "officer", 편관격: "officer",
  정재격: "wealth", 편재격: "wealth",
  식신격: "output", 상관격: "output",
  정인격: "resource", 편인격: "resource",
};

export const STRUCTURE_USEFUL_GOD_V1 = {
  rulesetVersion: "structure-useful-god-v1",
  coreRuleVersion: "structure-core-v1",
  preferenceRuleVersion: "structure-useful-preference-v1",
  sourceRuleVersions: ["structure-interactions-v1", "structure-rescue-v1"] as const,
  scores: { core: 25, support: 15, unresolvedRescue: 30, alreadyRescued: 10 },
  availability: [
    { maximumExclusive: 10, delta: 5 },
    { maximumExclusive: 20, delta: 2 },
    { maximumExclusive: 35, delta: 0 },
    { maximumExclusive: 45, delta: -5 },
    { maximumInclusive: 100, delta: -10 },
  ],
  aggregationWeights: [1, 0.5, 0.25],
  roles: { primaryMinimum: 30, strongMinimum: 20, supportingMinimum: 10,
    conditionalMinimum: 1 },
  canonicalElementOrder: ["wood", "fire", "earth", "metal", "water"] as const,
  categoryDistance: { companion: 0, output: 1, wealth: 2, officer: 3, resource: 4 } as const,
} as const;
