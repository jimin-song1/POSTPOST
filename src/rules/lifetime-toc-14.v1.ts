/**
 * 평생사주 14편 목차(docs/LIFETIME_TOC_14.md)와 그래프 표시 점수를 잇는 규칙 v1.
 *
 * 어떤 편의 어떤 항목이 graph-score-v1의 어느 값을 쓰는지, 시기를 어떻게 고르는지를 정한다.
 * 본문 생성은 여기서 고른 값과 근거(factors)만 사용한다. 계수와 기간은 POSTPOST 자체 초기값이다.
 */
export const LIFETIME_TOC_14_V1 = {
  ruleVersion: "lifetime-toc-14-v1",
  tocDocument: "docs/LIFETIME_TOC_14.md",
  /** 제4~7편의 상승 시기, 조심 시기를 고르는 범위(기준 연도부터 N년) */
  periodWindowYears: 10,
  /** 상승 시기, 조심 시기로 각각 고르는 연도 수 */
  periodPickCount: 2,
  /** 제12편 향후 연운 연도 수 */
  yearlyWindowYears: 5,
  /** 제12편 연도별 꼭 챙길 한 가지에서 비교하는 분야 */
  yearlyFocusCategories: ["wealth", "love", "career", "health"] as const,
  /** 가장 낮은 분야 점수가 이 값 미만이면 그 분야를 조심할 것으로, 아니면 가장 높은 분야를 살릴 것으로 고른다. */
  yearlyGuardBelow: 60,
  /** 제11편 황금기, 가장 힘든 시기는 현재 대운과 이후 대운 안에서만 고른다(지난 대운은 지난 대운 풀이에서 다룬다). */
  daeunPeakScope: "current_and_future" as const,
} as const;
