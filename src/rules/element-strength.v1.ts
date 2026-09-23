export const ELEMENT_STRENGTH_V1 = {
  status: "not_implemented",
  baseEnergy: { heavenlyStemEach: 10, yearBranch: 12, monthBranch: 24, dayBranch: 12, hourBranch: 12 },
  hiddenStemDistribution: { one: [1], two: [0.25, 0.75], three: [0.1, 0.2, 0.7] },
  seasonalMultiplier: { 왕: 1.1, 상: 1.05, 휴: 1, 수: 0.95, 사: 0.9 },
  todo: "월령·지장간·계절표가 확정된 뒤 pure function으로 구현"
} as const;
