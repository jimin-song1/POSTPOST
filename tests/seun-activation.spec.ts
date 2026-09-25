import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluateSeunActivation } from "@/lib/saju/fortune/seun-activation";
import { generateSeun,type SeunSourceResult } from "@/lib/saju/fortune/seun-generation";
import { capActivationScore,evaluateDaeunActivation } from "@/lib/saju/fortune/daeun-activation";
import { evaluateNobleSpecialStars } from "@/lib/saju/interpretation/noble-special-stars";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateYearPillar } from "@/lib/saju/pillars/year";
import { solarTermProvider as jplDe440SolarTermProvider } from "@/lib/saju/solarTerms";
import type { Branch,LuckPeriod,PillarPosition,Stem } from "@/types/saju-analysis";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { FortuneResult } from "@/types/fortune";
import type { NobleSpecialStarsResult } from "@/types/noble-special-stars";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const base=calculateSaju(SYNTHETIC_INPUT),positions:PillarPosition[]=["year","month","day","hour"];
if(base.stemPreferences.status!=="implemented"||!("stems" in base.stemPreferences)||base.branchPreferences.status!=="implemented"||
  !("branches" in base.branchPreferences)||base.nobleAndSpecialStars.status!=="implemented"||!("nobleStars" in base.nobleAndSpecialStars)||
  base.fortune.status!=="partial"||!("daeun" in base.fortune))throw new Error("14B fixtures unavailable");
const stemPreferences=base.stemPreferences as StemPreferencesResult,branchPreferences=base.branchPreferences as BranchPreferencesResult;
const defaultDaeunResult=(base.fortune as FortuneResult).daeun;
const pillars=(stems:Stem[]=["乙","乙","甲","戊"],branches:Branch[]=["亥","酉","辰","申"])=>Object.fromEntries(
  positions.map((position,index)=>[position,{position,stem:stems[index],branch:branches[index],hanja:null,korean:null}])) as typeof base.pillars;
const source=(year:number,pillar:string,daeunPillar="戊辰",daeunIndex=1):SeunSourceResult=>({status:"implemented",ruleVersion:"seun-generation-v1",
  periods:[{year,period:{startInstant:`${year}-02-04T00:00:00.000Z`,endInstant:`${year+1}-02-04T00:00:00.000Z`},
    pillar:{stem:pillar[0] as Stem,branch:pillar[1] as Branch},activeDaeunIndex:daeunIndex,activeDaeunPillar:daeunPillar,
    daeunSegments:[{daeunIndex,daeunPillar,startInstant:`${year}-02-04T00:00:00.000Z`,endInstant:`${year+1}-02-04T00:00:00.000Z`}]}],evidence:[]});
const analyze=(year:number,seunPillar:string,daeunPillar="戊辰",natal=pillars())=>{
  const stars=evaluateNobleSpecialStars(natal,detectRelations(natal)) as NobleSpecialStarsResult;
  const daeun:LuckPeriod[]=[{ageRange:"",pillar:daeunPillar,startAgeYears:0,endAgeYears:10,
    startInstant:`${year}-01-01T00:00:00.000Z`,endInstant:`${year+2}-01-01T00:00:00.000Z`}];
  return evaluateSeunActivation(source(year,seunPillar,daeunPillar),daeun,natal,stemPreferences,branchPreferences,stars,defaultDaeunResult).periods![0];
};

