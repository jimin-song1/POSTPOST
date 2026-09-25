import { EARTHLY_BRANCHES } from "./ganzhi.v1";

export const BRANCH_PREFERENCES_V1 = {
  ruleVersion: "branch-preferences-v1",
  synthesisVersion: "branch-preference-synthesis-v1",
  canonicalBranchOrder: EARTHLY_BRANCHES
} as const;
