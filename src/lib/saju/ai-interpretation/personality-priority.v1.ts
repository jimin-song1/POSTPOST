import type { PillarPosition, SajuAnalysis } from "@/types/saju-analysis";
import type { PersonalityCandidate } from "./personality-candidates.v1";

/**
 * V5.6 priority evidence: measured ENGINE states, used to decide which
 * traditional reading deserves editorial attention, not whether the person's
 * psychological profile is demonstrably true. This MUST NOT affect natal data.
 */
export type PrioritySignalCode =
  | "MONTH_COMMAND" | "MONTH_STEM" | "DAY_BRANCH_CONTEXT" | "SECTION_POSITION_FIT"
  | "STRUCTURE_ESTABLISHED" | "STRUCTURE_UNCERTAIN"
  | "DIRECT_RELATION" | "RELATION_TRANSFORMATION_UNCERTAIN"
  | "STRUCTURE_DAMAGED" | "STRENGTH_CONTEXT" | "USEFUL_GOD_CONTEXT";
export interface PrioritySignal {
  code: PrioritySignalCode;
  /** Internal editorial unit, NOT a factual score about an individual. */
  impact: number;
  evidenceIds: string[];
  note: string;
  status: "SUPPORT" | "CAUTION" | "CONTEXT";
}
export interface PersonalityPriorityResult {
  adjustment: number;
  signals: PrioritySignal[];
  counterConsiderations: string[];
}

type PositionRef = { position:PillarPosition; kind:"stem"|"branch"; character:string };
const SECTION_POSITIONS: Record<PersonalityCandidate["sectionId"], readonly PillarPosition[]> = {
  "P01-01":["month","day"],"P01-02":["month","day"],"P01-03":["day","hour"],
  "P01-04":["day","month"],"P01-05":["hour","day"],"P01-06":["day","hour"],
  "P01-07":["year","month"],"P01-08":["month","hour"],"P01-09":["month","day"],
  "P01-10":["month","day"],
};
function parseSource(id:string):PositionRef|null {
  const m=/^PILLAR:(year|month|day|hour):(stem|branch):([甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥])$/.exec(id);
  return m?{position:m[1] as PillarPosition,kind:m[2] as "stem"|"branch",character:m[3]}:null;
}
function matchNatal(a:SajuAnalysis,ref:PositionRef):boolean {
  return a.pillars[ref.position][ref.kind]===ref.character;
}
function relatedPositions(a:SajuAnalysis, left:PositionRef,right:PositionRef) {
  if(left.kind!==right.kind || left.position===right.position)return [];
  if(a.relations.status!=="implemented")return [];
  return a.relations.evidence.filter(e=>
    e.positions.includes(left.position) && e.positions.includes(right.position) &&
    e.characters.includes(left.character as never) && e.characters.includes(right.character as never) &&
    (left.kind==="stem" ? e.type.startsWith("STEM_") : !e.type.startsWith("STEM_")) &&
    e.complete!==false
  );
}

