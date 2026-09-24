export const MONTH_COMMAND_V1 = {
  rulesetVersion: "month-command-v1",
  visiblePillars: ["year", "month", "hour"],
  roleOrder: ["mainQi", "middleQi", "residualQi"],
  primaryRole: "mainQi",
  mixedRequiresPrimaryExposure: true,
  secondaryConfidence: "MEDIUM",
  confidenceByStatus: {
    ESTABLISHED: "HIGH", UNEXPOSED: "LOW", MIXED: "MEDIUM",
    SPECIAL_CANDIDATE: "MEDIUM", UNRESOLVED: "LOW"
  }
} as const;
