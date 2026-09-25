import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { evaluateDaeunActivation,activationLevel,capActivationScore,daeunFavorabilityRole } from "@/lib/saju/fortune/daeun-activation";
import { generateDaeun } from "@/lib/saju/fortune/daeun-generation";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { evaluateNobleSpecialStars } from "@/lib/saju/interpretation/noble-special-stars";
import { getTenGod } from "@/lib/saju/interpretation/ten-gods";
import type { Branch,PillarPosition,Stem } from "@/types/saju-analysis";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { NobleSpecialStarsResult } from "@/types/noble-special-stars";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const base=calculateSaju(SYNTHETIC_INPUT),positions:PillarPosition[]=["year","month","day","hour"];
if(base.stemPreferences.status!=="implemented"||!("stems" in base.stemPreferences)||base.branchPreferences.status!=="implemented"||
  !("branches" in base.branchPreferences))throw new Error("preference fixture unavailable");
const stemPreferences=base.stemPreferences as StemPreferencesResult,branchPreferences=base.branchPreferences as BranchPreferencesResult;
const pillars=(stems:Stem[]=["己","庚","甲","辛"],branches:Branch[]=["申","酉","辰","亥"])=>Object.fromEntries(
  positions.map((position,index)=>[position,{position,stem:stems[index],branch:branches[index],hanja:null,korean:null}])) as typeof base.pillars;
const activate=(fortunePillar:string,branches?:Branch[],stems?:Stem[])=>{const natal=pillars(stems,branches),relations=detectRelations(natal),
  stars=evaluateNobleSpecialStars(natal,relations);const source={status:"implemented",periods:[{ageRange:"3~13",pillar:fortunePillar,startAgeYears:3,endAgeYears:13}]};
  return{source,natal,relations,stars,result:evaluateDaeunActivation(source,natal,relations,stemPreferences,branchPreferences,stars)};};
const period=(value:ReturnType<typeof activate>)=>value.result.daeun.periods[0];

