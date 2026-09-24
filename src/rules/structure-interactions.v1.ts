/** POSTPOST selection table; these are structural signals, not fortune predictions. */
export const STRUCTURE_INTERACTIONS_V1 = {
  ruleVersion: "structure-interactions-v1",
  standard: {
    정관격: { support: ["정재", "편재", "정인", "편인"], damage: ["상관"], mixed: ["편관"], rescue: ["정인", "편인"] },
    편관격: { support: ["식신", "정인", "편인"], damage: [], mixed: ["정관"], rescue: [] },
    정재격: { support: ["식신", "상관"], damage: ["겁재", "비견"], mixed: [], rescue: ["정관", "편관"] },
    편재격: { support: ["식신", "상관"], damage: ["겁재", "비견"], mixed: [], rescue: ["정관", "편관"] },
    식신격: { support: ["정재", "편재"], damage: ["편인"], mixed: [], rescue: ["정재", "편재"] },
    상관격: { support: ["정재", "편재"], damage: ["정관"], mixed: [], rescue: ["정인", "편인"] },
    정인격: { support: ["정관", "편관"], damage: ["정재", "편재"], mixed: [], rescue: ["비견", "겁재"] },
    편인격: { support: ["정관", "편관"], damage: ["정재", "편재"], mixed: [], rescue: ["비견", "겁재"] }
  },
  damageWeight: { 겁재: 1, 비견: 0.5 }
} as const;
