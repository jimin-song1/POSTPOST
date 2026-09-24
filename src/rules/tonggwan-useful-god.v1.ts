import type { Element } from "@/types/saju-analysis";

export interface TonggwanBridgeRule {
  controller: Element;
  controlled: Element;
  bridge: Element;
}

export const TONGGWAN_BRIDGE_TABLE: readonly TonggwanBridgeRule[] = [
  { controller: "wood", controlled: "earth", bridge: "fire" },
  { controller: "earth", controlled: "water", bridge: "metal" },
  { controller: "water", controlled: "fire", bridge: "wood" },
  { controller: "fire", controlled: "metal", bridge: "earth" },
  { controller: "metal", controlled: "wood", bridge: "water" },
] as const;

export const TONGGWAN_USEFUL_GOD_V1 = {
  rulesetVersion: "tonggwan-useful-god-v1",
  conflictRuleVersion: "tonggwan-conflict-v1",
  bridgeRuleVersion: "tonggwan-bridge-v1",
  conflict: {
    minimumSidePercentage: 20,
    minimumCombinedPercentage: 50,
    strongBalanceRatioMinimum: 0.5,
    conditionalBalanceRatioMinimum: 0.35,
  },
  score: { strongConflict: 25, conditionalConflict: 15 },
  scarcity: [
    { maximumExclusive: 10, need: "HIGH", delta: 10 },
    { maximumExclusive: 20, need: "MEDIUM", delta: 5 },
    { maximumExclusive: 30, need: "PRESENT", delta: 0 },
    { maximumInclusive: 100, need: "ALREADY_SUFFICIENT", delta: -15 },
  ],
  sufficientPercentage: 30,
  excessivePercentage: 35,
  roles: {
    primaryMinimum: 30,
    strongMinimum: 20,
    conditionalMinimum: 10,
    lowMinimum: 1,
  },
  canonicalElementOrder: ["wood", "fire", "earth", "metal", "water"] as const,
} as const;
