import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { FileInterpretationCache } from "@/lib/saju/ai-interpretation/file-cache";
import { OpenAIInterpretationProvider } from "@/lib/saju/ai-interpretation/openai-provider";
import { MockInterpretationProvider } from "@/lib/saju/ai-interpretation/mock-provider";
import { interpretSajuAnalysis } from "@/lib/saju/ai-interpretation/service";
import { calculateSaju, UnsupportedBirthCountryError } from "@/lib/saju/engine";
import { firstValidationMessage, parseSajuInput } from "@/lib/saju/validation";
import type { InterpretationApiRequest, InterpretationReportType } from "@/types/ai-interpretation";
import { z } from "zod";

export const maxDuration = 300;

const reportTypes = new Set<InterpretationReportType>(["COMPREHENSIVE", "LIFETIME_GENERAL", "WEALTH", "BUSINESS", "CAREER", "RELATIONSHIP", "STUDY", "YEARLY"]);
const cache = new FileInterpretationCache(undefined, (event) => console.info("ai_interpretation_cache", event));

export async function POST(request: Request) {
  const requestId = randomUUID(), started = Date.now();
  try {
    const body = await request.json() as Partial<InterpretationApiRequest>;
    const reportType = body.reportType ?? "COMPREHENSIVE";
    if (!body.input || !reportTypes.has(reportType)) return NextResponse.json({ code: "INTERPRETATION_ERROR", error: "해석 요청 형식이 올바르지 않습니다." }, { status: 400 });
    const analysis = calculateSaju(parseSajuInput(body.input));
    const mockEnabled=process.env.DEV_MOCK_INTERPRETATION==="true"&&process.env.NODE_ENV!=="production";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!mockEnabled&&!apiKey) return NextResponse.json({ status: "failed", ruleVersion: "ai-interpretation-v1", error: { code: "PROVIDER_ERROR", message: "AI 해석 환경이 아직 연결되지 않았습니다." } }, { status: 503 });
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
    const provider = mockEnabled?new MockInterpretationProvider():new OpenAIInterpretationProvider({ apiKey:apiKey!, model, timeoutMs: 240_000, logger: (event) => console.info("ai_interpretation", event) });
    const result = await interpretSajuAnalysis(analysis, provider, { reportType, year: body.year, referenceInstant:body.referenceInstant, relationshipStatus:body.relationshipStatus, lifetimePartNumber:body.lifetimePartNumber, characterCore:body.characterCore,cache, modelConfigVersion: process.env.OPENAI_MODEL_CONFIG_VERSION });
    console.info("ai_interpretation_result", { requestId, reportType, lifetimePartNumber: body.lifetimePartNumber, provider: "openai", model, latencyMs: Date.now() - started,
      validationStatus: result.status, mockEnabled, repaired: result.status === "completed" ? result.metadata.repaired : false,
      errorCode: result.status === "failed" ? result.error.code : undefined });
    return NextResponse.json(result, { status: result.status === "completed" ? 200 : 422 });
  } catch (error) {
    if (error instanceof UnsupportedBirthCountryError) return NextResponse.json({ code: "INTERPRETATION_ERROR", error: error.message }, { status: 422 });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INTERPRETATION_ERROR", error: firstValidationMessage(error) }, { status: 400 });
    console.error("ai_interpretation_error", { requestId, latencyMs: Date.now() - started, errorCode: "INTERPRETATION_ERROR" });
    return NextResponse.json({ status: "failed", ruleVersion: "ai-interpretation-v1", error: { code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "AI 해석 요청에 실패했습니다." } }, { status: 500 });
  }
}
