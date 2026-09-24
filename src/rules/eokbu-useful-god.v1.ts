import type { Element } from "@/types/saju-analysis";
import type { ElementRelation, StrengthLevel } from "./strength.v1";

/** POSTPOST 억부 v1 선택 규칙. These coefficients are not a universal traditional table. */
export const EOKBU_USEFUL_GOD_V1 = {
  rulesetVersion: "eokbu-useful-god-v1",
  elementPreferenceRuleVersion: "eokbu-element-preference-v1",
  baseByLevel: {
    극약: { same: 30, resource: 35, output: -25, wealth: -30, officer: -35 },
    태약: { same: 25, resource: 30, output: -18, wealth: -22, officer: -28 },
    신약: { same: 20, resource: 24, output: -10, wealth: -14, officer: -18 },
    중화신약: { same: 12, resource: 15, output: -3, wealth: -5, officer: -8 },
    중화신강: { same: -5, resource: -8, output: 8, wealth: 10, officer: 12 },
    신강: { same: -15, resource: -18, output: 18, wealth: 22, officer: 24 },
    태강: { same: -25, resource: -28, output: 25, wealth: 30, officer: 32 },
    극왕: { same: -30, resource: -35, output: 30, wealth: 35, officer: 38 },
  } satisfies Record<StrengthLevel, Record<ElementRelation, number>>,
  favorableAvailability: [
    { maximumExclusive: 10, delta: 8, factor: "ELEMENT_SCARCITY" },
    { maximumExclusive: 20, delta: 4, factor: "ELEMENT_SCARCITY" },
    { maximumInclusive: 35, delta: 0, factor: "ELEMENT_AVAILABILITY_BALANCED" },
    { maximumInclusive: Infinity, delta: -4, factor: "ELEMENT_EXCESS" },
  ],
  unfavorableAvailability: [
    { maximumExclusive: 10, delta: 0, factor: "ELEMENT_SCARCITY_NO_BONUS" },
    { maximumExclusive: 20, delta: -2, factor: "ELEMENT_PRESENCE_BURDEN" },
    { maximumInclusive: 35, delta: -4, factor: "ELEMENT_EXCESS" },
    { maximumInclusive: Infinity, delta: -8, factor: "ELEMENT_SEVERE_EXCESS" },
  ],
  roles: { primaryMinimum: 25, supportiveMinimum: 15, conditionalMinimum: 5,
    neutralMinimum: -4 },
  canonicalElementOrder: ["wood", "fire", "earth", "metal", "water"] as const satisfies readonly Element[],
} as const;
