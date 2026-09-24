import type { Element } from "@/types/saju-analysis";
import type { TenGodCategory } from "./structure-useful-god.v1";

export type MedicineCategory = TenGodCategory;

export const BYEONGYAK_EXCESS_MEDICINE_TABLE: Readonly<Record<Element, {
  control: Element; drain: Element;
}>> = {
  wood: { control: "metal", drain: "fire" },
  fire: { control: "water", drain: "earth" },
  earth: { control: "wood", drain: "metal" },
  metal: { control: "fire", drain: "water" },
  water: { control: "earth", drain: "wood" },
};

export const BYEONGYAK_USEFUL_GOD_V1 = {
  rulesetVersion: "byeongyak-useful-god-v1",
  diseaseRuleVersion: "byeongyak-disease-v1",
  medicineRuleVersion: "byeongyak-medicine-v1",
  structureDamage: { activeSeverity: 30, rescuedSeverity: 10, medicineStrategyBase: 10 },
  excess: {
    minimumPercentage: 40,
    minimumGapPercentagePoints: 15,
    severity: [
      { minimum: 60, level: "SEVERE", score: 35 },
      { minimum: 50, level: "HIGH", score: 25 },
      { minimum: 40, level: "MODERATE", score: 15 },
    ],
    strategy: { CONTROL: 20, DRAIN: 15 },
  },
  availability: [
    { maximumExclusive: 10, delta: 8 },
    { maximumExclusive: 20, delta: 4 },
    { maximumExclusive: 35, delta: 0 },
    { maximumExclusive: 45, delta: -8 },
    { maximumInclusive: 100, delta: -15 },
  ],
  aggregationWeights: [1, 0.5, 0.25],
  roles: { primaryMinimum: 40, strongMinimum: 30, supportingMinimum: 20,
    conditionalMinimum: 10, lowMinimum: 1 },
  canonicalElementOrder: ["wood", "fire", "earth", "metal", "water"] as const,
  categoryDistance: { companion: 0, output: 1, wealth: 2, officer: 3, resource: 4 } as const,
} as const;
