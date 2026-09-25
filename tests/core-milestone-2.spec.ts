import { describe, expect, it } from "vitest";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "@/rules/ganzhi.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { TWELVE_STAGES_V1 } from "@/rules/twelve-stages.v1";
import { getTenGod } from "@/lib/saju/interpretation/ten-gods";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { getTwelveStage } from "@/lib/saju/interpretation/twelve-stages";
import { calculateSaju } from "@/lib/saju/engine";
import { SYNTHETIC_CASE } from "./synthetic-input";
import type { Branch, Stem } from "@/types/saju-analysis";

describe("십성 ten-gods-v1", () => {
  it("甲 일간에서 10천간의 십성을 전부 구한다", () => {
    const expected = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
    expect(HEAVENLY_STEMS.map((stem) => getTenGod("甲", stem).korean)).toEqual(expected);
    expect(getTenGod("甲", "庚")).toEqual({ korean: "편관", hanja: "偏官" });
  });
  it("음간 乙과 다른 양간 庚에도 동일한 생극·음양 규칙을 적용한다", () => {
    expect(HEAVENLY_STEMS.map((stem) => getTenGod("乙", stem).korean)).toEqual([
      "겁재", "비견", "상관", "식신", "정재", "편재", "정관", "편관", "정인", "편인"
    ]);
    expect(getTenGod("庚", "壬").korean).toBe("식신");
    expect(getTenGod("庚", "丁").korean).toBe("정관");
  });
  it("모든 일간과 대상 천간 100개 조합이 정의된다", () => {
    for (const day of HEAVENLY_STEMS) for (const target of HEAVENLY_STEMS) {
      expect(getTenGod(day, target).hanja).toBeTruthy();
    }
  });
});

describe("지장간 hidden-stems-v1", () => {
  it.each([["子", "癸"], ["卯", "乙"], ["酉", "辛"]] as const)("%s에는 %s 본기만 있다", (branch, stem) => {
    expect(HIDDEN_STEMS_V1.branches[branch]).toEqual({ mainQi: stem, middleQi: null, residualQi: null });
  });
  it.each([
    ["辰", "戊", "癸", "乙"], ["戌", "戊", "丁", "辛"],
    ["丑", "己", "辛", "癸"], ["未", "己", "乙", "丁"]
  ] as const)("%s의 본기·중기·여기와 십성을 보존한다", (branch, mainQi, middleQi, residualQi) => {
    const result = getHiddenStems(branch, "甲");
    expect([result.mainQi.stem, result.middleQi?.stem, result.residualQi?.stem]).toEqual([mainQi, middleQi, residualQi]);
    expect(result.mainQi.role).toBe("mainQi");
    expect(result.middleQi?.role).toBe("middleQi");
    expect(result.residualQi?.role).toBe("residualQi");
    for (const stem of [result.mainQi, result.middleQi!, result.residualQi!]) {
      expect(stem.element).toBeTruthy();
      expect(stem.polarity).toMatch(/^(yin|yang)$/);
      expect(stem.tenGod).toEqual(getTenGod("甲", stem.stem));
    }
  });
  it("12지지 표는 모두 유효한 천간만 포함한다", () => {
    for (const branch of EARTHLY_BRANCHES) {
      const result = getHiddenStems(branch, "乙");
      expect(HEAVENLY_STEMS).toContain(result.mainQi.stem);
      for (const item of [result.middleQi, result.residualQi]) if (item) expect(HEAVENLY_STEMS).toContain(item.stem);
    }
  });
});

describe("십이운성 twelve-stages-v1", () => {
  it.each([["亥", "장생"], ["子", "목욕"], ["酉", "태"], ["辰", "쇠"]] as const)("甲/%s는 %s", (branch, expected) => {
    expect(getTwelveStage("甲", branch).korean).toBe(expected);
  });
  it("乙 음간은 午에서 장생하고 역행한다", () => {
    expect(getTwelveStage("乙", "午").korean).toBe("장생");
    expect(getTwelveStage("乙", "巳").korean).toBe("목욕");
    expect(getTwelveStage("乙", "未").korean).toBe("양");
    expect(getTwelveStage("乙", "卯").korean).toBe("건록");
    expect(getTwelveStage("癸", "寅").korean).toBe("목욕");
  });
  it("10천간 각각 12지지에서 모든 단계가 한 번씩 나온다", () => {
    const labels = TWELVE_STAGES_V1.stages.map(({ korean }) => korean).sort();
    for (const stem of HEAVENLY_STEMS) {
      expect(EARTHLY_BRANCHES.map((branch) => getTwelveStage(stem, branch).korean).sort()).toEqual(labels);
    }
  });
});

describe("합성 입력의 엔진 통합", () => {
  it("실제 계산한 네 기둥의 천간·지지에 세 모듈을 적용한다", () => {
    expect(SYNTHETIC_CASE.isSynthetic).toBe(true);
    expect(SYNTHETIC_CASE.caseId).toMatch(/^SYNTHETIC_/);
    const result = calculateSaju(SYNTHETIC_CASE.input);
    expect([result.tenGods.status, result.hiddenStems.status, result.twelveStages.status]).toEqual([
      "implemented", "implemented", "implemented"
    ]);
    expect(result.tenGods.value?.ruleVersion).toBe("ten-gods-v1");
    expect(result.hiddenStems.value?.ruleVersion).toBe("hidden-stems-v1");
    expect(result.twelveStages.value?.ruleVersion).toBe("twelve-stages-v1");
    for (const position of ["year", "month", "day", "hour"] as const) {
      const { stem, branch } = result.pillars[position];
      expect(result.tenGods.value?.heavenlyStems[position]).toEqual(getTenGod(result.dayMaster!, stem!));
      expect(result.hiddenStems.value?.branches[position]).toEqual(getHiddenStems(branch!, result.dayMaster!));
      expect(result.twelveStages.value?.stages[position]).toEqual(getTwelveStage(result.dayMaster!, branch!));
      expect(result.tenGods.value?.hiddenStems[position].map((entry) => entry.stem)).toEqual(
        [result.hiddenStems.value?.branches[position].mainQi, result.hiddenStems.value?.branches[position].middleQi,
          result.hiddenStems.value?.branches[position].residualQi].filter((entry) => entry !== null).map((entry) => entry?.stem)
      );
    }
    expect(result.strength.status).toBe("implemented");
    expect(result.usefulGods.status).toBe("implemented");
    expect(result.engineMetadata.aiCalculationUsed).toBe(false);
  });
  it("출생시간 미상에서는 세 모듈을 추정하지 않는다", () => {
    const result = calculateSaju({ ...SYNTHETIC_CASE.input, birthTimeKnown: false, birthTime: null });
    expect(result.tenGods.status).toBe("not_implemented");
    expect(result.hiddenStems.status).toBe("not_implemented");
    expect(result.twelveStages.status).toBe("not_implemented");
  });
});
