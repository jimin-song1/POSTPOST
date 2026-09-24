export const RELATION_INTERACTION_V1 = {
  rulesetVersion: "relation-interaction-v1",
  adjacencyDistance: 1,
  competingCandidatePenalty: -2,
  blockingClashPenalty: -2,
  candidateTypes: ["STEM_COMBINATION", "SIX_COMBINATION", "THREE_HARMONY", "DIRECTIONAL_COMBINATION"],
  blockerTypes: ["STEM_CLASH", "BRANCH_CLASH"]
} as const;
