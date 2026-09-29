import { NextResponse } from "next/server";
import { calculateSaju } from "@/lib/saju/engine";
import { parseSajuInput } from "@/lib/saju/validation";
import { buildCalibrationTrace } from "@/lib/saju/audit/trace-builder";
import { assertCaseId, isLocalCalibrationEnabled } from "@/lib/saju/calibration/local-mode";
import { readCase, saveAnalysis } from "@/lib/saju/calibration/local-store";
import { buildCalibrationView } from "@/lib/saju/calibration/view-model";
export async function POST(_:Request,{params}:{params:Promise<{caseId:string}>}){if(!isLocalCalibrationEnabled())return NextResponse.json({code:"CALIBRATION_DISABLED"},{status:404});let caseId="UNKNOWN";try{caseId=assertCaseId((await params).caseId);const item=await readCase(caseId);if(!item)return NextResponse.json({code:"CASE_NOT_FOUND"},{status:404});const {relationshipStatus,gender,calendarType,birthDate,birthTime,birthTimeKnown,birthCountry,birthCityKnown,birthCity,lunarLeapMonth}=item.input;const result=calculateSaju(parseSajuInput({name:caseId,gender,calendarType,birthDate,birthTime,birthTimeKnown,birthCountry,birthCityKnown,birthCity,...(lunarLeapMonth?{lunarLeapMonth}: {})}));const trace=buildCalibrationTrace(result,{caseId,includeSensitiveInput:true,relationshipStatus});await saveAnalysis(caseId,result,trace);const view=buildCalibrationView(result,trace);return NextResponse.json(view,{status:view.traceError?422:200});}catch{return NextResponse.json({caseId,code:"CALIBRATION_ANALYSIS_ERROR"},{status:400});}}
