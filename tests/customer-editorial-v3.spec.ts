import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { LIFETIME_REPORT_SYSTEM_ADDENDUM } from "@/lib/saju/ai-interpretation/prompt";
import { LIFETIME_REPORT_V2 } from "@/rules/lifetime-report.v2";
import { customerTechnicalTermHits } from "@/rules/customer-terminology.v1";

const reportSource = () => readFile("src/components/LifetimeReport.tsx", "utf8");
const previewSource = () => readFile("src/app/dev/lifetime-report/page.tsx", "utf8");

describe("CUSTOMER_REPORT_EDITORIAL_REWRITE_V3", () => {
  it("keeps one complete 18-chapter book", () => {
    expect(LIFETIME_REPORT_V2.sections).toHaveLength(18);
    expect(LIFETIME_REPORT_V2.sections.at(0)?.id).toBe("overview");
    expect(LIFETIME_REPORT_V2.sections.at(-1)?.id).toBe("professional");
  });

  it("puts story before supporting visuals in the evidence-heavy chapters", async () => {
    const source = await reportSource();
    expect(source.indexOf('<AiCopy report={report} id="five-elements"')).toBeLessThan(source.indexOf('className="elementBars"'));
    expect(source.indexOf('<AiCopy report={report} id="wellness"')).toBeLessThan(source.indexOf('className="wellnessBalance"'));
    expect(source.indexOf('<AiCopy report={report} id="helpful-elements"')).toBeLessThan(source.indexOf('className="helpfulRanks"'));
  });

  it("keeps evidence secondary and professional analysis collapsed", async () => {
    const source = await reportSource();
    expect(source).toContain('className="chapterEvidence"');
    expect(source).toContain("왜 이렇게 보나요?");
    expect(source).toContain('id="chapter-18"');
    expect(source).toContain("버전과 evidence IDs");
  });

  it("defines customer-language and anti-boilerplate contracts", () => {
    for (const phrase of ["STORY FIRST, EVIDENCE SECOND", "상담사가 옆에서 설명하듯", "사주에서는", "~로 해석됩니다", "다른 사람에게 그대로 붙여도 되는", "도움을 함께 쓰다", "바로 이해되는 생활 한국어"])
      expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain(phrase);
    for (const term of ["용신", "신강", "신약", "격국", "조후", "통관", "병약", "지장간"])
      expect(LIFETIME_REPORT_SYSTEM_ADDENDUM).toContain(term);
  });

  it("distinguishes ordinary Korean from technical saju terminology", () => {
    for (const phrase of ["관계가 바로 이어지지 않을 수 있습니다.", "부담으로 느껴지지 않도록 여지를 남깁니다.", "결과와 상관없이 기준을 지킵니다.", "기준을 세운 뒤 움직입니다.", "자기신뢰를 지키는 편입니다.", "사용신청을 먼저 확인합니다.", "정신강화를 위한 습관은 별개입니다.", "일주일 동안 기록해 봅니다."])
      expect(customerTechnicalTermHits(phrase)).toEqual([]);
    expect(customerTechnicalTermHits("천간과 지지의 관계를 봅니다.")).toEqual(expect.arrayContaining(["천간","지지"]));
    expect(customerTechnicalTermHits("식신과 상관의 기운을 봅니다.")).toEqual(expect.arrayContaining(["식신","상관"]));
    expect(customerTechnicalTermHits("대운과 세운의 흐름을 함께 봅니다.")).toEqual(expect.arrayContaining(["대운","세운"]));
    expect(customerTechnicalTermHits("support와 activation을 합치지 않습니다.")).toEqual(expect.arrayContaining(["support","activation"]));
  });

  it("uses ordinary Korean for strength guidance", async () => {
    const source = await reportSource();
    expect(source).toContain("주변의 도움을 받으면 일을 조금 더 수월하게 해낼 수 있습니다");
    expect(source).not.toContain("주변의 도움을 함께 쓸 때 편안합니다");
    expect(source).not.toContain("도움을 연결하고 리듬을 지킬 때");
  });

  it("keeps the synthetic customer copy understandable on first read", async () => {
    const preview = await previewSource();
    for (const phrase of ["상대적 위치", "회복과 우선순위", "자원을 정확히 연결", "기준을 세우고 꾸준히 결과를 쌓는 힘", "균형을 보완하는 상대적 방향"])
      expect(preview).not.toContain(phrase);
    for (const phrase of ["작은 일부터 먼저 해보는", "누구와 무엇을 나눌지", "잠자는 시간", "가장 중요한 일부터"])
      expect(preview).toContain(phrase);
  });

  it("keeps relationship copy distinct without changing calculations", async () => {
    const source = await reportSource();
    for (const status of ["SINGLE", "DATING", "MARRIED"]) expect(source).toContain(`${status}:`);
    expect(source).toContain("relationshipStatus");
  });

  it("avoids child reality assumptions and medical diagnosis", async () => {
    const source = await reportSource();
    expect(source).not.toContain("현재 아이와");
    expect(source).not.toContain("첫째");
    expect(source).toContain("실제 아이의 성별을 맞히는 숫자가 아닙니다");
    expect(source).toContain("병을 알아보는 검사가 아닙니다");
  });

  it("uses only engine-backed values and no invented personality percentages", async () => {
    const source = await reportSource();
    expect(source).not.toMatch(/리더십\s*\d+%|연애 매력\s*\d+%|성실함\s*\d+%/);
    expect(source).toContain("adjusted?.[element].percentage");
    expect(source).toContain("children.bond.score");
    expect(source).toContain("wellness.constitutionalBalanceScore");
  });

  it("ships long, distinct synthetic prose for human copy review", async () => {
    const preview = await previewSource();
    expect(preview.length).toBeGreaterThan(8_500);
    expect(preview).toContain("겉으로는");
    expect(preview).toContain("한 번에 큰돈");
    expect(preview).toContain("부모가 된다면");
    expect(preview).toContain("생활 습관");
  });
});
