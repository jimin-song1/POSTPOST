import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { alignmentDirection,alignmentLevel,alignLayerProfile,normalizedFortuneLayerWeights,
  summarizeFortunePeriod,synthesizeFortune } from "@/lib/saju/fortune/fortune-synthesis";
import type { FortuneResult } from "@/types/fortune";
import type { FortuneElementProfile } from "@/types/fortune-transformation";
import type { FortuneSynthesisPeriod,FortuneSynthesisResult } from "@/types/fortune-synthesis";
import type { SynthesisResult } from "@/types/useful-gods";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const result=calculateSaju(SYNTHETIC_INPUT),fortune=result.fortune as FortuneResult;
if(fortune.status!=="partial"||fortune.synthesis.status!=="implemented"||fortune.transformation.status!=="implemented"||
  result.usefulGods.synthesis.status!=="implemented"||!result.pillars.day.stem)throw new Error("15 fixture unavailable");
const synthesis=fortune.synthesis as FortuneSynthesisResult,useful=result.usefulGods.synthesis as SynthesisResult;
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);

describe("SYNTHETIC_FORTUNE_SYNTHESIS_V1",()=>{
  it("A-D: normalizes only available layer weights",()=>{
    expect(sum(Object.values({DAEUN:.45,SEUN:.35,WOLUN:.20}))).toBe(1);
    expect(normalizedFortuneLayerWeights(["DAEUN"])).toEqual({DAEUN:1});
    expect(normalizedFortuneLayerWeights(["DAEUN","SEUN"])).toEqual({DAEUN:.5625,SEUN:.43749999999999994});
    expect(normalizedFortuneLayerWeights(["DAEUN","SEUN","WOLUN"])).toEqual({DAEUN:.45,SEUN:.35,WOLUN:.2});
  });

  it("E-I: reconstructs favorability and activation independently from existing layer scores",()=>{
    for(const row of [...synthesis.daeun,...synthesis.seun,...synthesis.wolun]){
      expect(row.favorability.score).toBeCloseTo(sum(row.favorability.layerContributions.map(item=>item.score*item.weight)),12);
      expect(row.activation.score).toBeCloseTo(sum(row.activation.layerContributions.map(item=>item.score*item.weight)),12);
      expect(row.favorability.layerContributions.map(item=>item.sourceId)).toEqual(row.activation.layerContributions.map(item=>item.sourceId));
      expect(row).not.toHaveProperty("overallScore");
    }
    const syntheticFav=80*.5625+60*.4375,syntheticActivation=20*.5625+60*.4375;
    expect(syntheticFav).toBe(71.25);expect(syntheticActivation).toBe(37.5);expect(syntheticFav).not.toBe(syntheticActivation);
  });

  it("J-R: calculates layer-weighted base/adjusted alignment, deltas and exact boundaries",()=>{
    const preference={wood:100,fire:75,earth:50,metal:25,water:0},profile:FortuneElementProfile={layer:"SEUN",key:"TEST",pillar:"甲子",
      base:{wood:11,fire:0,earth:0,metal:0,water:11},adjusted:{wood:16.5,fire:0,earth:0,metal:0,water:5.5},
      baseTotal:22,adjustedTotal:22,percentages:{wood:75,fire:0,earth:0,metal:0,water:25},contributions:[]};
    const aligned=alignLayerProfile(profile,preference);expect(aligned.baseAlignment).toBe(50);expect(aligned.adjustedAlignment).toBe(75);
    expect(aligned.delta).toBe(25);expect(aligned.direction).toBe("MORE_ALIGNED");
    profile.adjusted={wood:5.5,fire:0,earth:0,metal:0,water:16.5};expect(alignLayerProfile(profile,preference).delta).toBe(-25);
    profile.adjusted={...profile.base};expect(alignLayerProfile(profile,preference).delta).toBe(0);
    expect([5,1,.999,-.999,-1,-4.999,-5].map(alignmentDirection)).toEqual(["MORE_ALIGNED","SLIGHTLY_MORE_ALIGNED","UNCHANGED",
      "UNCHANGED","SLIGHTLY_LESS_ALIGNED","SLIGHTLY_LESS_ALIGNED","LESS_ALIGNED"]);
    expect([34.999,35,44.999,45,59.999,60,69.999,70,79.999,80].map(alignmentLevel)).toEqual([
      "VERY_LOW_ALIGNMENT","LOW_ALIGNMENT","LOW_ALIGNMENT","MIXED_ALIGNMENT","MIXED_ALIGNMENT","FAVORABLE_ALIGNMENT",
      "FAVORABLE_ALIGNMENT","HIGH_ALIGNMENT","HIGH_ALIGNMENT","VERY_HIGH_ALIGNMENT"]);
    for(const row of [...synthesis.daeun,...synthesis.seun,...synthesis.wolun]){
      const rebuiltBase=sum(row.transformationAlignment.layerAlignments.map(item=>item.baseAlignment*(row.layerWeights[item.layer.toLowerCase() as "daeun"|"seun"|"wolun"]!)));
      const rebuiltAdjusted=sum(row.transformationAlignment.layerAlignments.map(item=>item.adjustedAlignment*(row.layerWeights[item.layer.toLowerCase() as "daeun"|"seun"|"wolun"]!)));
      expect(row.transformationAlignment.baseScore).toBeCloseTo(rebuiltBase,12);expect(row.transformationAlignment.adjustedScore).toBeCloseTo(rebuiltAdjusted,12);
      expect(row.transformationAlignment.delta).toBeCloseTo(rebuiltAdjusted-rebuiltBase,12);
    }
  });

  it("S-W/AO-AP: creates deterministic Daeun, segmented Seun and Wolun results linked 1:1 to 14D IDs",()=>{
    expect(synthesis.daeun.map(row=>row.synthesisId)).toEqual(fortune.transformation.status==="implemented"?fortune.transformation.daeunSnapshots.map(row=>row.snapshotId):[]);
    expect(synthesis.seun.map(row=>row.synthesisId)).toEqual(fortune.transformation.status==="implemented"?fortune.transformation.seunSnapshots.map(row=>row.snapshotId):[]);
    expect(synthesis.wolun.map(row=>row.synthesisId)).toEqual(fortune.transformation.status==="implemented"?fortune.transformation.wolunSnapshots.map(row=>row.snapshotId):[]);
    expect(synthesis.seun.some((row,index,all)=>all.some(other=>other!==row&&other.context.seunYear===row.context.seunYear))).toBe(true);
    expect(synthesis.wolun.some((row,index,all)=>all.some(other=>other!==row&&other.context.seunYear===row.context.seunYear&&other.context.wolunBranch===row.context.wolunBranch))).toBe(true);
    expect(synthesis.daeun.every(row=>row.layers.join(",")==="DAEUN")).toBe(true);
    expect(synthesis.seun.every(row=>row.layers.join(",")==="DAEUN,SEUN")).toBe(true);
    expect(synthesis.wolun.every(row=>row.layers.join(",")==="DAEUN,SEUN,WOLUN")).toBe(true);
    expect(synthesis.daeun[0]).toMatchObject({synthesisId:"DAEUN-01",favorability:{score:59.02680785123968,level:"CONDITIONAL"},
      activation:{score:21,level:"MODERATE"},transformationAlignment:{baseScore:59.31574004507891,
        adjustedScore:60.57901953418483,direction:"SLIGHTLY_MORE_ALIGNED"}});
    expect(synthesis.seun[0]).toMatchObject({synthesisId:"SEUN-2033:DAEUN-01",favorability:{score:61.55743518555309,level:"FAVORABLE"},
      activation:{score:28.437499999999996,level:"MODERATE"},transformationAlignment:{baseScore:61.59869206207017,
        adjustedScore:62.309286774692254,direction:"UNCHANGED"}});
    expect(synthesis.wolun[0]).toMatchObject({synthesisId:"WOLUN-2033-辰:DAEUN-01",favorability:{score:66.02406596244664,level:"FAVORABLE"},
      activation:{score:38.55,level:"HIGH"},transformationAlignment:{baseScore:66.07376074338885,
        adjustedScore:66.07376074338885,direction:"UNCHANGED"}});
    expect(synthesis.daeun.map(row=>row.context.daeunIndex)).toEqual([...synthesis.daeun].map(row=>row.context.daeunIndex).sort((a,b)=>a-b));
    expect(synthesis.seun.map(row=>row.period.startInstant)).toEqual([...synthesis.seun].map(row=>row.period.startInstant).sort());
    expect(synthesis.wolun.map(row=>row.period.startInstant)).toEqual([...synthesis.wolun].map(row=>row.period.startInstant).sort());
  });

  it("X-Y: duration-weights multi-segment summaries while retaining activation peaks and delta extremes",()=>{
    const base=structuredClone(synthesis.seun[0]) as FortuneSynthesisPeriod,start=Date.parse("2040-01-01T00:00:00.000Z"),end=start+1000;
    const a={...structuredClone(base),synthesisId:"A",period:{startInstant:new Date(start).toISOString(),endInstant:new Date(start+700).toISOString()}};
    a.favorability.score=80;a.activation.score=20;a.transformationAlignment.baseScore=55;a.transformationAlignment.adjustedScore=60;a.transformationAlignment.delta=5;
    const b={...structuredClone(base),synthesisId:"B",period:{startInstant:new Date(start+700).toISOString(),endInstant:new Date(end).toISOString()}};
    b.favorability.score=60;b.activation.score=100;b.transformationAlignment.baseScore=50;b.transformationAlignment.adjustedScore=40;b.transformationAlignment.delta=-10;
    const summary=summarizeFortunePeriod("TEST",{startInstant:new Date(start).toISOString(),endInstant:new Date(end).toISOString()},[a,b]);
    expect(summary.segmentWeights.map(row=>row.weight)).toEqual([.7,.3]);expect(summary.favorabilityScore).toBe(74);
    expect(summary.activationScore).toBe(44);expect(summary.peakActivationScore).toBe(100);expect(summary.peakSegmentId).toBe("B");
    expect(summary.maxPositiveDelta).toBe(5);expect(summary.maxNegativeDelta).toBe(-10);
    const regression=synthesis.seunPeriodSummaries.find(row=>row.periodId==="SEUN-2043")!;
    expect(regression.segmentIds).toEqual(["SEUN-2043:DAEUN-01","SEUN-2043:DAEUN-02"]);
    expect(regression.favorabilityScore).toBeCloseTo(37.294609686434114,12);expect(regression.activationScore).toBeCloseTo(38.29641500122106,12);
    expect(regression.peakActivationScore).toBe(40.5);expect(regression.peakSegmentId).toBe("SEUN-2043:DAEUN-02");
  });

  it("Z-AA: emits a five-category ten-god flow totaling 100%",()=>{
    for(const row of [...synthesis.daeun,...synthesis.seun,...synthesis.wolun]){
      expect(Object.keys(row.tenGodFlow).sort()).toEqual(["companion","officer","output","resource","wealth"]);
      expect(sum(Object.values(row.tenGodFlow))).toBeCloseTo(100,10);
    }
  });

  it("AB-AH: keeps stars, samjae and void as context-only tags",()=>{
    const tagged=[...synthesis.daeun,...synthesis.seun,...synthesis.wolun].filter(row=>row.tags.length);
    expect(tagged.length).toBeGreaterThan(0);expect(tagged.some(row=>row.tags.includes("VOID_ACTIVATED"))).toBe(true);
    expect(synthesis.seun.some(row=>row.tags.includes("SAMJAE_ACTIVATED"))).toBe(true);
    for(const row of tagged){expect(row.favorability.score).toBeCloseTo(sum(row.favorability.layerContributions.map(item=>item.weightedScore)),12);
      expect(row.activation.score).toBeCloseTo(sum(row.activation.layerContributions.map(item=>item.weightedScore)),12);}
  });

  it("AI-AS: preserves every source, reconstructs evidence and is deterministic",()=>{
    const before={daeun:structuredClone(fortune.daeun),seun:structuredClone(fortune.seun),wolun:structuredClone(fortune.wolun),
      transformation:structuredClone(fortune.transformation),adjusted:structuredClone(result.fiveElements.adjustedStrength),useful:structuredClone(result.usefulGods)};
    const rebuilt=synthesizeFortune(fortune,useful,result.pillars.day.stem!);expect(rebuilt).toEqual(synthesis);
    expect(fortune.daeun).toEqual(before.daeun);expect(fortune.seun).toEqual(before.seun);expect(fortune.wolun).toEqual(before.wolun);
    expect(fortune.transformation).toEqual(before.transformation);expect(result.fiveElements.adjustedStrength).toEqual(before.adjusted);
    expect(result.usefulGods).toEqual(before.useful);expect(synthesis.status).toBe("implemented");
    const sourceIds=new Set<string>([...fortune.daeun.periods.flatMap(row=>row.interactions),...(fortune.seun.periods??[]).flatMap(row=>[
      ...row.interactions.natal,...row.interactions.daeun,...row.interactions.crossLayer]),...(fortune.wolun.periods??[]).flatMap(row=>[
      ...row.interactions.natal,...row.interactions.daeun,...row.interactions.seun,...row.interactions.crossLayer])].map(row=>row.id));
    for(const row of [...synthesis.daeun,...synthesis.seun,...synthesis.wolun])expect(row.topInteractions.every(top=>sourceIds.has(top.id))).toBe(true);
  });
});
