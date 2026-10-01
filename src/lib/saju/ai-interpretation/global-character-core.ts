import {createHash} from "node:crypto";
import type {SajuAnalysis} from "@/types/saju-analysis";
import type {CharacterCore,InterpretationProvider,RelationshipStatus} from "@/types/ai-interpretation";
import {buildInterpretationInput} from "./input-builder";
import {CHARACTER_CORE_JSON_SCHEMA,characterCoreSchema} from "./schema";
import {INTERPRETATION_SYSTEM_PROMPT,LIFETIME_INTERPRETATION_PLANNER_PROMPT} from "./prompt";

export async function generateGlobalCharacterCore(analysis:SajuAnalysis,provider:InterpretationProvider,options:{relationshipStatus:RelationshipStatus;year?:number}):Promise<CharacterCore>{
  const input=buildInterpretationInput(analysis,{reportType:"LIFETIME_GENERAL",relationshipStatus:options.relationshipStatus,year:options.year});
  const analysisHash=createHash("sha256").update(JSON.stringify(input.evidence)).digest("hex");
  const response=await provider.generate({systemPrompt:`${INTERPRETATION_SYSTEM_PROMPT}\n\n${LIFETIME_INTERPRETATION_PLANNER_PROMPT}\n\n책 전체에서 유지할 Global Character Core만 생성하라. 고객 본문은 쓰지 마라.`,input,analysisHash,
    schema:CHARACTER_CORE_JSON_SCHEMA as unknown as Record<string,unknown>});
  return characterCoreSchema.parse(response.output);
}
