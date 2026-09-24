import { notImplemented } from "./contracts";
import { countRawElements } from "./fiveElements/raw-count";
import { calculateNativeStrength } from "./fiveElements/native-strength";
import { calculatePillars } from "./pillars/calculate-pillars";
import { normalizeBirthTime } from "./time/normalize-birth-time";
import { solarTermProvider } from "./solarTerms";
import { TIME_RULES_V1 } from "@/rules/time-rules.v1";
import type { Pillar, PillarPosition, SajuAnalysis } from "@/types/saju-analysis";
import type { LegacySajuInput, SajuInput } from "@/types/saju-input";
import { normalizeBirthPlace, SEOUL_FALLBACK_NOTICE } from "./normalize-birth-place";
import { getTenGod } from "./interpretation/ten-gods";
import { getHiddenStems } from "./interpretation/hidden-stems";
import { getTwelveStage } from "./interpretation/twelve-stages";
import { TEN_GODS_V1 } from "@/rules/ten-gods.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { TWELVE_STAGES_V1 } from "@/rules/twelve-stages.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { SEASONAL_ELEMENT_STATE_V1 } from "@/rules/seasonal-element-state.v1";
import { SEASONAL_STRENGTH_V1 } from "@/rules/seasonal-strength.v1";
import { calculateStrength } from "./interpretation/strength";
import { STRENGTH_V1, DAY_MASTER_SUPPORT_V1 } from "@/rules/strength.v1";
import { ROOTING_V1 } from "@/rules/rooting.v1";
import { detectRelations, emptyRelations } from "./interpretation/relations";
import { evaluateTransformation } from "./interpretation/transformation";
import { assessRootDamage, calculateAdjustedStrength, emptyAdjustedStrength } from "./fiveElements/relation-effects";
import { ROOT_DAMAGE_V1 } from "@/rules/root-damage.v1";
import { emptyStructure, evaluateStructure } from "./interpretation/structure";
import { emptyAdjustedDayMasterStrength, evaluateAdjustedDayMasterStrength } from "./interpretation/adjusted-daymaster-strength";
import { emptyUsefulGods, evaluateEokbuUsefulGod } from "./interpretation/eokbu-useful-god";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const byPosition = <T>(get: (position: PillarPosition) => T) =>
  Object.fromEntries(positions.map((position) => [position, get(position)])) as Record<PillarPosition, T>;

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
  const dayStem = pillars.day.stem;
  const hiddenBranches = dayStem ? byPosition((position) => getHiddenStems(pillars[position].branch!, dayStem)) : null;
  const strength = hiddenBranches ? calculateNativeStrength(pillars, hiddenBranches) : null;
  const relations = supportedInput ? detectRelations(pillars) : emptyRelations();
  if (hiddenBranches && strength) relations.transformation = evaluateTransformation(relations, pillars, hiddenBranches, strength.nativeStrength);
  const strengthResult: SajuAnalysis["strength"] = strength && hiddenBranches ?
    calculateStrength(pillars, hiddenBranches, strength.evidence) : {
      status: "not_implemented", ruleVersion: STRENGTH_V1.rulesetVersion,
      rootingRuleVersion: ROOTING_V1.rulesetVersion, supportRuleVersion: DAY_MASTER_SUPPORT_V1.rulesetVersion,
      score: null, level: null, dayMaster: null, deukRyeong: null, deukJi: null, deukSe: null, deukSi: null,
      rooting: null, support: null, drain: null, control: null, relationAdjustmentApplied: false, evidence: [],
      adjustments: { status: "not_implemented", ruleVersion: ROOT_DAMAGE_V1.rulesetVersion,
        originalRootingScore: null, adjustedRootingScore: null, rootDamage: [], adjustedScore: null },
      adjusted: emptyAdjustedDayMasterStrength()
    };
  const adjustedStrength = strength && strengthResult.rooting ? calculateAdjustedStrength({
    nativeStrength: strength.nativeStrength, evidence: strength.evidence
  }, relations, strengthResult) : emptyAdjustedStrength();
  if (strengthResult.rooting) {
    const assessed = assessRootDamage(strengthResult, relations);
    strengthResult.adjustments = { status: "partial", ruleVersion: ROOT_DAMAGE_V1.rulesetVersion,
      originalRootingScore: strengthResult.rooting.score,
      adjustedRootingScore: assessed.adjustedRootingScore,
      rootDamage: assessed.rootDamage, adjustedScore: null };
  }
  strengthResult.adjusted = evaluateAdjustedDayMasterStrength(
    strengthResult, strength?.nativeStrength ?? null, adjustedStrength);
  const structure = hiddenBranches && adjustedStrength.status === "implemented"
    ? evaluateStructure(pillars, hiddenBranches, strengthResult, adjustedStrength, relations) : emptyStructure();
  const usefulGods = structure.specialStructure.status === "implemented"
    ? evaluateEokbuUsefulGod(strengthResult, adjustedStrength, structure.specialStructure)
    : emptyUsefulGods();
  const tenGods: SajuAnalysis["tenGods"] = dayStem && hiddenBranches ? {
    status: "implemented",
    value: {
      ruleVersion: TEN_GODS_V1.rulesetVersion, dayMaster: dayStem,
      heavenlyStems: byPosition((position) => getTenGod(dayStem, pillars[position].stem!)),
      hiddenStems: byPosition((position) => {
        const branch = hiddenBranches[position];
        return [branch.mainQi, branch.middleQi, branch.residualQi].filter((item) => item !== null)
          .map(({ role, stem, tenGod }) => ({ role, stem, tenGod }));
      })
    },
    evidence: ["ten-gods-v1: 일간 대비 오행 생극 거리와 천간 음양"]
  } : notImplemented("일간을 계산할 수 없어 십성을 계산하지 않았습니다.");
  const hiddenStems: SajuAnalysis["hiddenStems"] = hiddenBranches ? {
    status: "implemented", value: { ruleVersion: HIDDEN_STEMS_V1.rulesetVersion, branches: hiddenBranches },
    evidence: ["hidden-stems-v1: 12지지 본기·중기·여기 고정 표"]
  } : notImplemented("일간과 지지를 계산할 수 없어 지장간을 계산하지 않았습니다.");
  const twelveStages: SajuAnalysis["twelveStages"] = dayStem ? {
    status: "implemented",
    value: {
      ruleVersion: TWELVE_STAGES_V1.rulesetVersion,
      stages: byPosition((position) => getTwelveStage(dayStem, pillars[position].branch!))
    },
    evidence: ["twelve-stages-v1: 10천간 장생 시작 지지·양순음역"]
  } : notImplemented("일간과 지지를 계산할 수 없어 십이운성을 계산하지 않았습니다.");
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
    tenGods,
    hiddenStems,
    twelveStages,
    fiveElements: {
      status: strength ? "implemented" : "not_implemented",
      ruleVersion: "five-elements-v1",
      weightRuleVersion: ELEMENT_WEIGHT_V1.rulesetVersion,
      seasonalStateRuleVersion: SEASONAL_ELEMENT_STATE_V1.rulesetVersion,
      seasonalStrengthRuleVersion: SEASONAL_STRENGTH_V1.rulesetVersion,
      rawCount: countRawElements(pillars),
      nativeStrength: strength?.nativeStrength ?? null,
      adjustedStrength,
      evidence: strength?.evidence ?? []
    },
    relations,
    strength: strengthResult,
    structure,
    usefulGods,
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
