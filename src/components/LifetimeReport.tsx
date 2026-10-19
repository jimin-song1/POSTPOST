"use client";
import {useState} from "react";
import {customerElement,customerTerm} from "@/rules/customer-terminology.v1";
import {getLifetimeReportSections,LIFETIME_REPORT_V2} from "@/rules/lifetime-report.v2";
import type {ChildStatus,RelationshipStatus,StructuredInterpretation} from "@/types/ai-interpretation";
import type {CurrentPeriodSelection,InterpretationUiState} from "@/types/customer-result";
import type {CategoryFortunePeriod} from "@/types/category-fortune";
import type {FortuneResult} from "@/types/fortune";
import type {Element,PillarPosition,SajuAnalysis} from "@/types/saju-analysis";
import type {WellnessResult} from "@/types/wellness";
import type {ChildrenFortuneResult} from "@/types/children-fortune";

const ELEMENTS:Element[]=["wood","fire","earth","metal","water"];
const SUPPORT:Record<string,string>={PRIMARY_FAVORABLE:"매우 우호적",STRONG_FAVORABLE:"우호적",FAVORABLE:"비교적 우호적",CONDITIONAL:"조건부",NEUTRAL:"중립적",UNFAVORABLE:"부담이 있는 편",VERY_SUPPORTIVE:"매우 든든함",SUPPORTIVE:"든든함",MODERATELY_SUPPORTIVE:"다소 도움",MIXED:"여러 흐름이 섞임",LOW_SUPPORT:"도움이 적은 편",PRESSURED:"부담이 있는 편"};
const ACTIVITY:Record<string,string>={LOW:"잔잔함",MODERATE:"보통",HIGH:"큰 편",VERY_HIGH:"매우 큰 편"};
const STEM_HANGUL:Record<string,string>={甲:"갑",乙:"을",丙:"병",丁:"정",戊:"무",己:"기",庚:"경",辛:"신",壬:"임",癸:"계"};
const BRANCH_HANGUL:Record<string,string>={子:"자",丑:"축",寅:"인",卯:"묘",辰:"진",巳:"사",午:"오",未:"미",申:"신",酉:"유",戌:"술",亥:"해"};
const PILLAR_LABEL:Record<PillarPosition,string>={year:"년주",month:"월주",day:"일주",hour:"시주"};
const pct=(value:number|null|undefined)=>value==null?"—":`${value.toFixed(1)}%`;
const score=(value:number|null|undefined)=>value==null?"—":`${Math.round(value)}%`;
const section=(report:StructuredInterpretation|null,id:string)=>report?.sections.find(row=>row.id===id);

function Chapter({code,id,title,headline,children,tone="paper"}:{code:string;id:string;title:string;headline:string;children:React.ReactNode;tone?:"paper"|"ink"|"wine"}){return <section id={`chapter-${id}`} className={`lifetimeChapter ${tone}`}><div className="chapterRule"><span>{code}</span><i/></div><p className="chapterTitle">{title}</p><h2>{headline}</h2>{children}</section>;}
function AiCopy({report,id,fallback}:{report:StructuredInterpretation|null;id:string;fallback:string[]}){const row=section(report,id),paragraphs=row?.paragraphs?.length?row.paragraphs:row?.body?[row.body]:fallback;return <div className="longCopy">{paragraphs.map((text,index)=><p key={`${id}-${index}`}>{text}</p>)}</div>;}
function Metric({label,value,note,tone="support"}:{label:string;value:string;note?:string;tone?:"support"|"activity"|"neutral"}){return <div className={`lifetimeMetric ${tone}`}><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div>;}
function CrowNote({children}:{children:React.ReactNode}){return <aside className="crowNote"><span aria-hidden="true">●</span><p><b>삼족오 한마디</b>{children}</p></aside>;}

