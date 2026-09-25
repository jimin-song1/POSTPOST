"use client";

import { useMemo, useState } from "react";
import type { StructuredInterpretation } from "@/types/ai-interpretation";
import type { CurrentPeriodSelection, InterpretationUiState } from "@/types/customer-result";
import type { FortuneResult, SeunActivationPeriod, WolunActivationPeriod } from "@/types/fortune";
import type { CategoryFortunePeriod } from "@/types/category-fortune";
import type { FortuneSynthesisPeriod } from "@/types/fortune-synthesis";
import type { SajuAnalysis, Element, PillarPosition } from "@/types/saju-analysis";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { NobleSpecialStarsResult, StarDetection } from "@/types/noble-special-stars";
import type { SynthesisResult } from "@/types/useful-gods";
import { ACTIVATION_LABELS, FAVORABILITY_LABELS } from "@/lib/saju/presentation/format";

const ELEMENT: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const POSITION: Record<PillarPosition, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };
const FAVORABILITY: Record<string, string> = FAVORABILITY_LABELS;
const ACTIVITY: Record<string, string> = ACTIVATION_LABELS;
const SUPPORT: Record<string, string> = { VERY_SUPPORTIVE: "매우 든든함", SUPPORTIVE: "든든함", MODERATELY_SUPPORTIVE: "다소 도움", MIXED: "혼재", LOW_SUPPORT: "낮은 편", PRESSURED: "부담" };
const STRUCTURE: Record<string, string> = { ESTABLISHED: "뚜렷하게 성립", UNEXPOSED: "겉으로 드러나지 않음", MIXED: "여러 흐름이 함께 있음", SPECIAL_CANDIDATE: "특수 구조 가능성", UNRESOLVED: "판단 유보", CLEAN: "안정적", SUPPORTED: "지지받음", DAMAGED: "손상 요인 있음", RESCUED: "보완됨" };
const round = (value: number | null | undefined, digits = 0) => value == null ? "—" : value.toFixed(digits);
const date = (value?: string) => value ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : "—";

function Score({ label, score, level, tone = "support" }: { label: string; score?: number | null; level?: string | null; tone?: "support" | "activity" | "pressure" }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{round(score)}<small> / 100</small></strong>{level && <em>{tone === "activity" ? ACTIVITY[level] ?? level : tone === "pressure" ? ACTIVITY[level] ?? level : SUPPORT[level] ?? FAVORABILITY[level] ?? level}</em>}</div>;
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: React.ReactNode }) {
  return <section className="resultSection" aria-labelledby={`${id}-title`}>{eyebrow && <span className="sectionEyebrow">{eyebrow}</span>}<h2 id={`${id}-title`}>{title}</h2>{children}</section>;
}

function Evidence({ ids, analysis }: { ids: string[]; analysis: SajuAnalysis }) {
  const source = useMemo(() => {
    const all = [analysis.daeun.evidence,
      analysis.usefulGods.synthesis.status === "implemented" ? analysis.usefulGods.synthesis.evidence : []].flat();
    return new Map(all.map((item) => [item, item]));
  }, [analysis]);
  const label = (id: string) => id.includes("FAVORABILITY") ? "선택한 기간의 지원 흐름을 반영했습니다." : id.includes("ACTIVATION") ? "변화와 사건의 움직임이 얼마나 활발한지 반영했습니다." : id.includes("ALIGNMENT") ? "현재 흐름과 원국 오행의 정렬 관계를 반영했습니다." : id.includes("CATEGORY") ? "분야별 지원도와 활성도를 각각 반영했습니다." : id.includes("USEFUL_GOD") ? "여러 용신 관점의 합의와 충돌을 함께 반영했습니다." : "검증된 엔진 결과를 근거로 사용했습니다.";
  return <details className="evidence"><summary>왜 이렇게 나오나요?</summary><ul>{ids.map((id) => <li key={id}><span>{label(source.get(id) ?? id)}</span>{process.env.NODE_ENV !== "production" && <code>{id}</code>}</li>)}</ul></details>;
}

