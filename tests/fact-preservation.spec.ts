import { describe, expect, it } from "vitest";
import { checkFactPreservation, extractFacts } from "@/lib/saju/ai-interpretation/fact-preservation.v1";

describe("FACT_PRESERVATION_V1", () => {
  const original = "2026년에는 정관의 힘이 살아나 직장운이 89점까지 오릅니다. 戊子 대운이 끝나는 2028년 전후로 중화신강의 장점이 드러납니다.";

  it("passes a style-only revision that keeps every fact", () => {
    const revised = "2026년은 정관이 힘을 받는 해라 직장운이 89점까지 올라갑니다. 2028년 무렵 戊子 대운이 끝나면서 중화신강의 장점이 보입니다.";
    expect(checkFactPreservation(original, revised)).toEqual({ ok: true, missing: [], added: [] });
  });
  it("reports a changed year, score and pillar on both sides", () => {
    const revised = "2027년에는 정관의 힘이 살아나 직장운이 90점까지 오릅니다. 己丑 대운이 끝나는 2028년 전후로 중화신강의 장점이 드러납니다.";
    const result = checkFactPreservation(original, revised);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining([{ kind: "year", value: "2026" }, { kind: "number", value: "89" },
      { kind: "pillar", value: "戊子" }]));
    expect(result.added).toEqual(expect.arrayContaining([{ kind: "year", value: "2027" }, { kind: "number", value: "90" },
      { kind: "pillar", value: "己丑" }]));
  });
  it("catches a ten-god or strength label swapped while smoothing the sentence", () => {
    const result = checkFactPreservation("월지 정관이 중화신약을 받쳐 줍니다.", "월지 편관이 신약을 받쳐 줍니다.");
    expect(result.missing).toEqual(expect.arrayContaining([{ kind: "tenGod", value: "정관" }, { kind: "lockedLabel", value: "중화신약" }]));
    expect(result.added).toEqual(expect.arrayContaining([{ kind: "tenGod", value: "편관" }, { kind: "lockedLabel", value: "신약" }]));
  });
  it("counts repeated facts so a dropped repetition is visible", () => {
    expect(checkFactPreservation("2029년과 2029년", "2029년").missing).toEqual([{ kind: "year", value: "2029" }]);
  });
  it("does not count 신약 inside 중화신약 twice and reads 1,200 as one number", () => {
    expect(Array.from(extractFacts("중화신약이고 1,200만 원"))).toEqual([["lockedLabel:중화신약", 1], ["number:1200", 1]]);
  });
});
