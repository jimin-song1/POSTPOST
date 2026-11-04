import type { SajuAnalysis, PillarPosition } from "@/types/saju-analysis";
import type { TenGodName } from "@/lib/saju/interpretation/ten-gods";
import type { PersonalityCandidate, PersonalitySectionId } from "./personality-candidates.v1";

/**
 * Supplementary V5.6 candidate pool. Unlike the narrow legacy pattern rules,
 * every complete chart is inspected through several distinct natal positions.
 * Each result is a reviewable TRADITIONAL interpretation hypothesis: the
 * features are calculated facts, but no psychological behavior is established.
 */
type Signal = {
  id: string;
  position: PillarPosition;
  kind: "stem" | "branch";
  god: TenGodName;
  family: Family;
  sourceId: string;
  phrase: string;
};
type Family = "peer" | "output" | "wealth" | "officer" | "resource";
const FAMILIES: Record<TenGodName, Family> = {
  "비견":"peer", "겁재":"peer", "식신":"output", "상관":"output",
  "정재":"wealth", "편재":"wealth", "정관":"officer", "편관":"officer",
  "정인":"resource", "편인":"resource",
};
const FACETS: Record<TenGodName, string> = {
  "비견":"자기 몫과 주체성", "겁재":"또래와의 비교·주도권",
  "식신":"꾸준한 표현과 생산", "상관":"기존 방식에 대한 문제 제기",
  "정재":"일상적 자원 관리", "편재":"다양한 기회와 자원 배치",
  "정관":"분명한 절차와 공식적인 책임", "편관":"긴장 속의 책임과 대응",
  "정인":"익숙한 근거와 체계적 학습", "편인":"다르게 해석하고 탐색하는 학습",
};
/** Fixed section questions, not answers. Evidence changes the chosen contrast. */
const SECTIONS: Record<PersonalitySectionId, {
  focus:string; benefit:string; burden:string; discovery:string; scene:string;
  pairs: readonly [string,string][];
}> = {
  "P01-01": {
    focus:"평소 어떤 기준을 자신의 중심으로 삼는지",benefit:"서로 다른 두 기준을 조율하는 면",burden:"중요하게 여기는 기준이 부딪칠 때의 부담",discovery:"겉에서 반복되는 태도와 내부 우선순위가 같지 않을 수 있음",scene:"예상하지 못한 요구를 받았을 때 먼저 중요도를 구별해보는 경우",
    pairs:[["monthBranch","yearStem"],["monthStem","dayBranch"],["dayBranch","monthBranch"],["hourStem","yearBranch"]]},
  "P01-02": {
    focus:"남에게 보이는 역할과 친밀해졌을 때의 반응을 구별하는지",benefit:"처음 만나는 자리의 대응과 친밀함을 따로 조절하는 면",burden:"사회적 태도를 속마음으로 오해받는 조건",discovery:"사교성·친근함·신뢰는 서로 다른 축임",scene:"처음 만난 사람과 대화하는 모습과 개인적인 부탁을 받아들이는 모습이 다른 경우",
    pairs:[["monthStem","dayBranch"],["monthBranch","dayBranch"],["yearStem","dayBranch"],["yearBranch","hourStem"]]},
  "P01-03": {
    focus:"혼자 있을 때 무엇을 정리하고 어떤 활동에 힘을 쓰는지",benefit:"혼자 정리하는 과정이 다음 행동에 주는 도움",burden:"정리와 실행이 서로를 지연시키는 조건",discovery:"겉으로 조용한 시간에도 내부적으로 여러 요소를 다룰 수 있음",scene:"혼자 필요한 정보를 익힌 뒤 실제로 어떻게 써볼지 구상하는 경우",
    pairs:[["dayBranch","hourBranch"],["dayBranch","yearBranch"],["dayBranch","monthStem"],["hourStem","yearBranch"]]},
  "P01-04": {
    focus:"생각을 말로 꺼내는 계기와 표현의 방향",benefit:"말할 내용과 타이밍을 구별해 활용하는 면",burden:"생각이 전달되는 방식에서 생기는 간격",discovery:"속으로 생각하는 방향과 겉으로 표현하는 방식은 같을 필요가 없음",scene:"회의에서 떠오른 생각을 바로 공유할지 정리한 뒤 이야기할지 결정하는 경우",
    pairs:[["monthStem","dayBranch"],["hourStem","dayBranch"],["yearStem","dayBranch"],["hourBranch","monthStem"]]},
  "P01-05": {
    focus:"중요한 선택 앞에서 무엇을 먼저 따져보는지",benefit:"장점이 되는 판단 기준의 조합",burden:"두 가지 기준을 모두 만족시키려는 부담",discovery:"결정이 빠른지보다 무엇을 비교하는지에 차이가 있음",scene:"새로운 기회의 조건과 감수할 비용을 나눠 따져보는 경우",
    pairs:[["hourStem","monthBranch"],["hourBranch","dayBranch"],["monthStem","hourBranch"],["yearStem","hourBranch"]]},
  "P01-06": {
    focus:"이미 내린 판단을 유지하거나 바꾸는 기준",benefit:"처음 결정한 이유를 점검할 수 있다는 면",burden:"새 정보와 원래 기준이 충돌할 때의 부담",discovery:"결정을 수정하는 능력과 흔들리는 태도는 다름",scene:"새로운 근거가 생긴 뒤 원래 선택을 고칠지 유지할지 비교하는 경우",
    pairs:[["dayBranch","yearStem"],["dayBranch","hourStem"],["dayBranch","monthStem"],["hourBranch","monthBranch"]]},
  "P01-07": {
    focus:"함께할 때 양보할 부분과 지킬 부분을 구별하는 방식",benefit:"서로 다른 역할을 조율할 수 있는 면",burden:"역할과 몫이 불분명할 때 생기는 긴장",discovery:"양보와 자기 몫의 인정은 반드시 반대가 아님",scene:"협업에서 책임과 권한을 구별해 합의하는 경우",
    pairs:[["yearStem","monthBranch"],["monthStem","hourBranch"],["yearBranch","hourStem"],["monthBranch","hourStem"]]},
  "P01-08": {
    focus:"계획이 틀어질 때 무엇부터 정리하려 하는지",benefit:"상황에 맞는 두 종류의 대응을 함께 검토하는 면",burden:"평소 쓰던 방식이 통하지 않을 때의 마찰",discovery:"문제의 원인을 파악하는 것과 실제 해결은 별개임",scene:"예상과 다른 문제가 생겨 원인과 대응책을 따로 확인하는 경우",
    pairs:[["monthBranch","hourBranch"],["yearBranch","dayBranch"],["monthStem","hourStem"],["yearStem","hourBranch"]]},
  "P01-09": {
    focus:"다른 성질 두 가지가 서로 도울 때 생기는 강점",benefit:"각각의 장점을 필요한 순간에 연결하는 면",burden:"둘 중 하나만 계속 사용하면 생길 수 있는 비용",discovery:"한 가지 강점보다 다른 성질의 조합이 더 중요할 수 있음",scene:"상황을 파악하는 일과 실제로 결과를 만드는 일을 연결하는 경우",
    pairs:[["monthBranch","dayBranch"],["monthStem","dayBranch"],["yearStem","hourBranch"],["hourStem","yearBranch"]]},
  "P01-10": {
    focus:"익숙한 장점이 특정 상황에서는 왜 부담으로 바뀌는지",benefit:"평소 지키려는 기준의 긍정적 기능",burden:"그 기준을 모든 상황에 적용할 때의 과잉",discovery:"약점이 전혀 다른 성격이 아니라 강점의 사용 조건일 수 있음",scene:"평소 도움 되는 방식이 이번에는 통하지 않아 조정이 필요한 경우",
    pairs:[["dayBranch","monthBranch"],["yearBranch","hourStem"],["hourBranch","monthStem"],["dayBranch","yearStem"]]},
};

