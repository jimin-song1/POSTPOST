import {describe,expect,it} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import type {FortuneResult} from "@/types/fortune";
import {SYNTHETIC_INPUT} from "./synthetic-input";

describe("SAMJAE_FORTUNE_V1",()=>{
  const analysis=calculateSaju(SYNTHETIC_INPUT),fortune=analysis.fortune as FortuneResult;
  it("creates whole-life three-year cycles from the natal year branch",()=>{
    expect(fortune.samjae.status).toBe("implemented");
    if(fortune.samjae.status!=="implemented")return;
    expect(fortune.samjae.samjaeCycles.length).toBeGreaterThan(5);
    for(const cycle of fortune.samjae.samjaeCycles){
      expect([cycle.startYear,cycle.middleYear,cycle.endYear]).toEqual([cycle.startYear,cycle.startYear+1,cycle.startYear+2]);
      expect(cycle.phases.map(row=>row.phase)).toEqual(["DEUL","NUL","NAL"]);
      expect(cycle.daeunIndexes.length).toBeGreaterThan(0);
    }
  });
  it("keeps samjae, activation and favorability as independent facts",()=>{
    if(fortune.samjae.status!=="implemented")return;
    const rows=fortune.samjae.years.filter(row=>row.isSamjae);
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map(row=>row.phase))).toEqual(new Set(["DEUL","NUL","NAL"]));
    expect(rows.every(row=>typeof row.supportScore==="number"&&typeof row.activationScore==="number")).toBe(true);
    expect(rows.some(row=>row.activationScore!==row.supportScore)).toBe(true);
    expect(fortune.samjae.evidence.join(" ")).toContain("별도 필드");
  });
  it("does not mutate the existing synthesis axes",()=>{
    if(fortune.samjae.status!=="implemented"||fortune.synthesis.status!=="implemented")return;
    for(const row of fortune.samjae.years){
      const summary=fortune.synthesis.seunPeriodSummaries.find(item=>item.periodId===`SEUN-${row.year}`)!;
      expect(row.supportScore).toBe(summary.favorabilityScore);
      expect(row.activationScore).toBe(summary.activationScore);
    }
  });
});
