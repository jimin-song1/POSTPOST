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
import { evaluateJohuUsefulGod } from "./interpretation/johu-useful-god";
import { evaluateTonggwanUsefulGod } from "./interpretation/tonggwan-useful-god";
import { evaluateByeongyakUsefulGod } from "./interpretation/byeongyak-useful-god";
import { synthesizeUsefulGods } from "./interpretation/useful-god-synthesis";
import { evaluateStructureUsefulGod } from "./interpretation/structure-useful-god";
import { evaluateStemPreferences } from "./interpretation/stem-preferences";
import { evaluateBranchPreferences } from "./interpretation/branch-preferences";
import { evaluateNobleSpecialStars } from "./interpretation/noble-special-stars";
import { generateDaeun } from "./fortune/daeun-generation";
import { evaluateDaeunActivation } from "./fortune/daeun-activation";
import { generateSeun } from "./fortune/seun-generation";
import { evaluateSeunActivation } from "./fortune/seun-activation";

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
  if (hiddenBranches && usefulGods.status === "partial") {
    usefulGods.johu = evaluateJohuUsefulGod(pillars, hiddenBranches, adjustedStrength, relations);
    usefulGods.tonggwan = evaluateTonggwanUsefulGod(adjustedStrength,
      strength?.nativeStrength ?? null, relations, structure.specialStructure);
    usefulGods.byeongyak = evaluateByeongyakUsefulGod(dayStem, adjustedStrength,
      strengthResult, structure, relations, usefulGods.tonggwan);
    usefulGods.structure = evaluateStructureUsefulGod(dayStem, adjustedStrength, structure);
    usefulGods.synthesis = synthesizeUsefulGods(usefulGods);
    usefulGods.status = "implemented";
  }
  const stemPreferences = hiddenBranches && usefulGods.status === "implemented"
    ? evaluateStemPreferences(pillars, hiddenBranches, relations, usefulGods)
    : notImplemented("용신 종합 결과를 계산할 수 없어 천간 선호도를 계산하지 않았습니다.");
  const branchPreferences = stemPreferences.status === "implemented" && "stems" in stemPreferences
    ? evaluateBranchPreferences(pillars, stemPreferences)
    : notImplemented("천간 선호도를 계산할 수 없어 지지 선호도를 계산하지 않았습니다.");
  const nobleAndSpecialStars = supportedInput
    ? evaluateNobleSpecialStars(pillars, relations)
    : notImplemented("완성된 원국 간지가 없어 귀인·신살을 계산하지 않았습니다.");
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
  const daeun = supportedInput && normalized.absoluteBirthInstant && pillars.year.stem && pillars.month.stem && pillars.month.branch
    ? (() => { const previous=solarTermProvider.getPreviousJeol(normalized.absoluteBirthInstant!);
      const next=solarTermProvider.getNextJeol(normalized.absoluteBirthInstant!);
      return generateDaeun(pillars.year.stem!,pillars.month,input.gender,normalized.absoluteBirthInstant!,
        new Date(previous.instantIso),new Date(next.instantIso)); })()
    : {status:"not_implemented" as const,direction:null,directionLabel:null,referenceSolarTerm:null,
      exactStartAge:null,exactTermDifferenceMilliseconds:null,exactTermDifferenceDays:null,exactConvertedDuration:null,
      startAgeYears:null,startAgeMonths:null,startDatetime:null,periods:[],evidence:[],
      todo:"완성된 원국과 절입 시각이 필요"};
  const fortune = daeun.status === "implemented" && stemPreferences.status === "implemented" && "stems" in stemPreferences &&
    branchPreferences.status === "implemented" && "branches" in branchPreferences &&
    nobleAndSpecialStars.status === "implemented" && "nobleStars" in nobleAndSpecialStars
    ? evaluateDaeunActivation(daeun,pillars,relations,stemPreferences,branchPreferences,nobleAndSpecialStars)
    : notImplemented("대운 원본과 천간·지지 선호도 및 신살 결과가 필요합니다.");
  if(fortune.status==="partial"&&"daeun" in fortune&&fortune.daeun.status==="implemented"&&daeun.status==="implemented"&&
    stemPreferences.status==="implemented"&&"stems" in stemPreferences&&branchPreferences.status==="implemented"&&
    "branches" in branchPreferences&&nobleAndSpecialStars.status==="implemented"&&"nobleStars" in nobleAndSpecialStars){
    const seunSource=generateSeun(daeun.periods,solarTermProvider);
    fortune.seun=evaluateSeunActivation(seunSource,daeun.periods,pillars,stemPreferences,branchPreferences,nobleAndSpecialStars,fortune.daeun);
  }

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
    stemPreferences,
    branchPreferences,
    nobleAndSpecialStars,
    samjae: nobleAndSpecialStars.status === "implemented" && "samjae" in nobleAndSpecialStars ? {
      status:"implemented",value:nobleAndSpecialStars.samjae,
      evidence:["samjae-v1: 생년지 삼합 그룹별 들·눌·날삼재 기준"]
    } : notImplemented("생년지 간지를 계산할 수 없어 삼재 기준을 계산하지 않았습니다."),
    daeun,
    fortune,
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
