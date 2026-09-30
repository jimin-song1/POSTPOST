import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/saju/interpret/route";
import { SYNTHETIC_INPUT } from "./synthetic-input";

describe("interpretation request payload", () => {
  it("sends only SajuInput from the browser and keeps the 154-page part batches", async () => {
    const source = await readFile("src/app/page.tsx", "utf8");
    expect(source).toContain("input:payload.analysis.birthInput");
    expect(source).not.toContain("analysis:payload.analysis");
    expect(source).toContain("const BATCH_SIZE=3");
    expect(source).toContain("lifetimePartNumber:partNumber");
  });

  it("rejects the former full-analysis request shape", async () => {
    const response = await POST(new Request("http://localhost/api/saju/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analysis: { birthInput: SYNTHETIC_INPUT }, reportType: "LIFETIME_GENERAL" })
    }));
    expect(response.status).toBe(400);
  });

  it("validates SajuInput before provider configuration is checked", async () => {
    const response = await POST(new Request("http://localhost/api/saju/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { ...SYNTHETIC_INPUT, birthDate: "not-a-date" }, reportType: "LIFETIME_GENERAL" })
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INTERPRETATION_ERROR" });
  });

  it("recalculates deterministically on the server before interpretation", async () => {
    const source = await readFile("src/app/api/saju/interpret/route.ts", "utf8");
    expect(source).toContain("calculateSaju(parseSajuInput(body.input))");
    expect(source).toContain("interpretSajuAnalysis(analysis, provider");
    expect(source).not.toContain("interpretSajuAnalysis(body.analysis");
  });
});
