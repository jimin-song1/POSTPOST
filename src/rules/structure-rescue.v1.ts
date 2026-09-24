export const STRUCTURE_RESCUE_V1 = {
  ruleVersion: "structure-rescue-v1",
  requiresDamage: true,
  maxRescueSignalsPerSource: 1,
  /** Rescue is linked to a damage ID; no stand-alone rescue credit. */
  triggers: {
    정관격: ["상관"], 편관격: [], 정재격: ["겁재", "비견"], 편재격: ["겁재", "비견"],
    식신격: ["편인"], 상관격: ["정관"], 정인격: ["정재", "편재"], 편인격: ["정재", "편재"]
  }
} as const;