export function LifetimeReport({analysis,current:_current,relationshipStatus,childStatus,interpretation,onRetry,onRestart}:{analysis:SajuAnalysis;current:CurrentPeriodSelection;relationshipStatus:RelationshipStatus;childStatus:ChildStatus;interpretation:InterpretationUiState;onRetry:()=>void;onRestart:()=>void}){
  const report=interpretation.status==="completed"&&interpretation.report.reportType==="LIFETIME_GENERAL"?interpretation.report:null;
  const fortune=analysis.fortune as FortuneResult,categories=fortune.categories.status==="implemented"?fortune.categories.daeun[0]:null;
  const wellness=analysis.wellness.status==="implemented"?analysis.wellness as WellnessResult:null;
  const children=analysis.childrenFortune.status==="implemented"?analysis.childrenFortune as ChildrenFortuneResult:null;
  const sections=getLifetimeReportSections(relationshipStatus,childStatus);
  const title=(id:string)=>section(report,id)?.title??sections.find(row=>row.id===id)!.title;
  const starResult=analysis.nobleAndSpecialStars.status==="implemented"&&"nobleStars" in analysis.nobleAndSpecialStars?analysis.nobleAndSpecialStars:null;
  const starLabels=starResult?[...starResult.nobleStars,...starResult.peachBlossom,...starResult.travelHorse,...starResult.flowerCanopy].map(row=>row.label).slice(0,2):[];
  const seun=fortune.seun.status==="implemented"?fortune.seun.periods?.[0]:undefined,wolun=fortune.wolun.status==="implemented"?fortune.wolun.periods?.[0]:undefined,daeun=fortune.daeun.status==="implemented"?fortune.daeun.periods:[];
  const specialTitle=section(report,"special")?.title??`신살·삼재 · ${starLabels.join("·")||"명식의 보조 지표"}`;
  const yearlyTitle=section(report,"yearly")?.title??`연운 · ${seun?`${seun.year}년 ${seun.pillar.stem}${seun.pillar.branch}`:"계산된 해의 흐름"}${wolun?` · 월운 ${wolun.pillar.stem}${wolun.pillar.branch}`:""}`;
  const daeunTitle=section(report,"daeun")?.title??`평생 대운 · ${daeun.length?`${daeun[0].sourcePeriod.ageRange}~${daeun.at(-1)!.sourcePeriod.ageRange}`:"10년 흐름"}`;
  return <div className="lifetimeReport"><Cover analysis={analysis} report={report} onRestart={onRestart}/><nav className="chapterNav" aria-label="평생사주 목차">{sections.map(row=><a key={row.id} href={`#chapter-${row.id}`}>{row.chapterNumber}</a>)}</nav><main>
    <Chapter code="PROLOGUE · 5P" id="prologue" title={title("prologue")} headline={report?.headline??"내 삶의 큰 지도를 펼칩니다"}><AiCopy report={report} id="prologue" fallback={["타고난 기질과 평생의 흐름을 한 권의 이야기로 읽습니다.","이 프롤로그는 명식의 중심, 삶의 구조, 보고서를 읽는 법을 다섯 페이지의 호흡으로 안내합니다."]}/></Chapter>
    <Chapter code="PART01" id="personality" title={title("personality")} headline={section(report,"personality")?.headline??"타고난 기질과 반복되는 선택의 기준"}><FiveElements analysis={analysis}/><AiCopy report={report} id="personality" fallback={["성격은 하나의 단어가 아니라 힘을 쓰는 방식과 관계의 리듬이 겹쳐 드러납니다."]}/></Chapter>
    <Chapter code="PART02" id="career-study" title={title("career-study")} headline="재능을 배우고 일로 연결하는 방식"><AiCopy report={report} id="career-study" fallback={["배움의 속도와 재능을 표현하는 방식, 오래 몰입할 수 있는 환경을 함께 살펴봅니다."]}/></Chapter>
    <SituationChapter code="PART03" id="workplace" title={title("workplace")} headline="조직 안에서 성과를 만드는 방식" report={report} category={categories?.career}/>
    <SituationChapter code="PART04" id="business" title={title("business")} headline="기회를 고르고 책임지는 방식" report={report} category={categories?.business}/>
    <SituationChapter code="PART05" id="wealth" title={title("wealth")} headline="돈을 만들고 지키는 습관" report={report} category={categories?.wealth}/>
    <SituationChapter code="PART06" id="love-marriage" title={title("love-marriage")} headline={`${LIFETIME_REPORT_V2.relationship[relationshipStatus].label}의 관계 흐름`} report={report} category={categories?.relationship}/>
    <FamilyChapter report={report} relationshipStatus={relationshipStatus} childStatus={childStatus} children={children}/>
    <Chapter code="PART08" id="benefactor" title={title("benefactor")} headline="도움이 들어오는 사람과 환경"><AiCopy report={report} id="benefactor" fallback={["귀인운은 특정 인물을 예언하기보다 도움을 주고받기 쉬운 관계의 결을 읽습니다."]}/></Chapter>
    <HealthChapter report={report} wellness={wellness}/>
    <DeepReading analysis={analysis} report={report}/>
    <Chapter code="SPECIAL" id="special" title={specialTitle} headline="명식에서 실제로 확인된 보조 지표"><AiCopy report={report} id="special" fallback={["신살과 삼재는 실제 계산 결과가 있을 때만 소제목으로 삼고, 하나의 지표로 사건을 단정하지 않습니다."]}/></Chapter>
    <YearlyChapter report={report} fortune={fortune} title={yearlyTitle}/>
    <DaeunChapter report={report} fortune={fortune} title={daeunTitle}/>
    <Chapter code="EPILOGUE" id="epilogue" title={title("epilogue")} headline="내 사주를 잘 쓴다는 것" tone="wine"><AiCopy report={report} id="epilogue" fallback={["점수 하나보다 반복되는 방향을 기억하고, 선택의 기준을 더 선명하게 만드는 데 활용하세요."]}/><CrowNote>사주는 결정을 대신하지 않아요. 나를 이해하는 지도처럼 활용해 보세요.</CrowNote></Chapter>
    {interpretation.status==="failed"&&<div className="interpretationFallback" role="alert"><p>AI 상세 해석을 불러오지 못했습니다. 계산된 평생사주 결과는 정상적으로 표시되고 있습니다.</p><button onClick={onRetry}>상세 해석 다시 시도</button></div>}
    {interpretation.status==="pending"&&<div className="interpretationLoading" role="status">긴 해석을 정리하고 있습니다. 계산 결과는 먼저 읽을 수 있어요.</div>}
    <footer className="reportNotice">전통 명리의 경향을 계산 근거에 따라 풀어낸 참고 콘텐츠이며 중요한 현실 판단을 대신하지 않습니다.</footer>
  </main></div>;
}

