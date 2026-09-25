import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { calculateFlow,categoryActivityLevel,categoryActivityScore,categoryPressureLevel,categorySupportLevel,
  categorySupportScore,evaluateCategoryFortune,evaluateCategorySnapshot } from "@/lib/saju/fortune/category-fortune";
import { CATEGORY_FORTUNE_V1 as RULE,type FlowMatrix } from "@/rules/category-fortune.v1";
import type { CategoryAxis,CategoryFortunePeriod,CategoryFortuneResult,ScoreEvidence } from "@/types/category-fortune";
import type { FortuneResult } from "@/types/fortune";
import type { FortuneSynthesisPeriod,FortuneSynthesisResult } from "@/types/fortune-synthesis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const result=calculateSaju(SYNTHETIC_INPUT),fortune=result.fortune as FortuneResult;
if(fortune.categories.status!=="implemented"||fortune.synthesis.status!=="implemented")throw new Error("16 fixture unavailable");
const output=fortune.categories as CategoryFortuneResult,synthesis=fortune.synthesis as FortuneSynthesisResult;
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0),rebuild=(rows:ScoreEvidence[])=>sum(rows.map(row=>row.value*row.weight));
const single=(key:keyof FlowMatrix):Record<keyof FlowMatrix,number>=>({companion:0,resource:0,output:0,wealth:0,officer:0,[key]:100});

