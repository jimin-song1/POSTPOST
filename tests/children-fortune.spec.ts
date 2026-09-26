import {describe,expect,it} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import {childActivationLevel,childBondLevel,childCountBand,classifyGenderEnergy,classifyParenting} from "@/lib/saju/fortune/children-fortune";
import {CHILDREN_FORTUNE_V1 as RULE} from "@/rules/children-fortune.v1";
import type {ChildrenFortuneResult} from "@/types/children-fortune";
import {SYNTHETIC_INPUT} from "./synthetic-input";

const analysis=calculateSaju(SYNTHETIC_INPUT);
if(analysis.childrenFortune.status!=="implemented"||!("bond" in analysis.childrenFortune))throw new Error("children fixture unavailable");
const result=analysis.childrenFortune as ChildrenFortuneResult,rebuild=(rows:ChildrenFortuneResult["bond"]["contributions"])=>rows.reduce((sum,row)=>sum+row.value*row.weight,0);

describe("SYNTHETIC_CHILDREN_FORTUNE_V1",()=>{
  it("reconstructs bond and preserves exact boundary semantics",()=>{
    expect(result.bond.score).toBeCloseTo(rebuild(result.bond.contributions),12);
    expect([0,34.999,35,54.999,55,74.999,75,100].map(childBondLevel)).toEqual(["LOW","LOW","MODERATE","MODERATE","STRONG","STRONG","VERY_STRONG","VERY_STRONG"]);
    expect(result.bond.evidenceIds).toContain("CHILD-HOUR-OUTPUT");expect(result.bond.evidenceIds).toContain("CHILD-OUTPUT-COMBINED");expect(result.bond.evidenceIds).toContain("CHILD-OUTPUT-ROOT");expect(result.bond.evidenceIds).toContain("CHILD-HOUR-RELATIONS");
  });

  it("reconstructs count tendency without asserting an exact count",()=>{
    expect(result.countTendency.score).toBeCloseTo(rebuild(result.countTendency.contributions),12);
    expect([0,29.999,30,49.999,50,69.999,70,100].map(childCountBand)).toEqual(["LOW_CONNECTION","LOW_CONNECTION","ONE_CHILD_CENTERED","ONE_CHILD_CENTERED","ONE_TO_TWO","ONE_TO_TWO","MULTIPLE_TENDENCY","MULTIPLE_TENDENCY"]);
    expect(Object.values(RULE.countLabels)).not.toContain("자녀는 정확히 두 명");
  });

  it("normalizes symbolic son/daughter energy and keeps a balanced band",()=>{
    expect(result.genderEnergy.sonPercent+result.genderEnergy.daughterPercent).toBeCloseTo(100,12);
    expect(classifyGenderEnergy(51,49).dominant).toBe("BALANCED");expect(classifyGenderEnergy(60,40).dominant).toBe("SON");expect(classifyGenderEnergy(40,60).dominant).toBe("DAUGHTER");
    expect(result.genderEnergy.evidenceIds).toContain("CHILD-GENDER-NOT-BIOLOGICAL-PROBABILITY");
    expect(result.genderEnergy.scoreEvidence.filter(row=>row.target==="SON").reduce((sum,row)=>sum+row.value,0)).toBeCloseTo(result.genderEnergy.sonScore,12);
    expect(result.genderEnergy.scoreEvidence.filter(row=>row.target==="DAUGHTER").reduce((sum,row)=>sum+row.value,0)).toBeCloseTo(result.genderEnergy.daughterScore,12);
  });

  it("classifies all parenting axes from deterministic hour profiles",()=>{
    expect(classifyParenting({companion:0,resource:0,output:80,wealth:20,officer:0})).toMatchObject({expression:"EXPRESSIVE",guidance:"AUTONOMY_ORIENTED",conflict:"DIRECT"});
    expect(classifyParenting({companion:0,resource:80,output:0,wealth:20,officer:0})).toMatchObject({expression:"RESERVED",guidance:"PROTECTIVE",conflict:"INTERNALIZE"});
    expect(classifyParenting({companion:0,resource:10,output:10,wealth:0,officer:80})).toMatchObject({expression:"MIXED",guidance:"STRUCTURED",expectation:"HIGH_EXPECTATION",conflict:"NEGOTIATE"});
    expect(result.parentingStyle.evidenceIds).toEqual(["CHILD-PARENTING-HOUR-STEM","CHILD-PARENTING-HOUR-HIDDEN"]);
  });

  it("reconstructs every Daeun family activation and keeps output/hour signals",()=>{
    expect(Object.values(RULE.periodWeights).reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);expect(result.daeunPeriods).toHaveLength(analysis.daeun.periods.length);
    for(const row of result.daeunPeriods){expect(row.activationScore).toBeCloseTo(rebuild(row.contributions),12);expect(row.evidenceIds).toHaveLength(4);expect(row.evidenceIds.some(id=>id.endsWith("-OUTPUT"))).toBe(true);expect(row.evidenceIds.some(id=>id.endsWith("-HOUR"))).toBe(true);expect(childActivationLevel(row.activationScore)).toBe(row.activationLevel);}
  });

  it("is deterministic, leaves sources unchanged, and contains no prohibited prediction",()=>{
    const before={pillars:structuredClone(analysis.pillars),hiddenStems:structuredClone(analysis.hiddenStems),tenGods:structuredClone(analysis.tenGods),twelveStages:structuredClone(analysis.twelveStages),fiveElements:structuredClone(analysis.fiveElements),strength:structuredClone(analysis.strength),relations:structuredClone(analysis.relations),usefulGods:structuredClone(analysis.usefulGods),fortune:structuredClone(analysis.fortune)};
    expect(calculateSaju(SYNTHETIC_INPUT).childrenFortune).toEqual(result);expect(analysis.pillars).toEqual(before.pillars);expect(analysis.hiddenStems).toEqual(before.hiddenStems);expect(analysis.tenGods).toEqual(before.tenGods);expect(analysis.twelveStages).toEqual(before.twelveStages);expect(analysis.fiveElements).toEqual(before.fiveElements);expect(analysis.strength).toEqual(before.strength);expect(analysis.relations).toEqual(before.relations);expect(analysis.usefulGods).toEqual(before.usefulGods);expect(analysis.fortune).toEqual(before.fortune);
    expect(result.disclaimer).toEqual({tendencyOnly:true,pregnancyProbability:false,exactChildCount:false,fetalSexPrediction:false});const serialized=JSON.stringify(result);
    for(const text of ["임신 가능성","난임","불임","유산","출산 성공","첫째는","둘째는","정확히 2명"])expect(serialized).not.toContain(text);
  });
});
