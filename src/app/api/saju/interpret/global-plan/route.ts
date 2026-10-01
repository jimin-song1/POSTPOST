import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {calculateSaju} from "@/lib/saju/engine";
import {parseSajuInput,firstValidationMessage} from "@/lib/saju/validation";
import {OpenAIInterpretationProvider} from "@/lib/saju/ai-interpretation/openai-provider";
import {MockInterpretationProvider} from "@/lib/saju/ai-interpretation/mock-provider";
import {isMockInterpretationEnabled} from "@/lib/saju/ai-interpretation/mock-mode";
import {generateGlobalCharacterCore} from "@/lib/saju/ai-interpretation/global-character-core";
import type {InterpretationApiRequest} from "@/types/ai-interpretation";

export const maxDuration=300;
export async function POST(request:Request){const requestId=randomUUID();try{
  const body=await request.json() as Partial<InterpretationApiRequest>;if(!body.input||!body.relationshipStatus)return NextResponse.json({error:"Global plan 요청 형식이 올바르지 않습니다."},{status:400});
  const analysis=calculateSaju(parseSajuInput(body.input));
  const mockEnabled=isMockInterpretationEnabled(),apiKey=process.env.OPENAI_API_KEY;
  if(!mockEnabled&&!apiKey)return NextResponse.json({error:"AI 해석 환경이 아직 연결되지 않았습니다."},{status:503});
  const provider=mockEnabled?new MockInterpretationProvider():new OpenAIInterpretationProvider({apiKey:apiKey!,model:process.env.OPENAI_MODEL??"gpt-5-mini",timeoutMs:240_000});
  const core=await generateGlobalCharacterCore(analysis,provider,{relationshipStatus:body.relationshipStatus,year:body.year});
  return NextResponse.json({status:"completed",characterCore:core,metadata:{provider:mockEnabled?"mock":"openai",model:mockEnabled?"deterministic-fixture-v3":process.env.OPENAI_MODEL??"gpt-5-mini"}});
}catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:firstValidationMessage(error)},{status:400});console.error("global_character_core_error",{requestId,error});return NextResponse.json({error:error instanceof Error?error.message:"Global plan 생성 실패"},{status:500});}}