describe("SYNTHETIC_CATEGORY_FORTUNE_V1",()=>{
  it("A-G: keeps overall axes separate and implements generic support/activity/flow formulas",()=>{
    expect(categorySupportScore(70,60,80)).toBe(68.5);expect(categoryActivityScore(60,40)).toBe(54);
    const matrix:{companion:number;resource:number;output:number;wealth:number;officer:number}={companion:.6,resource:0,output:0,wealth:0,officer:0},flow=calculateFlow(single("companion"),matrix);
    expect(flow).toEqual({signedFlow:60,flowQualityScore:80,flowActivityScore:60});
    for(const row of [...output.daeun,...output.seun,...output.wolun]){
      const source=[...synthesis.daeun,...synthesis.seun,...synthesis.wolun].find(item=>item.synthesisId===row.synthesisId)!;
      expect(row.overallFlow.supportScore).toBeCloseTo(source.favorability.score*.55+source.transformationAlignment.adjustedScore*.45,12);
      expect(row.overallFlow.activityScore).toBe(source.activation.score);expect(row.overallFlow.supportScore).not.toBe(row.overallFlow.activityScore);
    }
  });

  it("H-Q: uses every configured wealth/business/career/study matrix exactly",()=>{
    const names=["incomeOpportunity","businessRevenue","stableCashflow","assetAccumulation","business","career","study"] as const;
    for(const name of names)for(const key of ["companion","resource","output","wealth","officer"] as const){
      const metric=calculateFlow(single(key),RULE.matrices[name]);expect(metric.signedFlow).toBeCloseTo(RULE.matrices[name][key]*100,12);
      expect(metric.flowQualityScore).toBeCloseTo(50+RULE.matrices[name][key]*50,12);
      expect(metric.flowActivityScore).toBeCloseTo(Math.abs(RULE.matrices[name][key])*100,12);}
    for(const row of output.daeun){const wealthExpected=row.wealth.incomeOpportunity.score*.30+row.wealth.businessRevenue.score*.25+
      row.wealth.stableCashflow.score*.25+row.wealth.assetAccumulation.score*.20;
      expect(row.wealth.supportScore).toBeCloseTo(wealthExpected,12);
      expect(row.wealth.expensePressure.semanticType).toBe("PRESSURE");expect(row.wealth.expensePressure.score).toBeCloseTo(rebuild(row.wealth.expensePressure.evidence),12);
      expect(row.wealth.expansionInvestment.semanticType).toBe("ACTIVITY");expect(row.wealth.expansionInvestment.score).toBeCloseTo(rebuild(row.wealth.expansionInvestment.evidence),12);}
  });

  it("R-X: applies male/female/generic relationship matrices and aggregates three support metrics",()=>{
    const source=structuredClone(synthesis.daeun[0]) as FortuneSynthesisPeriod;source.tenGodFlow={companion:0,resource:0,output:0,wealth:100,officer:0};
    const male=evaluateCategorySnapshot(source,"male",null,null),female=evaluateCategorySnapshot(source,"female",null,null),generic=evaluateCategorySnapshot(source,undefined,null,null);
    expect(male.relationship.traditionalPartnerCategory).toBe("wealth");expect(female.relationship.traditionalPartnerCategory).toBe("officer");
    expect(generic.relationship.traditionalPartnerCategory).toBe("GENERIC");expect(male.relationship.opportunity.score).toBeGreaterThan(female.relationship.opportunity.score);
    for(const row of [male,female,generic])expect(row.relationship.supportScore).toBeCloseTo(row.relationship.opportunity.score*.40+
      row.relationship.stability.score*.35+row.relationship.formalizationSupport.score*.25,12);
  });

  it("Y-AD: computes change independently and preserves exact level boundaries/high-activity low-support",()=>{
    expect(RULE.thresholds).toEqual({support:{verySupportive:80,supportive:70,moderatelySupportive:60,mixed:45,lowSupport:35},
      activity:{veryHigh:50,high:30,moderate:15},pressure:{veryHigh:75,high:50,moderate:25}});
    expect([34.999,35,44.999,45,59.999,60,69.999,70,79.999,80].map(categorySupportLevel)).toEqual(["PRESSURED","LOW_SUPPORT","LOW_SUPPORT","MIXED","MIXED","MODERATELY_SUPPORTIVE","MODERATELY_SUPPORTIVE","SUPPORTIVE","SUPPORTIVE","VERY_SUPPORTIVE"]);
    expect([0,14.999,15,29.999,30,49.999,50].map(categoryActivityLevel)).toEqual(["LOW","LOW","MODERATE","MODERATE","HIGH","HIGH","VERY_HIGH"]);
    expect([0,24.999,25,49.999,50,74.999,75].map(categoryPressureLevel)).toEqual(["LOW","LOW","MODERATE","MODERATE","HIGH","HIGH","VERY_HIGH"]);
    const source=structuredClone(synthesis.daeun[0]) as FortuneSynthesisPeriod;source.favorability.score=20;source.transformationAlignment.adjustedScore=20;
    source.activation.score=100;source.tenGodFlow={companion:100,resource:0,output:0,wealth:0,officer:0};const row=evaluateCategorySnapshot(source,"female",null,null);
    expect(row.business.supportLevel).toBe("PRESSURED");expect(row.business.activityLevel).toBe("VERY_HIGH");
    expect(row.change.supportScore).toBe(20);expect(row.change.activityScore).toBe(100);
  });

  it("AE-AJ: does not double-count delta/structure/useful-god/tags and creates stable Daeun IDs",()=>{
    const source=structuredClone(synthesis.daeun[0]) as FortuneSynthesisPeriod,baseline=evaluateCategorySnapshot(source,"female","정관격","water");
    source.transformationAlignment.delta=99;source.tags=["PEACH_BLOSSOM_ACTIVATED","SAMJAE_ACTIVATED","VOID_ACTIVATED"];
    const changed=evaluateCategorySnapshot(source,"female","편재격","fire");
    for(const name of ["overallFlow","wealth","business","career","relationship","study","change"] as const){
      expect(changed[name].supportScore).toBe(baseline[name].supportScore);expect(changed[name].activityScore).toBe(baseline[name].activityScore);}
    expect(changed.context).toEqual({transformationDelta:99,structureType:"편재격",usefulGodHighestElement:"fire"});
    expect(changed.tags).toEqual(source.tags);expect(output.daeun.map(row=>row.categoryId)).toEqual(synthesis.daeun.map(row=>`CATEGORY:${row.synthesisId}`));
  });

  it("AK-AP: preserves authoritative segments and duration summaries with activity/pressure peaks",()=>{
    expect(output.seun.map(row=>row.synthesisId)).toEqual(synthesis.seun.map(row=>row.synthesisId));
    expect(output.wolun.map(row=>row.synthesisId)).toEqual(synthesis.wolun.map(row=>row.synthesisId));
    const seun=output.seunPeriodSummaries.find(row=>row.segmentIds.length>1)!,wolun=output.wolunPeriodSummaries.find(row=>row.segmentIds.length>1)!;
    for(const summary of [seun,wolun]){expect(sum(summary.segmentWeights.map(row=>row.weight))).toBeCloseTo(1,12);
      expect(summary.peakActivityScore).toBeGreaterThanOrEqual(summary.categories.overallFlow.activityScore);
      expect(summary.peakPressureScore).toBeGreaterThanOrEqual(summary.wealth.expensePressureScore);}
    expect(output.daeun[0]).toMatchObject({categoryId:"CATEGORY:DAEUN-01",overallFlow:{supportScore:59.725303108565,activityScore:21},
      wealth:{supportScore:58.26040218820437,activityScore:27.283772727272726,expensePressure:{score:46.52960368144252}},
      business:{supportScore:62.61017491547709,activityScore:32.525454545454544},career:{supportScore:58.71381127911346,activityScore:17.547272727272727},
      relationship:{supportScore:57.86135673365891,activityScore:19.759090909090908,traditionalPartnerCategory:"officer"},
      study:{supportScore:61.584720370022545,activityScore:26.192727272727275},change:{supportScore:59.80291369271225,activityScore:21}});
    expect(seun).toMatchObject({periodId:"CATEGORY:SEUN-2043",peakActivityScore:41.98303977272727,
      peakActivitySegmentId:"CATEGORY:SEUN-2043:DAEUN-02",peakPressureScore:56.40830771572178,
      peakPressureSegmentId:"CATEGORY:SEUN-2043:DAEUN-02"});
  });

  it("AQ-AX: preserves all sources, reconstructs score evidence, and is deterministic",()=>{
    const before={synthesis:structuredClone(fortune.synthesis),transformation:structuredClone(fortune.transformation),daeun:structuredClone(fortune.daeun),
      seun:structuredClone(fortune.seun),wolun:structuredClone(fortune.wolun),adjusted:structuredClone(result.fiveElements.adjustedStrength),useful:structuredClone(result.usefulGods)};
    const regenerated=evaluateCategoryFortune(synthesis,result.person.gender,{structureType:result.structure.primary?.type??null,
      usefulGodHighestElement:result.usefulGods.synthesis.status==="implemented"?result.usefulGods.synthesis.highestElement:null});expect(regenerated).toEqual(output);
    for(const row of [...output.daeun,...output.seun,...output.wolun])for(const name of ["overallFlow","business","career","study","change"] as const){const axis=row[name] as CategoryAxis;
      expect(axis.supportScore).toBeCloseTo(rebuild(axis.supportEvidence),12);expect(axis.activityScore).toBeCloseTo(rebuild(axis.activityEvidence),12);}
    expect(fortune.synthesis).toEqual(before.synthesis);expect(fortune.transformation).toEqual(before.transformation);expect(fortune.daeun).toEqual(before.daeun);
    expect(fortune.seun).toEqual(before.seun);expect(fortune.wolun).toEqual(before.wolun);expect(result.fiveElements.adjustedStrength).toEqual(before.adjusted);
    expect(result.usefulGods).toEqual(before.useful);expect(output.status).toBe("implemented");
  });
});
