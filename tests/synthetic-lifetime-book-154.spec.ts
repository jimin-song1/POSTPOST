import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildDynamicLifetimeBook, LIFETIME_CONTENT_CONTRACT_V1 } from "@/rules/lifetime-report.v4";

describe("dynamic lifetime-book interpretation preview", () => {
  it("builds a variable editorial report with every required chapter", async () => {
    const source=await readFile("src/app/dev/lifetime-report/page.tsx","utf8");
    const book=buildDynamicLifetimeBook({includeSamjae:true,year:2026});
    expect(book.sections.length).toBeGreaterThanOrEqual(LIFETIME_CONTENT_CONTRACT_V1.minimumContentSections);
    expect(new Set(book.sections.map(section=>section.id)).size).toBe(book.sections.length);
    expect(book.parts.some(part=>part.partNumber==="12S")).toBe(true);
    expect(source).toContain("previewBook.sections.map");
    expect(source).toContain('birthCity:"경기도 시흥시"');
    expect(source).toContain("API 키 없이 검토하는 동적 편집 샘플입니다");
  });

  it("offers an explicit sample route without replacing live interpretation", async () => {
    const source=await readFile("src/app/page.tsx","utf8");
    expect(source).toContain('href="/dev/lifetime-report"');
    expect(source).toContain("API 키 없이 동적 평생사주 편집 샘플 보기");
    expect(source).toContain('fetch("/api/saju/interpret"');
  });
});