describe("SYNTHETIC_SEUN_ACTIVATION_V1",()=>{
  it("A-D: uses exact Ipchun boundaries and the existing year-pillar calculator, never January 1",()=>{
    const ipchun=jplDe440SolarTermProvider.getSolarTerm(2027,"입춘").instant;
    const before=new Date(ipchun.getTime()-1),after=new Date(ipchun.getTime()+1),jan1=new Date("2027-01-01T00:00:00Z");
    expect(calculateYearPillar(before,2027,jplDe440SolarTermProvider)).toEqual(calculateYearPillar(jan1,2027,jplDe440SolarTermProvider));
    expect(calculateYearPillar(after,2027,jplDe440SolarTermProvider)).not.toEqual(calculateYearPillar(before,2027,jplDe440SolarTermProvider));
    const daeun:LuckPeriod[]=[{ageRange:"",pillar:"戊辰",startAgeYears:0,endAgeYears:10,
      startInstant:"2026-06-01T00:00:00.000Z",endInstant:"2028-06-01T00:00:00.000Z"}];
    const generated=generateSeun(daeun,jplDe440SolarTermProvider),period=generated.periods.find(row=>row.year===2027)!;
    expect(period.period).toEqual({startInstant:jplDe440SolarTermProvider.getSolarTerm(2027,"입춘").instantIso,
      endInstant:jplDe440SolarTermProvider.getSolarTerm(2028,"입춘").instantIso});
    const expected=calculateYearPillar(new Date(period.period.startInstant),2027,jplDe440SolarTermProvider);
    expect(period.pillar).toEqual({stem:expected.stem,branch:expected.branch});
  });

  it("E-F: links active daeun by exact intervals and splits a seun crossing a daeun boundary",()=>{
    const boundary="2027-07-01T12:00:00.000Z",daeun:LuckPeriod[]=[
      {ageRange:"",pillar:"戊辰",startAgeYears:0,endAgeYears:10,startInstant:"2026-01-01T00:00:00.000Z",endInstant:boundary},
      {ageRange:"",pillar:"己巳",startAgeYears:10,endAgeYears:20,startInstant:boundary,endInstant:"2029-01-01T00:00:00.000Z"}];
    const period=generateSeun(daeun,jplDe440SolarTermProvider).periods.find(row=>row.year===2027)!;
    expect(period.activeDaeunIndex).toBeNull();expect(period.activeDaeunPillar).toBeNull();
    expect(period.daeunSegments).toEqual([
      {daeunIndex:1,daeunPillar:"戊辰",startInstant:period.period.startInstant,endInstant:boundary},
      {daeunIndex:2,daeunPillar:"己巳",startInstant:boundary,endInstant:period.period.endInstant}]);
  });

  it("G-K: reuses stem/branch preferences, 45/55 weighting, ten gods, and hidden-stem weights",()=>{
    const row=analyze(2028,"丙戌"),stem=stemPreferences.stems.find(item=>item.stem==="丙")!,
      branch=branchPreferences.branches.find(item=>item.branch==="戌")!;
    expect(row.preference).toMatchObject({stemScore:stem.score,branchScore:branch.score,
      baseFavorabilityScore:stem.score*.45+branch.score*.55});
    expect(row.tenGodProfile.stemTenGod).toBe("식신");
    expect(row.tenGodProfile.branchHiddenTenGods.map(item=>item.weight)).toEqual([.7,.2,.1]);
  });

  it("L-P: detects natal↔seun stem and branch relations with layer metadata",()=>{
    const natal=pillars(undefined,["子","酉","辰","申"]),combo=analyze(2028,"己午","戊辰",natal),clash=analyze(2028,"庚午","戊辰",natal);
    expect(combo.interactions.natal).toEqual(expect.arrayContaining([
      expect.objectContaining({layerPair:"NATAL_SEUN",relationType:"STEM_COMBINATION",natalPosition:"day",transformationCandidate:true}),
      expect.objectContaining({layerPair:"NATAL_SEUN",relationType:"BRANCH_CLASH"})]));
    expect(clash.interactions.natal).toContainEqual(expect.objectContaining({relationType:"STEM_CLASH",natalPosition:"day"}));
    const relations=analyze(2028,"丙巳","戊辰",pillars(undefined,["寅","酉","辰","申"])).interactions.natal.map(row=>row.relationType);
    expect(relations).toContain("BRANCH_HARM");
  });

  it("Q-R: detects daeun↔seun relations separately",()=>{
    const row=analyze(2028,"庚午","乙子");
    expect(row.interactions.daeun).toEqual(expect.arrayContaining([
      expect.objectContaining({layerPair:"DAEUN_SEUN",relationType:"STEM_COMBINATION",daeunIndex:1}),
      expect.objectContaining({layerPair:"DAEUN_SEUN",relationType:"BRANCH_CLASH",daeunIndex:1})]));
  });

  it("S-W: completes cross-layer three-harmony/directional groups without rescoring 14A context",()=>{
    const harmony=analyze(2028,"丙子","戊辰",pillars(undefined,["申","酉","午","亥"]));
    expect(harmony.interactions.crossLayer).toContainEqual(expect.objectContaining({layerPair:"CROSS_LAYER",
      relationType:"THREE_HARMONY",state:"CROSS_LAYER_COMPLETE",members:["申","子","辰"]}));
    const directional=analyze(2028,"丙丑","戊亥",pillars(undefined,["子","酉","午","申"]));
    expect(directional.interactions.crossLayer).toContainEqual(expect.objectContaining({relationType:"DIRECTIONAL_COMBINATION",
      state:"CROSS_LAYER_COMPLETE",members:["亥","子","丑"]}));
    expect(analyze(2028,"丙子","戊午",pillars(undefined,["申","酉","午","亥"])).interactions.natal)
      .toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"ACTIVATED_PARTIAL"}));
    expect(analyze(2028,"丙子","戊午",pillars(undefined,["申","酉","子","亥"])).interactions.natal)
      .toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"REPEATED_EXISTING_CONTEXT"}));
    expect([...harmony.interactions.natal,...harmony.interactions.daeun,...harmony.interactions.crossLayer]
      .some(item=>item.id.startsWith("DAEUN-"))).toBe(false);
  });

  it("X-AA: keeps stable IDs unique, reconstructs/caps activation, and separates favorability",()=>{
    const row=analyze(2028,"己午","乙子"),all=[...row.interactions.natal,...row.interactions.daeun,...row.interactions.crossLayer];
    expect(new Set(all.map(item=>item.id)).size).toBe(all.length);
    expect(row.activation.natalRawScore).toBe(row.interactions.natal.reduce((sum,item)=>sum+item.activationPoints,0));
    expect(row.activation.crossLayerRawScore).toBe([...row.interactions.daeun,...row.interactions.crossLayer]
      .reduce((sum,item)=>sum+item.activationPoints,0));
    expect(row.activation.rawScore).toBe(row.activation.natalRawScore+row.activation.crossLayerRawScore);
    expect(row.activation.score).toBe(Math.min(100,row.activation.rawScore));
    expect(capActivationScore(120)).toBe(100);
    expect(row.preference).not.toHaveProperty("activationScore");
  });

  it("AB-AF: activates scoreless stars, all samjae stages, and natal void",()=>{
    const natal=pillars(undefined,["亥","酉","辰","申"]);
    for(const [pillar,stage] of [["丙巳","들삼재"],["丁午","눌삼재"],["戊未","날삼재"]] as const){
      const row=analyze(2028,pillar,"戊辰",natal),before=row.activation.rawScore;
      expect(row.samjaeActivation).toMatchObject({type:"SAMJAE_ACTIVATED",stage,branch:pillar[1]});
      expect(row.activation.rawScore).toBe(before);
    }
    const voidRow=analyze(2028,"丙寅","戊辰",natal);
    expect(voidRow.starActivations).toContainEqual(expect.objectContaining({type:"VOID_ACTIVATED",target:"寅"}));
    expect(voidRow.starActivations.every(tag=>!("activationPoints" in tag))).toBe(true);
  });

  it("AG-AP: is deterministic, leaves every upstream axis immutable, and integrates only seun",()=>{
    const first=calculateSaju(SYNTHETIC_INPUT),before={daeun:structuredClone(first.daeun),adjusted:structuredClone(first.fiveElements.adjustedStrength),
      useful:structuredClone(first.usefulGods),stems:structuredClone(first.stemPreferences),branches:structuredClone(first.branchPreferences),
      stars:structuredClone(first.nobleAndSpecialStars)},second=calculateSaju(SYNTHETIC_INPUT);
    expect(second.fortune).toEqual(first.fortune);expect(first.daeun).toEqual(before.daeun);
    expect(first.fiveElements.adjustedStrength).toEqual(before.adjusted);expect(first.usefulGods).toEqual(before.useful);
    expect(first.stemPreferences).toEqual(before.stems);expect(first.branchPreferences).toEqual(before.branches);
    expect(first.nobleAndSpecialStars).toEqual(before.stars);
    expect((first.fortune as FortuneResult).daeun).toEqual(evaluateDaeunActivation(first.daeun,first.pillars,first.relations,
      first.stemPreferences as StemPreferencesResult,first.branchPreferences as BranchPreferencesResult,
      first.nobleAndSpecialStars as NobleSpecialStarsResult).daeun);
    const integrated=(first.fortune as FortuneResult).seun.periods!;
    expect(integrated).toHaveLength(67);
    expect(integrated[0]).toMatchObject({year:2033,pillar:{stem:"癸",branch:"丑"}});
    expect(integrated.at(-1)).toMatchObject({year:2099,pillar:{stem:"己",branch:"未"}});
    expect(first.fortune).toMatchObject({status:"partial",daeun:{status:"implemented"},seun:{status:"implemented"},
      wolun:{status:"implemented"},transformation:{status:"implemented"},synthesis:{status:"not_implemented"}});
  });
});
