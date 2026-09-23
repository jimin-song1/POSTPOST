import { PillarTable } from "./PillarTable";
import type { SajuAnalysis } from "@/types/saju-analysis";

export function SajuResultDebug({ result }: { result: SajuAnalysis }) {
  return <section className="card resultCard"><div className="resultHeader"><div><span className="eyebrow">SAJU ANALYSIS</span><h2>계산 결과 JSON</h2></div><span className="mock">{result.engineMetadata.calculationMode === "test_fixture" ? "TEST-001" : "STUB"}</span></div><PillarTable pillars={result.pillars} /><details open><summary>RAW JSON 펼쳐보기</summary><pre>{JSON.stringify(result, null, 2)}</pre></details></section>;
}