describe("SYNTHETIC_DAEUN_GENERATION_AND_ACTIVATION_V1",()=>{
  it("generates direction, start age, and sequence once from year/month/solar-term sources",()=>{
    const month={position:"month" as const,stem:"丁" as const,branch:"卯" as const,hanja:null,korean:null};
    const birth=new Date("2024-01-01T00:00:00Z"),previous=new Date("2023-12-29T00:00:00Z"),next=new Date("2024-01-04T00:00:00Z");
    const forward=generateDaeun("甲",month,"male",birth,previous,next),reverse=generateDaeun("甲",month,"female",birth,previous,next);
    expect(forward).toMatchObject({direction:"forward",referenceSolarTerm:"next",exactStartAge:1,
      exactTermDifferenceMilliseconds:3*86_400_000,exactTermDifferenceDays:3,
      exactConvertedDuration:{years:1,milliseconds:366*86_400_000},startAgeYears:1,startAgeMonths:0});
    expect(forward.periods.map(row=>row.pillar)).toEqual(["戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑"]);
    expect(forward.periods[0]).toMatchObject({startInstant:"2025-01-01T00:00:00.000Z",endInstant:"2035-01-01T00:00:00.000Z"});
    expect(forward.periods[1].startInstant).toBe(forward.periods[0].endInstant);
    expect(forward.periods.every((row,index)=>index===0||row.startInstant===forward.periods[index-1].endInstant)).toBe(true);
    expect(reverse.periods.map(row=>row.pillar)).toEqual(["丙寅","乙丑","甲子","癸亥","壬戌","辛酉","庚申","己未","戊午","丁巳"]);
  });

  it("A-G: preserves source periods, looks up preferences, computes 45/55, and records ten gods",()=>{
    const value=activate("丙戌"),row=period(value),before=structuredClone(value.source);
    const stem=stemPreferences.stems.find(item=>item.stem==="丙")!,branch=branchPreferences.branches.find(item=>item.branch==="戌")!;
    expect(row.sourcePeriod).toEqual(value.source.periods[0]);expect(value.source).toEqual(before);
    expect(row.preference).toMatchObject({stemScore:stem.score,stemRole:stem.role,branchScore:branch.score,branchRole:branch.role,
      baseFavorabilityScore:stem.score*.45+branch.score*.55});
    expect(row.tenGodProfile.stemTenGod).toBe(getTenGod("甲","丙").korean);
    expect(row.tenGodProfile.branchHiddenTenGods.map(item=>item.weight)).toEqual([.7,.2,.1]);
  });

  it("reuses favorability role boundaries",()=>{
    expect(daeunFavorabilityRole(34.999)).toBe("UNFAVORABLE");expect(daeunFavorabilityRole(35)).toBe("NEUTRAL");
    expect(daeunFavorabilityRole(45)).toBe("CONDITIONAL");expect(daeunFavorabilityRole(60)).toBe("FAVORABLE");
    expect(daeunFavorabilityRole(70)).toBe("STRONG_FAVORABLE");expect(daeunFavorabilityRole(80)).toBe("PRIMARY_FAVORABLE");
  });

  it("H-K: detects stem combination/clash, six combination, and branch clash",()=>{
    expect(period(activate("己午",["子","酉","辰","亥"])).interactions).toEqual(expect.arrayContaining([
      expect.objectContaining({relationType:"STEM_COMBINATION",natalPosition:"day",activationPoints:6,transformationCandidate:true}),
      expect.objectContaining({relationType:"BRANCH_CLASH",natalPosition:"year",activationPoints:10})]));
    expect(period(activate("庚寅",["亥","酉","辰","子"])).interactions).toEqual(expect.arrayContaining([
      expect.objectContaining({relationType:"STEM_CLASH",natalPosition:"day",activationPoints:7}),
      expect.objectContaining({relationType:"SIX_COMBINATION",natalPosition:"year",activationPoints:6})]));
  });

  it("L-O: distinguishes partial/complete three-harmony and directional activation",()=>{
    expect(period(activate("丙子",["申","酉","午","亥"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"ACTIVATED_PARTIAL",activationPoints:4}));
    expect(period(activate("丙子",["申","酉","辰","亥"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"ACTIVATED_COMPLETE",activationPoints:10}));
    expect(period(activate("丙丑",["亥","酉","辰","申"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"DIRECTIONAL_COMBINATION",state:"ACTIVATED_PARTIAL",activationPoints:4}));
    expect(period(activate("丙丑",["亥","酉","子","申"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"DIRECTIONAL_COMBINATION",state:"ACTIVATED_COMPLETE",activationPoints:10}));
    expect(period(activate("丙子",["申","酉","子","亥"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"REPEATED_EXISTING_CONTEXT"}));
  });

  it("P-T: detects punishment, self punishment, harm, break, and wonjin",()=>{
    expect(period(activate("丙申",["寅","巳","子","辰"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"THREE_PUNISHMENT",state:"ACTIVATED_COMPLETE",activationPoints:9}));
    expect(period(activate("丙辰",["辰","酉","子","亥"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"SELF_PUNISHMENT",activationPoints:6}));
    const row=period(activate("丙巳",["寅","酉","子","辰"]));
    expect(row.interactions).toContainEqual(expect.objectContaining({relationType:"BRANCH_HARM",activationPoints:5}));
    expect(period(activate("丙酉",["子","亥","辰","丑"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"BRANCH_BREAK",activationPoints:4}));
    expect(period(activate("丙未",["子","酉","辰","亥"])).interactions)
      .toContainEqual(expect.objectContaining({relationType:"WONJIN",activationPoints:5}));
  });

  it("U-Y: deduplicates stable IDs, reconstructs activation, levels and cap without good/bad score",()=>{
    const row=period(activate("己午",["子","子","子","子"],["甲","甲","甲","甲"]));
    expect(new Set(row.interactions.map(item=>item.id)).size).toBe(row.interactions.length);
    expect(row.activation.rawScore).toBe(row.interactions.reduce((sum,item)=>sum+item.activationPoints,0));
    expect(row.activation.score).toBe(capActivationScore(row.activation.rawScore));expect(capActivationScore(120)).toBe(100);
    expect([[0,"LOW"],[14,"LOW"],[15,"MODERATE"],[29,"MODERATE"],[30,"HIGH"],[49,"HIGH"],[50,"VERY_HIGH"]]
      .map(([score])=>activationLevel(score as number))).toEqual(["LOW","LOW","MODERATE","MODERATE","HIGH","HIGH","VERY_HIGH"]);
    expect(row.preference).not.toHaveProperty("activationScore");
  });

  it("Z-AC: emits scoreless star tags, never activates samjae, and does not transform natal data",()=>{
    const value=activate("丙酉",["亥","丑","子","辰"]),row=period(value),before=structuredClone(value.relations.transformation);
    expect(row.starActivations).toContainEqual(expect.objectContaining({type:"PEACH_BLOSSOM_ACTIVATED",basis:"DAY_BRANCH"}));
    expect(row.starActivations.every(tag=>!("activationPoints" in tag))).toBe(true);
    expect(row.starActivations.some(tag=>tag.type.includes("SAMJAE"))).toBe(false);
    expect(value.relations.transformation).toEqual(before);
  });

  it("AD-AK: preserves all upstream axes, is deterministic, and keeps later synthesis layers pending",()=>{
    const first=calculateSaju(SYNTHETIC_INPUT),second=calculateSaju(SYNTHETIC_INPUT);
    expect(second.daeun).toEqual(first.daeun);expect(second.fortune).toEqual(first.fortune);
    expect(first.fortune).toMatchObject({status:"partial",daeun:{status:"implemented"},seun:{status:"implemented"},
      wolun:{status:"implemented"},transformation:{status:"not_implemented"},synthesis:{status:"not_implemented"}});
    const before={adjusted:structuredClone(first.fiveElements.adjustedStrength),useful:structuredClone(first.usefulGods),
      stems:structuredClone(first.stemPreferences),branches:structuredClone(first.branchPreferences),stars:structuredClone(first.nobleAndSpecialStars)};
    expect(first.fiveElements.adjustedStrength).toEqual(before.adjusted);expect(first.usefulGods).toEqual(before.useful);
    expect(first.stemPreferences).toEqual(before.stems);expect(first.branchPreferences).toEqual(before.branches);
    expect(first.nobleAndSpecialStars).toEqual(before.stars);
  });

  it("locks the synthetic ten-period generation and activation regression",()=>{
    if(base.fortune.status!=="partial"||!("daeun" in base.fortune))throw new Error("fortune fixture unavailable");
    expect(base.daeun).toMatchObject({direction:"reverse",referenceSolarTerm:"previous",startAgeYears:9,startAgeMonths:0});
    expect(base.fortune.daeun.periods.map(row=>({pillar:`${row.pillar.stem}${row.pillar.branch}`,
      favorability:row.preference.baseFavorabilityScore,role:row.preference.role,
      activation:row.activation.score,level:row.activation.level}))).toEqual([
      {pillar:"丙寅",favorability:59.02680785123968,role:"CONDITIONAL",activation:21,level:"MODERATE"},
      {pillar:"乙丑",favorability:51.86370879120879,role:"CONDITIONAL",activation:44,level:"HIGH"},
      {pillar:"甲子",favorability:18.324587912087914,role:"UNFAVORABLE",activation:44,level:"HIGH"},
      {pillar:"癸亥",favorability:16.99426510989011,role:"UNFAVORABLE",activation:22,level:"MODERATE"},
      {pillar:"壬戌",favorability:56.938101851851854,role:"CONDITIONAL",activation:50,level:"VERY_HIGH"},
      {pillar:"辛酉",favorability:100,role:"PRIMARY_FAVORABLE",activation:23,level:"MODERATE"},
      {pillar:"庚申",favorability:89.61875,role:"PRIMARY_FAVORABLE",activation:22,level:"MODERATE"},
      {pillar:"己未",favorability:88.03467592592594,role:"PRIMARY_FAVORABLE",activation:20,level:"MODERATE"},
      {pillar:"戊午",favorability:97.79131944444445,role:"PRIMARY_FAVORABLE",activation:20,level:"MODERATE"},
      {pillar:"丁巳",favorability:96.00814393939396,role:"PRIMARY_FAVORABLE",activation:29,level:"MODERATE"}
    ]);
  });
});
