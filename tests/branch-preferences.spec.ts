import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluateBranchPreferences, prospectiveBranchRelations } from
  "@/lib/saju/interpretation/branch-preferences";
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "@/rules/ganzhi.v1";
import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { synthesisRole } from "@/lib/saju/interpretation/useful-god-synthesis";
import type { Branch, PillarPosition, Stem } from "@/types/saju-analysis";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const scores: Record<Stem, number> = { 壬:69.91758241758242, 癸:69.91758241758242,
  甲:65, 乙:65, 丁:61.08516483516484, 丙:56.689560439560445,
  戊:52.95454545454545, 己:52.95454545454545, 庚:52.22471910112359, 辛:50.18181818181818 };
const stems = (values: Record<Stem, number> = scores): StemPreferencesResult => ({
  status:"implemented", ruleVersion:"stem-preferences-v1", synthesisVersion:"stem-preference-synthesis-v1",
  stems:HEAVENLY_STEMS.map(stem=>({ stem, element:"wood", yinYang:"yang", score:values[stem],
    baseStemScore:values[stem], role:synthesisRole(values[stem]), confidence:"MEDIUM",
    parentElementScore:0, parentElementRole:"UNFAVORABLE", engineSignals:[],
    coverage:{engineCount:0,effectiveWeight:0,engines:[]}, availability:{state:"ABSENT",visiblePositions:[],hiddenOccurrences:[],dayStemSelf:false},
    relationContext:[], consensusBonus:0, conflictPenalty:0, conflictingSignals:false, evidence:[] })),
  rankedStems:[...HEAVENLY_STEMS], primaryStems:[], secondaryStems:[], favorableStems:[],
  conditionalStems:[], neutralStems:[], unfavorableStems:[] });
const pillars = (branches: Branch[] = ["亥","酉","子","辰"]) => Object.fromEntries(positions.map((position,index)=>
  [position,{position,stem:["乙","乙","甲","戊"][index] as Stem,branch:branches[index],hanja:null,korean:null}])) as
  ReturnType<typeof calculateSaju>["pillars"];
const pure = () => evaluateBranchPreferences(pillars(), stems());
const branch = (value: ReturnType<typeof pure>, target: Branch) => value.branches.find(row=>row.branch===target)!;

