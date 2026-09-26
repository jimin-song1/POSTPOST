import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/saju/calculate/route";
import { SajuResultDebug } from "@/components/SajuResultDebug";
import { SajuInputForm } from "@/components/SajuInputForm";
import { calculateSaju } from "@/lib/saju/engine";
import { normalizeBirthPlace, SEOUL_FALLBACK_NOTICE } from "@/lib/saju/normalize-birth-place";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const unknown = { ...SYNTHETIC_INPUT, birthCityKnown: false, birthCity: null };
const request = (body: unknown) => new Request("http://localhost/api/saju/calculate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

describe("Birth Place Rules v1", () => {
  it("preserves a known Korean city without fallback metadata", () => {
    expect(calculateSaju(SYNTHETIC_INPUT).birthNormalized.birthPlace).toEqual({
      inputCity: "가상도시", resolvedCity: "가상도시", country: "KR",
      isEstimated: false, fallbackReason: null, fallbackRule: null
    });
  });
  it("records Seoul fallback and its reason in the API JSON", async () => {
    const response = await POST(request(unknown));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.birthNormalized.birthPlace).toEqual({
      inputCity: null, resolvedCity: "서울특별시", country: "KR", isEstimated: true,
      fallbackReason: "birth_place_unknown", fallbackRule: "SEOUL_DEFAULT"
    });
    expect(result.warnings).toContain(SEOUL_FALLBACK_NOTICE);
    expect(result.birthInput.birthCity).toBeNull();
  });
  it.each([undefined, null, "", "   "])("rejects foreign births with missing city %s, even when unknown", async (birthCity) => {
    for (const birthCityKnown of [true, false]) {
      const response = await POST(request({ ...SYNTHETIC_INPUT, birthCountry: "US", birthCityKnown, birthCity }));
      expect(response.status).toBe(400);
    }
  });
  it("rejects foreign birth without returning Korean normalization metadata", async () => {
    const response = await POST(request({ ...SYNTHETIC_INPUT, birthCountry: "US", birthCity: "New York" }));
    expect(response.status).toBe(422);
    const result = await response.json();
    expect(result).toEqual({ code: "UNSUPPORTED_BIRTH_COUNTRY", message: "해외 출생 시간 계산은 현재 지원되지 않습니다." });
    expect(JSON.stringify(result)).not.toMatch(/Asia\/Seoul|-30|\+09:00/);
  });
  it.each([undefined, null, "", "  "])("rejects known KR city missing %s", async (birthCity) => {
    expect((await POST(request({ ...SYNTHETIC_INPUT, birthCity }))).status).toBe(400);
  });
  it.each([undefined, null, "", "  ", "stale city"])("ignores city when KR explicitly unknown: %s", (birthCity) => {
    expect(normalizeBirthPlace({ birthCountry: "KR", birthCityKnown: false, birthCity })).toMatchObject({ birthCity: null, birthPlace: { resolvedCity: "서울특별시", inputCity: null } });
  });
  it("preserves nonempty city text verbatim", () => {
    expect(normalizeBirthPlace({ birthCity: " 가상도시 " }).birthPlace.resolvedCity).toBe(" 가상도시 ");
  });
  it("canonicalizes the legacy request without changing SYNTHETIC_CORE_001", async () => {
    const { birthCountry, birthCityKnown, ...legacy } = SYNTHETIC_INPUT;
    const legacyRequest = { ...legacy, birthCity: legacy.birthCity! };
    const oldResult = calculateSaju(legacyRequest);
    const result = calculateSaju(SYNTHETIC_INPUT);
    expect(oldResult.pillars).toEqual(result.pillars);
    expect(oldResult.birthNormalized).toEqual(result.birthNormalized);
    const response = await POST(request(legacyRequest));
    expect(response.status).toBe(200);
    expect((await response.json()).birthInput).toEqual(SYNTHETIC_INPUT);
  });
  it.each([
    { birthCountry: null }, { birthCountry: "" }, { birthCountry: "KOREA" },
    { birthCountry: "kr" }, { birthCountry: 12 }, { birthCityKnown: "false" },
    { birthCityKnown: null }, { birthCity: 12 }, { birthCity: {} },
    { birthCountry: undefined }, { birthCityKnown: undefined }
  ])("rejects malformed or partial canonical location fields %j", async (fields) => {
    expect((await POST(request({ ...SYNTHETIC_INPUT, ...fields }))).status).toBe(400);
  });
  it.each([null, [], 12, "bad"])("rejects invalid request objects %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
  });
  it("rejects malformed JSON with 400", async () => {
    expect((await POST(new Request("http://localhost/api/saju/calculate", { method: "POST", body: "{" }))).status).toBe(400);
  });
  it("resolves location even with unknown birth time", () => {
    const result = calculateSaju({ ...unknown, birthTimeKnown: false, birthTime: null });
    expect(result.birthNormalized.adjustedDateTime).toBeNull();
    expect(result.birthNormalized.birthPlace.isEstimated).toBe(true);
  });
  it("keeps the -30 minute rule and previous-day rollover", () => {
    const result = calculateSaju({ ...SYNTHETIC_INPUT, birthTime: "00:10" });
    expect(result.birthNormalized.adjustedDateTime).toBe("2024-03-31T23:40:00+09:00");
  });
  it("renders birthNormalized.birthPlace in Debug JSON and the visible fallback notice", () => {
    const result = calculateSaju(unknown);
    const html = renderToStaticMarkup(createElement(SajuResultDebug, { result }));
    expect(html).toContain(`<p role="status">${SEOUL_FALLBACK_NOTICE}</p>`);
    const pre = html.match(/<pre>([\s\S]*?)<\/pre>/)![1];
    const json = JSON.parse(pre.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    expect(json.birthNormalized.birthPlace).toEqual(result.birthNormalized.birthPlace);
  });
  it("does not show the fallback notice for known cities", () => {
    const html = renderToStaticMarkup(createElement(SajuResultDebug, { result: calculateSaju(SYNTHETIC_INPUT) }));
    expect(html).not.toContain(SEOUL_FALLBACK_NOTICE);
  });
  it("renders the canonical Korean searchable-location form default", () => {
    const html = renderToStaticMarkup(createElement(SajuInputForm, { onResult: () => {} }));
    expect(html).toContain("출생 국가");
    expect(html).toContain("대한민국");
    expect(html).toContain("출생 도시");
    expect(html).toContain("선택해 주세요");
    expect(html).toContain('value=""');
  });
});
