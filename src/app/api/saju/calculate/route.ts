import { NextResponse } from "next/server";
import { calculateSaju } from "@/lib/saju/engine";
import type { SajuInput } from "@/types/saju-input";

export async function POST(request: Request) {
  const input = (await request.json()) as Partial<SajuInput>;
  if (!input.name || !input.gender || !input.calendarType || !input.birthDate || !input.birthCity || typeof input.birthTimeKnown !== "boolean") {
    return NextResponse.json({ error: "필수 입력값을 확인해주세요." }, { status: 400 });
  }
  if (input.birthTimeKnown && !input.birthTime) return NextResponse.json({ error: "출생시간을 입력해주세요." }, { status: 400 });
  if (input.calendarType === "lunar" && !input.lunarLeapMonth) return NextResponse.json({ error: "평달/윤달을 선택해주세요." }, { status: 400 });
  return NextResponse.json(calculateSaju(input as SajuInput));
}