function Cover({analysis,report,onRestart}:{analysis:SajuAnalysis;report:StructuredInterpretation|null;onRestart:()=>void}){return <header className="lifetimeCover"><div className="coverTop"><b>POSTPOST · V5.6</b><button onClick={onRestart}>다시 입력</button></div><div className="coverOrnament" aria-hidden="true"><i/><i/><i/></div><p>평생사주</p><h1>{analysis.person.name}님의<br/>한 권의 사주책</h1><h2>{report?.headline??"타고난 나와 인생의 큰 흐름을 읽는 시간"}</h2></header>;}
function FiveElements({analysis}:{analysis:SajuAnalysis}){const adjusted=analysis.fiveElements.adjustedStrength.elements;return <div className="elementBars">{ELEMENTS.map(element=><div key={element}><p><b>{customerElement(element)}</b><strong>{pct(adjusted?.[element].percentage)}</strong></p><i><span style={{width:`${adjusted?.[element].percentage??0}%`}}/></i></div>)}</div>;}
function SituationChapter({code,id,title,headline,report,category}:{code:string;id:string;title:string;headline:string;report:StructuredInterpretation|null;category?:{supportScore:number;supportLevel:string;activityScore:number;activityLevel:string}}){return <Chapter code={code} id={id} title={title} headline={headline}><AiCopy report={report} id={id} fallback={["현재 상황에 맞춰 이 영역의 분량과 초점을 조절합니다."]}/>{category&&<div className="metricPair"><Metric label="도움 흐름" value={score(category.supportScore)} note={SUPPORT[category.supportLevel]??category.supportLevel}/><Metric label="변화 움직임" value={score(category.activityScore)} note={ACTIVITY[category.activityLevel]??category.activityLevel} tone="activity"/></div>}</Chapter>;}
function FamilyChapter({report,relationshipStatus,childStatus,children}:{report:StructuredInterpretation|null;relationshipStatus:RelationshipStatus;childStatus:ChildStatus;children:ChildrenFortuneResult|null}){
  if(relationshipStatus!=="MARRIED")return <Chapter code="PART07" id="family" title="가족운" headline="가족 안에서 맡는 역할과 건강한 경계"><AiCopy report={report} id="family" fallback={["원가족과의 관계, 가족 안에서 자연스럽게 맡는 역할, 서로를 지키는 거리감을 살펴봅니다."]}/></Chapter>;
  const hasChildren=childStatus==="HAS_CHILDREN";
  const fallback=hasChildren?["자녀와 나의 인연과 부모로서의 모습을 살펴봅니다.","기대가 다르거나 의견이 엇갈릴 때의 대화, 성장에 따른 관계 변화를 함께 읽습니다."]:["자녀 인연과 부모가 되었을 때의 모습을 가능성의 언어로 살펴봅니다.","자녀에게 기대하는 것과 관계를 맺는 방식을 중심으로 읽습니다."];
  return <Chapter code="PART07" id="family" title="가족운·자녀운" headline={hasChildren?"함께 성장하며 달라지는 관계":"가족을 이루고 관계를 준비하는 방식"}><AiCopy report={report} id="family" fallback={fallback}/>{children&&<div className="metricPair"><Metric label="자녀 관계 영역" value={score(children.bond.score)} note="관계의 선명도"/><Metric label="부모 역할" value={children.parentingStyle.guidance} tone="neutral"/></div>}</Chapter>;
}
function HealthChapter({report,wellness}:{report:StructuredInterpretation|null;wellness:WellnessResult|null}){return <Chapter code="PART09" id="health" title="건강운" headline="몸의 균형과 생활 리듬">{wellness&&<div className="wellnessBalance"><span>타고난 컨디션 균형</span><strong>{score(wellness.constitutionalBalanceScore)}</strong></div>}<AiCopy report={report} id="health" fallback={["오행 구성은 건강 능력 점수가 아니라 생활 리듬을 살피는 참고 지표입니다."]}/><p className="softDisclaimer">전통 명리의 관점이며 의학적 진단이 아닙니다.</p></Chapter>;}
function DeepReading({analysis,report}:{analysis:SajuAnalysis;report:StructuredInterpretation|null}){return <Chapter code="PART10" id="deep-reading" title="사주 심층풀이" headline="명식과 계산 근거를 깊이 읽습니다" tone="ink"><AiCopy report={report} id="deep-reading" fallback={["같은 계산 결과를 전문 용어와 원국 구조로 다시 확인합니다."]}/><details><summary>전문 분석 펼쳐 보기</summary><div className="professionalPillars">{(["year","month","day","hour"] as PillarPosition[]).map(position=><article key={position}><span>{PILLAR_LABEL[position]}</span><b>{analysis.pillars[position].stem}{analysis.pillars[position].branch}</b><small>천간 십성: {analysis.tenGods.value?.heavenlyStems[position].korean}</small></article>)}</div><p>{customerTerm("격국")}: {analysis.structure.primary?.type} · {customerTerm("용신")}: {analysis.usefulGods.synthesis.status==="implemented"?analysis.usefulGods.synthesis.elements.slice(0,3).map(row=>customerElement(row.element,true)).join(" · "):"판단 유보"}</p><details><summary>버전과 evidence IDs</summary><pre>{JSON.stringify({rulesetVersion:analysis.rulesetVersion,engineVersion:analysis.engineMetadata.engineVersion,evidence:analysis.daeun.evidence},null,2)}</pre></details></details></Chapter>;}
function YearlyChapter({report,fortune,title}:{report:StructuredInterpretation|null;fortune:FortuneResult;title:string}){const seun=fortune.seun.status==="implemented"?fortune.seun.periods?.[0]:undefined,wolun=fortune.wolun.status==="implemented"?fortune.wolun.periods?.slice(0,12)??[]:[];return <Chapter code="PART11" id="yearly" title={title} headline={seun?`${seun.year}년 ${STEM_HANGUL[seun.pillar.stem]}${BRANCH_HANGUL[seun.pillar.branch]}의 핵심 주제`:"계산된 해의 흐름"}><AiCopy report={report} id="yearly" fallback={["연운의 핵심 주제와 월별 변화는 실제 세운·월운 계산 결과에서만 가져옵니다."]}/>{wolun.length>0&&<div className="daeunRail" role="list" aria-label="월운">{wolun.map(row=><article role="listitem" key={`${row.seunYear}-${row.indexInSeun}`}><b>{row.indexInSeun+1}월 · {STEM_HANGUL[row.pillar.stem]}{BRANCH_HANGUL[row.pillar.branch]}</b><span>{ACTIVITY[row.activation.level]??row.activation.level}</span></article>)}</div>}</Chapter>;}
function DaeunChapter({report,fortune,title}:{report:StructuredInterpretation|null;fortune:FortuneResult;title:string}){const periods=fortune.daeun.status==="implemented"?fortune.daeun.periods:[], [selected,setSelected]=useState(0),active=periods[selected];return <Chapter code="PART12" id="daeun" title={title} headline="10년마다 달라지는 삶의 배경"><div className="periodIndicator"><b>{periods.length?selected+1:0}</b><span>/ {periods.length}</span></div><div className="daeunRail" role="list" aria-label="평생 대운">{periods.map((row,index)=><button role="listitem" aria-pressed={index===selected} key={row.index} onClick={()=>setSelected(index)}><b>{STEM_HANGUL[row.pillar.stem]}{BRANCH_HANGUL[row.pillar.branch]} · {row.sourcePeriod.ageRange}</b><small>{SUPPORT[row.preference.role]??row.preference.role} / {ACTIVITY[row.activation.level]??row.activation.level}</small></button>)}</div>{active&&<div className="metricPair"><Metric label="도움 흐름" value={score(active.preference.baseFavorabilityScore)} note={SUPPORT[active.preference.role]??active.preference.role}/><Metric label="변화 움직임" value={score(active.activation.score)} note={ACTIVITY[active.activation.level]??active.activation.level} tone="activity"/></div>}<p>도움의 정도와 변화의 크기는 하나의 종합 점수로 합치지 않습니다.</p><AiCopy report={report} id="daeun" fallback={["각 대운의 소제목은 실제 간지와 나이 구간을 기준으로 달라집니다."]}/></Chapter>;}
