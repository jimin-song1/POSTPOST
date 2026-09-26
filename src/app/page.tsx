"use client";
import { useCallback, useState } from "react";
import { SajuInputForm, type LifetimeFormResult } from "@/components/SajuInputForm";
import { LifetimeReport } from "@/components/LifetimeReport";
import type { CustomerResultPayload, InterpretationUiState } from "@/types/customer-result";
import type { RelationshipStatus } from "@/types/ai-interpretation";

export default function Home() {
  const [result, setResult] = useState<CustomerResultPayload | null>(null), [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>("SINGLE");
  const [interpretation, setInterpretation] = useState<InterpretationUiState>({ status: "not_requested" });
  const requestInterpretation = useCallback(async (payload: CustomerResultPayload, relationship: RelationshipStatus) => {
    setInterpretation({ status: "pending" });
    try { const response = await fetch("/api/saju/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysis: payload.analysis, reportType: "LIFETIME_GENERAL", relationshipStatus: relationship }) }); setInterpretation(await response.json() as InterpretationUiState); }
    catch { setInterpretation({ status: "failed", ruleVersion: "ai-interpretation-v1", error: { code: "NETWORK_ERROR", message: "네트워크 연결을 확인해 주세요." } }); }
  }, []);
  function accept(value: LifetimeFormResult) { setResult(value.payload); setRelationshipStatus(value.relationshipStatus); void requestInterpretation(value.payload, value.relationshipStatus); }
  if (result) return <LifetimeReport analysis={result.analysis} current={result.current} relationshipStatus={relationshipStatus} interpretation={interpretation} onRetry={() => void requestInterpretation(result, relationshipStatus)} onRestart={() => { setResult(null); setInterpretation({ status: "not_requested" }); }} />;
  return <main className="lifetimeInputPage"><SajuInputForm onResult={accept} /><p className="inputDisclaimer">전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다.</p></main>;
}