const RESULT_NAV = [["summary", "요약"], ["natal", "원국"], ["elements", "오행·강약"], ["useful", "용신"], ["daeun", "대운"], ["seun", "세운"], ["wolun", "월운"], ["categories", "분야별"], ["interpretation", "AI 해석"]] as const;

function Natal({ analysis }: { analysis: SajuAnalysis }) {
  const tenGods = analysis.tenGods.value, hidden = analysis.hiddenStems.value, stages = analysis.twelveStages.value;
  return <Section id="natal" eyebrow="원국" title="태어난 순간의 네 기둥"><div className="natalGrid">{(["year", "month", "day", "hour"] as PillarPosition[]).map((position) => {
    const pillar = analysis.pillars[position], isDay = position === "day";
    const branchHidden = hidden?.branches[position];
    const hiddenStems = branchHidden ? [branchHidden.mainQi, branchHidden.middleQi, branchHidden.residualQi].filter((item): item is NonNullable<typeof item> => item != null) : [];
    return <article className={`natalPillar ${isDay ? "dayMaster" : ""}`} key={position}><span>{POSITION[position]}{isDay && <b>나</b>}</span><strong aria-label={`${pillar.stem ?? "미상"} ${pillar.branch ?? "미상"}`}>{pillar.stem}<br />{pillar.branch}</strong><dl><div><dt>십성</dt><dd>{tenGods?.heavenlyStems[position]?.korean ?? "—"}</dd></div><div><dt>지장간</dt><dd>{hiddenStems.map((item) => item.stem).join(" · ") || "—"}</dd></div><div><dt>십이운성</dt><dd>{stages?.stages[position]?.korean ?? "—"}</dd></div></dl></article>;
  })}</div></Section>;
}

function FiveElements({ analysis }: { analysis: SajuAnalysis }) {
  const native = analysis.fiveElements.nativeStrength, adjusted = analysis.fiveElements.adjustedStrength.elements;
  return <div className="splitCards"><Section id="elements" eyebrow="오행" title="다섯 기운의 분포"><p className="sectionLead">기본 분포와 관계를 반영한 분포를 나누어 보여드려요.</p><div className="elementList">{(Object.keys(ELEMENT) as Element[]).map((element) => <div key={element}><b>{ELEMENT[element]}</b><span>기본 {round(native?.[element].percentage, 1)}</span><span>관계 반영 {round(adjusted?.[element].percentage, 1)}</span><i style={{ "--bar": `${Math.min(100, adjusted?.[element].percentage ?? 0)}%` } as React.CSSProperties} /></div>)}</div></Section><Section id="strength" eyebrow="강약" title={analysis.strength.adjusted.level ?? "판단 대기"}><div className="heroScore"><strong>{round(analysis.strength.adjusted.score, 1)}</strong><span>/ 100 · 관계 반영 대표값</span></div><details><summary>강약의 근거 보기</summary><ul className="plainList"><li>월령: {analysis.strength.deukRyeong?.isObtained ? "얻음" : "얻지 못함"}</li><li>뿌리: {round(analysis.strength.rooting?.score, 1)}</li><li>득지: {analysis.strength.deukJi?.isObtained ? "있음" : "없음"}</li><li>득시: {analysis.strength.deukSi?.isObtained ? "있음" : "없음"}</li><li>득세: {analysis.strength.deukSe?.isObtained ? "있음" : "없음"}</li></ul></details></Section></div>;
}

