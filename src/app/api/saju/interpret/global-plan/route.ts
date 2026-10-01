import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {calculateSaju} from "@/lib/saju/engine";
import {parseSajuInput,firstValidationMessage} from "@/lib/saju/validation";
import {buildInterpretationInput} from "@/lib/saju/ai-interpretation/input-builder";
import {OpenAIInterpretationProvider} from "@/lib/saju/ai-interpretation/openai-provider";
import {MockInterpretationProvider} from "@/lib/saju/ai-interpretation/mock-provider";
import {CHARACTER_CORE_JSON_SCHEMA,characterCoreSchema} from "@/lib/saju/ai-interpretation/schema";
import {INTERPRETATION_SYSTEM_PROMPT,LIFETIME_INTERPRETATION_PLANNER_PROMPT} from "@/lib/saju/ai-interpretation/prompt";
import type {InterpretationApiRequest} from "@/types/ai-interpretation";

export const maxDuration=300;
export async function POST(request:Request){const requestId=randomUUID();try{
  const body=await request.json() as Partial<InterpretationApiRequest>;if(!body.input||!body.relationshipStatus)return NextResponse.json({error:"Global plan 요청 형식이 올바르지 않습니다."},{status:400});
  const analysis=calculateSaju(parseSajuInput(body.input)),input=buildInterpretationInput(analysis,{reportType:"LIFETIME_GENERAL",relationshipStatus:body.relationshipStatus,year:body.year});
  const mockEnabled=process.env.DEV_MOCK_INTERPRETATION==="true"&&process.env.NODE_ENV!=="production",apiKey=process.env.OPENAI_API_KEY;
  if(!mockEnabled&&!apiKey)return NextResponse.json({error:"AI 해석 환경이 아직 연결되지 않았습니다."},{status:503});
  const provider=mockEnabled?new MockInterpretationProvider():new OpenAIInterpretationProvider({apiKey:apiKey!,model:process.env.OPENAI_MODEL??"gpt-5-mini",timeoutMs:240_000});
  const response=await provider.generate({systemPrompt:`${INTERPRETATION_SYSTEM_PROMPT}\n\n${LIFETIME_INTERPRETATION_PLANNER_PROMPT}\n\n책 전체에서 유지할 Global Character Core만 생성하라. 고객 본문은 쓰지 마라.`,input,
    analysisHash:createHash("sha256").update(JSON.stringify(input.evidence)).digest("hex"),schema:CHARACTER_CORE_JSON_SCHEMA as unknown as Record<string,unknown>});
  const core=characterCoreSchema.parse(response.output);return NextResponse.json({status:"completed",characterCore:core,metadata:{provider:response.provider,model:response.model}});
}catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:firstValidationMessage(error)},{status:400});console.error("global_character_core_error",{requestId,error});return NextResponse.json({error:error instanceof Error?error.message:"Global plan 생성 실패"},{status:500});}}
