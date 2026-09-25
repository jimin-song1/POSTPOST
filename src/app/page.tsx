"use client";

import { useState } from "react";
import { SajuInputForm } from "@/components/SajuInputForm";
import { CustomerResult } from "@/components/CustomerResult";
import type { CustomerResultPayload, InterpretationUiState } from "@/types/customer-result";

export default function Home() {
  const [result, setResult] = useState<CustomerResultPayload | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationUiState>({ status: "not_requested" });
  async function requestInterpretation() {
    if (!result) return;
    setInterpretation({ status: "pending" });
    try {
      const response = await fetch("/api/saju/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysis: result.analysis, reportType: "COMPREHENSIVE" }) });
      setInterpretation(await response.json() as InterpretationUiState);
    } catch { setInterpretation({ status: "failed", ruleVersion: "ai-interpretation-v1", error: { code: "NETWORK_ERROR", message: "네트워크 연결을 확인해 주세요." } }); }
  }
  if (result) return <CustomerResult analysis={result.analysis} current={result.current} interpretation={interpretation} onInterpret={requestInterpretation} onRetry={requestInterpretation} />;
  return <main className="shell"><header className="hero"><span className="eyebrow">POSTPOST · SAJU</span><h1>나의 흐름을<br />차분히 읽어보세요</h1><p>태어난 순간의 기운부터 지금의 흐름까지, 계산 근거를 바탕으로 정리해 드립니다.</p></header><SajuInputForm onResult={(value) => { setResult(value); setInterpretation({ status: "not_requested" }); }} /><section className="ruleNote"><strong>안내</strong><p>결과는 전통 명리 이론에 따른 참고 정보이며 중요한 결정을 대신하지 않습니다.</p></section></main>;
}
