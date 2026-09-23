import { PillarTable } from "./PillarTable";
import type { SajuAnalysis } from "@/types/saju-analysis";
import { SEOUL_FALLBACK_NOTICE } from "@/lib/saju/normalize-birth-place";

export function SajuResultDebug({ result }: { result: SajuAnalysis }) {
  return <section className="card resultCard"><div className="resultHeader"><div><span className="eyebrow">SAJU ANALYSIS</span><h2>계산 결과 JSON</h2></div><span className="mock">{result.engineMetadata.calculationMode === "algorithmic" ? "CORE v1" : "STUB"}</span></div><PillarTable pillars={result.pillars} />{result.birthNormalized.birthPlace.isEstimated && <p role="status">{SEOUL_FALLBACK_NOTICE}</p>}<details open><summary>RAW JSON 펼쳐보기</summary><pre>{JSON.stringify(result, null, 2)}</pre></details></section>;
}
