import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { LIFETIME_BOOK_PAGES, LIFETIME_BOOK_V1 } from "@/rules/lifetime-report.v3";

describe("fixed 154-page interpretation preview", () => {
  it("keeps all canonical pages in the fixed editorial report", async () => {
    const source=await readFile("src/app/dev/lifetime-report/page.tsx","utf8");
    expect(LIFETIME_BOOK_V1.pageCount).toBe(154);
    expect(LIFETIME_BOOK_PAGES).toHaveLength(154);
    expect(source).toContain("sections:LIFETIME_BOOK_PAGES.map");
    expect(source).toContain('birthCity:"경기도 시흥시"');
    expect(source).toContain("API 키 없이 검토하는 고정 편집 샘플입니다");
  });

  it("offers an explicit sample route without replacing live interpretation", async () => {
    const source=await readFile("src/app/page.tsx","utf8");
    expect(source).toContain('href="/dev/lifetime-report"');
    expect(source).toContain("API 키 없이 ㅇㅇ님의 154페이지 편집 샘플 보기");
    expect(source).toContain('fetch("/api/saju/interpret"');
  });
});
