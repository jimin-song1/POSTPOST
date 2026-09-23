import type { LuckPeriod } from "@/types/saju-analysis";

const pillars = ["丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳", "甲午", "乙未"];

export const TEST_001_DAEUN: LuckPeriod[] = pillars.map((pillar, index) => ({
  pillar,
  startAgeYears: 3 + index * 10,
  endAgeYears: 12 + index * 10,
  ageRange: `${3 + index * 10}~${12 + index * 10}`
}));