describe("SYNTHETIC_BRANCH_PREFERENCES_V1",()=>{
  it("A-C: creates all branches and uses shared canonical and hidden-stem sources",()=>{
    const result=pure();
    expect(result.branches).toHaveLength(12);
    expect(new Set(result.branches.map(row=>row.branch))).toEqual(new Set(EARTHLY_BRANCHES));
    expect(result).toMatchObject({ hiddenStemRuleVersion:HIDDEN_STEMS_V1.rulesetVersion,
      weightRuleVersion:ELEMENT_WEIGHT_V1.rulesetVersion });
    const equal=Object.fromEntries(HEAVENLY_STEMS.map(stem=>[stem,50])) as Record<Stem,number>;
    expect(evaluateBranchPreferences(pillars(),stems(equal)).rankedBranches).toEqual(EARTHLY_BRANCHES);
  });

  it("D-F: reuses one/two/three hidden-stem allocations exactly",()=>{
    expect(branch(pure(),"子").hiddenComponents.map(row=>[row.qiRole,row.weight])).toEqual([["mainQi",1]]);
    expect(branch(pure(),"午").hiddenComponents.map(row=>[row.qiRole,row.weight]))
      .toEqual([["mainQi",.75],["residualQi",.25]]);
    expect(branch(pure(),"辰").hiddenComponents.map(row=>[row.qiRole,row.weight]))
      .toEqual([["mainQi",.7],["middleQi",.2],["residualQi",.1]]);
  });

  it("G-L: reconstructs scores only from hidden stem preferences",()=>{
    const result=pure();
    for(const row of result.branches){
      expect(row.hiddenComponents.reduce((sum,item)=>sum+item.weight,0)).toBeCloseTo(1);
      expect(row.score).toBeCloseTo(row.hiddenComponents.reduce((sum,item)=>sum+item.weightedScore,0));
    }
    expect(branch(result,"子").score).toBe(scores.癸);
    expect(branch(result,"卯").score).toBe(scores.乙);
    expect(branch(result,"酉").score).toBe(scores.辛);
    const changed=stems(); changed.stems.forEach(row=>row.parentElementScore=100);
    expect(evaluateBranchPreferences(pillars(),changed).branches.map(row=>row.score))
      .toEqual(result.branches.map(row=>row.score));
  });

  it("M-O: records present, absent, and repeated natal positions without score effects",()=>{
    const result=pure();
    expect(branch(result,"酉").availability).toEqual({state:"PRESENT",positions:["month"],count:1});
    expect(branch(result,"午").availability).toEqual({state:"ABSENT",positions:[],count:0});
    const repeated=evaluateBranchPreferences(pillars(["酉","酉","子","辰"]),stems());
    expect(branch(repeated,"酉").availability).toEqual({state:"PRESENT",positions:["year","month"],count:2});
    expect(branch(repeated,"酉").score).toBe(branch(result,"酉").score);
  });

  it("P-Y: records every prospective relation family from shared rule tables",()=>{
    const natal=pillars();
    expect(prospectiveBranchRelations("丑",natal)).toContainEqual(expect.objectContaining({type:"SIX_COMBINATION",state:"PAIR",members:["子","丑"]}));
    expect(prospectiveBranchRelations("卯",natal)).toContainEqual(expect.objectContaining({type:"THREE_HARMONY",state:"PARTIAL",members:["亥","卯","未"]}));
    expect(prospectiveBranchRelations("申",natal)).toContainEqual(expect.objectContaining({type:"THREE_HARMONY",state:"COMPLETE",members:["申","子","辰"],targetElement:"water"}));
    expect(prospectiveBranchRelations("丑",natal)).toContainEqual(expect.objectContaining({type:"DIRECTIONAL_COMBINATION",state:"COMPLETE",members:["亥","子","丑"]}));
    expect(prospectiveBranchRelations("午",natal)).toContainEqual(expect.objectContaining({type:"BRANCH_CLASH",members:["子","午"]}));
    expect(prospectiveBranchRelations("卯",natal)).toContainEqual(expect.objectContaining({type:"MUTUAL_PUNISHMENT",members:["子","卯"]}));
    expect(prospectiveBranchRelations("酉",natal)).toContainEqual(expect.objectContaining({type:"SELF_PUNISHMENT",members:["酉","酉"]}));
    expect(prospectiveBranchRelations("戌",natal)).toContainEqual(expect.objectContaining({type:"BRANCH_HARM",members:["酉","戌"]}));
    expect(prospectiveBranchRelations("丑",natal)).toContainEqual(expect.objectContaining({type:"BRANCH_BREAK",members:["丑","辰"]}));
    expect(prospectiveBranchRelations("亥",natal)).toContainEqual(expect.objectContaining({type:"WONJIN",members:["辰","亥"]}));
  });

  it("Z-AE: relation context is scoreless and all upstream values remain immutable",()=>{
    const stemInput=stems(), originalStems=structuredClone(stemInput), natal=pillars(), originalPillars=structuredClone(natal);
    const first=evaluateBranchPreferences(natal,stemInput);
    const changed=evaluateBranchPreferences(pillars(["午","未","寅","戌"]),stemInput);
    for(const target of EARTHLY_BRANCHES) expect(branch(changed,target).score).toBe(branch(first,target).score);
    expect(stemInput).toEqual(originalStems); expect(natal).toEqual(originalPillars);
    const integrated=calculateSaju(SYNTHETIC_INPUT), before={stems:structuredClone(integrated.stemPreferences),
      useful:structuredClone(integrated.usefulGods),strength:structuredClone(integrated.strength),structure:structuredClone(integrated.structure),
      transformation:structuredClone(integrated.relations.transformation)};
    expect(integrated.branchPreferences.status).toBe("implemented");
    expect(integrated.stemPreferences).toEqual(before.stems); expect(integrated.usefulGods).toEqual(before.useful);
    expect(integrated.strength).toEqual(before.strength); expect(integrated.structure).toEqual(before.structure);
    expect(integrated.relations.transformation).toEqual(before.transformation);
  });

  it("AF-AJ: reuses roles, is deterministic, reconstructible, and fixes the pure regression",()=>{
    expect(synthesisRole(34.999)).toBe("UNFAVORABLE"); expect(synthesisRole(35)).toBe("NEUTRAL");
    expect(synthesisRole(45)).toBe("CONDITIONAL"); expect(synthesisRole(60)).toBe("FAVORABLE");
    expect(synthesisRole(70)).toBe("SECONDARY"); expect(synthesisRole(80)).toBe("PRIMARY");
    const result=pure(); expect(pure()).toEqual(result);
    expect(result.branches.map(({branch,score,role})=>[branch,score,role])).toEqual([
      ["子",69.91758241758242,"FAVORABLE"],["亥",68.68818681318682,"FAVORABLE"],
      ["卯",65,"FAVORABLE"],["寅",62.133366633366634,"FAVORABLE"],
      ["午",59.052509990009995,"CONDITIONAL"],["辰",57.551698301698295,"CONDITIONAL"],
      ["未",56.176698301698295,"CONDITIONAL"],["申",55.83627439975754,"CONDITIONAL"],
      ["巳",55.423090673371576,"CONDITIONAL"],["戌",54.3033966033966,"CONDITIONAL"],
      ["丑",54.09630369630369,"CONDITIONAL"],["酉",50.18181818181818,"CONDITIONAL"]]);
    expect(result).toMatchObject({status:"implemented",primaryBranches:[],secondaryBranches:[],
      favorableBranches:["子","亥","卯","寅"],conditionalBranches:["午","辰","未","申","巳","戌","丑","酉"],
      neutralBranches:[],unfavorableBranches:[]});
    for(const row of result.branches) expect(row.evidence.at(-1)).toContain(`final=${row.score}`);
  });
});