const RELEVANT: Record<PersonalitySectionId, readonly Family[]> = {
  "P01-01":["peer","officer","resource"],
  "P01-02":["officer","resource","peer"],
  "P01-03":["resource","output","peer"],
  "P01-04":["output","resource","officer"],
  "P01-05":["wealth","resource","officer"],
  "P01-06":["peer","resource","officer"],
  "P01-07":["peer","officer","wealth"],
  "P01-08":["officer","output","resource"],
  "P01-09":["resource","output","peer","officer","wealth"],
  "P01-10":["officer","peer","resource","wealth","output"],
};
function signalsFromAnalysis(a:SajuAnalysis):Map<string,Signal> {
  const gods=a.tenGods.status==="implemented" ? a.tenGods.value : null;
  const results=new Map<string,Signal>();
  if (!a.dayMaster || !gods || a.dayMaster!==gods.dayMaster) return results;
  for (const pos of ["year","month","day","hour"] as const) {
    const stem=a.pillars[pos].stem;
    if (stem && gods.heavenlyStems[pos]) {
      const god=gods.heavenlyStems[pos].korean;
      results.set(pos+"Stem",{
        id:pos+"Stem",position:pos,kind:"stem",god,family:FAMILIES[god],
        sourceId:"PILLAR:"+pos+":stem:"+stem,phrase:FACETS[god],
      });
    }
    const branch=a.pillars[pos].branch;
    const main=gods.hiddenStems[pos]?.find(g=>g.role==="mainQi");
    if (branch && main) {
      const god=main.tenGod.korean;
      results.set(pos+"Branch",{
        id:pos+"Branch",position:pos,kind:"branch",god,family:FAMILIES[god],
        sourceId:"PILLAR:"+pos+":branch:"+branch,phrase:FACETS[god],
      });
    }
  }
  return results;
}

