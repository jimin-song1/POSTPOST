import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { getTenGod } from "@/lib/saju/interpretation/ten-gods";
import { buildPersonalityCandidatePlan,PERSONALITY_SECTIONS } from "@/lib/saju/ai-interpretation/personality-candidates.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";

/** Synthetic rule fixture, NOT a claim that this was calculated from these natal pillars. */
function syntheticPattern() {
  const analysis=structuredClone(calculateSaju(SYNTHETIC_INPUT));
  const gods=analysis.tenGods.value;
  if (!gods) throw new Error("Synthetic engine must include ten gods");
  analysis.dayMaster="甲"; gods.dayMaster="甲";
  analysis.pillars.year.stem="乙";
  analysis.pillars.month.stem="乙";
  analysis.pillars.month.branch="酉";
  analysis.pillars.day.stem="甲";
  analysis.pillars.day.branch="子";
  analysis.pillars.hour.stem="戊";
  gods.heavenlyStems.year=getTenGod("甲","乙");
  gods.heavenlyStems.month=getTenGod("甲","乙");
  gods.heavenlyStems.day=getTenGod("甲","甲");
  gods.heavenlyStems.hour=getTenGod("甲","戊");
  gods.hiddenStems.month=[{role:"mainQi",stem:"辛",tenGod:getTenGod("甲","辛")}];
  gods.hiddenStems.day=[{role:"mainQi",stem:"癸",tenGod:getTenGod("甲","癸")}];
  analysis.strength.adjusted.status="implemented";
  analysis.strength.adjusted.level="중화신약";
  return analysis;
}

describe("V5.6 personality candidate layer",()=>{
  it("preserves the ten finalized V5.6 personality titles in order",()=>{
    expect(PERSONALITY_SECTIONS.map(x=>x.title)).toEqual([
      "내가 타고난 성격","첫인상과 친해진 뒤의 모습","혼자 있을 때의 나",
      "속마음을 꺼낼 때","중요한 선택을 앞두고","한번 마음을 정하고 나면",
      "양보하는 것과 끝까지 지키는 것","일이 뜻대로 풀리지 않을 때",
      "내 성격의 가장 큰 장점","나를 힘들게 하는 성격"
    ]);
  });

  it("selects distinct, traceable candidates for a controlled multi-signal pattern",()=>{
    const plan=buildPersonalityCandidatePlan(syntheticPattern());
    expect(plan.status).toBe("completed");
    expect(plan.diagnostics.emptySectionIds).toEqual([]);
    expect(plan.sections).toHaveLength(10);
    const candidates=plan.sections.flatMap(s=>s.candidates);
    expect(candidates.length).toBeGreaterThanOrEqual(10);
    expect(new Set(candidates.map(c=>c.id)).size).toBe(candidates.length);
    expect(new Set(candidates.map(c=>c.narrativeKey)).size).toBe(candidates.length);
    const valid=new Set(["NATAL:PILLARS","NATAL:TEN_GODS","NATAL:STRUCTURE:PRIMARY","NATAL:STRENGTH:ADJUSTED"]);
    for (const candidate of candidates) {
      expect(candidate.evidenceIds.every(id=>valid.has(id))).toBe(true);
      expect(candidate.sourceIds.length).toBeGreaterThanOrEqual(2);
      expect(candidate.relationRuleId).toContain(candidate.id);
      expect(candidate.limits.length).toBeGreaterThan(0);
    }
  });

  it("does not recycle the same conclusion when the ten-god evidence changes",()=>{
    const original=syntheticPattern(),changed=structuredClone(original);
    const gods=changed.tenGods.value!;
    gods.heavenlyStems.year=getTenGod("甲","丙");
    gods.heavenlyStems.month=getTenGod("甲","丁");
    const a=buildPersonalityCandidatePlan(original);
    const b=buildPersonalityCandidatePlan(changed);
    expect(a.sections[0].candidates.some(c=>c.id==="V56-P01-A")).toBe(true);
    expect(b.sections[0].candidates.some(c=>c.id==="V56-P01-A")).toBe(false);
    expect(b.diagnostics.emptySectionIds.length).toBeGreaterThan(0);
  });

  it("never fills missing facts with generic invented personality",()=>{
    const incomplete=syntheticPattern();
    incomplete.tenGods={status:"not_implemented",value:null,evidence:[]};
    const plan=buildPersonalityCandidatePlan(incomplete);
    expect(plan.status).toBe("insufficient_evidence");
    expect(plan.diagnostics.emptySectionIds).toHaveLength(10);
    expect(plan.sections.every(s=>s.candidates.length===0)).toBe(true);
  });

  it("ignores the person's identity and does not mutate deterministic calculations",()=>{
    const a=syntheticPattern(),b=structuredClone(a),before=structuredClone(a);
    b.person.name="테스트가명";
    b.birthInput.name="테스트가명";
    expect(buildPersonalityCandidatePlan(a)).toEqual(buildPersonalityCandidatePlan(b));
    expect(a).toEqual(before);
    const serialized=JSON.stringify(buildPersonalityCandidatePlan(a));
    expect(serialized).not.toContain(SYNTHETIC_INPUT.name);
    expect(serialized).not.toContain(SYNTHETIC_INPUT.birthDate);
  });

  it("does not turn a useful-god rank into a primary useful-god claim",()=>{
    const analysis=syntheticPattern();
    const synthesis=analysis.usefulGods.synthesis;
    if(synthesis.status!=="implemented")throw new Error("Missing synthesis fixture");
    const original=buildPersonalityCandidatePlan(analysis);
    synthesis.highestElement="water";
    synthesis.primaryElements=[];
    expect(buildPersonalityCandidatePlan(analysis)).toEqual(original);
    expect(JSON.stringify(original)).not.toContain("주용신");
  });
});
