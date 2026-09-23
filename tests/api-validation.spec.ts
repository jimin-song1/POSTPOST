import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/saju/calculate/route";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const request = (body: unknown) => new Request("http://localhost/api/saju/calculate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

describe("POST /api/saju/calculate runtime validation", () => {
  it.each([
    ["빈 이름", { name: "  " }],
    ["잘못된 성별", { gender: "other" }],
    ["잘못된 달력", { calendarType: "gregorian" }],
    ["존재하지 않는 날짜", { birthDate: "2024-02-30" }],
    ["지원 범위 밖 날짜", { birthDate: "2101-01-01" }],
    ["첫 절입 이전", { birthDate: "1900-01-06" }],
    ["마지막 연도", { birthDate: "2100-01-01" }],
    ["잘못된 시간", { birthTime: "24:00" }],
    ["분이 없는 시간", { birthTime: "08" }],
    ["문자열 birthTimeKnown", { birthTimeKnown: "true" }],
    ["소문자 국가코드", { birthCountry: "kr" }],
    ["양력의 윤달 값", { lunarLeapMonth: "normal" }]
  ])("%s을 400으로 거부한다", async (_label, override) => {
    expect((await POST(request({ ...SYNTHETIC_INPUT, ...override }))).status).toBe(400);
  });

  it.each(["1900-01-07", "2099-12-31"])("지원 경계 %s에서 양쪽 절기를 찾는다", async (birthDate) => {
    const response = await POST(request({ ...SYNTHETIC_INPUT, birthDate, birthTime: "12:00" }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.solarTerms.value.previousJeol).toBeTruthy();
    expect(result.solarTerms.value.nextJeol).toBeTruthy();
  });

  it("음력은 평달/윤달 값이 필수다", async () => {
    expect((await POST(request({ ...SYNTHETIC_INPUT, calendarType: "lunar" }))).status).toBe(400);
  });

  it("유효한 음력 조합은 계약을 유지하되 미구현 상태로 반환한다", async () => {
    const response = await POST(request({ ...SYNTHETIC_INPUT, calendarType: "lunar", lunarLeapMonth: "normal" }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.engineMetadata.calculationMode).toBe("unsupported_input");
    expect(result.warnings.some((warning: string) => warning.includes("음력/윤달"))).toBe(true);
  });

  it("출생시간 미상은 시간을 비우고 미구현 원국으로 반환한다", async () => {
    const response = await POST(request({ ...SYNTHETIC_INPUT, birthTimeKnown: false, birthTime: null }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.birthNormalized.adjustedDateTime).toBeNull();
    expect(result.engineMetadata.calculationMode).toBe("unsupported_input");
  });

  it("출생시간 미상인데 시간을 보내면 400을 반환한다", async () => {
    expect((await POST(request({ ...SYNTHETIC_INPUT, birthTimeKnown: false }))).status).toBe(400);
  });
});
