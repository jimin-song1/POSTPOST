export const DAEUN_ACTIVATION_V1={
  ruleVersion:"daeun-activation-v1",interactionVersion:"fortune-interaction-v1",
  activationScoreVersion:"fortune-activation-score-v1",preferenceVersion:"daeun-pillar-preference-v1",
  preferenceWeights:{stem:0.45,branch:0.55},
  activationPoints:{STEM_COMBINATION:6,STEM_CLASH:7,SIX_COMBINATION:6,THREE_HARMONY_PARTIAL:4,
    THREE_HARMONY_COMPLETE:10,DIRECTIONAL_COMBINATION_PARTIAL:4,DIRECTIONAL_COMBINATION_COMPLETE:10,
    BRANCH_CLASH:10,THREE_PUNISHMENT_PARTIAL:7,THREE_PUNISHMENT_COMPLETE:9,
    MUTUAL_PUNISHMENT:7,SELF_PUNISHMENT:6,BRANCH_HARM:5,BRANCH_BREAK:4,WONJIN:5},
  activationLevels:{moderate:15,high:30,veryHigh:50},cap:100
} as const;
