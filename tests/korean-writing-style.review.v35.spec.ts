import { describe, expect, it } from "vitest";
import { lintCustomerKoreanWriting, reviewCustomerKoreanWriting } from "@/lib/saju/ai-interpretation/korean-writing-style.v1";

describe("V35 non-blocking Korean style review (editor hints, not accuracy checks)", () => {
  it("passes the reference strength draft", () => {
    const text = "새 절차를 받아들일 때 무조건 전부 따르기보다, 실제로 어디까지 적용할지 범위를 정하는 데서 장점이 드러날 수 있습니다. 이때 지금 급하게 처리해야 할 책임과, 이미 알고 있던 설명이 새 절차와 맞는지를 함께 살핍니다. 그렇게 맞춰 본 끝에 실제 결과로 남는 것은 공식 기준과 하나씩 대조해 정한 적용 범위입니다. 충분히 익숙한 절차라면 이런 확인 없이 바로 따르기도 합니다.";
    expect(lintCustomerKoreanWriting(text)).toEqual([]);
    expect(reviewCustomerKoreanWriting(text)).toEqual([]);
  });

  it("flags engine wording and ten-god terms that should stay out of customer body text", () => {
    expect(reviewCustomerKoreanWriting("편관과 정인의 조건부 가설에 따라 책임을 먼저 살핍니다.")).toEqual(
      expect.arrayContaining(["SAJU_TERM_IN_BODY", "ENGINE_WORDING"]),
    );
  });

  it("flags stacked hedging and three identical sentence endings", () => {
    expect(reviewCustomerKoreanWriting("바뀔 수 있습니다. 늦어질 수도 있습니다. 줄어들 수 있습니다.")).toContain("HEDGE_REPEAT");
    expect(reviewCustomerKoreanWriting("기준은 두 가지입니다. 하나는 책임입니다. 다른 하나는 근거입니다.")).toContain("SAME_ENDING_X3");
  });

  it("does not treat ordinary words like 시간 or 월간 as saju terms", () => {
    expect(reviewCustomerKoreanWriting("혼자 있는 시간에는 월간 계획을 정리합니다.")).not.toContain("SAJU_TERM_IN_BODY");
  });
});
