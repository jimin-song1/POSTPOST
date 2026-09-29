"use client";
import { useState } from "react";
import { customerElement, customerTerm } from "@/rules/customer-terminology.v1";
import { LIFETIME_REPORT_V2 } from "@/rules/lifetime-report.v2";
import { LIFETIME_BOOK_V1 } from "@/rules/lifetime-report.v3";
import type { RelationshipStatus, StructuredInterpretation } from "@/types/ai-interpretation";
import type { CurrentPeriodSelection, InterpretationUiState } from "@/types/customer-result";
import type { CategoryFortunePeriod } from "@/types/category-fortune";
import type { FortuneResult } from "@/types/fortune";
import type { SajuAnalysis, Element, PillarPosition } from "@/types/saju-analysis";
import type { WellnessResult } from "@/types/wellness";
import type { ChildrenFortuneResult } from "@/types/children-fortune";

const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];
const ELEMENT_THEME: Record<Element, string> = { wood: "성장과 유연함", fire: "표현과 추진", earth: "현실과 관리", metal: "기준과 정리", water: "생각과 회복" };
const RELATIONSHIP_COPY: Record<RelationshipStatus, string> = { SINGLE: "새로운 사람을 만날 때 무엇을 중요하게 보는지 살펴봅니다.", DATING: "연애하면서 마음을 어떻게 표현하고 다툼을 어떻게 푸는지 살펴봅니다.", MARRIED: "배우자와 집안일과 책임을 어떻게 나누면 좋은지 살펴봅니다." };
const RELATIONSHIP_DETAIL: Record<RelationshipStatus, string[]> = {
  SINGLE:["새로운 사람을 만날 때는 첫 느낌보다 말과 행동이 같은지를 살펴봅니다.","처음에는 마음을 크게 드러내지 않지만 믿음이 생기면 행동으로 꾸준히 보여 줍니다.","서로 혼자 있는 시간을 존중하고, 필요할 때 곁에 있어 주는 관계가 편합니다.","상대가 내 마음을 알아서 알기를 기다리지 말고, 내가 원하는 것을 말로 알려 주세요."],
  DATING:["연애할 때는 사랑하는 마음만큼 서로 표현하는 방법을 이해하는 것이 중요합니다.","다투면 혼자 생각을 정리한 뒤 말하려는 편입니다. 생각할 시간이 필요하다고 먼저 알려 주세요.","오래 만나려면 약속을 지키고 생활 방식과 맡을 일을 함께 정하는 것이 중요합니다.","내 말이 맞다고 설득하기 전에 상대의 생각부터 물어보세요."],
  MARRIED:["결혼 생활에서는 내가 맡은 일을 꾸준히 해내려는 모습이 먼저 보입니다.","가족에게 필요한 일을 미리 챙기지만, 혼자 다 맡으면 서운한 마음이 쌓일 수 있습니다.","일정, 집안일, 돈 문제를 배우자와 함께 정할 때 생활이 더 편해집니다.","오래 함께 살아도 각자 혼자 쉬는 시간과 서로 이야기하는 시간을 남겨 두세요."],
};
const STRENGTH_COPY: Record<string, string> = { 극약: "충분히 쉬고 기운을 보충한 뒤 움직이는 편이 좋습니다.", 태약: "혼자 버티기보다 필요한 도움을 받을 때 일을 더 수월하게 풀어갑니다.", 신약: "좋은 환경과 믿을 만한 사람이 곁에 있을 때 제 실력을 더 잘 냅니다.", 중화신약: "균형에 가깝지만, 주변의 도움을 받으면 일을 조금 더 수월하게 해낼 수 있습니다.", 중화신강: "균형에 가깝고, 필요할 때는 스스로 방향을 정해 움직이는 힘도 있습니다.", 신강: "자기 판단으로 방향을 정하고 끝까지 밀고 가는 힘이 분명합니다.", 태강: "추진력은 충분합니다. 다만 속도를 조절할 때 결과가 더 안정적입니다.", 극왕: "한곳에 힘을 집중하는 데 능합니다. 필요할 때는 다른 사람과 역할을 나누는 연습도 중요합니다." };
const ACTIVITY: Record<string, string> = { LOW: "잔잔함", MODERATE: "보통", HIGH: "큰 편", VERY_HIGH: "매우 큰 편" };
const SUPPORT: Record<string, string> = { PRIMARY_FAVORABLE: "매우 우호적", STRONG_FAVORABLE: "우호적", FAVORABLE: "비교적 우호적", CONDITIONAL: "조건부", NEUTRAL: "중립적", CAUTION: "주의 필요", UNFAVORABLE: "부담이 있는 편", VERY_SUPPORTIVE: "매우 든든함", SUPPORTIVE: "든든함", MODERATELY_SUPPORTIVE: "다소 도움", MIXED: "여러 흐름이 섞임", LOW_SUPPORT: "도움이 적은 편", PRESSURED: "부담이 있는 편" };
const STEM_COPY: Record<string, string> = { 甲: "갑목 · 큰 나무의 기운", 乙: "을목 · 유연한 풀과 덩굴의 기운", 丙: "병화 · 밝은 햇빛의 기운", 丁: "정화 · 오래 밝히는 불빛의 기운", 戊: "무토 · 든든한 산과 대지의 기운", 己: "기토 · 돌보고 가꾸는 흙의 기운", 庚: "경금 · 결단하고 다듬는 쇠의 기운", 辛: "신금 · 정교하게 빛나는 쇠의 기운", 壬: "임수 · 크게 흐르는 물의 기운", 癸: "계수 · 스며들고 적시는 물의 기운" };
const CHILD_BOND: Record<string, string> = { LOW: "천천히 가까워지는 편", MODERATE: "차분히 이어지는 편", STRONG: "깊게 이어지는 편", VERY_STRONG: "매우 깊게 이어지는 편" };
const PILLAR_LABEL: Record<PillarPosition, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };
const STEM_HANGUL: Record<string, string> = { 甲:"갑", 乙:"을", 丙:"병", 丁:"정", 戊:"무", 己:"기", 庚:"경", 辛:"신", 壬:"임", 癸:"계" };
const BRANCH_HANGUL: Record<string, string> = { 子:"자", 丑:"축", 寅:"인", 卯:"묘", 辰:"진", 巳:"사", 午:"오", 未:"미", 申:"신", 酉:"유", 戌:"술", 亥:"해" };
const pct = (value: number | null | undefined) => value == null ? "—" : `${value.toFixed(1)}%`;
const score = (value: number | null | undefined) => value == null ? "—" : `${Math.round(value)}%`;
const chapterSection = (report: StructuredInterpretation | null, id: string) => report?.sections.find((section) => section.id === id);