function UsefulGod({ analysis }: { analysis: SajuAnalysis }) {
  const synthesis = analysis.usefulGods.synthesis as SynthesisResult;
  if (synthesis.status !== "implemented") return null;
  const groups: Array<{ label: string; values: Element[] }> = [{ label: "우선적으로 유리", values: [...synthesis.primaryElements, ...synthesis.secondaryElements, ...synthesis.favorableElements] }, { label: "조건에 따라 유리", values: synthesis.conditionalElements }];
  return <Section id="useful" eyebrow="용신 종합" title="균형을 돕는 기운"><div className="usefulGroups">{groups.map((group) => <div key={group.label}><span>{group.label}</span><strong>{Array.from(new Set<Element>(group.values)).map((item) => ELEMENT[item]).join(" · ") || "해당 없음"}</strong></div>)}</div><div className="perspectives">{[["억부", analysis.usefulGods.eokbu.primaryElements], ["조후", analysis.usefulGods.johu.elementPreferences.slice(0, 2).map((v) => v.element)], ["통관", analysis.usefulGods.tonggwan.elementPreferences.slice(0, 2).map((v) => v.element)], ["병약", analysis.usefulGods.byeongyak.elementPreferences.slice(0, 2).map((v) => v.element)], ["격국", analysis.usefulGods.structure.elementPreferences.slice(0, 2).map((v) => v.element)]].map(([label, values]) => <div key={label as string}><b>{label as string}</b><span>{(values as Element[]).map((v) => ELEMENT[v]).join(" · ") || "해당 없음"}</span></div>)}</div><Evidence ids={synthesis.evidence.slice(0, 4)} analysis={analysis} /></Section>;
}

function PreferencesAndStars({ analysis }: { analysis: SajuAnalysis }) {
  const stems = analysis.stemPreferences as StemPreferencesResult, branches = analysis.branchPreferences as BranchPreferencesResult;
  const stars = analysis.nobleAndSpecialStars as NobleSpecialStarsResult;
  const detected: StarDetection[] = stars.status === "implemented" ? [stars.nobleStars, stars.peachBlossom, stars.travelHorse, stars.flowerCanopy, stars.ghostGate, stars.wonjin, stars.needle, stars.yangBlade, stars.goegang, stars.whiteTiger].flat() : [];
  return <div className="splitCards"><Section id="preferences" eyebrow="천간 · 지지" title="선호도가 높은 글자"><div className="preference"><div><span>천간</span><strong>{stems.status === "implemented" ? stems.rankedStems.slice(0, 4).join(" · ") : "—"}</strong></div><div><span>지지</span><strong>{branches.status === "implemented" ? branches.rankedBranches.slice(0, 4).join(" · ") : "—"}</strong></div></div><details><summary>전체 순위 보기</summary><p className="rankLine">{stems.status === "implemented" && stems.stems.map((v) => `${v.stem} ${round(v.score)}`).join(" · ")}</p><p className="rankLine">{branches.status === "implemented" && branches.branches.map((v) => `${v.branch} ${round(v.score)}`).join(" · ")}</p></details></Section><Section id="stars" eyebrow="귀인 · 신살" title="탐지된 보조 지표"><div className="chips">{detected.length ? detected.map((star) => <span key={star.id}>{star.label}</span>) : <span>두드러진 항목 없음</span>}</div><p className="notice">전통적으로 성향과 흐름을 보조해 읽는 지표이며, 하나의 항목만으로 길흉이나 사건을 단정하지 않습니다.</p></Section></div>;
}

