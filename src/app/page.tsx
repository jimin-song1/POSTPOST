"use client";

import { useState } from "react";
import { SajuInputForm } from "@/components/SajuInputForm";
import { SajuResultDebug } from "@/components/SajuResultDebug";
import type { SajuAnalysis } from "@/types/saju-analysis";

export default function Home() {
  const [result, setResult] = useState<SajuAnalysis | null>(null);
  return <main className="shell"><header className="hero"><span className="eyebrow">SAJU ENGINE · MVP</span><h1>내 사주 입력하기</h1><p>계산 엔진과 해석 엔진을 분리한 개발용 첫 화면입니다.</p></header><SajuInputForm onResult={(value) => setResult(value as SajuAnalysis)} /><section className="ruleNote"><strong>시간 규칙 saju-time-v1</strong><p>현대 한국 −30분 자연시 보정 · 균시차 및 야자시 미적용 · 보정시간 00:00 일주 변경</p></section>{result && <SajuResultDebug result={result} />}</main>;
}
