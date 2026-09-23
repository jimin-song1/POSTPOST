import { describe, expect, it } from "vitest";
import { calculateDayPillar } from "@/lib/saju/pillars/day";
import { calculateMonthPillar } from "@/lib/saju/pillars/month";
import { calculateYearPillar } from "@/lib/saju/pillars/year";
import { solarTermProvider } from "@/lib/saju/solarTerms";
import { normalizeBirthTime } from "@/lib/saju/time/normalize-birth-time";
import { calculatePillars } from "@/lib/saju/pillars/calculate-pillars";
import { SYNTHETIC_INPUT } from "./synthetic-input";

describe("절입 기반 년주·월주", () => {
  it.each([[2024, "입춘", "year"], [2024, "백로", "month"]] as const)("%i %s 직전·직후 30분에 실제 입력의 %s주가 전환된다", (year, term, position) => {
    const boundary = solarTermProvider.getSolarTerm(year, term).instant.getTime();
    const atMinute = Math.ceil(boundary / 60000) * 60000;
    const fromInstant = (instant: number) => {
      const civil = new Date(instant + 9 * 3600000).toISOString();
      return calculatePillars(normalizeBirthTime({ ...SYNTHETIC_INPUT, birthDate: civil.slice(0, 10), birthTime: civil.slice(11, 16) }))[position].hanja;
    };
    expect(fromInstant(atMinute - 60000)).not.toBe(fromInstant(atMinute));
    expect(fromInstant(atMinute)).toBe(fromInstant(atMinute + 30 * 60000));
  });
  it("입춘 정확한 순간 전후에 년주가 바뀐다", () => {
    const ipchun = solarTermProvider.getSolarTerm(2024, "입춘").instant;
    expect(calculateYearPillar(new Date(ipchun.getTime() - 1), 2024, solarTermProvider).hanja).toBe("癸卯");
    expect(calculateYearPillar(ipchun, 2024, solarTermProvider).hanja).toBe("甲辰");
  });

  it("백로 정확한 순간 전후에 申월에서 酉월로 바뀐다", () => {
    const bailu = solarTermProvider.getSolarTerm(2024, "백로").instant;
    expect(calculateMonthPillar(new Date(bailu.getTime() - 1), "甲", solarTermProvider).hanja).toBe("壬申");
    expect(calculateMonthPillar(bailu, "甲", solarTermProvider).hanja).toBe("癸酉");
  });

  it("previous/next provider가 정확한 절입을 둘러싼다", () => {
    const instant = new Date("2024-03-31T22:59:00.000Z");
    expect(solarTermProvider.getPreviousJeol(instant).term).toBe("경칩");
    expect(solarTermProvider.getNextJeol(instant).term).toBe("청명");
  });
});

describe("00:00 경계의 60갑자 일주", () => {
  it.each([
    [{ year: 2024, month: 4, day: 1 }, "乙未"],
    [{ year: 2024, month: 4, day: 6 }, "庚子"]
  ])("홍콩 천문대 2024년 연력의 독립 일진과 일치한다", (date, expected) => {
    expect(calculateDayPillar(date).hanja).toBe(expected);
  });
  it("독립 기준일과 전후 날짜의 60갑자 순환을 확인한다", () => {
    expect(calculateDayPillar({ year: 2024, month: 4, day: 1 }).hanja).toBe("乙未");
    expect(calculateDayPillar({ year: 2024, month: 4, day: 2 }).hanja).toBe("丙申");
    expect(calculateDayPillar({ year: 2024, month: 3, day: 31 }).hanja).toBe("甲午");
    expect(calculateDayPillar({ year: 2024, month: 5, day: 31 }).hanja).toBe("乙未");
  });
});
