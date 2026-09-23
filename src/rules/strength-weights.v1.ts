export const STRENGTH_WEIGHTS_V1 = {
  status: "not_implemented",
  levels: [[0, 14, "극약"], [15, 27, "태약"], [28, 39, "신약"], [40, 49, "중화신약"], [50, 59, "중화신강"], [60, 72, "신강"], [73, 85, "태강"], [86, 100, "극왕"]],
  monthBranch: { sameElement: 18, producesDayMaster: 14, producedByDayMaster: -10, controlledByDayMaster: -8, controlsDayMaster: -18 },
  stemTenGod: { 비견: 5, 겁재: 5, 정인: 5, 편인: 5, 식신: -4, 상관: -4, 정재: -4, 편재: -4, 정관: -6, 편관: -6 },
  root: { mainQi: 8, middleQi: 5, residualQi: 3, cap: 20 },
  todo: "득지·득세·득시의 세부 판정 조건 확정 필요"
} as const;
