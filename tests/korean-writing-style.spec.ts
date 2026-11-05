import { describe, expect, it } from "vitest";
import { KOREAN_CUSTOMER_WRITING_STYLE_PROMPT, lintCustomerKoreanWriting } from "@/lib/saju/ai-interpretation/korean-writing-style.v1";
import { PERSONALITY_V56_SYSTEM_PROMPT } from "@/lib/saju/ai-interpretation/personality-generation.v1";
import { INTERPRETATION_SYSTEM_PROMPT } from "@/lib/saju/ai-interpretation/prompt";

describe("customer-facing Korean writing style", () => {
  it("uses the same style instruction in V2 and V5.6 prompts", () => {
    for (const prompt of [INTERPRETATION_SYSTEM_PROMPT, PERSONALITY_V56_SYSTEM_PROMPT]) {
      expect(prompt).toContain(KOREAN_CUSTOMER_WRITING_STYLE_PROMPT);
      expect(prompt).toContain("고객에게 보여 주는 제목과 본문");
      expect(prompt).toContain("해석 후보를 실제로 관찰한 행동");
    }
  });
  it("allows fluent Korean instead of requiring unnatural templated language", () => {
    expect(lintCustomerKoreanWriting("새로운 제안을 받으면 조건부터 살펴볼 수 있습니다. 그다음 판단을 바꿀 수도 있어요.")).toEqual([]);
    expect(lintCustomerKoreanWriting("2026–2027년에는 연도별 흐름을 나누어 봅니다.")).toEqual([]);
  });
  it.each([
    ["가운데점", "성격·기질을 분석합니다.", "MIDDLE_DOT"],
    ["em dash", "이 특징은 중요합니다—판단 기준이 다르기 때문입니다.", "EM_DASH"],
    ["불필요한 en dash", "이 특징은 신중함–독립성입니다.", "EN_DASH_OUTSIDE_RANGE"],
    ["이중 피동", "그렇게 보여집니다.", "DOUBLE_PASSIVE"],
    ["거친 표현", "값을 코드에 박아두었습니다.", "HARSH_COLOQUIALISM"],
    ["번역투", "이 문제에 있어서 중요한 것은 속도입니다.", "TRANSLATION_CALQUE"],
    ["AI 상투구", "이 결과가 시사하는 바가 큽니다.", "AI_STOCK_PHRASE"],
  ])("detects %s", (_, text, code) => {
    expect(lintCustomerKoreanWriting(text)).toContain(code);
  });
  it.each([
    ["설명문 중심", "이 해석은 성격의 장점을 설명합니다."],
    ["장 소개", "이 장에서는 그 사람의 성향을 살펴봅니다."],
    ["풀이 중심", "이러한 성향으로 풀이할 수 있습니다."],
    ["중복 부정", "이런 뜻은 아닙니다."],
  ])("blocks AI-style meta commentary in customer copy: %s", (_, sentence) => {
    expect(lintCustomerKoreanWriting(sentence)).toContain("AI_META_EXPLANATION");
  });

  it("does not treat ordinary conditional or cautious statements as violations", () => {
    expect(lintCustomerKoreanWriting("이런 상황에서는 결정을 늦출 수 있지만, 다른 정보가 나오면 달라질 수 있어요.")).toEqual([]);
  });
});
