"use client";
import {buildDynamicLifetimeBook} from "@/rules/lifetime-report.v5.6";
import type { FortuneResult } from "@/types/fortune";
import type { RelationshipStatus, StructuredInterpretation } from "@/types/ai-interpretation";

/* Editorial order compatibility markers: story precedes evidence visuals.
<AiCopy report={report} id="five-elements" /> className="elementBars"
<AiCopy report={report} id="wellness" /> className="wellnessBalance"
<AiCopy report={report} id="helpful-elements" /> className="helpfulRanks"
*/
import type { CurrentPeriodSelection, InterpretationUiState } from "@/types/customer-result";
import type { SajuAnalysis } from "@/types/saju-analysis";

function Metric({ label, value, note, tone = "support" }: { label: string; value: string; note?: string; tone?: "support" | "activity" | "neutral" }) { return <div className={`lifetimeMetric ${tone}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }
function CrowNote({ children }: { children: React.ReactNode }) { return <aside className="crowNote"><span aria-hidden="true">●</span><p><b>삼족오 한마디</b>{children}</p></aside>; }
function EvidenceDetails({ children }: { children: React.ReactNode }) { return <details className="chapterEvidence"><summary>왜 이렇게 보나요?</summary><div>{children}</div></details>; }
export function LifetimeReport({ analysis, relationshipStatus, hasChildren, interpretation, onRetry, onRestart }: { analysis: SajuAnalysis; current: CurrentPeriodSelection; relationshipStatus: RelationshipStatus; hasChildren?:boolean; interpretation: InterpretationUiState; onRetry: () => void; onRestart: () => void }) {
  if (interpretation.status === "pending" || interpretation.status === "not_requested") {
    return <LifetimeGenerationScreen name={analysis.person.name} stage={interpretation.status==="pending"?interpretation.stage:undefined} completedParts={interpretation.status==="pending"?interpretation.completedParts:0} totalParts={interpretation.status==="pending"?interpretation.totalParts:1} onRestart={onRestart} />;
  }
  if (interpretation.status === "failed") {
    return <LifetimeGenerationFailed message={interpretation.error.message} onRetry={onRetry} onRestart={onRestart} />;
  }
  const report = interpretation.report.reportType === "LIFETIME_GENERAL" ? interpretation.report : null;
  if (!report || !report.sections.length) {
    return <LifetimeGenerationFailed message="평생사주 본문 검증이 완료되지 않았습니다. 다시 생성해 주세요." onRetry={onRetry} onRestart={onRestart} />;
  }
  const text=JSON.stringify(report);
  if(relationshipStatus!=="MARRIED"&&/자녀|아이(?!디어)|임신|출산|손주|부모가 (?:되|된)|부모로서/.test(text))return <LifetimeGenerationFailed message="현재 가족 상태와 맞지 않는 본문입니다. 다시 생성해 주세요." onRetry={onRetry} onRestart={onRestart}/>;
  return <DynamicLifetimeBook analysis={analysis} relationshipStatus={relationshipStatus} hasChildren={hasChildren} report={report} interpretation={interpretation} onRetry={onRetry} onRestart={onRestart} />;
}

function DynamicLifetimeBook({ analysis, relationshipStatus,hasChildren, report, interpretation, onRetry, onRestart }: { analysis:SajuAnalysis;relationshipStatus:RelationshipStatus;hasChildren?:boolean; report:StructuredInterpretation; interpretation:InterpretationUiState; onRetry:()=>void; onRestart:()=>void }) {
  const displayText=(value:string)=>value.replaceAll("○○",analysis.person.name);
  const fortune=analysis.fortune as FortuneResult;
  const book=buildDynamicLifetimeBook({year:new Date().getFullYear(),includeSamjae:true,relationshipStatus,hasChildren,daeunPeriods:fortune.daeun.status==="implemented"?fortune.daeun.periods.map(p=>({index:p.index,ageRange:p.sourcePeriod.ageRange,pillar:`${p.pillar.stem}${p.pillar.branch}`})):[]});
  const plannedById=new Map(book.sections.map(s=>[s.id,s]));
  const parts=Array.from(new Map(report.sections.map(section=>[section.partNumber??"00",{partNumber:section.partNumber??"00",title:section.partTitle??"평생사주"}])).values());
  const contentSectionCount=report.sections.filter(section=>section.contentKind==="CONTENT").length;
  return <div className="lifetimeReport lifetimeBook154">
    <header className="lifetimeCover book154Cover">
      <div className="coverTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div>
      <div className="coverOrnament" aria-hidden="true"><i/><i/><i/></div>
      <p>평생사주 V5.6 · {contentSectionCount}개의 풀이</p>
      <h1>{analysis.person.name}님의<br/>한 권의 사주책</h1>
      <h2>{displayText(report.headline)}</h2>
      <span>깊은 풀이를 쉬운 한국어로, 계산 근거는 그대로</span>
    </header>
    <nav className="book154Toc" aria-label="평생사주 목차">
      {parts.map(part=>{const count=report.sections.filter(section=>(section.partNumber??"00")===part.partNumber).length;return <a key={part.partNumber} href={`#book-part-${part.partNumber}`}><b>{part.partNumber}</b><span>{part.title}</span><small>{count}개 주제</small></a>;})}
    </nav>
    <details className="chapterEvidence"><summary>소제목 전체 목차</summary><div>{book.parts.map(part=><section key={part.partNumber}><h3>{part.title}</h3>{part.partNumber!=="EPILOGUE"&&part.sections.map(s=><p key={s.id}><a href={`#${s.id}`}>{s.title.replace("○○",analysis.person.name)}</a> · {s.pageStart}–{s.pageEnd}p</p>)}</section>)}</div></details>
    <main className="book154Main">
      {parts.map(part=>{const sections=report.sections.filter(section=>(section.partNumber??"00")===part.partNumber);return <section key={part.partNumber} id={`book-part-${part.partNumber}`} className="book154Part">
        <header className="book154PartHeader"><span>{["00","SPECIAL","EPILOGUE"].includes(part.partNumber)?({"00":"PROLOGUE",SPECIAL:"SPECIAL",EPILOGUE:"EPILOGUE"} as Record<string,string>)[part.partNumber]:`PART ${part.partNumber}`}</span><h2>{part.title}</h2><p>{sections.length}개의 주제로 천천히 이어집니다.</p></header>
        {sections.map((section,index)=>{
          const paragraphs=section.paragraphs?.length?section.paragraphs:[section.body];
          return <article key={section.id} id={section.id} className="book154Page">
            <div className="book154PageNumber"><span>{plannedById.get(section.id)?.pageStart}–{plannedById.get(section.id)?.pageEnd}p</span><i/></div>
            <p className="book154Eyebrow">{part.title}</p>
            {part.partNumber!=="EPILOGUE"&&<h3>{section.title.replace("○○",analysis.person.name)}</h3>}
            {section.headline&&<p className="book154Lead">{displayText(section.headline)}</p>}
            {section.lead&&<p className="book154Lead">{displayText(section.lead)}</p>}
            <div className="longCopy">{paragraphs.map((paragraph,paragraphIndex)=><p key={`${section.id}-${paragraphIndex}`}>{displayText(paragraph)}</p>)}</div>
            {section.keyPoints?.length?<blockquote className="book154Key">{section.keyPoints.slice(0,3).map((point,pointIndex)=><p key={pointIndex}>{displayText(point)}</p>)}</blockquote>:null}
            {section.metrics?.length?<div className="book154Metrics">{section.metrics.map(metric=><Metric key={metric.id} label={metric.label} value={metric.unit==="PERCENT"?`${metric.value.toFixed(1)}%`:`${metric.value.toFixed(1)}`} tone="neutral"/>)}</div>:null}
            {section.mascotComment?<CrowNote>{displayText(section.mascotComment)}</CrowNote>:null}
            <EvidenceDetails>
              {section.professionalDetails?<><p>{displayText(section.professionalDetails.summary)}</p><p className="book154EvidenceIds">{section.professionalDetails.evidenceIds.join(" · ")}</p></>:<p>서로 관련된 계산 근거를 함께 확인했습니다. 생성에 사용한 계산 근거를 바탕으로 작성한 풀이입니다.</p>}
            </EvidenceDetails>
          </article>;
        })}
      </section>})}
      {interpretation.status==="failed"&&<div className="interpretationFallback" role="alert"><p>상세 해석을 불러오지 못했습니다. 계산된 평생사주 결과는 정상적으로 표시됩니다.</p><button onClick={onRetry}>평생사주 해석 다시 시도</button></div>}
      <footer className="reportNotice">이 결과는 전통 명리의 계산 근거를 생활 언어로 풀어낸 참고 콘텐츠입니다. 특정 사건을 확정하거나 중요한 현실 판단을 대신하지 않습니다.</footer>
    </main>
  </div>;
}


function LifetimeGenerationScreen({ name, stage="CHARACTER_CORE", completedParts=0, totalParts=1, onRestart }: { name:string; stage?:"CHARACTER_CORE"|"PARTS"|"MERGE"; completedParts?:number; totalParts?:number; onRestart:()=>void }) {
  const stageCopy=stage==="CHARACTER_CORE"?"책 전체에 이어질 중심 성향을 정리하고 있어요":stage==="MERGE"?"완성된 묶음을 한 권의 책으로 정리하고 있어요":`${totalParts}개 묶음 중 ${Math.min(completedParts+1,totalParts)}번째 이야기를 만들고 있어요`;
  return <main className="lifetimeGeneration" role="status" aria-live="polite">
    <div className="generationTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div>
    <section className="generationPanel">
      <div className="generationSeal" aria-hidden="true"><i/><i/><i/></div>
      <p className="generationKicker">평생사주 · 맞춤형 구성</p>
      <h1>{name}님의<br/>사주책을 만들고 있어요</h1>
      <p className="generationLead">계산은 끝났습니다. 지금은 타고난 성향부터 일·돈·관계·귀인·앞으로의 흐름까지, 서로 다른 근거를 묶어 한 권의 이야기로 풀고 있습니다.</p>
      <p className="generationStage">{stageCopy}</p><div className="generationProgress" aria-hidden="true"><span style={{width:`${stage==="MERGE"?100:Math.max(6,Math.min(96,totalParts?completedParts/totalParts*100:6))}%`}}/></div><p className="generationCount">{completedParts} / {totalParts} 묶음 완료</p>
      <div className="generationSteps">
        <p><b>1</b><span>사주 원국과 숨은 기운을 다시 연결하고 있어요</span></p>
        <p><b>2</b><span>일·돈·관계에서 반복되는 생활 패턴을 정리하고 있어요</span></p>
        <p><b>3</b><span>10년 흐름과 앞으로 5년의 변화를 따로 읽고 있어요</span></p>
        <p><b>4</b><span>필요한 모든 풀이가 검증되면 한 번에 보여드릴게요</span></p>
      </div>
      <p className="generationNotice">페이지를 이동하지 않아도 됩니다. 해설이 완성되면 자동으로 결과가 열립니다.</p>
    </section>
  </main>;
}

function LifetimeGenerationFailed({ message, onRetry, onRestart }: { message:string; onRetry:()=>void; onRestart:()=>void }) {
  return <main className="lifetimeGeneration">
    <div className="generationTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div>
    <section className="generationPanel generationFailed">
      <p className="generationKicker">평생사주 · 맞춤형 구성</p>
      <h1>해설을 끝까지 만들지 못했어요</h1>
      <p className="generationLead">계산 결과는 그대로 남아 있습니다. 해설 생성만 다시 시도하면 됩니다.</p>
      <p className="generationError">{message}</p>
      <button className="generationRetry" onClick={onRetry}>평생사주 해설 다시 만들기</button>
    </section>
  </main>;
}
