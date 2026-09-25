import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { selectCurrentPeriods } from "@/lib/saju/presentation/current-period";
import { ACTIVATION_LABELS, FAVORABILITY_LABELS, roundPresentationScore } from "@/lib/saju/presentation/format";
import type { SajuAnalysis } from "@/types/saju-analysis";

describe("CUSTOMER_RESULT_UI_V1", () => {
  it("rounds for presentation without mutating the source value", () => {
    const raw = 66.04642861387065;
    expect(roundPresentationScore(raw)).toBe(66);
    expect(roundPresentationScore(raw, 1)).toBe(66);
    expect(raw).toBe(66.04642861387065);
  });

  it("keeps favorability and activation semantics separate", () => {
    expect(FAVORABILITY_LABELS.CONDITIONAL).toBe("조건부");
    expect(ACTIVATION_LABELS.VERY_HIGH).toBe("매우 높음");
    expect(ACTIVATION_LABELS.VERY_HIGH).not.toContain("나쁨");
  });

  it("uses server-selected absolute intervals including exact boundaries", () => {
    const analysis = {
      daeun: { periods: [{ startInstant: "2026-01-01T00:00:00.000Z", endInstant: "2027-01-01T00:00:00.000Z" }] },
      fortune: { seun: { status: "implemented", periods: [{ year: 2026, period: { startInstant: "2026-02-04T00:00:00.000Z", endInstant: "2027-02-04T00:00:00.000Z" } }] },
        wolun: { status: "implemented", periods: [{ indexInSeun: 0, period: { startInstant: "2026-02-04T00:00:00.000Z", endInstant: "2026-03-05T00:00:00.000Z" } }] } }
    } as unknown as SajuAnalysis;
    expect(selectCurrentPeriods(analysis, "2026-02-04T00:00:00.000Z")).toMatchObject({ daeunIndex: 0, seunYear: 2026, wolunIndex: 0 });
    expect(selectCurrentPeriods(analysis, "2027-02-04T00:00:00.000Z").seunYear).toBeNull();
  });

  it("renders only the selected seun year's twelve solar-term months", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain("filter((item) => item.seunYear === year).slice(0, 12)");
    expect(source).toContain("절기 경계");
    expect(source).not.toContain("2월 운");
  });

  it("keeps support, activity and expense pressure independent", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain('label="지원도"');
    expect(source).toContain('label="활성도"');
    expect(source).toContain('label="지출 압력"');
    expect(source).not.toContain("종합운");
    expect(source).not.toContain("결혼 확률");
  });

  it("keeps the OpenAI key and debug JSON out of the production customer bundle", async () => {
    const page = await readFile("src/app/page.tsx", "utf8");
    const component = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(page).not.toContain("OPENAI_API_KEY");
    expect(component).toContain('process.env.NODE_ENV !== "production"');
  });

  it("keeps selected seun, wolun and category presentation synchronized", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain("selectedYear={selectedYear}");
    expect(source).toContain("item.context.seunYear === selectedYear");
    expect(source).toContain("onYearChange(period.year)");
  });

  it("offers customer navigation without exposing raw evidence IDs in production", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain('aria-label="결과 빠른 이동"');
    expect(source).toContain("다시 입력하기");
    expect(source).toContain('process.env.NODE_ENV !== "production" && <code>{id}</code>');
  });

  it("uses Korean-first story sections and keeps specialist data behind disclosure", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain("사주 이야기");
    expect(source).toContain("한눈에 보는 나");
    expect(source).toContain("나를 이루는 다섯 기운");
    expect(source).toContain("숫자보다 결론을 먼저 읽고");
    expect(source).toContain('id="professional"');
    expect(source).toContain("원국과 명리 용어를 자세히 보고 싶다면");
  });

  it("translates alignment and element terminology without changing source scores", async () => {
    const source = await readFile("src/components/CustomerResult.tsx", "utf8");
    expect(source).toContain('LOW_ALIGNMENT: "어울림이 낮은 편"');
    expect(source).toContain('wood: { name: "나무"');
    expect(source).toContain('fire: { name: "불"');
    expect(source).toContain("axes.transformationAlignment.adjustedScore");
  });
});
