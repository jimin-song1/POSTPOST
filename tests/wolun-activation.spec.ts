import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { capActivationScore } from "@/lib/saju/fortune/daeun-activation";
import { evaluateWolunActivation } from "@/lib/saju/fortune/wolun-activation";
import { generateWolun,type WolunSourceResult } from "@/lib/saju/fortune/wolun-generation";
import { evaluateNobleSpecialStars } from "@/lib/saju/interpretation/noble-special-stars";
import { detectRelations } from "@/lib/saju/interpretation/relations";
import { calculateMonthPillar,MONTH_JEOL_SEQUENCE } from "@/lib/saju/pillars/month";
import { calculateYearPillar } from "@/lib/saju/pillars/year";
import { solarTermProvider } from "@/lib/saju/solarTerms";
import type { Branch,PillarPosition,Stem } from "@/types/saju-analysis";
import type { BranchPreferencesResult } from "@/types/branch-preferences";
import type { FortuneResult,SeunActivationPeriod } from "@/types/fortune";
import type { NobleSpecialStarsResult } from "@/types/noble-special-stars";
import type { StemPreferencesResult } from "@/types/stem-preferences";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const base=calculateSaju(SYNTHETIC_INPUT),positions:PillarPosition[]=["year","month","day","hour"];
if(base.stemPreferences.status!=="implemented"||!("stems" in base.stemPreferences)||base.branchPreferences.status!=="implemented"||
  !("branches" in base.branchPreferences)||base.nobleAndSpecialStars.status!=="implemented"||!("nobleStars" in base.nobleAndSpecialStars)||
  base.fortune.status!=="partial"||!("seun" in base.fortune)||base.fortune.seun.status!=="implemented")throw new Error("14C fixtures unavailable");
const stemPreferences=base.stemPreferences as StemPreferencesResult,branchPreferences=base.branchPreferences as BranchPreferencesResult;
const pillars=(stems:Stem[]=["乙","乙","甲","戊"],branches:Branch[]=["亥","酉","辰","申"])=>Object.fromEntries(
  positions.map((position,index)=>[position,{position,stem:stems[index],branch:branches[index],hanja:null,korean:null}])) as typeof base.pillars;
const seunFixture=(year:number,pillar:string,daeunPillar:string,daeunIndex=1):SeunActivationPeriod=>({
  ...structuredClone((base.fortune as FortuneResult).seun.periods![0]),year,period:{startInstant:`${year}-02-04T00:00:00.000Z`,endInstant:`${year+1}-02-04T00:00:00.000Z`},
  pillar:{stem:pillar[0] as Stem,branch:pillar[1] as Branch},activeDaeunIndex:daeunIndex,activeDaeunPillar:daeunPillar,
  daeunSegments:[{daeunIndex,daeunPillar,startInstant:`${year}-02-04T00:00:00.000Z`,endInstant:`${year+1}-02-04T00:00:00.000Z`}]
});
const wolunSource=(year:number,pillar:string,daeunPillar:string,daeunIndex=1):WolunSourceResult=>({status:"implemented",ruleVersion:"wolun-generation-v1",periods:[{
  seunYear:year,indexInSeun:1,solarMonthBranch:pillar[1] as Branch,period:{startInstant:`${year}-02-04T00:00:00.000Z`,endInstant:`${year}-03-05T00:00:00.000Z`},
  pillar:{stem:pillar[0] as Stem,branch:pillar[1] as Branch},activeSeunYear:year,activeSeunPillar:{stem:"丙",branch:"午"},
  activeDaeunIndex:daeunIndex,activeDaeunPillar:daeunPillar,daeunSegments:[{daeunIndex,daeunPillar,
    startInstant:`${year}-02-04T00:00:00.000Z`,endInstant:`${year}-03-05T00:00:00.000Z`}]}],evidence:[]});
const analyze=(wolunPillar:string,daeunPillar="戊辰",seunPillar="丙午",natal=pillars(),samjae:SeunActivationPeriod["samjaeActivation"]=null)=>{
  const seun=seunFixture(2035,seunPillar,daeunPillar);seun.samjaeActivation=samjae;
  const source=wolunSource(2035,wolunPillar,daeunPillar);source.periods[0].activeSeunPillar={...seun.pillar};
  const stars=evaluateNobleSpecialStars(natal,detectRelations(natal)) as NobleSpecialStarsResult;
  return{seun,source,row:evaluateWolunActivation(source,[seun],natal,stemPreferences,branchPreferences,stars).periods[0]};
};

