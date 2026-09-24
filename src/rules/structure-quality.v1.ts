export const STRUCTURE_QUALITY_V1 = {
  ruleVersion: "structure-quality-v1",
  baseline: 50, exposed: 10,
  support: { delta: 8, cap: 16 },
  damage: { delta: -12, cap: -24 },
  rescue: { delta: 8, cap: 16 },
  mixed: { delta: -5, cap: -10 },
  scoreMin: 0, scoreMax: 100,
  visiblePillars: ["year", "month", "hour"],
  limitedTypes: ["건록격", "양인격"],
  relationTypes: ["SIX_COMBINATION", "THREE_HARMONY", "DIRECTIONAL_COMBINATION",
    "BRANCH_CLASH", "THREE_PUNISHMENT", "MUTUAL_PUNISHMENT", "SELF_PUNISHMENT", "BRANCH_BREAK", "BRANCH_HARM"]
} as const;
