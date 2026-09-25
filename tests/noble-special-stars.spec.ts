import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluateNobleSpecialStars, voidFromDayPillar } from "@/lib/saju/interpretation/noble-special-stars";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { MOBILITY_STARS_V1 } from "@/rules/mobility-stars.v1";
import { NOBLE_STARS_V1 } from "@/rules/noble-stars.v1";
import { SAMJAE_V1 } from "@/rules/samjae.v1";
import { SPECIAL_STARS_V1 } from "@/rules/special-stars.v1";
import { TWELVE_SINSAL_V1 } from "@/rules/twelve-sinsal.v1";
import { VOID_V1 } from "@/rules/void.v1";
import { YANG_BLADE_STRUCTURE_V1 } from "@/rules/yang-blade-structure.v1";
import type { Branch, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions:PillarPosition[]=["year","month","day","hour"];
const HEAVENLY_STEM_DAY_BRANCH:Record<Stem,Branch>={甲:"子",乙:"丑",丙:"子",丁:"丑",戊:"子",己:"丑",庚:"子",辛:"丑",壬:"子",癸:"丑"};
const pillars=(stems:Stem[]=["乙","乙","甲","戊"],branches:Branch[]=["亥","酉","子","辰"])=>
  Object.fromEntries(positions.map((position,index)=>[position,{position,stem:stems[index],branch:branches[index],hanja:null,korean:null}])) as
    ReturnType<typeof calculateSaju>["pillars"];
const run=(stems?:Stem[],branches?:Branch[])=>{const actualBranches=branches??["亥","酉","子","辰"];
  const actualStems=stems??["乙","乙",(["子","寅","辰","午","申","戌"] as Branch[]).includes(actualBranches[2])?"甲":"乙","戊"];
  const value=pillars(actualStems,actualBranches);return evaluateNobleSpecialStars(value,detectRelations(value));};

describe("SYNTHETIC_NOBLE_SPECIAL_STARS_V1",()=>{
  it("detects peach, travel, and canopy for all four groups with separate year/day bases",()=>{
    for(const group of MOBILITY_STARS_V1.groups){
      const basis=group.members[0];
      const result=run(undefined,[basis,group.peach,basis,group.travel]);
      expect(result.peachBlossom).toContainEqual(expect.objectContaining({basis:{type:"YEAR_BRANCH",value:basis},matched:expect.objectContaining({pillar:"month",branch:group.peach})}));
      expect(result.travelHorse).toContainEqual(expect.objectContaining({basis:{type:"DAY_BRANCH",value:basis},matched:expect.objectContaining({pillar:"hour",branch:group.travel})}));
      const canopy=run(undefined,[basis,group.canopy,basis,"子"]);
      expect(canopy.flowerCanopy.some(row=>row.matched.branch===group.canopy)).toBe(true);
    }
    const split=run(undefined,["申","酉","亥","子"]);
    expect(new Set(split.peachBlossom.map(row=>row.basis.type))).toEqual(new Set(["YEAR_BRANCH","DAY_BRANCH"]));
  });

  it.each(SPECIAL_STARS_V1.ghostGatePairs)("detects unordered ghost-gate pair %s%s",(a,b)=>{
    expect(run(undefined,[a,b,"子","丑"]).ghostGate.some(row=>row.basis.value===`${a}${b}`)).toBe(true);
    expect(run(undefined,[b,a,"子","丑"]).ghostGate.some(row=>row.basis.value===`${b}${a}`)).toBe(true);
  });

  it("reuses detected relations as the only wonjin source",()=>{
    const value=pillars(undefined,["子","未","辰","酉"]),relations=detectRelations(value),before=structuredClone(relations);
    const result=evaluateNobleSpecialStars(value,relations);
    expect(result.wonjin).toHaveLength(relations.earthlyBranches.wonjin.length);
    expect(result.wonjin[0].basis.type).toBe("RELATIONS_RESULT"); expect(relations).toEqual(before);
  });

  it("detects custom needle stems and branches at every position",()=>{
    const result=run(["甲","辛","丁","丙"],["卯","午","未","申"]);
    expect(result.needle.filter(row=>row.basis.type==="CUSTOM_STEM_TABLE")).toHaveLength(2);
    expect(result.needle.filter(row=>row.basis.type==="CUSTOM_BRANCH_TABLE")).toHaveLength(4);
  });

  it.each(VOID_V1.xun)("calculates void for $start",row=>{
    const dayBranch=row.start[1] as Branch,value=pillars(["乙","乙","甲","戊"],[row.voidBranches[0],"子",dayBranch,row.voidBranches[1]]);
    const result=voidFromDayPillar("甲",dayBranch,value);
    expect(result).toMatchObject({xunStart:row.start,voidBranches:row.voidBranches,dayBranchPolicy:"EXCLUDED_SELF"});
    expect(result.matches).toContainEqual({pillar:"year",branch:row.voidBranches[0]});
    expect(result.matches).toContainEqual({pillar:"hour",branch:row.voidBranches[1]});
  });

  it("detects all five yang blades and marks yin stems not applicable",()=>{
    for(const [stem,target] of Object.entries(YANG_BLADE_STRUCTURE_V1.byDayStem) as Array<[Stem,Branch]>)
      expect(run(["乙","乙",stem,"戊"],["亥",target,HEAVENLY_STEM_DAY_BRANCH[stem],"辰"]).yangBlade)
        .toContainEqual(expect.objectContaining({basis:{type:"DAY_STEM",value:stem},matched:expect.objectContaining({branch:target})}));
    for(const stem of ["乙","丁","己","辛","癸"] as Stem[])
      expect(run(["甲","乙",stem,"戊"],["亥","酉",HEAVENLY_STEM_DAY_BRANCH[stem],"辰"]).yangBladeApplicability).toBe("NOT_APPLICABLE");
  });

  it.each(SPECIAL_STARS_V1.goegang)("detects goegang pillar %s",value=>{
    expect(run(["乙","乙",value[0] as Stem,"戊"],["亥","酉",value[1] as Branch,"辰"]).goegang)
      .toContainEqual(expect.objectContaining({matched:expect.objectContaining({pillar:"day"}),isDayPillar:true}));
  });

  it.each(SPECIAL_STARS_V1.whiteTiger)("detects white-tiger pillar %s",value=>{
    expect(run([value[0] as Stem,"乙","甲","戊"],[value[1] as Branch,"酉","子","辰"]).whiteTiger)
      .toContainEqual(expect.objectContaining({matched:expect.objectContaining({pillar:"year"}),isDayPillar:false}));
  });

  it("covers every noble lookup target and preserves duplicate positions",()=>{
    for(const [type,table] of Object.entries(NOBLE_STARS_V1.byDayStem)) for(const [stem,targets] of Object.entries(table))
      for(const target of targets){const dayStem=stem as Stem;const result=run(["乙","乙",dayStem,"戊"],[target,target,HEAVENLY_STEM_DAY_BRANCH[dayStem],"辰"]);
        const found=result.nobleStars.filter(row=>row.type===type&&row.matched.branch===target);
        expect(found.map(row=>row.matched.pillar)).toEqual(expect.arrayContaining(["year","month"]));}
  });

  it("contains the complete versioned twelve-sinsal mappings for both bases",()=>{
    const expected=[
      ["巳","午","未","申","酉","戌","亥","子","丑","寅","卯","辰"],
      ["申","酉","戌","亥","子","丑","寅","卯","辰","巳","午","未"],
      ["亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌"],
      ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"]];
    expect(TWELVE_SINSAL_V1.groups.map(row=>row.targets)).toEqual(expected);
    const result=run(); expect(result.twelveSinsal.yearBasis).toHaveLength(12);expect(result.twelveSinsal.dayBasis).toHaveLength(12);
    expect(result.twelveSinsal.yearBasis.every(row=>row.basisBranch==="亥")).toBe(true);
    expect(result.twelveSinsal.dayBasis.every(row=>row.basisBranch==="子")).toBe(true);
  });

  it("maps every samjae group to enter, stay, and leave stages",()=>{
    for(const rule of SAMJAE_V1.groups){const result=run(undefined,[rule.members[0],"酉","子","辰"]);
      expect(result.samjae).toMatchObject({basisYearBranch:rule.members[0],group:rule.members,stages:rule.stages,
        samjaeBranches:Object.values(rule.stages)});}
  });

  it("is deterministic, integrates, and leaves all established calculations unchanged",()=>{
    expect(run()).toEqual(run());
    const calculated=calculateSaju(SYNTHETIC_INPUT),before={strength:structuredClone(calculated.strength),structure:structuredClone(calculated.structure),
      useful:structuredClone(calculated.usefulGods),stems:structuredClone(calculated.stemPreferences),branches:structuredClone(calculated.branchPreferences)};
    expect(calculated.nobleAndSpecialStars.status).toBe("implemented");expect(calculated.samjae.status).toBe("implemented");
    expect(calculated.strength).toEqual(before.strength);expect(calculated.structure).toEqual(before.structure);
    expect(calculated.usefulGods).toEqual(before.useful);expect(calculated.stemPreferences).toEqual(before.stems);
    expect(calculated.branchPreferences).toEqual(before.branches);
  });

  it("locks every pure-pillar regression detection",()=>{
    const result=run();
    const compact=(rows:typeof result.nobleStars)=>rows.map(row=>[row.type,row.basis.type,row.basis.value,row.matched.pillar]);
    expect(compact(result.nobleStars)).toEqual([["TAIJI_NOBLE","DAY_STEM","甲","day"],["ACADEMIC","DAY_STEM","甲","year"]]);
    expect(compact(result.peachBlossom)).toEqual([["PEACH_BLOSSOM","YEAR_BRANCH","亥","day"],["PEACH_BLOSSOM","DAY_BRANCH","子","month"]]);
    expect(result.travelHorse).toEqual([]);
    expect(compact(result.flowerCanopy)).toEqual([["FLOWER_CANOPY","DAY_BRANCH","子","hour"]]);
    expect(result.ghostGate.map(row=>[row.basis.value,row.matched.pillar])).toEqual([["亥辰","hour"],["酉子","day"]]);
    expect(result.wonjin.map(row=>[row.basis.value,row.matched.pillar])).toEqual([["WONJIN:year-hour","hour"]]);
    expect(compact(result.needle)).toEqual([["NEEDLE","CUSTOM_STEM_TABLE","甲","day"]]);
    expect(result.void).toEqual({ruleVersion:"void-v1",dayPillar:"甲子",xunStart:"甲子",voidBranches:["戌","亥"],
      dayBranchPolicy:"EXCLUDED_SELF",matches:[{pillar:"year",branch:"亥"}]});
    expect(result.yangBladeApplicability).toBe("APPLICABLE");expect(result.yangBlade).toEqual([]);
    expect(result.goegang.map(row=>[row.basis.value,row.matched.pillar,row.isDayPillar])).toEqual([["戊辰","hour",false]]);
    expect(result.whiteTiger.map(row=>[row.basis.value,row.matched.pillar,row.isDayPillar])).toEqual([["戊辰","hour",false]]);
    const detected=(rows:typeof result.twelveSinsal.yearBasis)=>rows.filter(row=>row.detected).map(row=>[row.name,row.targetBranch,row.matchedPositions]);
    expect(detected(result.twelveSinsal.yearBasis)).toEqual([["재살","酉",["month"]],["지살","亥",["year"]],
      ["년살","子",["day"]],["반안살","辰",["hour"]]]);
    expect(detected(result.twelveSinsal.dayBasis)).toEqual([["년살","酉",["month"]],["망신살","亥",["year"]],
      ["장성살","子",["day"]],["화개살","辰",["hour"]]]);
    expect(result.samjae).toEqual({ruleVersion:"samjae-v1",basisYearBranch:"亥",group:["亥","卯","未"],
      samjaeBranches:["巳","午","未"],stages:{들삼재:"巳",눌삼재:"午",날삼재:"未"}});
  });
});
