import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import { TEN_GODS_V1 } from "@/rules/ten-gods.v1";
import { USEFUL_GOD_SYNTHESIS_V1 } from "@/rules/useful-god-synthesis.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";
import { calculateNativeStrength } from "@/lib/saju/fiveElements/native-strength";
import { assessRootDamage, calculateAdjustedStrength } from "@/lib/saju/fiveElements/relation-effects";
import { getHiddenStems } from "@/lib/saju/interpretation/hidden-stems";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { evaluateTransformation } from "@/lib/saju/interpretation/transformation";
import { calculateStrength } from "@/lib/saju/interpretation/strength";
import { evaluateAdjustedDayMasterStrength } from "@/lib/saju/interpretation/adjusted-daymaster-strength";
import { evaluateStructure } from "@/lib/saju/interpretation/structure";
import { evaluateEokbuUsefulGod } from "@/lib/saju/interpretation/eokbu-useful-god";
import { evaluateJohuUsefulGod } from "@/lib/saju/interpretation/johu-useful-god";
import { evaluateTonggwanUsefulGod } from "@/lib/saju/interpretation/tonggwan-useful-god";
import { evaluateByeongyakUsefulGod } from "@/lib/saju/interpretation/byeongyak-useful-god";
import { evaluateStructureUsefulGod } from "@/lib/saju/interpretation/structure-useful-god";
import { synthesisRole, synthesizeUsefulGods } from "@/lib/saju/interpretation/useful-god-synthesis";
import { evaluateStemPreferences, STEM_PREFERENCE_SHARED_CONFIG } from "@/lib/saju/interpretation/stem-preferences";
import type { Branch, PillarPosition, Stem } from "@/types/saju-analysis";

function pureRegression(ss: Stem[] = ["乙","乙","甲","戊"], bs: Branch[] = ["亥","酉","子","辰"]){
 const ps:PillarPosition[]=["year","month","day","hour"];
 const pillars=Object.fromEntries(ps.map((p,i)=>[p,{position:p,stem:ss[i],branch:bs[i],hanja:null,korean:null}])) as any;
 const hidden=Object.fromEntries(ps.map(p=>[p,getHiddenStems(pillars[p].branch,pillars.day.stem)])) as any;
 const native=calculateNativeStrength(pillars,hidden), relations=detectRelations(pillars);
 relations.transformation=evaluateTransformation(relations,pillars,hidden,native.nativeStrength);
 const strength=calculateStrength(pillars,hidden,native.evidence), adjusted=calculateAdjustedStrength(native,relations,strength);
 const root=assessRootDamage(strength,relations);strength.adjustments={...strength.adjustments,status:"partial",originalRootingScore:strength.rooting!.score,...root};
 strength.adjusted=evaluateAdjustedDayMasterStrength(strength,native.nativeStrength,adjusted);
 const structure=evaluateStructure(pillars,hidden,strength,adjusted,relations);
 const useful=evaluateEokbuUsefulGod(strength,adjusted,structure.specialStructure);
 useful.johu=evaluateJohuUsefulGod(pillars,hidden,adjusted,relations);
 useful.tonggwan=evaluateTonggwanUsefulGod(adjusted,native.nativeStrength,relations,structure.specialStructure);
 useful.byeongyak=evaluateByeongyakUsefulGod("甲",adjusted,strength,structure,relations,useful.tonggwan);
 useful.structure=evaluateStructureUsefulGod("甲",adjusted,structure); useful.synthesis=synthesizeUsefulGods(useful); useful.status="implemented";
 const out=evaluateStemPreferences(pillars,hidden,relations,useful);
 return { pillars, hidden, relations, strength, structure, useful, out };
}


const integrated = () => calculateSaju(SYNTHETIC_INPUT);
const stem = (result: ReturnType<typeof pureRegression>["out"], value: Stem) => result.stems.find(row => row.stem === value)!;

