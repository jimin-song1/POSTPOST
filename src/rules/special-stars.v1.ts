import type { Branch, Stem } from "@/types/saju-analysis";

export const SPECIAL_STARS_V1 = {
  ruleVersion:"special-stars-v1",
  ghostGatePairs:[["子","酉"],["丑","午"],["寅","未"],["卯","申"],["辰","亥"],["巳","戌"]] as const,
  needle:{source:"CUSTOM_RULE",stems:["甲","辛"] as Stem[],branches:["卯","午","未","申"] as Branch[]},
  goegang:["庚辰","庚戌","壬辰","壬戌","戊辰","戊戌"] as const,
  whiteTiger:["甲辰","乙未","丙戌","丁丑","戊辰","壬戌","癸丑"] as const
} as const;
