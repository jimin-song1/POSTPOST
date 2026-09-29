import { NextResponse } from "next/server";
import { isLocalCalibrationEnabled } from "@/lib/saju/calibration/local-mode";
import { createCase, listCases } from "@/lib/saju/calibration/local-store";
import type { LocalCalibrationInput } from "@/types/local-calibration";
const disabled=()=>NextResponse.json({code:"CALIBRATION_DISABLED"},{status:404});
export async function GET(){if(!isLocalCalibrationEnabled())return disabled();return NextResponse.json({cases:await listCases()});}
export async function POST(request:Request){if(!isLocalCalibrationEnabled())return disabled();try{return NextResponse.json(await createCase(await request.json() as LocalCalibrationInput),{status:201});}catch{return NextResponse.json({code:"INVALID_CASE_INPUT"},{status:400});}}