export function evaluatePersonalityPriority(a:SajuAnalysis,c:PersonalityCandidate):PersonalityPriorityResult {
  const sources=c.sourceIds.map(parseSource).filter((row):row is PositionRef=>row!==null && matchNatal(a,row));
  const signals:PrioritySignal[]=[];
  const counterConsiderations:string[]=[];
  const add=(code:PrioritySignalCode,impact:number,note:string,evidenceIds:string[],status:PrioritySignal["status"])=>
    signals.push({code,impact,note,evidenceIds,status});
  const monthBranch=sources.some(x=>x.position==="month" && x.kind==="branch");
  const monthStem=sources.some(x=>x.position==="month" && x.kind==="stem");
  const dayBranch=sources.some(x=>x.position==="day" && x.kind==="branch");
  // Month's main-qi is directly relevant to traditional structure, not a
  // certified measurement of which everyday psychological trait is dominant.
  if(monthBranch) add("MONTH_COMMAND",2,"월지 본기: 전통적 명리 해석에서 월령을 우선 고려",["NATAL:PILLARS","NATAL:TEN_GODS"],"SUPPORT");
  else if(monthStem) add("MONTH_STEM",1,"월간에 직접 드러난 십성 신호",["NATAL:PILLARS","NATAL:TEN_GODS"],"SUPPORT");
  if(dayBranch) add("DAY_BRANCH_CONTEXT",1,"일지 본기: 개인 영역 해석에서 참고하는 위치",["NATAL:PILLARS","NATAL:TEN_GODS"],"SUPPORT");
  const present=new Set(sources.map(x=>x.position));
  const domain=SECTION_POSITIONS[c.sectionId];
  if(domain.every(x=>present.has(x)))add("SECTION_POSITION_FIT",1,"현재 소제목의 질문과 관련된 두 위치를 모두 비교",["NATAL:PILLARS"],"SUPPORT");

  if(monthBranch && a.structure.status==="implemented") {
    const primary=a.structure.primary;
    const monthMain=a.tenGods.value?.hiddenStems.month.find(h=>h.role==="mainQi")?.tenGod.korean;
    // Only when the classified structure actually comes from the same month
    // main-qi. Exposed secondary structures must not borrow this bonus.
    const sameStructure=!!primary && primary.source.tenGod===monthMain &&
      primary.source.branch===a.pillars.month.branch;
    if(sameStructure && primary?.status==="ESTABLISHED" && primary.confidence!=="LOW") {
      add("STRUCTURE_ESTABLISHED",1,"월지 본기와 격국 원천이 일치하며 격이 성립",["NATAL:STRUCTURE:PRIMARY"],"SUPPORT");
    } else if(!sameStructure || !primary || primary.status!=="ESTABLISHED") {
      add("STRUCTURE_UNCERTAIN",-1,"격국 성립이 불확실하거나 월지 본기와 불일치하여 단정적 풀이 억제",primary?["NATAL:STRUCTURE:PRIMARY"]:["NATAL:PILLARS","NATAL:TEN_GODS"],"CAUTION");
      counterConsiderations.push("격국이 미성립/혼재일 수 있으므로 월지 신호 하나로 성격을 확정하지 않습니다.");
    }
    const quality=a.structure.qualityEvaluation;
    if(quality.evaluationScope!=="UNAVAILABLE" && ["DAMAGED","MIXED","UNRESOLVED"].includes(quality.integrity)) {
      add("STRUCTURE_DAMAGED",-1,"격국 손상·혼재가 존재해 단일 작용에 대한 해석을 낮춤",["NATAL:STRUCTURE:QUALITY"],"CAUTION");
      counterConsiderations.push("격국의 손상·혼재가 있어 긍정적 방향만 해석하지 않습니다.");
    }
  }

  // This is a direct branch/stem relationship verified by the engine; neither
  // "there was a quarrel" nor "the person is sociable" follows from it.
  const relationships=new Map<string,ReturnType<typeof relatedPositions>[number]>();
  for(let i=0;i<sources.length;i++)for(let j=i+1;j<sources.length;j++) {
    for(const relation of relatedPositions(a,sources[i],sources[j])) relationships.set(relation.relationId,relation);
  }
  if(relationships.size) {
    add("DIRECT_RELATION",1,"후보가 참조한 두 글자 사이의 실제 합충형파해 관계 존재",["NATAL:RELATIONS"],"SUPPORT");
    for(const relation of Array.from(relationships.values())){
      const state=a.relations.transformation.evaluations.find(t=>t.relationId===relation.relationId)?.state;
      if(state && state!=="TRANSFORMED") {
        add("RELATION_TRANSFORMATION_UNCERTAIN",0,"합충 관계의 성립과 오행 전환은 별개: "+state,["NATAL:RELATIONS"],"CAUTION");
        counterConsiderations.push("관계가 존재해도 합화나 성격·사건의 실제 변화를 확정하지 않습니다.");
      }
    }
  }
  if(a.strength.adjusted.status==="implemented" && a.strength.adjusted.level){
    add("STRENGTH_CONTEXT",0,"일간 강약은 사용 조건 참고값일 뿐 의지·성격의 강약이 아님: "+a.strength.adjusted.level,["NATAL:STRENGTH:ADJUSTED"],"CONTEXT");
  }
  // The useful-god synthesis is important for a lifetime reading, but scoring
  // personality by 'favorable' elements would be a category error.
  const ug=a.usefulGods.synthesis;
  if(ug.status==="implemented" && (ug.conflicts.length>0 || ug.primaryElements.length===0)) {
    add("USEFUL_GOD_CONTEXT",0,"용신 관점 충돌/주용신 미확정은 성격 확신도 근거로 사용하지 않음",["USEFUL_GOD:SYNTHESIS"],"CONTEXT");
    counterConsiderations.push("용신 선호나 종합 오행 점수를 개인의 심리 특성 점수로 환산하지 않습니다.");
  }
  const adjustment=signals.reduce((total,s)=>total+s.impact,0);
  return {adjustment,signals,counterConsiderations:Array.from(new Set(counterConsiderations))};
}
