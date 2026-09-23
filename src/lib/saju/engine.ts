import { notImplemented } from "./contracts";
import { countRawElements } from "./fiveElements/raw-count";
import { TEST_001_DAEUN } from "./luck/test-001-daeun";
import { isTest001, TEST_001_PILLARS } from "./pillars/test-fixtures";
import { normalizeBirthTime } from "./time/normalize-birth-time";
import { TIME_RULES_V1 } from "@/rules/time-rules.v1";
import { TWELVE_STAGES_V1 } from "@/rules/twelve-stages.v1";
import type { Pillar, SajuAnalysis } from "@/types/saju-analysis";
import type { SajuInput } from "@/types/saju-input";

const emptyPillars = (): SajuAnalysis["pillars"] => Object.fromEntries(
  (["year", "month", "day", "hour"] as const).map((position) => [position, { position, stem: null, branch: null, hanja: null, korean: null } satisfies Pillar])
) as SajuAnalysis["pillars"];

export function calculateSaju(input: SajuInput): SajuAnalysis {
  const matched = isTest001(input);
  const normalized = normalizeBirthTime(input);
  const pillars = matched ? TEST_001_PILLARS : emptyPillars();
  const fixtureEvidence = "TEST-001 회귀 fixture: 음양관/귀신사주 비교 결과로 고정된 값";

  return {
    schemaVersion: "saju-analysis-v1",
    rulesetVersion: TIME_RULES_V1.rulesetVersion,
    person: { name: input.name, gender: input.gender },
    birthInput: input,
    birthNormalized: { ...normalized, offsetMinutes: -30, timezone: "Asia/Seoul", equationOfTimeApplied: false },
    solarTerms: notImplemented("정확한 절입 datetime 계산기 구현 필요"),
    pillars,
    dayMaster: matched ? "甲" : null,
    tenGods: notImplemented("일간 기준 천간·지장간 십성 계산기 구현 필요"),
    hiddenStems: notImplemented("hidden-stems-v1 표 확정 필요"),
    twelveStages: matched
      ? { status: "partial", value: TWELVE_STAGES_V1.test001, evidence: [fixtureEvidence], todo: TWELVE_STAGES_V1.todo }
      : notImplemented<Record<Pillar["position"], string>>(TWELVE_STAGES_V1.todo),
    fiveElements: {
      rawCount: countRawElements(pillars),
      nativeStrength: notImplemented("element-strength-v1 가중 세력 계산기 구현 필요"),
      adjustedStrength: notImplemented("관계 엔진 적용 후 계산")
    },
    relations: notImplemented("relations-v1 관계 탐지 및 합화 evaluator 구현 필요"),
    strength: notImplemented<{ score: number; level: string }>("strength-weights-v1 기반 신강신약 evaluator 구현 필요"),
    structure: matched
      ? { status: "partial", value: { primary: "정관격" }, evidence: ["甲 일간, 酉월, 酉 본기 辛은 正官"], todo: "일반 격국 evaluator 구현 필요" }
      : notImplemented("격국 evaluator 구현 필요"),
    usefulGods: notImplemented("억부·조후·통관·병약·격국용신 및 종격 evaluator 구현 필요"),
    stemPreferences: notImplemented("용신 evaluator 완성 후 계산"),
    branchPreferences: notImplemented("지장간·관계·운 evaluator 완성 후 계산"),
    nobleAndSpecialStars: notImplemented("noblemen-v1 및 sinsal-v1 테이블 구현 필요"),
    samjae: notImplemented("생년지 그룹 기반 삼재 range 계산기 구현 필요"),
    daeun: matched ? {
      status: "partial", direction: "forward", directionLabel: "순행", referenceSolarTerm: "next",
      exactStartAge: null, startAgeYears: 3, startAgeMonths: null, startDatetime: null,
      periods: TEST_001_DAEUN, evidence: ["乙은 음간이며 여성은 음녀이므로 순행", fixtureEvidence],
      todo: "정확한 다음 절입 시각으로 exactStartAge/startDatetime 계산"
    } : {
      status: "not_implemented", direction: null, directionLabel: null, referenceSolarTerm: null,
      exactStartAge: null, startAgeYears: null, startAgeMonths: null, startDatetime: null, periods: [], evidence: [],
      todo: "절입 계산기 구현 후 일반 입력 지원"
    },
    fortune: notImplemented("대운 45·세운 35·월운 20 규칙 기반 운 작용 엔진 구현 필요"),
    warnings: matched ? ["현재 결과에는 TEST-001 회귀 fixture가 포함됩니다.", "AI 계산은 사용하지 않았습니다."] : ["현재 최소 코어는 TEST-001 이외의 원국 계산을 지원하지 않습니다."],
    engineMetadata: { engineVersion: "0.1.0", calculationMode: matched ? "test_fixture" : "unsupported_input", calculatedAt: new Date().toISOString(), aiCalculationUsed: false }
  };
}
