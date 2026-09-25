import { describe,expect,it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { applyFortuneTransfers,buildFortuneContributions,evaluateFortuneTransformation,
  fortuneTransformationState,fortuneTransferRatio } from "@/lib/saju/fortune/fortune-transformation";
import type { Element } from "@/types/saju-analysis";
import type { FortuneResult } from "@/types/fortune";
import type { FortuneElementProfile,FortuneLayer,FortuneTransformationEvaluation,
  FortuneTransformationResult } from "@/types/fortune-transformation";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const elements:Element[]=["wood","fire","earth","metal","water"],empty=()=>({wood:0,fire:0,earth:0,metal:0,water:0});
const result=calculateSaju(SYNTHETIC_INPUT);
if(result.fortune.status!=="partial"||!("transformation" in result.fortune)||result.fortune.transformation.status!=="implemented"||
  !result.fiveElements.nativeStrength)throw new Error("14D fixture unavailable");
const transformation=result.fortune.transformation as FortuneTransformationResult;
const profile=(layer:FortuneLayer,key:string,pillar:{stem:any;branch:any}):FortuneElementProfile=>{const contributions=buildFortuneContributions(layer,key,pillar),base=empty();
  for(const item of contributions)base[item.element]+=item.baseAmount;return{layer,key,pillar:`${pillar.stem}${pillar.branch}`,base,adjusted:{...base},
    baseTotal:22,adjustedTotal:22,percentages:Object.fromEntries(elements.map(element=>[element,base[element]/22*100])) as Record<Element,number>,contributions};};
const evaluation=(id:string,targetElement:Element,state:"TRANSFORMED"|"PARTIAL"|"COMBINATION_ONLY"|"WEAK",sourceContributionIds:string[],partialGroup=false):FortuneTransformationEvaluation=>({
  relationId:id,relationType:"STEM_COMBINATION",targetElement,score:state==="TRANSFORMED"?5:state==="PARTIAL"?3:state==="COMBINATION_ONLY"?0:-1,
  state,partialGroup,factors:[],sourceContributionIds,blockingRelations:[],competingRelations:[]});

describe("SYNTHETIC_FORTUNE_TRANSFORMATION_V1",()=>{
  it("A-C: creates deterministic 10+12=22 contribution profiles and hidden-stem distributions",()=>{
    const one=buildFortuneContributions("DAEUN","DAEUN-01",{stem:"甲",branch:"子"}),
      two=buildFortuneContributions("SEUN","SEUN-2038",{stem:"戊",branch:"午"}),
      three=buildFortuneContributions("WOLUN","WOLUN-2038-戌",{stem:"庚",branch:"戌"});
    for(const rows of [one,two,three])expect(rows.reduce((sum,item)=>sum+item.baseAmount,0)).toBeCloseTo(22,12);
    expect(one.map(item=>item.baseAmount)).toEqual([10,12]);expect(two.map(item=>item.baseAmount)).toEqual([10,9,3]);
    [10,8.4,2.4,1.2].forEach((amount,index)=>expect(three[index].baseAmount).toBeCloseTo(amount,12));
    expect(one.map(item=>item.id)).toEqual(["DAEUN-01:STEM:甲","DAEUN-01:BRANCH:子:MAIN:癸"]);
  });

  it("D-K: transfers fortune sources only, including both sides of fortune↔fortune and multi-layer candidates",()=>{
    const daeun=profile("DAEUN","DAEUN-03",{stem:"甲",branch:"申"}),seun=profile("SEUN","SEUN-2038",{stem:"己",branch:"辰"}),
      wolun=profile("WOLUN","WOLUN-2038-子",{stem:"丁",branch:"子"}),daeunStem=daeun.contributions[0].id,seunStem=seun.contributions[0].id,
      wolunBranch=wolun.contributions.filter(item=>item.sourceType==="HIDDEN_STEM").map(item=>item.id);
    const transfers=applyFortuneTransfers("TEST",[daeun,seun,wolun],[
      evaluation("NATAL-SEUN","earth","TRANSFORMED",[seunStem]),
      evaluation("DAEUN-SEUN","earth","TRANSFORMED",[daeunStem,seunStem]),
      evaluation("MULTI","water","TRANSFORMED",wolunBranch)]);
    expect(transfers.every(item=>item.sourceContributionId.startsWith("DAEUN-")||item.sourceContributionId.startsWith("SEUN-")||item.sourceContributionId.startsWith("WOLUN-"))).toBe(true);
    expect(transfers.filter(item=>item.relationId==="NATAL-SEUN").map(item=>item.layer)).toEqual(["SEUN"]);
    expect(new Set(transfers.filter(item=>item.relationId==="DAEUN-SEUN").map(item=>item.layer))).toEqual(new Set(["DAEUN","SEUN"]));
    expect(transfers.filter(item=>item.relationId==="MULTI").every(item=>item.layer==="WOLUN")).toBe(true);
  });

  it("L-O: reuses thresholds and 60/30/0 transfer ratios",()=>{
    expect([[5,false,"TRANSFORMED"],[3,false,"PARTIAL"],[0,false,"COMBINATION_ONLY"],[-1,false,"WEAK"],[8,true,"PARTIAL"]]
      .map(([score,partial])=>fortuneTransformationState(score as number,partial as boolean))).toEqual(["TRANSFORMED","PARTIAL","COMBINATION_ONLY","WEAK","PARTIAL"]);
    expect(fortuneTransferRatio("TRANSFORMED")).toBe(.6);expect(fortuneTransferRatio("PARTIAL")).toBe(.3);
    expect(fortuneTransferRatio("TRANSFORMED",true)).toBe(.3);expect(fortuneTransferRatio("COMBINATION_ONLY")).toBe(0);
    expect(fortuneTransferRatio("WEAK")).toBe(0);
  });

  it("P-R: proportionally scales competing requests, never goes negative, and records same-element net zero",()=>{
    const layer=profile("SEUN","SEUN-2040",{stem:"甲",branch:"子"}),source=layer.contributions[0];
    const transfers=applyFortuneTransfers("COMPETE",[layer],[evaluation("A","fire","TRANSFORMED",[source.id]),
      evaluation("B","earth","TRANSFORMED",[source.id]),evaluation("SAME","wood","PARTIAL",[source.id])]);
    expect(transfers.every(item=>item.scale<1&&item.remainingAmount>=0)).toBe(true);
    expect(transfers.reduce((sum,item)=>sum+item.actualAmount,0)).toBeCloseTo(source.baseAmount,12);
    expect(transfers.find(item=>item.relationId==="SAME")!.netElementChange).toBe(0);
  });

  it("S-T/AO: conserves every layer and combined profile and reconstructs adjusted values from the ledger",()=>{
    for(const snapshot of [...transformation.daeunSnapshots,...transformation.seunSnapshots,...transformation.wolunSnapshots]){
      for(const layer of snapshot.layerProfiles){expect(layer.baseTotal).toBeCloseTo(22,10);expect(layer.adjustedTotal).toBeCloseTo(22,10);
        const rebuilt={...layer.base};for(const transfer of snapshot.transfers.filter(item=>item.layer===layer.layer)){
          rebuilt[transfer.fromElement]-=transfer.actualAmount;rebuilt[transfer.toElement]+=transfer.actualAmount;}
        for(const element of elements)expect(rebuilt[element]).toBeCloseTo(layer.adjusted[element],10);}
      expect(snapshot.combinedProfile.baseTotal).toBeCloseTo(snapshot.layerProfiles.length*22,10);
      expect(snapshot.combinedProfile.adjustedTotal).toBeCloseTo(snapshot.combinedProfile.baseTotal,10);
    }
  });

  it("U-AA/AP: creates deterministic segmented snapshots with correct seasonal contexts and IDs",()=>{
    expect(transformation.daeunSnapshots).toHaveLength((result.fortune as FortuneResult).daeun.periods.length);
    expect(transformation.seunSnapshots).toHaveLength((result.fortune as FortuneResult).seun.periods!.reduce((sum,row)=>sum+row.daeunSegments.length,0));
    expect(transformation.wolunSnapshots).toHaveLength((result.fortune as FortuneResult).wolun.periods!.reduce((sum,row)=>sum+row.daeunSegments.length,0));
    expect(transformation.daeunSnapshots.every(row=>row.snapshotId.startsWith("DAEUN-")&&row.seasonContext.source==="NATAL_MONTH_BASELINE")).toBe(true);
    expect(transformation.seunSnapshots.every(row=>row.snapshotId.startsWith("SEUN-")&&row.seasonContext.source==="NATAL_MONTH_BASELINE")).toBe(true);
    expect(transformation.wolunSnapshots.every(row=>row.snapshotId.startsWith("WOLUN-")&&row.seasonContext.source==="ACTIVE_WOLUN_BRANCH"&&
      row.seasonContext.branch===row.context.wolun!.monthBranch)).toBe(true);
    expect(transformation.daeunSnapshots.flatMap(row=>row.evaluations).flatMap(row=>row.factors)
      .filter(row=>row.factor==="adjacency").every(row=>row.status==="NOT_APPLICABLE"&&row.delta===0)).toBe(true);
  });

  it("AB-AC: records fortune factors while reusing existing transformation thresholds",()=>{
    const evaluations=[...transformation.daeunSnapshots,...transformation.seunSnapshots,...transformation.wolunSnapshots].flatMap(row=>row.evaluations);
    expect(evaluations.length).toBeGreaterThan(0);expect(evaluations.every(row=>row.state===fortuneTransformationState(row.score,row.partialGroup))).toBe(true);
    expect(evaluations.flatMap(row=>row.factors).some(row=>row.factor==="season")).toBe(true);
  });

  it("AD-AN/AQ-AR: leaves every upstream axis unchanged, is deterministic, and implements transformation only",()=>{
    const before={adjusted:structuredClone(result.fiveElements.adjustedStrength),natalTransformation:structuredClone(result.relations.transformation),
      daeun:structuredClone((result.fortune as FortuneResult).daeun),seun:structuredClone((result.fortune as FortuneResult).seun),
      wolun:structuredClone((result.fortune as FortuneResult).wolun),useful:structuredClone(result.usefulGods),stems:structuredClone(result.stemPreferences),
      branches:structuredClone(result.branchPreferences),stars:structuredClone(result.nobleAndSpecialStars)};
    const rebuilt=evaluateFortuneTransformation(result.fortune as FortuneResult,result.pillars,result.fiveElements.nativeStrength!);
    expect(rebuilt).toEqual(transformation);expect(result.fiveElements.adjustedStrength).toEqual(before.adjusted);
    expect(result.relations.transformation).toEqual(before.natalTransformation);expect((result.fortune as FortuneResult).daeun).toEqual(before.daeun);
    expect((result.fortune as FortuneResult).seun).toEqual(before.seun);expect((result.fortune as FortuneResult).wolun).toEqual(before.wolun);
    expect(result.usefulGods).toEqual(before.useful);expect(result.stemPreferences).toEqual(before.stems);
    expect(result.branchPreferences).toEqual(before.branches);expect(result.nobleAndSpecialStars).toEqual(before.stars);
    expect((result.fortune as FortuneResult).transformation.status).toBe("implemented");expect((result.fortune as FortuneResult).synthesis.status).toBe("not_implemented");
  });
});
