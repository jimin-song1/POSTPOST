import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/engine";
import { countRawElements } from "@/lib/saju/fiveElements/raw-count";
import { buildInterpretationInput } from "@/lib/saju/ai-interpretation/input-builder";
import { selectCurrentPeriods } from "@/lib/saju/presentation/current-period";
import type { FortuneResult } from "@/types/fortune";
import type { FortuneSynthesisResult } from "@/types/fortune-synthesis";
import type { Branch, Pillar, PillarPosition, Stem } from "@/types/saju-analysis";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const stableSubset = (analysis: ReturnType<typeof calculateSaju>) => ({
  pillars: analysis.pillars,
  dayMaster: analysis.dayMaster,
  fiveElements: analysis.fiveElements,
  strength: analysis.strength,
  structure: analysis.structure,
  usefulGods: analysis.usefulGods,
  stemPreferences: analysis.stemPreferences,
  branchPreferences: analysis.branchPreferences,
  nobleAndSpecialStars: analysis.nobleAndSpecialStars,
  daeun: analysis.daeun,
  fortune: analysis.fortune,
});

describe("RELEASE_CANDIDATE_V1", () => {
  it("locks the canonical pure pillars and raw element counts", () => {
    const positions: PillarPosition[] = ["year", "month", "day", "hour"];
    const stems: Stem[] = ["乙", "乙", "甲", "戊"], branches: Branch[] = ["亥", "酉", "子", "辰"];
    const pillars = Object.fromEntries(positions.map((position, index) => [position, {
      position, stem: stems[index], branch: branches[index], hanja: `${stems[index]}${branches[index]}`, korean: null,
    }])) as Record<PillarPosition, Pillar>;
    expect(positions.map((key) => pillars[key].hanja)).toEqual(["乙亥", "乙酉", "甲子", "戊辰"]);
    expect(pillars.day.stem).toBe("甲");
    expect(countRawElements(pillars)).toEqual({ wood: 3, fire: 0, earth: 2, metal: 1, water: 2 });
  });

  it("produces a byte-equivalent deterministic subset for repeated analysis", () => {
    expect(JSON.stringify(stableSubset(calculateSaju(SYNTHETIC_INPUT))))
      .toBe(JSON.stringify(stableSubset(calculateSaju(SYNTHETIC_INPUT))));
  });

  it("selects fortune intervals as start-inclusive and end-exclusive", () => {
    const analysis = calculateSaju(SYNTHETIC_INPUT), fortune = analysis.fortune as FortuneResult;
    const period = fortune.wolun.status === "implemented" ? fortune.wolun.periods![0] : undefined;
    expect(period).toBeDefined();
    const atStart = selectCurrentPeriods(analysis, period!.period.startInstant);
    const atEnd = selectCurrentPeriods(analysis, period!.period.endInstant);
    expect(atStart.wolunIndex).toBe(period!.indexInSeun);
    expect(atEnd.wolunIndex === period!.indexInSeun && atEnd.seunYear === period!.seunYear).toBe(false);
  });

  it("keeps large wolun data out of the initial DOM and exposes term dates", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain("filter((item) => item.seunYear === year).slice(0, 12)");
    expect(source).toContain("date(period.period.startInstant)");
    expect(source).not.toContain("종합운");
    expect(source).not.toMatch(/신살[\s\S]{0,20}(점|score)/);
  });

  it("distinguishes network and interpretation failures without hiding analysis", async () => {
    const page = await readFile("src/app/page.tsx", "utf8");
    const component = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(page).toContain('code: "NETWORK_ERROR"');
    expect(component).toContain('state.error.code === "NETWORK_ERROR"');
    expect(component).toContain("사주 계산 결과는 정상");
    expect(component).not.toContain("사주 계산 실패");
  });

  it("keeps secrets and private birth data out of client and provider input", async () => {
    const page = await readFile("src/app/page.tsx", "utf8");
    const customer = await readFile("src/components/CustomerResult.tsx", "utf8");
    const builder = await readFile("src/lib/saju/ai-interpretation/input-builder.ts", "utf8");
    const analysis = calculateSaju(SYNTHETIC_INPUT), fortune = analysis.fortune as FortuneResult;
    const referenceInstant = (fortune.synthesis as FortuneSynthesisResult).wolun[0].period.startInstant;
    const providerInput = JSON.stringify(buildInterpretationInput(analysis, { reportType: "COMPREHENSIVE", referenceInstant }));
    expect(page + customer).not.toContain("OPENAI_API_KEY");
    expect(builder).not.toContain("birthCity:");
    expect(builder).not.toContain("birthDate:");
    expect(providerInput).not.toContain(SYNTHETIC_INPUT.name);
    expect(providerInput).not.toContain(SYNTHETIC_INPUT.birthCity);
    expect(providerInput).not.toContain(SYNTHETIC_INPUT.birthDate);
  });
});
