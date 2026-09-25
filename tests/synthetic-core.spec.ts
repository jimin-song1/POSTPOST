import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculatePillars } from "@/lib/saju/pillars/calculate-pillars";
import { normalizeBirthTime } from "@/lib/saju/time/normalize-birth-time";
import { SYNTHETIC_INPUT } from "./synthetic-input";

describe("SYNTHETIC_CORE_001 회귀 테스트", () => {
  const result = calculateSaju(SYNTHETIC_INPUT);
  it("현대 한국 자연시를 30분 차감한다", () => expect(result.birthNormalized.adjustedDateTime).toBe("2024-04-01T12:04:00+09:00"));
  it("확정된 네 기둥과 일간을 반환한다", () => {
    const pillars = calculatePillars(normalizeBirthTime(SYNTHETIC_INPUT));
    expect(Object.values(pillars).map((pillar) => pillar.hanja)).toEqual(["甲辰", "丁卯", "乙未", "壬午"]);
    expect(result.pillars).toEqual(pillars);
    expect(result.dayMaster).toBe("乙");
  });
  it("겉으로 드러난 8글자의 대표 오행을 센다", () => expect(result.fiveElements.rawCount).toEqual({ wood: 3, fire: 2, earth: 2, metal: 0, water: 1 }));
  it("fixture 없이 알고리즘 계산 모드로 반환한다", () => expect(result.engineMetadata.calculationMode).toBe("algorithmic"));
  it("대운 원본과 14A 분석을 구현하고 후속 운 레이어는 보류한다", () => {
    expect(result.daeun.status).toBe("implemented");
    expect(result.fortune).toMatchObject({ status: "partial", daeun: { status: "implemented" },
      seun: { status: "implemented" }, wolun: { status: "implemented" },
      transformation: { status: "implemented" }, synthesis: { status: "implemented" } });
    expect(result.structure.status).toBe("implemented");
    expect(result.strength.status).toBe("implemented");
  });
  it("AI 계산을 사용하지 않는다", () => expect(result.engineMetadata.aiCalculationUsed).toBe(false));
});