function Periods({ analysis, current, year, onYearChange }: { analysis: SajuAnalysis; current: CurrentPeriodSelection; year: number; onYearChange: (year: number) => void }) {
  const fortune = analysis.fortune as FortuneResult;
  const [daeunIndex, setDaeunIndex] = useState(current.daeunIndex ?? 0);
  const seunAll = fortune.seun.status === "implemented" ? fortune.seun.periods ?? [] : [];
  const seun = seunAll.find((item) => item.year === year);
  const wolun = fortune.wolun.status === "implemented" ? (fortune.wolun.periods ?? []).filter((item) => item.seunYear === year).slice(0, 12) : [];
  const selectedDaeun = fortune.daeun.status === "implemented" ? fortune.daeun.periods[daeunIndex] : undefined;
  return <><Section id="daeun" eyebrow="대운" title="10년 흐름"><p className="sectionLead scrollHint">좌우로 넘겨 다른 대운을 선택할 수 있어요.</p><div className="timeline" role="list" aria-label="대운 타임라인">{fortune.daeun.status === "implemented" && fortune.daeun.periods.map((period) => <button role="listitem" aria-pressed={period.index === daeunIndex} className={period.index === daeunIndex ? "active" : ""} key={period.index} onClick={() => setDaeunIndex(period.index)}><b>{period.pillar.stem}{period.pillar.branch}</b><span>{period.sourcePeriod.ageRange}</span><small>{FAVORABILITY[period.preference.role] ?? period.preference.role} · 변화 {ACTIVITY[period.activation.level]}</small></button>)}</div>{selectedDaeun && <div className="periodDetail" aria-live="polite"><h3>{selectedDaeun.pillar.stem}{selectedDaeun.pillar.branch} 대운</h3><div className="metricGrid"><Score label="선호도" score={selectedDaeun.preference.baseFavorabilityScore} level={selectedDaeun.preference.role} /><Score label="활성도" score={selectedDaeun.activation.score} level={selectedDaeun.activation.level} tone="activity" /></div><p>십성 {selectedDaeun.tenGodProfile.stemTenGod} · 주요 상호작용 {selectedDaeun.interactions.length}개</p></div>}</Section><Section id="seun" eyebrow="세운" title="해마다 달라지는 흐름"><p className="sectionLead scrollHint">연도를 선택하면 월운과 분야별 흐름도 함께 바뀝니다.</p><div className="yearPicker" role="list" aria-label="세운 연도 선택">{seunAll.slice(0, 18).map((period) => <button role="listitem" aria-pressed={period.year === year} className={period.year === year ? "active" : ""} key={period.year} onClick={() => onYearChange(period.year)}><b>{period.year}{period.year === current.seunYear && <small className="currentBadge">현재</small>}</b><span>{period.pillar.stem}{period.pillar.branch}</span></button>)}</div>{seun && <div aria-live="polite"><SeunDetail period={seun} /></div>}</Section><Wolun periods={wolun} /></>;
}

function SeunDetail({ period }: { period: SeunActivationPeriod }) { return <div className="periodDetail"><h3>{period.year}년 {period.pillar.stem}{period.pillar.branch}</h3><p>현재 대운 {period.activeDaeunPillar ?? "경계 밖"}{period.daeunSegments.length > 1 && " · 대운 경계가 포함된 해"}</p><div className="metricGrid"><Score label="선호도" score={period.preference.baseFavorabilityScore} level={period.preference.role} /><Score label="활성도" score={period.activation.score} level={period.activation.level} tone="activity" /></div></div>; }

function Wolun({ periods }: { periods: WolunActivationPeriod[] }) { return <Section id="wolun" eyebrow="월운" title="절기로 나눈 열두 달"><p className="notice">월운은 양력 1일 기준이 아니라 절기 경계로 바뀝니다. 아래 실제 기간을 함께 확인해 주세요.</p><div className="monthGrid">{periods.map((period) => <article key={`${period.seunYear}-${period.indexInSeun}`}><span>{period.solarMonthBranch}월</span><strong>{period.pillar.stem}{period.pillar.branch}</strong><small>{date(period.period.startInstant)} ~ {date(period.period.endInstant)}</small><div><b>선호 {round(period.preference.baseFavorabilityScore)}</b><b>변화 {round(period.activation.score)}</b></div></article>)}</div></Section>; }