describe("SYNTHETIC_STEM_PREFERENCES_V1", () => {
  it("A-C, AH: creates exactly ten stems with source metadata and deterministic ordering", () => {
    const first = integrated().stemPreferences;
    expect(first.status).toBe("implemented");
    if (first.status !== "implemented" || !("stems" in first)) throw new Error("stem preferences unavailable");
    expect(first.stems).toHaveLength(10);
    expect(new Set(first.stems.map(row => row.stem))).toEqual(new Set(HEAVENLY_STEMS));
    for (const row of first.stems) expect(row).toMatchObject({
      element: TEN_GODS_V1.stemTraits[row.stem].element, yinYang: TEN_GODS_V1.stemTraits[row.stem].polarity });
    const second = integrated().stemPreferences;
    expect(second).toEqual(first);
    const tied = pureRegression().out.stems.filter(row => row.score === 65).map(row => row.stem);
    expect(tied).toEqual(["甲", "乙"]);
  });

  it("D-J: inherits element engines equally but uses only johu stem signals", () => {
    const { out } = pureRegression(), ding = stem(out, "丁"), bing = stem(out, "丙"), xin = stem(out, "辛");
    const inherited = (value: Stem) => stem(out, value).engineSignals.filter(row => row.engine !== "johu")
      .map(({ engine, rawScore, normalizedScore }) => ({ engine, rawScore, normalizedScore }));
    expect(inherited("壬")).toEqual(inherited("癸"));
    expect(inherited("丁")).toEqual(inherited("丙"));
    expect(inherited("戊")).toEqual(inherited("己"));
    expect(inherited("庚")).toEqual(inherited("辛"));
    expect(ding.engineSignals.find(row => row.engine === "johu")).toMatchObject({ rawScore: 30, normalizedScore: 80 });
    expect(bing.engineSignals.find(row => row.engine === "johu")).toMatchObject({ rawScore: 20, normalizedScore: 70 });
    expect(xin.engineSignals.some(row => row.engine === "johu")).toBe(false);
    expect(xin.engineSignals.some(row => row.rawScore === 10 && row.engine === "johu")).toBe(false);
  });

  it("reads johu stemPreferences after the condition priority override", () => {
    const value = pureRegression(["乙","戊","甲","壬"], ["亥","酉","卯","未"]);
    expect(value.useful.johu.activeConditions).toEqual([
      { id: "JIA_YOU_WOOD_GROUP_VISIBLE_COMPANION", effect: "PRIORITY_OVERRIDE" }
    ]);
    expect(value.useful.johu.stemPreferences.map(row => row.stem)).toEqual(["庚", "丁"]);
    expect(stem(value.out, "庚").engineSignals.find(row => row.engine === "johu"))
      .toMatchObject({ rawScore: 30, normalizedScore: 80 });
    expect(stem(value.out, "丁").engineSignals.find(row => row.engine === "johu"))
      .toMatchObject({ rawScore: 20, normalizedScore: 70 });
    expect(stem(value.out, "丙").engineSignals.some(row => row.engine === "johu")).toBe(false);
  });

  it("K-P, AI: fixes all pure-pillar stem regression values without forcing direction", () => {
    const out = pureRegression().out;
    expect(out.stems.map(({ stem, score, role }) => [stem, score, role])).toEqual([
      ["壬",69.91758241758242,"FAVORABLE"],["癸",69.91758241758242,"FAVORABLE"],
      ["甲",65,"FAVORABLE"],["乙",65,"FAVORABLE"],["丁",61.08516483516484,"FAVORABLE"],
      ["丙",56.689560439560445,"CONDITIONAL"],["戊",52.95454545454545,"CONDITIONAL"],
      ["己",52.95454545454545,"CONDITIONAL"],["庚",52.22471910112359,"CONDITIONAL"],
      ["辛",50.18181818181818,"CONDITIONAL"]]);
    expect(stem(out,"丁").score).toBeGreaterThan(stem(out,"丙").score);
    expect(stem(out,"庚").engineSignals.find(row=>row.engine==="johu"))
      .toMatchObject({ rawScore:10, normalizedScore:60 });
    expect(stem(out,"辛").engineSignals.some(row=>row.engine==="johu")).toBe(false);
    expect(out).toMatchObject({ primaryStems:[], secondaryStems:[],
      favorableStems:["壬","癸","甲","乙","丁"],
      conditionalStems:["丙","戊","己","庚","辛"], neutralStems:[], unfavorableStems:[] });
  });

  it("Q-U: records visible, hidden, absent and day-self availability without changing scores", () => {
    const { out } = pureRegression();
    expect(stem(out,"乙").availability).toMatchObject({ state:"VISIBLE", visiblePositions:["year","month"], dayStemSelf:false });
    expect(stem(out,"壬").availability).toMatchObject({ state:"HIDDEN", hiddenOccurrences:[
      { pillar:"year", branch:"亥", hiddenStem:"壬", qiRole:"mainQi" }] });
    expect(stem(out,"丁").availability).toMatchObject({ state:"ABSENT", visiblePositions:[], hiddenOccurrences:[] });
    expect(stem(out,"甲").availability.dayStemSelf).toBe(true);
    expect(stem(out,"甲").availability.visiblePositions).not.toContain("day");
    expect(stem(out,"戊").score).toBe(stem(out,"己").score);
  });

  it("V: preserves transformation as context only", () => {
    const value=pureRegression(), before=value.out;
    value.relations.heavenlyStems.combinations.push({ id:"STEM_COMBINATION:year-hour", type:"STEM_COMBINATION",
      members:["乙","庚"], positions:["year","hour"], ruleVersion:"stem-relations-v1", rule:"synthetic", exists:true, transformed:null, targetElement:"metal" });
    value.relations.transformation.evaluations.push({ relationId:"STEM_COMBINATION:year-hour", relationType:"STEM_COMBINATION",
      targetElement:"metal", score:50, state:"PARTIAL", factors:[], competingRelations:[], blockingRelations:[], adjacent:false, complete:null, evidence:[] });
    const after=evaluateStemPreferences(value.pillars,value.hidden,value.relations,value.useful);
    expect(stem(after,"乙").relationContext).toContainEqual({ relationId:"STEM_COMBINATION:year-hour", relationType:"STEM_COMBINATION", state:"PARTIAL" });
    expect(stem(after,"乙").score).toBe(stem(before,"乙").score);
  });

  it("W-Z: reuses consensus, conflict, role and coverage rules from Milestone 11", () => {
    expect(STEM_PREFERENCE_SHARED_CONFIG).toBe(USEFUL_GOD_SYNTHESIS_V1);
    expect(synthesisRole(34.999)).toBe("UNFAVORABLE"); expect(synthesisRole(35)).toBe("NEUTRAL");
    expect(synthesisRole(45)).toBe("CONDITIONAL"); expect(synthesisRole(60)).toBe("FAVORABLE");
    expect(synthesisRole(70)).toBe("SECONDARY"); expect(synthesisRole(80)).toBe("PRIMARY");
    const value=pureRegression(), parent=value.useful.synthesis.status === "implemented"
      ? value.useful.synthesis.elements.find(row=>row.element==="wood")! : null;
    if (!parent) throw new Error("parent missing");
    const make=(scores:number[], weights:number[])=>{ parent.engineSignals=scores.map((normalizedScore,i)=>({
      engine: (["eokbu","structure","tonggwan"] as const)[i], rawScore:0, normalizedScore,
      baseWeight:weights[i], effectiveWeight:weights[i] })); return evaluateStemPreferences(value.pillars,value.hidden,value.relations,value.useful); };
    let out=make([70,70],[0.2,0.2]); expect(stem(out,"甲")).toMatchObject({ consensusBonus:3, confidence:"MEDIUM" });
    out=make([70,70,70],[0.2,0.2,0.2]); expect(stem(out,"甲")).toMatchObject({ consensusBonus:5, confidence:"HIGH" });
    out=make([75,35],[0.2,0.2]); expect(stem(out,"甲")).toMatchObject({ conflictPenalty:-3, conflictingSignals:true });
    out=make([60],[0.2]); expect(stem(out,"甲").confidence).toBe("LOW");
  });

  it("AA-AJ: preserves parent and every upstream result, reconstructs evidence, and integrates", () => {
    const value=pureRegression(), before={ useful:structuredClone(value.useful), strength:structuredClone(value.strength), structure:structuredClone(value.structure) };
    const out=evaluateStemPreferences(value.pillars,value.hidden,value.relations,value.useful);
    expect(value.useful).toEqual(before.useful); expect(value.strength).toEqual(before.strength); expect(value.structure).toEqual(before.structure);
    for(const row of out.stems){
      const parent=value.useful.synthesis.status === "implemented" ? value.useful.synthesis.elements.find(e=>e.element===row.element)! : null;
      expect(row).toMatchObject({ parentElementScore:parent!.score, parentElementRole:parent!.role });
      const weight=row.engineSignals.reduce((sum,x)=>sum+x.effectiveWeight,0);
      const base=weight ? row.engineSignals.reduce((sum,x)=>sum+x.normalizedScore*x.effectiveWeight,0)/weight : 50;
      expect(row.baseStemScore).toBeCloseTo(base); expect(row.score).toBeCloseTo(Math.max(0,Math.min(100,base+row.consensusBonus+row.conflictPenalty)));
    }
    expect(integrated().stemPreferences.status).toBe("implemented");
  });
});
