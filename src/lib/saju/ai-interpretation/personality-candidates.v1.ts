import type { SajuAnalysis } from "@/types/saju-analysis";
import type { TenGodName } from "@/lib/saju/interpretation/ten-gods";

/** V5.6 editorial hypotheses; not measured personality traits or predictions. */
export const PERSONALITY_SECTIONS = [
  { id: "P01-01", title: "내가 타고난 성격" },
  { id: "P01-02", title: "첫인상과 친해진 뒤의 모습" },
  { id: "P01-03", title: "혼자 있을 때의 나" },
  { id: "P01-04", title: "속마음을 꺼낼 때" },
  { id: "P01-05", title: "중요한 선택을 앞두고" },
  { id: "P01-06", title: "한번 마음을 정하고 나면" },
  { id: "P01-07", title: "양보하는 것과 끝까지 지키는 것" },
  { id: "P01-08", title: "일이 뜻대로 풀리지 않을 때" },
  { id: "P01-09", title: "내 성격의 가장 큰 장점" },
  { id: "P01-10", title: "나를 힘들게 하는 성격" }
] as const;

export type PersonalitySectionId = (typeof PERSONALITY_SECTIONS)[number]["id"];
export type CandidateKind = "UPSIDE" | "DOWNSIDE" | "CONTRAST" | "LESS_OBVIOUS";
export interface PersonalityCandidate {
  id: string;
  sectionId: PersonalitySectionId;
  kind: CandidateKind;
  claim: string;
  strength: string;
  drawback: string;
  unexpected: string;
  exampleScene: string;
  /** Existing lifetime input evidence IDs; each must match the engine data. */
  evidenceIds: string[];
  /** Provenance of input facts, not independent proof of a psychological claim. */
  sourceIds: string[];
  relationRuleId: string;
  limits: string[];
  /** A phrase describing what belongs to this subsection and nowhere else. */
  narrativeKey: string;
  confidence: "EDITORIAL_HYPOTHESIS" | "LOW_CONFIDENCE_HYPOTHESIS";
}
export interface PersonalityCandidatePlan {
  version: "personality-candidates-v1";
  status: "completed" | "insufficient_evidence";
  sections: Array<{ id: PersonalitySectionId; title: string; candidates: PersonalityCandidate[] }>;
  diagnostics: { emptySectionIds: PersonalitySectionId[]; skippedRuleIds: string[]; warnings: string[] };
}