function Chapter({ number, id, title, headline, lead, children, tone = "paper" }: { number: string; id: string; title: string; headline: string; lead?: string; children: React.ReactNode; tone?: "paper" | "ink" | "wine" }) { return <section id={id} className={`lifetimeChapter ${tone}`}><div className="chapterRule"><span>{number}</span><i /></div><p className="chapterTitle">{title}</p><h2>{headline}</h2>{lead && <p className="chapterLead">{lead}</p>}{children}</section>; }
function AiCopy({ report, id, fallback }: { report: StructuredInterpretation | null; id: string; fallback: string[] }) { const section = chapterSection(report, id); const paragraphs = section?.paragraphs?.length ? section.paragraphs : section?.body ? [section.body] : fallback; return <div className="longCopy">{paragraphs.map((paragraph, index) => <p key={`${id}-${index}`}>{paragraph}</p>)}</div>; }
function Metric({ label, value, note, tone = "support" }: { label: string; value: string; note?: string; tone?: "support" | "activity" | "neutral" }) { return <div className={`lifetimeMetric ${tone}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }
function CrowNote({ children }: { children: React.ReactNode }) { return <aside className="crowNote"><span aria-hidden="true">●</span><p><b>삼족오 한마디</b>{children}</p></aside>; }
function EvidenceDetails({ children }: { children: React.ReactNode }) { return <details className="chapterEvidence"><summary>왜 이렇게 보나요?</summary><div>{children}</div></details>; }
function EvidenceRows({ rows }: { rows: Array<[string,string]> }) { return <dl className="evidenceRows">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }

export function LifetimeReport({ analysis, interpretation, onRetry, onRestart }: { analysis: SajuAnalysis; current: CurrentPeriodSelection; relationshipStatus: RelationshipStatus; interpretation: InterpretationUiState; onRetry: () => void; onRestart: () => void }) {
  if (interpretation.status === "pending" || interpretation.status === "not_requested") {
    return <LifetimeGenerationScreen name={analysis.person.name} onRestart={onRestart} />;
  }
  if (interpretation.status === "failed") {
    return <LifetimeGenerationFailed message={interpretation.error.message} onRetry={onRetry} onRestart={onRestart} />;
  }
  const report = interpretation.report.reportType === "LIFETIME_GENERAL" ? interpretation.report : null;
  if (!report || report.sections.length !== LIFETIME_BOOK_V1.pageCount) {
    return <LifetimeGenerationFailed message="154페이지 해설 검증이 완료되지 않았습니다. 다시 생성해 주세요." onRetry={onRetry} onRestart={onRestart} />;
  }
  return <LifetimeBook154 analysis={analysis} report={report} interpretation={interpretation} onRetry={onRetry} onRestart={onRestart} />;
}

function Cover({ analysis, report, onRestart }: { analysis: SajuAnalysis; report: StructuredInterpretation | null; onRestart: () => void }) { return <header className="lifetimeCover"><div className="coverTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div><div className="coverOrnament" aria-hidden="true"><i/><i/><i/></div><p>평생사주</p><h1>{analysis.person.name}님의<br/>한 권의 사주책</h1><h2>{report?.headline ?? "타고난 나와 인생의 큰 흐름을 읽는 시간"}</h2><span>계산 근거를 쉬운 한국어로 풀어낸 평생 이야기</span></header>; }

function WealthChapter({ report, category }: { report: StructuredInterpretation | null; category: CategoryFortunePeriod | null }) { return <Chapter number="07" id="chapter-07" title="돈을 대하는 방식" headline={chapterSection(report,"money-style")?.headline ?? "큰돈을 한 번 노리기보다 꾸준히 벌고 지키는 편입니다"}><AiCopy report={report} id="money-style" fallback={["돈을 벌고 쓸 때 얼마나 조심하는지, 좋은 기회가 왔을 때 얼마나 빨리 움직이는지를 살펴봅니다.", "어느 해에 돈을 많이 번다고 예측하지 않습니다. 평소 돈을 다루는 습관만 이야기합니다."]}/>{category && <EvidenceDetails><EvidenceRows rows={[["돈을 벌 때 도움받기 쉬운 정도",score(category.wealth.supportScore)],["돈이 많이 나갈 수 있는 정도",score(category.wealth.expensePressure.score)]]}/><p>평생 돈 점수가 아닙니다. 지금 보고 있는 10년 시기를 설명할 때만 참고하는 숫자입니다.</p></EvidenceDetails>}</Chapter>; }

function ChildrenChapter({ report, children }: { report: StructuredInterpretation | null; children: ChildrenFortuneResult | null }) { if (!children) return null; return <Chapter number="09" id="chapter-09" title="아이와 맺는 인연" headline="아이를 대할 때는 작은 변화를 잘 살피고 꾸준히 챙깁니다"><AiCopy report={report} id="children" fallback={["부모가 된다면 아이를 얼마나 꼼꼼하게 챙기는지, 언제 지나치게 걱정할 수 있는지를 살펴봅니다.", ...children.strengths.slice(0,2).map(row=>row.text), ...children.attentionAreas.slice(0,1).map(row=>row.text)]}/><EvidenceDetails><div className="childrenOverview"><div><Metric label="아이와의 관계가 크게 드러나는 정도" value={score(children.bond.score)} note={CHILD_BOND[children.bond.level]}/><p className="metricMeaning">출산 가능성을 뜻하지 않습니다. 사주에서 아이와의 관계가 얼마나 많이 보이는지를 나타냅니다.</p></div><article><span>관심이 한두 아이에게 모이는지 보는 값</span><strong>{children.countTendency.label}</strong></article></div><div className="genderEnergy"><p className="metricMeaning">실제 아이의 성별을 맞히는 숫자가 아닙니다. 옛 사주에서 쓰는 두 가지 상징을 비교한 값입니다.</p><p><span>아들 쪽 상징</span><b>{pct(children.genderEnergy.sonPercent)}</b></p><i><span style={{width:`${children.genderEnergy.sonPercent}%`}}/></i><p><span>딸 쪽 상징</span><b>{pct(children.genderEnergy.daughterPercent)}</b></p></div></EvidenceDetails><p className="softDisclaimer">실제로 아이를 몇 명 낳는지, 아이의 성별이 무엇인지, 임신할 수 있는지를 예측하지 않습니다.</p></Chapter>; }

function WellnessChapter({ report, wellness }: { report: StructuredInterpretation | null; wellness: WellnessResult | null }) { if (!wellness) return null; return <Chapter number="10" id="chapter-10" title="내 몸이 힘을 쓰는 방식" headline={chapterSection(report,"wellness")?.headline ?? "일이 바빠도 잠과 식사 시간을 지켜야 덜 지칩니다"}><AiCopy report={report} id="wellness" fallback={[`평소 잘 유지되는 쪽은 ${wellness.strengths.map((element)=>customerElement(element)).join("·") || "전체"}이고, 조금 더 챙겨야 하는 쪽은 ${wellness.attentionAreas.map((element)=>customerElement(element)).join("·") || "생활 습관"}입니다.`, ...wellness.habits.slice(0,3).map(row=>row.guidance)]}/><EvidenceDetails><div className="wellnessBalance"><span>생활 습관이 고르게 잡힌 정도</span><strong>{score(wellness.constitutionalBalanceScore)}</strong></div><p className="metricIntro">건강 점수가 아닙니다. 잠, 식사, 움직임 같은 생활 습관을 돌아볼 때 참고하는 숫자입니다.</p><div className="wellnessElements">{ELEMENTS.map(element=><article key={element}><span>{customerElement(element)} 기운 <strong>{pct(wellness.elements[element].percentage)}</strong></span><b>{wellness.elements[element].theme}과 이어서 살펴보는 기운</b></article>)}</div></EvidenceDetails><p className="softDisclaimer">병을 알아보는 검사가 아닙니다. 전통 사주 방식으로 생활 습관을 돌아보는 참고 내용입니다.</p></Chapter>; }

function DaeunChapter({ report, fortune }: { report: StructuredInterpretation | null; fortune: FortuneResult }) { const periods=fortune.daeun.status==="implemented"?fortune.daeun.periods:[]; const [selected,setSelected]=useState(0); const active=periods[selected]??periods[0]; return <Chapter number="15" id="chapter-15" title="10년마다 바뀌는 나" headline="10년마다 도움받기 쉬운 정도와 바빠지는 정도가 달라집니다"><AiCopy report={report} id="daeun" fallback={["앞 시기에 쌓은 경험은 다음 시기에 선택할 때 도움이 됩니다. 한 시기만 보고 좋다거나 나쁘다고 판단하지 마세요."]}/><div className="periodIndicator" aria-live="polite"><b>{selected+1}</b><span>/ {periods.length}</span><i><span style={{width:`${periods.length ? ((selected+1)/periods.length)*100 : 0}%`}}/></i></div><div className="daeunRail" role="list" aria-label="10년 큰 흐름">{periods.map((period,index)=><button role="listitem" aria-pressed={index===selected} key={period.index} onClick={()=>setSelected(index)}><b>{STEM_HANGUL[period.pillar.stem]}{BRANCH_HANGUL[period.pillar.branch]}</b><span>{period.sourcePeriod.ageRange}</span><span>{period.sourcePeriod.startInstant?.slice(0,4)}~{period.sourcePeriod.endInstant?.slice(0,4)}</span><small>{period.pillar.stem}{period.pillar.branch}</small></button>)}</div>{active&&<div className="daeunFocus"><h3>{STEM_HANGUL[active.pillar.stem]}{BRANCH_HANGUL[active.pillar.branch]} · {active.sourcePeriod.ageRange}</h3><small className="hanjaSecondary">{active.pillar.stem}{active.pillar.branch}</small><p>{active.activation.level==="HIGH"||active.activation.level==="VERY_HIGH"?"맡은 일이나 생활 환경이 자주 바뀔 수 있는 시기입니다.":"큰 변화보다 지금 하는 일을 정리하기 쉬운 시기입니다."}</p><EvidenceDetails><div className="metricPair"><Metric label="도움받기 쉬운 정도" value={score(active.preference.baseFavorabilityScore)} note={SUPPORT[active.preference.role]??active.preference.role}/><Metric label="바빠지거나 바뀌는 정도" value={score(active.activation.score)} note={ACTIVITY[active.activation.level]??active.activation.level} tone="activity"/></div><EvidenceRows rows={[["전문가용 한자",`${active.pillar.stem}${active.pillar.branch}`]]}/><p>도움을 받는 것과 변화가 많은 것은 서로 다릅니다. 두 숫자를 합쳐 좋다거나 나쁘다고 말하지 않습니다.</p></EvidenceDetails></div>}</Chapter>; }

function ProfessionalChapter({ analysis, report }: { analysis:SajuAnalysis; report:StructuredInterpretation|null }) { const native=analysis.fiveElements.nativeStrength, adjusted=analysis.fiveElements.adjustedStrength.elements; return <section id="chapter-18" className="professionalRoom"><details><summary><span><small>18 · 전문 분석실</small><b>계산 근거와 전문 용어를 확인합니다</b></span><em>펼쳐 보기</em></summary><div className="professionalInner"><AiCopy report={report} id="professional" fallback={["기본 결과와 같은 원국, 규칙 버전, evidence를 사용합니다."]}/><h3>사주 원국</h3><div className="professionalPillars">{(["year","month","day","hour"] as PillarPosition[]).map(position=><article key={position}><span>{PILLAR_LABEL[position]}</span><b>{analysis.pillars[position].stem}{analysis.pillars[position].branch}</b><small>천간 십성: {analysis.tenGods.value?.heavenlyStems[position].korean}</small></article>)}</div><h3>오행 기본값과 관계 반영값</h3><div className="professionalElements">{ELEMENTS.map(element=><p key={element}><b>{customerElement(element,true)}</b><span>기본 {pct(native?.[element].percentage)}</span><span>관계 반영 {pct(adjusted?.[element].percentage)}</span></p>)}</div><h3>전문 분류</h3><p>{customerTerm("격국")}: {analysis.structure.primary?.type} · {customerTerm("용신")}: {analysis.usefulGods.synthesis.status==="implemented"?analysis.usefulGods.synthesis.elements.slice(0,3).map(row=>customerElement(row.element,true)).join(" · "):"판단 유보"}</p><details><summary>버전과 evidence IDs</summary><pre>{JSON.stringify({rulesetVersion:analysis.rulesetVersion,engineVersion:analysis.engineMetadata.engineVersion,evidence:analysis.daeun.evidence},null,2)}</pre></details></div></details></section>; }


function LifetimeBook154({ analysis, report, interpretation, onRetry, onRestart }: { analysis:SajuAnalysis; report:StructuredInterpretation; interpretation:InterpretationUiState; onRetry:()=>void; onRestart:()=>void }) {
  const sectionById=new Map(report.sections.map(section=>[section.id,section]));
  return <div className="lifetimeReport lifetimeBook154">
    <header className="lifetimeCover book154Cover">
      <div className="coverTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div>
      <div className="coverOrnament" aria-hidden="true"><i/><i/><i/></div>
      <p>평생사주 · 154 PAGE</p>
      <h1>{analysis.person.name}님의<br/>한 권의 사주책</h1>
      <h2>{report.headline}</h2>
      <span>깊은 풀이를 쉬운 한국어로, 계산 근거는 그대로</span>
    </header>
    <nav className="book154Toc" aria-label="평생사주 154페이지 목차">
      {LIFETIME_BOOK_V1.parts.map(part=><a key={part.partNumber} href={`#book-part-${part.partNumber}`}><b>{part.partNumber}</b><span>{part.title}</span><small>{part.pages[0]?.pageNumber}–{part.pages.at(-1)?.pageNumber}</small></a>)}
    </nav>
    <main className="book154Main">
      {LIFETIME_BOOK_V1.parts.map(part=><section key={part.partNumber} id={`book-part-${part.partNumber}`} className="book154Part">
        <header className="book154PartHeader"><span>PART {part.partNumber}</span><h2>{part.title}</h2><p>{part.pages.length}개의 이야기로 천천히 이어집니다.</p></header>
        {part.pages.map(page=>{
          const section=sectionById.get(page.id);
          const paragraphs=section?.paragraphs?.length?section.paragraphs:section?.body?[section.body]:["계산 근거를 바탕으로 이 페이지의 이야기를 정리하고 있습니다."];
          return <article key={page.id} id={page.id} className="book154Page">
            <div className="book154PageNumber"><span>{String(page.pageNumber).padStart(3,"0")}</span><i/></div>
            <p className="book154Eyebrow">{part.title}</p>
            <h3>{section?.headline||page.title}</h3>
            {section?.lead&&<p className="book154Lead">{section.lead}</p>}
            <div className="longCopy">{paragraphs.map((paragraph,index)=><p key={`${page.id}-${index}`}>{paragraph}</p>)}</div>
            {section?.keyPoints?.length?<blockquote className="book154Key">{section.keyPoints.slice(0,3).map((point,index)=><p key={index}>{point}</p>)}</blockquote>:null}
            {section?.metrics?.length?<div className="book154Metrics">{section.metrics.map(metric=><Metric key={metric.id} label={metric.label} value={metric.unit==="PERCENT"?`${metric.value.toFixed(1)}%`:`${metric.value.toFixed(1)}`} tone="neutral"/>)}</div>:null}
            {section?.mascotComment?<CrowNote>{section.mascotComment}</CrowNote>:null}
            {section&&<EvidenceDetails>
              {section.professionalDetails?<><p>{section.professionalDetails.summary}</p><p className="book154EvidenceIds">{section.professionalDetails.evidenceIds.join(" · ")}</p></>:<p className="book154EvidenceIds">{section.evidenceIds.join(" · ")}</p>}
            </EvidenceDetails>}
          </article>;
        })}
      </section>)}
      {interpretation.status==="failed"&&<div className="interpretationFallback" role="alert"><p>상세 해석을 불러오지 못했습니다. 계산 결과는 정상적으로 보관되어 있습니다.</p><button onClick={onRetry}>154페이지 해석 다시 시도</button></div>}
      <footer className="reportNotice">이 결과는 전통 명리의 계산 근거를 생활 언어로 풀어낸 참고 콘텐츠입니다. 특정 사건을 확정하거나 중요한 현실 판단을 대신하지 않습니다.</footer>
    </main>
  </div>;
}


function LifetimeGenerationScreen({ name, onRestart }: { name:string; onRestart:()=>void }) {
  return <main className="lifetimeGeneration" role="status" aria-live="polite">
    <div className="generationTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div>
    <section className="generationPanel">
      <div className="generationSeal" aria-hidden="true"><i/><i/><i/></div>
      <p className="generationKicker">평생사주 · 154 PAGE</p>
      <h1>{name}님의<br/>사주책을 만들고 있어요</h1>
      <p className="generationLead">계산은 끝났습니다. 지금은 타고난 성향부터 일·돈·관계·귀인·앞으로의 흐름까지, 서로 다른 근거를 묶어 한 권의 이야기로 풀고 있습니다.</p>
      <div className="generationProgress" aria-hidden="true"><span/></div>
      <div className="generationSteps">
        <p><b>1</b><span>사주 원국과 숨은 기운을 다시 연결하고 있어요</span></p>
        <p><b>2</b><span>일·돈·관계에서 반복되는 생활 패턴을 정리하고 있어요</span></p>
        <p><b>3</b><span>10년 흐름과 앞으로 5년의 변화를 따로 읽고 있어요</span></p>
        <p><b>4</b><span>154페이지가 모두 검증되면 한 번에 보여드릴게요</span></p>
      </div>
      <p className="generationNotice">페이지를 이동하지 않아도 됩니다. 해설이 완성되면 자동으로 결과가 열립니다.</p>
    </section>
  </main>;
}

function LifetimeGenerationFailed({ message, onRetry, onRestart }: { message:string; onRetry:()=>void; onRestart:()=>void }) {
  return <main className="lifetimeGeneration">
    <div className="generationTop"><b>POSTPOST</b><button onClick={onRestart}>다시 입력</button></div>
    <section className="generationPanel generationFailed">
      <p className="generationKicker">평생사주 · 154 PAGE</p>
      <h1>해설을 끝까지 만들지 못했어요</h1>
      <p className="generationLead">계산 결과는 그대로 남아 있습니다. 해설 생성만 다시 시도하면 됩니다.</p>
      <p className="generationError">{message}</p>
      <button className="generationRetry" onClick={onRetry}>154페이지 해설 다시 만들기</button>
    </section>
  </main>;
}