describe("SYNTHETIC_WOLUN_ACTIVATION_V1",()=>{
  it("A-I: uses all 12 exact Jeol boundaries, existing month logic, and 12-month sequence",()=>{
    const year=2027,start=solarTermProvider.getSolarTerm(year,"입춘").instant,end=solarTermProvider.getSolarTerm(year+1,"입춘").instant,
      yearPillar=calculateYearPillar(start,year,solarTermProvider),seun=seunFixture(year,`${yearPillar.stem}${yearPillar.branch}`,"戊辰");
    seun.period={startInstant:start.toISOString(),endInstant:end.toISOString()};seun.daeunSegments=[{daeunIndex:1,daeunPillar:"戊辰",
      startInstant:start.toISOString(),endInstant:end.toISOString()}];
    const result=generateWolun([seun],solarTermProvider);expect(result.periods).toHaveLength(12);
    expect(result.periods.map(row=>row.solarMonthBranch)).toEqual(["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"]);
    result.periods.forEach((row,index)=>{const term=MONTH_JEOL_SEQUENCE[index],termYear=index===11?year+1:year;
      expect(row.period.startInstant).toBe(solarTermProvider.getSolarTerm(termYear,term).instantIso);
      const expected=calculateMonthPillar(new Date(row.period.startInstant),yearPillar.stem!,solarTermProvider);
      expect(row.pillar).toEqual({stem:expected.stem,branch:expected.branch});});
    expect(result.periods.at(-1)!.period.endInstant).toBe(end.toISOString());
  });

  it("B-D: changes Seun and Wolun together at Ipchun, not Gregorian month start, and changes at Gyeongchip",()=>{
    const ipchun=solarTermProvider.getSolarTerm(2027,"입춘").instant,gyeongchip=solarTermProvider.getSolarTerm(2027,"경칩").instant;
    const before=new Date(ipchun.getTime()-1),at=new Date(ipchun),jan1=new Date("2027-01-01T00:00:00Z");
    const beforeYear=calculateYearPillar(before,2027,solarTermProvider),atYear=calculateYearPillar(at,2027,solarTermProvider);
    expect(calculateYearPillar(jan1,2027,solarTermProvider)).toEqual(beforeYear);expect(atYear).not.toEqual(beforeYear);
    expect(calculateMonthPillar(before,beforeYear.stem!,solarTermProvider).branch).toBe("丑");
    expect(calculateMonthPillar(at,atYear.stem!,solarTermProvider).branch).toBe("寅");
    expect(calculateMonthPillar(new Date(gyeongchip.getTime()-1),atYear.stem!,solarTermProvider).branch).toBe("寅");
    expect(calculateMonthPillar(gyeongchip,atYear.stem!,solarTermProvider).branch).toBe("卯");
  });

  it("J-M: excludes unsupported incomplete years, connects Seun, and splits Daeun inside a Wolun",()=>{
    const integrated=(base.fortune as FortuneResult).wolun.periods!;expect(integrated).toHaveLength(804);
    expect(integrated.at(-1)).toMatchObject({seunYear:2099,indexInSeun:12,activeSeunYear:2099});
    expect(integrated.some(row=>row.seunYear===2100)).toBe(false);
    const seun=structuredClone((base.fortune as FortuneResult).seun.periods!.find(row=>row.year===2035)!),
      monthStart=solarTermProvider.getSolarTerm(2035,"입춘").instant,monthEnd=solarTermProvider.getSolarTerm(2035,"경칩").instant,
      boundary=new Date((monthStart.getTime()+monthEnd.getTime())/2).toISOString();
    seun.daeunSegments=[{daeunIndex:1,daeunPillar:"戊辰",startInstant:seun.period.startInstant,endInstant:boundary},
      {daeunIndex:2,daeunPillar:"己巳",startInstant:boundary,endInstant:seun.period.endInstant}];
    const first=generateWolun([seun],solarTermProvider).periods[0];expect(first.activeDaeunIndex).toBeNull();
    expect(first.daeunSegments).toEqual([{daeunIndex:1,daeunPillar:"戊辰",startInstant:first.period.startInstant,endInstant:boundary},
      {daeunIndex:2,daeunPillar:"己巳",startInstant:boundary,endInstant:first.period.endInstant}]);
  });

  it("N-R: reuses preferences, 45/55 weighting, stem ten-god and hidden-stem profile",()=>{
    const row=analyze("丙戌").row,stem=stemPreferences.stems.find(item=>item.stem==="丙")!,branch=branchPreferences.branches.find(item=>item.branch==="戌")!;
    expect(row.preference).toMatchObject({stemScore:stem.score,branchScore:branch.score,baseFavorabilityScore:stem.score*.45+branch.score*.55});
    expect(row.tenGodProfile.stemTenGod).toBe("식신");expect(row.tenGodProfile.branchHiddenTenGods.map(item=>item.weight)).toEqual([.7,.2,.1]);
  });

  it("S-U: separates NATAL_WOLUN, DAEUN_WOLUN, and SEUN_WOLUN relations",()=>{
    const natal=pillars(undefined,["子","酉","辰","申"]),row=analyze("己午","乙子","庚子",natal).row;
    expect(row.interactions.natal).toEqual(expect.arrayContaining([expect.objectContaining({layerPair:"NATAL_WOLUN",relationType:"BRANCH_CLASH"}),
      expect.objectContaining({layerPair:"NATAL_WOLUN",relationType:"STEM_COMBINATION",transformationCandidate:true})]));
    expect(row.interactions.daeun).toContainEqual(expect.objectContaining({layerPair:"DAEUN_WOLUN",relationType:"BRANCH_CLASH"}));
    expect(row.interactions.seun).toContainEqual(expect.objectContaining({layerPair:"SEUN_WOLUN",relationType:"BRANCH_CLASH"}));
  });

  it("V-AB: records only Wolun-participating multi-layer complete/partial/punishment relations",()=>{
    const harmony=analyze("丙子","戊辰","丁午",pillars(undefined,["申","酉","午","亥"])).row;
    expect(harmony.interactions.crossLayer).toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"WOLUN_TRIGGERED_COMPLETE",members:["申","子","辰"]}));
    const directional=analyze("丙丑","戊午","丁亥",pillars(undefined,["子","酉","午","申"])).row;
    expect(directional.interactions.crossLayer).toContainEqual(expect.objectContaining({relationType:"DIRECTIONAL_COMBINATION",state:"WOLUN_TRIGGERED_COMPLETE",members:["亥","子","丑"]}));
    expect(analyze("丙子","戊午","丁未",pillars(undefined,["申","酉","午","亥"])).row.interactions.natal)
      .toContainEqual(expect.objectContaining({relationType:"THREE_HARMONY",state:"ACTIVATED_PARTIAL"}));
    expect(analyze("丙申","戊巳","丁午",pillars(undefined,["寅","酉","子","辰"])).row.interactions.crossLayer)
      .toContainEqual(expect.objectContaining({relationType:"THREE_PUNISHMENT",state:"WOLUN_TRIGGERED_COMPLETE"}));
    expect([...harmony.interactions.natal,...harmony.interactions.daeun,...harmony.interactions.seun,...harmony.interactions.crossLayer]
      .every(item=>item.id.startsWith("WOLUN-"))).toBe(true);
  });

  it("AC-AF: guarantees unique IDs, reconstructs/caps activation, and keeps favorability independent",()=>{
    const row=analyze("己午","乙子","庚子",pillars(undefined,["子","酉","辰","申"])).row,
      all=[...row.interactions.natal,...row.interactions.daeun,...row.interactions.seun,...row.interactions.crossLayer];
    expect(new Set(all.map(item=>item.id)).size).toBe(all.length);
    expect(row.activation.natalRawScore).toBe(row.interactions.natal.reduce((sum,item)=>sum+item.activationPoints,0));
    expect(row.activation.fortuneLayerRawScore).toBe([...row.interactions.daeun,...row.interactions.seun].reduce((sum,item)=>sum+item.activationPoints,0));
    expect(row.activation.crossLayerRawScore).toBe(row.interactions.crossLayer.reduce((sum,item)=>sum+item.activationPoints,0));
    expect(row.activation.rawScore).toBe(row.activation.natalRawScore+row.activation.fortuneLayerRawScore+row.activation.crossLayerRawScore);
    expect(row.activation.score).toBe(Math.min(100,row.activation.rawScore));expect(capActivationScore(120)).toBe(100);
    expect(row.preference).not.toHaveProperty("activationScore");
  });

  it("AG-AM: emits scoreless star/void tags, carries Seun Samjae context only, and marks transformation candidates",()=>{
    const samjae={type:"SAMJAE_ACTIVATED" as const,stage:"들삼재" as const,branch:"巳" as const,ruleVersion:"samjae-v1" as const},
      natal=pillars(undefined,["亥","酉","辰","申"]),row=analyze("己寅","乙子","丙巳",natal,samjae).row;
    expect(row.starActivations).toContainEqual(expect.objectContaining({type:"VOID_ACTIVATED",target:"寅"}));
    expect(row.starActivations.every(tag=>!("activationPoints" in tag))).toBe(true);expect(row.samjaeContext).toEqual(samjae);
    expect(row.samjaeContext!.branch).not.toBe(row.pillar.branch);
    expect(row.interactions.natal).toContainEqual(expect.objectContaining({relationType:"STEM_COMBINATION",transformationCandidate:true}));
  });

  it("AN-AW: preserves Daeun, Seun, natal axes and deterministically integrates only Wolun",()=>{
    const first=calculateSaju(SYNTHETIC_INPUT),before={daeun:structuredClone(first.daeun),seun:structuredClone((first.fortune as FortuneResult).seun),
      adjusted:structuredClone(first.fiveElements.adjustedStrength),useful:structuredClone(first.usefulGods),stems:structuredClone(first.stemPreferences),
      branches:structuredClone(first.branchPreferences),stars:structuredClone(first.nobleAndSpecialStars)},second=calculateSaju(SYNTHETIC_INPUT);
    expect(second.fortune).toEqual(first.fortune);expect(first.daeun).toEqual(before.daeun);expect((first.fortune as FortuneResult).seun).toEqual(before.seun);
    expect(first.fiveElements.adjustedStrength).toEqual(before.adjusted);expect(first.usefulGods).toEqual(before.useful);
    expect(first.stemPreferences).toEqual(before.stems);expect(first.branchPreferences).toEqual(before.branches);expect(first.nobleAndSpecialStars).toEqual(before.stars);
    expect(first.fortune).toMatchObject({status:"partial",daeun:{status:"implemented"},seun:{status:"implemented"},wolun:{status:"implemented"},
      transformation:{status:"implemented"},synthesis:{status:"implemented"}});
  });
});
