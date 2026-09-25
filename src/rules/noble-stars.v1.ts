import type { Branch, Stem } from "@/types/saju-analysis";

export const NOBLE_STARS_V1 = {
  ruleVersion: "noble-stars-v1",
  byDayStem: {
    HEAVENLY_NOBLE: { 甲:["丑","未"],乙:["子","申"],丙:["亥","酉"],丁:["亥","酉"],戊:["丑","未"],
      己:["子","申"],庚:["丑","未"],辛:["寅","午"],壬:["卯","巳"],癸:["卯","巳"] },
    TAIJI_NOBLE: { 甲:["子","午"],乙:["子","午"],丙:["卯","酉"],丁:["卯","酉"],戊:["辰","戌","丑","未"],
      己:["辰","戌","丑","未"],庚:["寅","亥"],辛:["寅","亥"],壬:["巳","申"],癸:["巳","申"] },
    LITERARY: { 甲:["巳"],乙:["午"],丙:["申"],丁:["酉"],戊:["申"],己:["酉"],庚:["亥"],辛:["子"],壬:["寅"],癸:["卯"] },
    ACADEMIC: { 甲:["亥"],乙:["午"],丙:["寅"],丁:["酉"],戊:["寅"],己:["酉"],庚:["巳"],辛:["子"],壬:["申"],癸:["卯"] }
  } satisfies Record<string, Record<Stem, readonly Branch[]>>,
  labels: { HEAVENLY_NOBLE:"천을귀인", TAIJI_NOBLE:"태극귀인", LITERARY:"문창귀인", ACADEMIC:"학당귀인" }
} as const;
