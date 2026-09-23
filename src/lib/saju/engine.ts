import { notImplemented } from "./contracts";
import { countRawElements } from "./fiveElements/raw-count";
import { calculatePillars } from "./pillars/calculate-pillars";
import { normalizeBirthTime } from "./time/normalize-birth-time";
import { solarTermProvider } from "./solarTerms";
import { TIME_RULES_V1 } from "@/rules/time-rules.v1";
import type { Pillar, SajuAnalysis } from "@/types/saju-analysis";
import type { LegacySajuInput, SajuInput } from "@/types/saju-input";
import { normalizeBirthPlace, SEOUL_FALLBACK_NOTICE } from "./normalize-birth-place";

const emptyPillars = (): SajuAnalysis["pillars"] => Object.fromEntries(
  (["year", "month", "day", "hour"] as const).map((position) => [position, { position, stem: null, branch: null, hanja: null, korean: null } satisfies Pillar])
) as SajuAnalysis["pillars"];

export function calculateSaju(request: SajuInput | LegacySajuInput): SajuAnalysis {
  const { birthPlace, ...placeInput } = normalizeBirthPlace(request);
  const input: SajuInput = { ...request, ...placeInput };
  if (input.birthCountry !== "KR") throw new UnsupportedBirthCountryError();
  const normalized = normalizeBirthTime(input);
  const supportedInput = input.calendarType === "solar" && normalized.absoluteBirthInstant !== null;
  const pillars = supportedInput ? calculatePillars(normalized) : emptyPillars();
  const solarTerms = supportedInput && normalized.absoluteBirthInstant ? (() => {
    const previous = solarTermProvider.getPreviousJeol(normalized.absoluteBirthInstant);
    const next = solarTermProvider.getNextJeol(normalized.absoluteBirthInstant);
    return {
      status: "implemented" as const,
      value: {
        previousJeol: { term: previous.term, instant: previous.instantIso },
        nextJeol: { term: next.term, instant: next.instantIso },
        providerRange: solarTermProvider.supportedRange
      },
      evidence: [previous.source],
    };
  })() : notImplemented("양력과 출생시간이 확인된 입력에서 계산합니다.");

  return {
    schemaVersion: "saju-analysis-v1",
    rulesetVersion: TIME_RULES_V1.rulesetVersion,
    person: { name: input.name, gender: input.gender },
    birthInput: input,
    birthNormalized: {
      absoluteBirthInstant: normalized.absoluteBirthInstant?.toISOString() ?? null,
      legalDateTime: normalized.legalDateTime,
      adjustedDateTime: normalized.adjustedDateTime,
      birthPlace, offsetMinutes: -30, timezone: "Asia/Seoul", equationOfTimeApplied: false
    },
    solarTerms,
    pillars,
    dayMaster: pillars.day.stem,
    tenGods: notImplemented("일간 기준 천간·지장간 십성 계산기 구현 필요"),
    hiddenStems: notImplemented("hidden-stems-v1 표 확정 필요"),
    twelveStages: notImplemented<Record<Pillar["position"], string>>("10일간 × 12지지 전체 테이블 입력"),
    fiveElements: {
      rawCount: countRawElements(pillars),
      nativeStrength: notImplemented("element-strength-v1 가중 세력 계산기 구현 필요"),
      adjustedStrength: notImplemented("관계 엔진 적용 후 계산")
    },
    relations: notImplemented("relations-v1 관계 탐지 및 합화 evaluator 구현 필요"),
    strength: notImplemented<{ score: number; level: string }>("strength-weights-v1 기반 신강신약 evaluator 구현 필요"),
    structure: notImplemented("격국 evaluator 구현 필요"),
    usefulGods: notImplemented("억부·조후·통관·병약·격국용신 및 종격 evaluator 구현 필요"),
    stemPreferences: notImplemented("용신 evaluator 완성 후 계산"),
    branchPreferences: notImplemented("지장간·관계·운 evaluator 완성 후 계산"),
    nobleAndSpecialStars: notImplemented("noblemen-v1 및 sinsal-v1 테이블 구현 필요"),
    samjae: notImplemented("생년지 그룹 기반 삼재 range 계산기 구현 필요"),
    daeun: {
      status: "not_implemented", direction: null, directionLabel: null, referenceSolarTerm: null,
      exactStartAge: null, startAgeYears: null, startAgeMonths: null, startDatetime: null, periods: [], evidence: [],
      todo: "대운 방향 및 시작 시각 계산은 후속 마일스톤에서 구현"
    },
    fortune: notImplemented("대운 45·세운 35·월운 20 규칙 기반 운 작용 엔진 구현 필요"),
    warnings: [
      ...(!input.birthTimeKnown ? ["출생시간 미상 입력은 원국 계산을 지원하지 않습니다."] : []),
      ...(input.calendarType === "lunar" ? ["음력/윤달의 양력 변환은 아직 구현되지 않아 원국을 계산하지 않았습니다."] : []),
      ...(birthPlace.isEstimated ? [SEOUL_FALLBACK_NOTICE] : []),
    ],
    engineMetadata: { engineVersion: "1.0.0", calculationMode: supportedInput ? "algorithmic" : "unsupported_input", calculatedAt: new Date().toISOString(), aiCalculationUsed: false }
  };
}

export class UnsupportedBirthCountryError extends Error {
  readonly code = "UNSUPPORTED_BIRTH_COUNTRY";
  constructor() { super("해외 출생 시간 계산은 현재 지원되지 않습니다."); }
}