function Categories({ analysis, selectedYear, current }: { analysis: SajuAnalysis; selectedYear: number; current: CurrentPeriodSelection }) {
  const fortune = analysis.fortune as FortuneResult;
  if (fortune.categories.status !== "implemented" || fortune.synthesis.status !== "implemented") return null;
  const axes = fortune.synthesis.seun.find((item) => item.context.seunYear === selectedYear) ?? fortune.synthesis.daeun[current.daeunIndex ?? 0] ?? fortune.synthesis.seun[0];
  const category = fortune.categories.seun.find((item) => item.synthesisId === axes?.synthesisId) ?? fortune.categories.daeun.find((item) => item.synthesisId === axes?.synthesisId) ?? fortune.categories.seun[0];
  if (!category || !axes) return null;
  return <><Section id="axes" eyebrow="종합 운 흐름" title={`${selectedYear}년의 서로 다른 세 가지 축`}><div className="metricGrid three"><Score label="지원 흐름" score={axes.favorability.score} level={axes.favorability.level} /><Score label="변화 활성도" score={axes.activation.score} level={axes.activation.level} tone="activity" /><Score label="오행 정렬도" score={axes.transformationAlignment.adjustedScore} level={axes.transformationAlignment.level} /></div></Section><Section id="categories" eyebrow="분야별 흐름" title={`${selectedYear}년 생활 영역별 흐름`}><CategoryGrid category={category} /><CategoryDetails category={category} /><Evidence ids={category.evidence.slice(0, 4)} analysis={analysis} /></Section></>;
}

function CategoryGrid({ category }: { category: CategoryFortunePeriod }) { const items = [["재물", category.wealth], ["사업", category.business], ["직장", category.career], ["관계", category.relationship], ["학업", category.study], ["변화", category.change]] as const; return <div className="categoryGrid">{items.map(([label, item]) => <article key={label}><h3>{label}</h3><Score label="지원도" score={item.supportScore} level={item.supportLevel} /><Score label="활성도" score={item.activityScore} level={item.activityLevel} tone="activity" /></article>)}</div>; }

function CategoryDetails({ category }: { category: CategoryFortunePeriod }) { return <div className="detailStack"><details><summary>재물 상세</summary><div className="metricGrid"><Score label="수입 기회" score={category.wealth.incomeOpportunity.score} level={category.wealth.incomeOpportunity.level} /><Score label="사업 매출" score={category.wealth.businessRevenue.score} level={category.wealth.businessRevenue.level} /><Score label="안정적 현금흐름" score={category.wealth.stableCashflow.score} level={category.wealth.stableCashflow.level} /><Score label="자산 축적" score={category.wealth.assetAccumulation.score} level={category.wealth.assetAccumulation.level} /><Score label="지출 압력" score={category.wealth.expensePressure.score} level={category.wealth.expensePressure.level} tone="pressure" /><Score label="확장·투자 활성도" score={category.wealth.expansionInvestment.score} level={category.wealth.expansionInvestment.level} tone="activity" /></div></details><details><summary>관계 상세</summary><div className="metricGrid"><Score label="기회" score={category.relationship.opportunity.score} level={category.relationship.opportunity.level} /><Score label="안정성" score={category.relationship.stability.score} level={category.relationship.stability.level} /><Score label="공식화 지원" score={category.relationship.formalizationSupport.score} level={category.relationship.formalizationSupport.level} /></div><p className="notice">전통 명리 분류 기준은 상세 맥락을 돕는 참고 정보이며 확률을 뜻하지 않습니다.</p></details></div>; }

