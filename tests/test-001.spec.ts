import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { TEST_001_INPUT } from "@/lib/saju/pillars/test-fixtures";

describe("TEST-001 회귀 테스트", () => {
  const result = calculateSaju(TEST_001_INPUT);
  it("현대 한국 자연시를 30분 차감한다", () => expect(result.birthNormalized.adjustedDateTime).toBe("2024-04-01T12:04:00+09:00"));
  it("확정된 네 기둥과 일간을 반환한다", () => {
    expect(Object.values(result.pillars).map((pillar) => pillar.hanja)).toEqual(["乙亥", "乙酉", "甲子", "戊辰"]);
    expect(result.dayMaster).toBe("甲");
  });
  it("겉으로 드러난 8글자의 대표 오행을 센다", () => expect(result.fiveElements.rawCount).toEqual({ wood: 3, fire: 0, earth: 2, metal: 1, water: 2 }));
  it("음년생 여성의 대운을 순행 fixture로 반환한다", () => {
    expect(result.daeun.direction).toBe("forward");
    expect(result.daeun.periods.slice(0, 5).map((period) => period.pillar)).toEqual(["丙戌", "丁亥", "戊子", "己丑", "庚寅"]);
  });
  it("AI 계산을 사용하지 않는다", () => expect(result.engineMetadata.aiCalculationUsed).toBe(false));
});
