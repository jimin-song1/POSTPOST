export const WELLNESS_V1 = {
  ruleVersion: "wellness-v1",
  elementBalanceVersion: "wellness-element-balance-v1",
  themeVersion: "wellness-theme-v1",
  habitVersion: "wellness-habit-v1",
  periodVersion: "wellness-period-v1",
  idealElementPercent: 20,
  maximumReferenceDeviation: 160,
  excessAttentionFactor: 0.8,
  periodWeights: { elementAttention: 0.6, activation: 0.25, transformedShare: 0.15 },
  thresholds: { veryHighAttention: 80, highAttention: 60, needSupport: 40, watch: 20 },
  themes: {
    wood: { label: "나무", customerTheme: "유연성 · 긴장 회복", traditionalAreas: ["간", "담", "눈", "근육·인대"], habits: ["가벼운 스트레칭", "규칙적인 움직임", "같은 자세 오래 유지하지 않기"] },
    fire: { label: "불", customerTheme: "활력 · 체온 · 순환", traditionalAreas: ["심", "소장", "열", "순환"], habits: ["낮 시간 활동", "적당한 유산소 운동", "일정한 수면 리듬"] },
    earth: { label: "흙", customerTheme: "소화 리듬 · 생활 균형", traditionalAreas: ["비", "위", "소화"], habits: ["규칙적인 식사", "과식 피하기", "급하게 먹지 않기"] },
    metal: { label: "쇠", customerTheme: "호흡 · 피부 · 건조함", traditionalAreas: ["폐", "대장", "피부", "코"], habits: ["환기", "편안한 호흡", "지나치게 건조한 환경 피하기"] },
    water: { label: "물", customerTheme: "휴식 · 회복 · 냉감", traditionalAreas: ["신", "방광", "수분", "뼈"], habits: ["충분한 수면", "과도한 피로 누적 피하기", "몸을 지나치게 차갑게 두지 않기"] },
  },
} as const;