type Facts = {
  peerPair: boolean; monthOfficer: boolean; dayResource: boolean;
  hourWealth: boolean; lacksVisibleOutput: boolean; moderatedWeak: boolean;
  sources: Record<"peer" | "officer" | "resource" | "wealth" | "output" | "strength", string[]>;
};
type FactKey = keyof Omit<Facts,"sources">;
type SourceKey = keyof Facts["sources"];
type Rule = {
  id: string; sectionId: PersonalitySectionId; kind: CandidateKind; narrativeKey: string;
  requires: readonly FactKey[]; sources: readonly SourceKey[]; evidenceIds: readonly string[];
  claim: string; strength: string; drawback: string; unexpected: string; exampleScene: string; limits: readonly string[];
  confidence: PersonalityCandidate["confidence"]; priority: number;
};
const NT = "NATAL:TEN_GODS";
const NP = "NATAL:PILLARS";
const NS = "NATAL:STRENGTH:ADJUSTED";
const ST = "NATAL:STRUCTURE:PRIMARY";
const RULES: readonly Rule[] = [
  {id:"V56-P01-A",sectionId:"P01-01",kind:"CONTRAST",narrativeKey:"rules-and-self-direction",
   requires:["peerPair","monthOfficer"],sources:["peer","officer"],evidenceIds:[NP,NT,ST],priority:10,
   claim:"사회적 규칙과 자기 판단의 기준을 동시에 고려하는 전통적 해석이다.",
   strength:"공동의 기준을 이해하면서도 자신의 판단을 유지하는 장점을 살펴본다.",
   drawback:"기준을 따르는 것과 결정권을 양보하는 것을 다르게 느낄 수 있다는 부담을 검토한다.",
   unexpected:"규칙을 지키는 성향과 독립적인 성향이 서로 반대되는 것만은 아니다.",
   exampleScene:"함께 정한 절차를 따르면서 본인이 맡은 결정의 이유는 따로 확인하는 상황",
   limits:["실제 고집이나 사회성을 진단하지 않는다."],confidence:"EDITORIAL_HYPOTHESIS"},
  {id:"V56-P01-B",sectionId:"P01-02",kind:"CONTRAST",narrativeKey:"public-vs-personal",
   requires:["monthOfficer","dayResource"],sources:["officer","resource"],evidenceIds:[NP,NT],priority:10,
   claim:"공적인 태도와 마음속에서 이해하고 판단하는 과정은 별개일 수 있다는 가설이다.",
   strength:"상황에 맞춰 행동하는 면과 개인적인 기준을 분리해 읽는다.",
   drawback:"자연스러운 대화가 마음을 모두 열었다는 뜻으로 받아들여질 수 있다.",
   unexpected:"낯가림과 신뢰 형성의 속도는 같은 개념이 아니다.",
   exampleScene:"처음 만난 사람과 이야기를 나누되 개인적인 신뢰는 시간을 두고 형성하는 상황",
   limits:["내향·외향 여부, 실제 타인의 인상을 단정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-C",sectionId:"P01-03",kind:"UPSIDE",narrativeKey:"private-learning",
   requires:["dayResource","monthOfficer"],sources:["resource","officer"],evidenceIds:[NP,NT],priority:10,
   claim:"혼자 생각을 정리하는 인성과 외부 기준의 관계를 살펴본다.",
   strength:"정보를 익히고 자신의 말로 정리하는 방향을 장점 후보로 제시한다.",
   drawback:"정보를 이해하는 과정과 실제 결론을 내리는 과정이 길어질 수 있다.",
   unexpected:"혼자 보내는 시간이 반드시 수동적인 휴식일 필요는 없다.",
   exampleScene:"새로운 규칙의 배경을 혼자 읽어보고 적용법을 정리하는 상황",
   limits:["학습능력, 성적, 불안 수준을 추정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-D",sectionId:"P01-04",kind:"LESS_OBVIOUS",narrativeKey:"intake-and-expression",
   requires:["dayResource","lacksVisibleOutput"],sources:["resource","output"],evidenceIds:[NP,NT],priority:10,
   claim:"정보를 받아들이는 방식과 밖으로 표현하는 방식은 따로 해석할 필요가 있다.",
   strength:"생각을 정리한 뒤 표현을 선택하는 장면을 다룬다.",
   drawback:"밖으로 전달되지 않은 생각은 상대에게 알려지지 않을 수 있다.",
   unexpected:"표현하는 기운이 드러나지 않는다고 말솜씨가 부족하다는 뜻은 아니다.",
   exampleScene:"의견을 듣고 내용을 정리한 뒤 질문을 던지는 상황",
   limits:["식상 비노출로 실제 언어능력이나 소통 능력을 단정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-E",sectionId:"P01-05",kind:"CONTRAST",narrativeKey:"learning-vs-opportunity",
   requires:["dayResource","hourWealth"],sources:["resource","wealth"],evidenceIds:[NP,NT],priority:10,
   claim:"정보를 이해하는 과정과 바깥의 현실적인 기회를 검토하는 과정이 함께 놓인다.",
   strength:"기회의 조건과 내용을 함께 살피는 해석을 시도한다.",
   drawback:"계속 알아보는 것과 실제 행동으로 옮기는 것 사이에 차이가 생길 수 있다.",
   unexpected:"빠르게 결정한다/늦게 결정한다보다 무엇을 확인하는지가 더 구체적이다.",
   exampleScene:"새로운 제안을 받으면 이익과 실제 진행 조건을 나누어 검토하는 상황",
   limits:["실제 의사결정 속도, 투자 성향, 사업성과를 단정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-F",sectionId:"P01-06",kind:"CONTRAST",narrativeKey:"revising-choices",
   requires:["peerPair","dayResource"],sources:["peer","resource"],evidenceIds:[NP,NT],priority:10,
   claim:"자기 결정을 지키려는 방향과 새로운 정보를 수용하는 방향을 비교한다.",
   strength:"새로운 근거가 들어오면 판단을 점검할 수 있는 장점을 살펴본다.",
   drawback:"근거 없는 반대는 납득하기 어려울 수 있는 조건을 검토한다.",
   unexpected:"입장을 바꾸는 것과 남에게 이끌리는 것은 다른 문제다.",
   exampleScene:"이미 결정한 계획에 새 사실이 확인되면 기존 근거와 다시 비교하는 상황",
   limits:["실제 고집의 정도나 판단 오류의 빈도를 추정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-G",sectionId:"P01-07",kind:"UPSIDE",narrativeKey:"collaboration-boundaries",
   requires:["peerPair","monthOfficer"],sources:["peer","officer"],evidenceIds:[NP,NT],priority:10,
   claim:"경쟁·협력과 역할의 기준을 함께 읽어 공로 및 책임의 경계를 생각해 본다.",
   strength:"각자의 역할을 분명히 하며 협력할 수 있다는 점을 살펴본다.",
   drawback:"역할과 책임의 기준이 흐릿할 때 부담을 느끼는 상황을 가정할 수 있다.",
   unexpected:"경쟁심은 반드시 남을 이기는 행동만 뜻하지 않는다.",
   exampleScene:"함께 만든 성과에서 누가 무엇을 책임지는지 먼저 합의하는 상황",
   limits:["실제 금전 다툼이나 경쟁 경험을 지어내지 않는다."],confidence:"EDITORIAL_HYPOTHESIS"},
  {id:"V56-P01-H",sectionId:"P01-08",kind:"CONTRAST",narrativeKey:"rules-help-and-pressure",
   requires:["monthOfficer","moderatedWeak"],sources:["officer","strength"],evidenceIds:[NP,NT,NS],priority:10,
   claim:"외부의 규칙과 요구가 도움과 부담 양쪽으로 해석될 수 있는 조건을 구분한다.",
   strength:"분명한 기준이 문제를 정리하는 데 도움이 되는 장면을 살핀다.",
   drawback:"책임은 있지만 조정할 권한이 없을 때 기준이 부담이 되는 상황을 살핀다.",
   unexpected:"규칙은 언제나 좋은 것도, 언제나 나쁜 것도 아니다.",
   exampleScene:"문제가 생겨 정해진 절차를 활용할 때와 절차가 대응을 늦출 때를 비교하는 상황",
   limits:["중화신약을 정신적 약함으로 번역하지 않는다.","강약과 월령은 독립적 증거가 아니다."],
   confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-I",sectionId:"P01-09",kind:"UPSIDE",narrativeKey:"understanding-to-practice",
   requires:["dayResource","monthOfficer"],sources:["resource","officer"],evidenceIds:[NP,NT,ST],priority:10,
   claim:"배우고 이해하려는 방향을 기준과 역할의 수행에 연결하는 장점 후보이다.",
   strength:"이해한 내용을 실제 상황에서 활용하는 과정을 장점으로 살펴본다.",
   drawback:"기준에 익숙해질수록 자기 결과에 대한 기대도 높아질 수 있다.",
   unexpected:"처음부터 완벽하게 하는 것보다 배운 뒤 적용하는 방식에 주목한다.",
   exampleScene:"배운 절차를 실제 일에 활용해 보고 필요한 부분을 정리하는 상황",
   limits:["실제 전문성이나 직업 능력을 측정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-J",sectionId:"P01-10",kind:"DOWNSIDE",narrativeKey:"self-imposed-responsibility",
   requires:["peerPair","monthOfficer","dayResource"],sources:["peer","officer","resource"],evidenceIds:[NP,NT],priority:10,
   claim:"자기 기준, 책임, 충분한 이해가 한꺼번에 작용할 때의 부담을 검토한다.",
   strength:"자기 역할을 분명하게 하려는 태도는 장점이 될 수 있다.",
   drawback:"모든 일을 직접 점검해야 한다는 부담으로 번질 수 있는 조건을 본다.",
   unexpected:"좋은 성질이 사라져서가 아니라 그 성질의 적용 범위가 넓어질 때 생기는 문제다.",
   exampleScene:"다른 사람의 몫까지 내가 확인해야 한다고 느끼는 경우를 가정한 장면",
   limits:["완벽주의·불안·번아웃을 진단하지 않는다.","실제 경험인 것처럼 서술하지 않는다."],
   confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-K",sectionId:"P01-01",kind:"UPSIDE",narrativeKey:"learning-the-rules",
   requires:["monthOfficer","dayResource"],sources:["officer","resource"],evidenceIds:[NP,NT],priority:2,
   claim:"사회적 기준을 이해하고 자신의 판단에 반영하는 해석이다.",
   strength:"외부 기준을 배워 활용하는 점을 본다.",
   drawback:"기준에 과하게 맞추려는 부담을 살핀다.",
   unexpected:"기준을 의식한다고 모두 남의 뜻에 따라 움직이는 것은 아니다.",
   exampleScene:"새 규칙의 이유를 알아보고 자신의 업무에 적용하는 상황",
   limits:["순종적 성격을 확정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"},
  {id:"V56-P01-L",sectionId:"P01-08",kind:"LESS_OBVIOUS",narrativeKey:"facts-under-pressure",
   requires:["dayResource","hourWealth"],sources:["resource","wealth"],evidenceIds:[NP,NT],priority:2,
   claim:"일이 막혔을 때 정보를 확인하는 것과 현실적 결정을 하는 것을 구분한다.",
   strength:"문제에 필요한 정보를 다시 파악하는 장면을 다룬다.",
   drawback:"정보가 많아도 정답이 보장되지는 않는다는 점을 다룬다.",
   unexpected:"원인 분석과 실제 해결은 두 가지 다른 단계다.",
   exampleScene:"문제가 생겼을 때 원인과 가능한 대응 방안을 따로 정리하는 상황",
   limits:["위기 대처능력이나 스트레스 내성을 판정하지 않는다."],confidence:"LOW_CONFIDENCE_HYPOTHESIS"}
] as const;

function isOutput(god: TenGodName) {return god === "식신" || god === "상관";}
function factsFromAnalysis(analysis:SajuAnalysis): Facts | null {
  const gods = analysis.tenGods.status === "implemented" ? analysis.tenGods.value : null;
  if (!gods || !analysis.dayMaster || gods.dayMaster !== analysis.dayMaster) return null;
  const visible = [gods.heavenlyStems.year.korean,gods.heavenlyStems.month.korean,gods.heavenlyStems.hour.korean];
  const month = gods.hiddenStems.month.find(row=>row.role==="mainQi")?.tenGod.korean;
  const day = gods.hiddenStems.day.find(row=>row.role==="mainQi")?.tenGod.korean;
  const strength=analysis.strength.adjusted;
  const peerStems = (["year","month","hour"] as const).filter(p=> {
    const name=gods.heavenlyStems[p].korean; return name==="비견" || name==="겁재";
  });
  return {
    peerPair:peerStems.length>=2,
    monthOfficer:month==="정관"||month==="편관",
    dayResource:day==="정인"||day==="편인",
    hourWealth:visible[2]==="편재"||visible[2]==="정재",
    lacksVisibleOutput:!visible.some(isOutput),
    moderatedWeak:strength.status==="implemented" && (strength.level==="중화신약"||strength.level==="신약"),
    sources: {
      peer:peerStems.map(p=>"PILLAR:"+p+":stem:"+analysis.pillars[p].stem),
      officer:["PILLAR:month:branch:"+analysis.pillars.month.branch],
      resource:["PILLAR:day:branch:"+analysis.pillars.day.branch],
      wealth:["PILLAR:hour:stem:"+analysis.pillars.hour.stem],
      output:(["year","month","hour"] as const).map(p=>"PILLAR:"+p+":stem:"+analysis.pillars[p].stem),
      strength:["NATAL:STRENGTH:ADJUSTED"]
    }
  };
}

export function buildPersonalityCandidatePlan(analysis:SajuAnalysis): PersonalityCandidatePlan {
  const facts=factsFromAnalysis(analysis);
  const selected:PersonalityCandidate[]=[];
  const skippedRuleIds:string[]=[];
  const usedNarratives=new Set<string>();
  if (facts) for (const rule of [...RULES].sort((a,b)=>b.priority-a.priority || a.id.localeCompare(b.id))) {
    if (!rule.requires.every(name=>facts[name])) {skippedRuleIds.push(rule.id);continue;}
    if (usedNarratives.has(rule.narrativeKey)) {skippedRuleIds.push(rule.id);continue;}
    usedNarratives.add(rule.narrativeKey);
    selected.push({
      id:rule.id,sectionId:rule.sectionId,kind:rule.kind,
      claim:rule.claim,strength:rule.strength,drawback:rule.drawback,unexpected:rule.unexpected,
      exampleScene:rule.exampleScene,evidenceIds:[...rule.evidenceIds],
      sourceIds:Array.from(new Set(rule.sources.flatMap(key=>facts.sources[key]))),
      relationRuleId:"personality-candidates-v1:"+rule.id,limits:[...rule.limits],
      narrativeKey:rule.narrativeKey,confidence:rule.confidence
    });
  }
  const sections=PERSONALITY_SECTIONS.map(section=>({
    ...section,candidates:selected.filter(row=>row.sectionId===section.id).slice(0,2)
  }));
  return {
    version:"personality-candidates-v1",
    status:selected.length?"completed":"insufficient_evidence",
    sections,
    diagnostics:{
      emptySectionIds:sections.filter(row=>!row.candidates.length).map(row=>row.id),
      skippedRuleIds:facts?skippedRuleIds:RULES.map(rule=>rule.id),
      warnings:[
        "이 항목은 성격의 측정값이 아니라 명리 요소에서 도출한 검토용 해석 가설입니다.",
        "후보가 없는 소제목은 억지로 채우지 않습니다.",
        "같은 원자료에서 나온 강약 점수와 월령을 독립된 심리 근거로 세지 않습니다."
      ]
    }
  };
}
