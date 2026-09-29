import { NextResponse } from "next/server";
import { assertCaseId, isLocalCalibrationEnabled } from "@/lib/saju/calibration/local-mode";
import { readTraceStep } from "@/lib/saju/calibration/local-store";
export async function GET(_:Request,{params}:{params:Promise<{caseId:string;step:string}>}){if(!isLocalCalibrationEnabled())return NextResponse.json({code:"CALIBRATION_DISABLED"},{status:404});try{const values=await params,caseId=assertCaseId(values.caseId),index=Number(values.step);if(!Number.isInteger(index)||index<1||index>41)throw new Error();const step=await readTraceStep(caseId,index);return step?NextResponse.json(step):NextResponse.json({code:"TRACE_STEP_NOT_FOUND"},{status:404});}catch{return NextResponse.json({code:"INVALID_TRACE_REQUEST"},{status:400});}}