function Interpretation({ state, onRequest, onRetry, analysis }: { state: InterpretationUiState; onRequest: () => void; onRetry: () => void; analysis: SajuAnalysis }) {
  const failureCopy = state.status === "failed" && state.error.code === "NETWORK_ERROR" ? "네트워크 연결 문제로 AI 해석을 불러오지 못했어요." : "AI 해석 서비스에서 응답을 받지 못했어요.";
  return <Section id="interpretation" eyebrow="AI 종합 해석" title="계산 근거를 문장으로 읽기">{state.status === "not_requested" && <div className="emptyState"><p>검증된 엔진 결과를 바탕으로 해석을 생성할 수 있어요.</p><button onClick={onRequest}>AI 해석 생성하기</button></div>}{state.status === "pending" && <div className="skeleton" role="status" aria-label="AI 해석 생성 중"><i /><i /><i /></div>}{state.status === "failed" && <div className="errorPanel" role="alert"><strong>{failureCopy}</strong><p>사주 계산 결과는 정상이며 위 내용을 계속 확인할 수 있습니다.</p><button onClick={onRetry}>해석 다시 시도</button></div>}{state.status === "completed" && <Report report={state.report} analysis={analysis} />}</Section>;
}
function Report({ report, analysis }: { report: StructuredInterpretation; analysis: SajuAnalysis }) { return <div className="report"><h3>{report.headline}</h3><p className="reportSummary">{report.summary}</p>{report.highlights.length > 0 && <div className="callout"><b>주목할 점</b><ul>{report.highlights.map((item) => <li key={item}>{item}</li>)}</ul></div>}{report.sections.map((section) => <article key={section.id}><h4>{section.title}</h4><p>{section.body}</p><Evidence ids={section.evidenceIds} analysis={analysis} /></article>)}{report.cautions.length > 0 && <div className="cautions"><b>유의할 점</b><ul>{report.cautions.map((item) => <li key={item}>{item}</li>)}</ul></div>}<p className="disclaimer">{report.disclaimer}</p></div>; }

export function CustomerResult({ analysis, current, interpretation, onInterpret, onRetry, onRestart }: { analysis: SajuAnalysis; current: CurrentPeriodSelection; interpretation: InterpretationUiState; onInterpret: () => void; onRetry: () => void; onRestart?: () => void }) {
  const fortune = analysis.fortune as FortuneResult;
  const firstYear = fortune.seun.status === "implemented" ? fortune.seun.periods?.[0]?.year : undefined;
  const [selectedYear, setSelectedYear] = useState(current.seunYear ?? firstYear ?? 0);
  return <div className="customerResult"><header className="resultHero"><div className="heroTop"><span className="sectionEyebrow">SAJU RESULT</span>{onRestart && <button className="restartButton" onClick={onRestart}>다시 입력하기</button>}</div><h1>{analysis.person.name}님의 사주 흐름</h1><p>{analysis.person.gender === "female" ? "여성" : "남성"} · {analysis.birthInput.calendarType === "solar" ? "양력" : "음력"} 입력 기준</p><div className="heroPillars">{(["year", "month", "day", "hour"] as PillarPosition[]).map((position) => <span key={position}><small>{POSITION[position]}</small><b>{analysis.pillars[position].stem}{analysis.pillars[position].branch}</b></span>)}</div></header><nav className="resultNav" aria-label="결과 빠른 이동">{RESULT_NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><main className="resultBody"><section id="summary" className="summaryStrip"><span>핵심 요약</span><strong>{analysis.strength.adjusted.level ?? "강약 분석"} · {analysis.structure.primary?.type ?? "격국 판단 중"}</strong><p>점수는 가능성이나 확률이 아니라, 엔진이 계산한 흐름의 상대적 지표입니다.</p></section><Natal analysis={analysis} /><FiveElements analysis={analysis} /><Section id="structure" eyebrow="격국" title={analysis.structure.primary?.type ?? "격국 판단 유보"}><div className="structureStatus"><strong>{STRUCTURE[analysis.structure.classificationStatus] ?? analysis.structure.classificationStatus}</strong><span>{STRUCTURE[analysis.structure.qualityEvaluation.integrity] ?? analysis.structure.qualityEvaluation.integrity}</span></div></Section><UsefulGod analysis={analysis} /><PreferencesAndStars analysis={analysis} /><Periods analysis={analysis} current={current} year={selectedYear} onYearChange={setSelectedYear} /><Categories analysis={analysis} current={current} selectedYear={selectedYear} /><Interpretation state={interpretation} onRequest={onInterpret} onRetry={onRetry} analysis={analysis} />{process.env.NODE_ENV !== "production" && <details className="debugPanel"><summary>개발자 진단 정보</summary><p>규칙 버전 {analysis.rulesetVersion} · 엔진 {analysis.engineMetadata.engineVersion}</p><pre>{JSON.stringify({ current, analysis, interpretation }, null, 2)}</pre></details>}</main></div>;
}
