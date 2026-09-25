import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { FileInterpretationCache } from "@/lib/saju/ai-interpretation/file-cache";
import { OpenAIInterpretationProvider } from "@/lib/saju/ai-interpretation/openai-provider";
import { interpretSajuAnalysis } from "@/lib/saju/ai-interpretation/service";
import type { InterpretationReportType } from "@/types/ai-interpretation";
import type { SajuAnalysis } from "@/types/saju-analysis";

const reportTypes = new Set<InterpretationReportType>(["COMPREHENSIVE", "WEALTH", "BUSINESS", "CAREER", "RELATIONSHIP", "STUDY", "YEARLY"]);
const cache = new FileInterpretationCache(undefined, (event) => console.info("ai_interpretation_cache", event));

export async function POST(request: Request) {
  const requestId = randomUUID(), started = Date.now();
  try {
    const body = await request.json() as { analysis?: SajuAnalysis; reportType?: InterpretationReportType; year?: number };
    const reportType = body.reportType ?? "COMPREHENSIVE";
    if (!body.analysis || !reportTypes.has(reportType)) return NextResponse.json({ code: "INTERPRETATION_ERROR", error: "해석 요청 형식이 올바르지 않습니다." }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ status: "failed", ruleVersion: "ai-interpretation-v1", error: { code: "PROVIDER_ERROR", message: "AI 해석 환경이 아직 연결되지 않았습니다." } }, { status: 503 });
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
    const provider = new OpenAIInterpretationProvider({ apiKey, model, logger: (event) => console.info("ai_interpretation", event) });
    const result = await interpretSajuAnalysis(body.analysis, provider, { reportType, year: body.year, cache, modelConfigVersion: process.env.OPENAI_MODEL_CONFIG_VERSION });
    console.info("ai_interpretation_result", { requestId, reportType, provider: "openai", model, latencyMs: Date.now() - started,
      validationStatus: result.status, repaired: result.status === "completed" ? result.metadata.repaired : false,
      errorCode: result.status === "failed" ? result.error.code : undefined });
    return NextResponse.json(result, { status: result.status === "completed" ? 200 : 422 });
  } catch (error) {
    console.error("ai_interpretation_error", { requestId, latencyMs: Date.now() - started, errorCode: "INTERPRETATION_ERROR" });
    return NextResponse.json({ status: "failed", ruleVersion: "ai-interpretation-v1", error: { code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "AI 해석 요청에 실패했습니다." } }, { status: 500 });
  }
}
