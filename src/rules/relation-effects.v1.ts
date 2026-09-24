/** All overlapping requests to a source are scaled proportionally, with no relation priority. */
export const RELATION_EFFECTS_V1 = {
  rulesetVersion: "relation-effects-v1",
  maximumFractionPerSource: 1
} as const;
