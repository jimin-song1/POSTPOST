import { describe, expect, it } from "vitest";
import { calculateHourPillar } from "@/lib/saju/pillars/hour";
import { calculatePillars } from "@/lib/saju/pillars/calculate-pillars";
import { getHourBranch } from "@/lib/saju/time/hour-branch";
import { normalizeBirthTime } from "@/lib/saju/time/normalize-birth-time";
import { SYNTHETIC_INPUT } from "./synthetic-input";

describe("현대 한국 시간 규칙 v1", () => {
  it.each([
    ["09:29", "08:59", "辰", "戊辰"],
    ["09:30", "09:00", "巳", "己巳"],
    ["09:31", "09:01", "巳", "己巳"],
    ["09:32", "09:02", "巳", "己巳"]
  ])("%s 입력을 30분 보정해 %s / %s / %s로 계산한다", (birthTime, adjustedTime, branch, pillar) => {
    const normalized = normalizeBirthTime({ ...SYNTHETIC_INPUT, birthTime });
    expect(normalized.adjustedDateTime).toContain(`T${adjustedTime}:00+09:00`);
    expect(getHourBranch(normalized.adjustedFields!.hour)).toBe(branch);
    expect(calculateHourPillar(normalized.adjustedFields!.hour, "甲").hanja).toBe(pillar);
    expect(calculatePillars(normalized).hour.branch).toBe(branch);
  });

  it("00:10 입력은 전날 23:40으로 rollover한다", () => {
    const normalized = normalizeBirthTime({ ...SYNTHETIC_INPUT, birthTime: "00:10" });
    expect(normalized.adjustedDateTime).toBe("2024-03-31T23:40:00+09:00");
    expect(getHourBranch(normalized.adjustedFields!.hour)).toBe("子");
    const pillars = calculatePillars(normalized);
    expect(pillars.day.hanja).toBe("甲午");
    expect(pillars.hour.hanja).toBe("甲子");
  });

  it.each([
    [23, "子"], [0, "子"], [1, "丑"], [2, "丑"], [7, "辰"], [8, "辰"],
    [9, "巳"], [10, "巳"], [21, "亥"], [22, "亥"]
  ])("%i시는 %s시이다", (hour, branch) => expect(getHourBranch(hour)).toBe(branch));
});
