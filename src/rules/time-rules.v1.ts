export const TIME_RULES_V1 = {
  rulesetVersion: "saju-time-v1",
  timezone: "Asia/Seoul",
  modernKoreaOffsetMinutes: -30,
  equationOfTime: false,
  lateRatHour: false,
  dayBoundary: "adjusted_time_00_00",
  yearBoundary: "exact_ipchun",
  monthBoundary: "exact_12_jeol",
  historicalTime: { status: "not_implemented", source: "IANA Asia/Seoul history" }
} as const;

export const HOUR_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
