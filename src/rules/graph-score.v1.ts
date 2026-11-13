/**
 * 그래프 표시 점수 규칙 v1.
 *
 * 엔진 점수(fortune.categories, strength 등)는 그대로 두고, 고객 화면 그래프에 쓰는 표시 점수만 여기서 만든다.
 * 계수는 POSTPOST 자체 초기값이며 전통 절대값이 아니다. 샘플 명식 평가로 보정해야 한다.
 */
export const GRAPH_SCORE_V1 = {
  ruleVersion: "graph-score-v1",
  /** 시기 점수: 개인 생애 분포(세운 전체) 안에서의 위치로 환산한다. */
  period: {
    display: { min: 30, max: 97 },
    /** 표준편차 1당 표시 점수 폭 */
    spread: 11,
    /** 분포가 지나치게 평평할 때 잡음을 키우지 않도록 두는 표준편차 하한 */
    sdFloor: { core: 1.5, specific: 2 },
    /** 그 사람의 평균 수준을 반영하는 기준점 */
    anchor: { base: 64, reference: 60, gain: 1.2, min: 56, max: 72 },
    /** 분야 점수 = 공통 성분(그 해 전체 흐름) + 분야 고유 성분(십성 흐름, 궁위 작용에서 공통 성분을 뺀 나머지) */
    mix: { overall: { core: 1, specific: 0 }, category: { core: 0.65, specific: 0.75 } },
  },
  /** 분야 고유 성분에 더하는 궁위·신살 보정(엔진 flowQualityScore와 같은 척도) */
  palace: {
    love: { position: "day", combine: 6, clash: -8, friction: -4, peachBlossom: 4 },
    career: { position: "month", combine: 5, clash: -7, friction: -3, nobleStar: 3 },
    wealth: { wealthStem: 4, robStem: -4 },
    health: { clash: -8, dayClash: -4, friction: -4, samjae: -3, favorabilityWeight: 0.1 },
  },
  relationGroups: {
    combine: ["SIX_COMBINATION", "THREE_HARMONY", "DIRECTIONAL_COMBINATION"],
    clash: ["BRANCH_CLASH"],
    friction: ["BRANCH_HARM", "BRANCH_BREAK", "WONJIN", "SELF_PUNISHMENT", "MUTUAL_PUNISHMENT", "THREE_PUNISHMENT"],
  },
  /** 원국 고정 그래프: 십성 비중(일간 제외, 합 100)에서 평균 20을 뺀 값에 계수를 곱한다. */
  natal: {
    display: { min: 20, max: 97 },
    base: 60,
    averageShare: 20,
    work: {
      career: { officer: 0.9, resource: 0.4, structureBonus: 10, usefulBonus: 8 },
      business: { wealth: 0.6, output: 0.6, companion: 0.15, strengthWeight: 0.5, structureBonus: 10 },
      study: { resource: 0.8, output: 0.25, academicStar: 8, structureBonus: 10 },
    },
    wealth: {
      earn: { wealth: 0.8, output: 0.5 },
      save: { wealth: 0.5, officer: 0.5, companion: -0.6, directWealthVisible: 5 },
      keep: { strengthWeight: 0.6, resource: 0.4, robVisible: -4 },
      grow: { output: 0.7, wealth: 0.4, indirectWealthVisible: 6 },
    },
    love: {
      expression: { output: 1.2 },
      initiative: { companion: 0.6, output: 0.5, strengthWeight: 0.3 },
      sincerity: { officer: 0.9, resource: 0.5 },
      charm: { base: 55, peachBlossom: 12, flowerCanopy: 4, output: 0.3 },
      devotion: { resource: 0.8, officer: 0.4, steadyDayBranch: 8 },
      stability: { officer: 0.6, resource: 0.4, travelHorse: -6, dayBranchClash: -8 },
    },
    structureGroups: {
      officer: ["정관격", "편관격"],
      wealthOutput: ["정재격", "편재격", "식신격", "상관격"],
      resource: ["정인격", "편인격"],
    },
    steadyDayTenGods: ["정인", "정관", "정재"],
    favorableRoles: ["PRIMARY", "SECONDARY", "FAVORABLE"],
    unfavorableRoles: ["UNFAVORABLE"],
  },
  /** 십이운성 에너지 곡선(초년·청년·중년·말년) */
  twelveStageEnergy: {
    장생: 75, 목욕: 60, 관대: 80, 건록: 90, 제왕: 97, 쇠: 65,
    병: 45, 사: 32, 묘: 38, 절: 25, 태: 42, 양: 55,
  } as Record<string, number>,
} as const;
