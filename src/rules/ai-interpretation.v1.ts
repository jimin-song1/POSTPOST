import type { InterpretationReportType } from "@/types/ai-interpretation";

export const AI_INTERPRETATION_V1={
  ruleVersion:"ai-interpretation-v1",inputVersion:"interpretation-input-v1",schemaVersion:"interpretation-schema-v1",
  promptVersion:"interpretation-prompt-v1",groundingVersion:"interpretation-grounding-v1",modelConfigVersion:"openai-model-config-v1",
  supportedReports:["COMPREHENSIVE","LIFETIME_GENERAL","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"] as InterpretationReportType[],
  maxRepairAttempts:1,
  prohibitedCertainty:["돈 번다","매출 오른다","승진한다","합격한다","연애 시작한다","결혼한다","임신한다","헤어진다","퇴사한다","사고난다","사업 망한다"],
  prohibitedStarClaims:["신살 때문에 질병","신살 때문에 사고","도화 때문에 이혼","백호 때문에 사망","삼재 때문에 파산"],
  lockedLabels:{strength:["극약","태약","신약","중화신약","중화신강","신강","태강","극왕"],
    structure:["정관격","편관격","정재격","편재격","식신격","상관격","정인격","편인격","건록격","양인격"],
    usefulGod:["PRIMARY","SECONDARY","FAVORABLE","CONDITIONAL","NEUTRAL","UNFAVORABLE"]},
} as const;
