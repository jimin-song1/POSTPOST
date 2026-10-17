import { NextResponse } from "next/server";
import { calculateSaju, UnsupportedBirthCountryError } from "@/lib/saju/engine";
import { selectCurrentPeriods } from "@/lib/saju/presentation/current-period";
import { firstValidationMessage, parseSajuInput } from "@/lib/saju/validation";
import {lifetimeDisplayAnalysis} from "@/lib/saju/presentation/lifetime-display";
import { z } from "zod";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ code: "ANALYSIS_ERROR", error: "올바른 JSON 요청을 보내주세요." }, { status: 400 }); }
  try {
    const compact=body&&typeof body==="object"&&"view" in body&&body.view==="LIFETIME_BOOK";
    const input=compact&&body&&typeof body==="object"&&"input" in body?body.input:body;
    const analysis = calculateSaju(parseSajuInput(input));
    return NextResponse.json({ analysis:compact?lifetimeDisplayAnalysis(analysis):analysis, current: selectCurrentPeriods(analysis) });
  } catch (error) {
    if (error instanceof UnsupportedBirthCountryError) return NextResponse.json({ code: "ANALYSIS_ERROR", message: error.message }, { status: 422 });
    const message = error instanceof z.ZodError ? firstValidationMessage(error) : error instanceof Error ? error.message : "입력값을 확인해주세요.";
    return NextResponse.json({ code: "ANALYSIS_ERROR", error: message }, { status: 400 });
  }
}