/** Multiple grounded alternatives for each subsection; no profile/biography data. */
export function generateCrossPositionPersonalityCandidates(a:SajuAnalysis):PersonalityCandidate[] {
  const signals=signalsFromAnalysis(a);
  const result:PersonalityCandidate[]=[];
  // Use the section-specific, meaningful pairs first. If earlier chapters have
  // already used them, keep other distinct natal position pairs available for
  // comparison rather than making up a generic single-stem interpretation.
  const available=Array.from(signals.keys()).filter(key=>key!=="dayStem");
  const comparisons: Array<[string,string]> = [];
  for(let i=0;i<available.length;i++) for(let j=i+1;j<available.length;j++) {
    const left=signals.get(available[i])!,right=signals.get(available[j])!;
    if(left.position!==right.position) comparisons.push([available[i],available[j]]);
  }
  const pairId=(a:string,b:string)=>[a,b].sort().join("|");
  for (const [sectionId,section] of Object.entries(SECTIONS) as Array<[PersonalitySectionId,typeof SECTIONS[PersonalitySectionId]]>) {
    const pairs=[...section.pairs];
    const known=new Set(pairs.map(([a,b])=>pairId(a,b)));
    for(const [a,b] of comparisons) if(!known.has(pairId(a,b))) {
      known.add(pairId(a,b)); pairs.push([a,b]);
    }
    for (let index=0; index<pairs.length;index++) {
      const [leftKey,rightKey]=pairs[index];
      const left=signals.get(leftKey),right=signals.get(rightKey);
      if (!left || !right || left.position===right.position) continue;
      const same=left.family===right.family;
      const relation=same ? "같은 십성 계열이 서로 다른 위치에서 반복되는 점" : "서로 다른 두 십성 계열이 연결되는 점";
      const loc=(s:Signal)=>({year:"연",month:"월",day:"일",hour:"시"}[s.position])+(s.kind==="stem"?"간":"지");
      const contrast=loc(left)+" "+left.god+"의 '"+left.phrase+"'와 "+loc(right)+" "+right.god+"의 '"+right.phrase+"'";
      const relevant=RELEVANT[sectionId];
      const relevance=(relevant.includes(left.family)?1:0)+(relevant.includes(right.family)?1:0);
      // Prefer domain-relevant evidence, not lexicographically first combinations.
      const editorialPriority=relevance ? 1 : 0;
      const qualifier=same?"한 성질이 여러 역할에서 강조될 수 있는 조건":"상황에 따라 서로 다른 성질을 꺼내 써야 하는 조건";
      result.push({
        id:"V56-X-"+sectionId+"-"+(index+1),sectionId,
        kind:same?"UPSIDE":"CONTRAST",
        narrativeKey:sectionId+":"+leftKey+":"+left.god+":"+rightKey+":"+right.god,
        claim:contrast+"를 비교하며 "+section.focus+" 살펴본다. 핵심은 "+relation+"이다.",
        strength:contrast+"를 서로 다르게 활용하는 상황에서 "+section.benefit+"을 강점 후보로 살펴본다.",
        drawback:contrast+"를 한 방식으로만 적용하면 "+section.burden+"을 놓칠 수 있다.",
        unexpected:section.discovery+" 특히 "+qualifier+"으로 해석한다.",
        exampleScene:section.scene+". 가령 "+left.phrase+"를 고려하면서 "+right.phrase+"도 따져보는 장면을 가정한다. 실제 경험을 확인한 것은 아니다.",
        evidenceIds:["NATAL:PILLARS","NATAL:TEN_GODS"],
        sourceIds:[left.sourceId,right.sourceId],
        relationRuleId:"cross-position-personality-v1:V56-X-"+sectionId+"-"+(index+1),
        limits:["명리 상징에서 출발한 가설로 실제 행동을 진단하지 않는다.","원국의 두 위치가 심리적 사실의 독립 검증 증거라는 뜻은 아니다."],
        confidence:"LOW_CONFIDENCE_HYPOTHESIS",editorialPriority,
      });
    }
  }
  return result;
}
