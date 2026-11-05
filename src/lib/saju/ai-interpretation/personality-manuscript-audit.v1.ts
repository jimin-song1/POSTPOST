/**
 * Editorial manuscript audit for the customer-facing V5.6 personality chapter.
 * This is a writing-level heuristic, not a test of whether a person's psychology
 * follows from their birth chart. Findings must not be used as accuracy scores.
 */
export type PersonalityManuscriptSection = {
  id: string;
  headline: string;
  lead: string;
  paragraphs: readonly string[];
};
export type ManuscriptFinding = {
  sectionId: string;
  code: string;
  level: "BLOCK" | "REVIEW";
  message: string;
};
export type ManuscriptAudit = {
  status: "blocked" | "review_required" | "no_rule_flags";
  findings: ManuscriptFinding[];
};

/** These are editorial responsibilities, not claims about an individual's traits. */
export const PERSONALITY_SECTION_BOUNDARIES: Readonly<Record<string, string>> = Object.freeze({
  "P01-01": "기본 성향과 시작할 때의 첫 반응. 학습 습관과 성과를 과도하게 확장하지 않음",
  "P01-02": "처음 만나는 공적인 상황과 가까운 사적인 상황의 차이. 실제 타인의 평가를 사실처럼 단정하지 않음",
  "P01-03": "외부 요구가 없는 시간의 관심과 사고. 첫 시작 방식이나 일의 성과를 반복하지 않음",
  "P01-04": "의견을 표현할 때의 조건과 순서. 말수·숨기는 버릇을 단정하지 않음",
  "P01-05": "결정을 내리기 전에 확인하는 조건과 기준",
  "P01-06": "이미 결정한 뒤 새 정보에 따라 유지하거나 수정하는 조건",
  "P01-07": "여럿과 일할 때 타협과 역할을 조정하는 문제",
  "P01-08": "예상 밖 문제가 생겼을 때 처리 순서를 정하는 문제",
  "P01-09": "실제 행동이나 결과물로 나타날 수 있는 강점의 조건",
  "P01-10": "09의 강점이 부담이 되는 조건과 조절 방식. 07의 역할 조정을 반복하지 않음",
});

const patterns = {
  preparation: /시작|처음 접|처음 맡|출발|시도|계획을 세우|준비|먼저 배우|우선 익히|알아두어야|처음부터|실행 전|익숙한 일|배운|익힌|학습/g,
  solo: /혼자|외부의 요구|다른 사람의 시선|누군가 (?:보지|요구)|혼자만의|개인적인 시간|스스로 돌아보/g,
  result: /결과물|완성|마무리|끝까지|성과|실제 결과|일을 끝|마친/g,
  joint: /역할|공동|함께 맡|누가 맡|나누어 맡|분담|합의|협상|담당 범위|책임의 범위/g,
  burden: /지나치|과하게|부담|소진|여유가 줄|놓치|비용이 커|힘들|긴장|피로|조절/g,
  choice: /선택지|선택하기 전|제안|기회비용|조건을 비교|비교해/g,
};
function count(text: string, rx: RegExp) { return (text.match(rx) ?? []).length; }
function whole(section: PersonalityManuscriptSection) {
  return [section.headline, section.lead, ...section.paragraphs].join(" ");
}
export function auditPersonalityManuscript(sections: readonly PersonalityManuscriptSection[]): ManuscriptAudit {
  const findings: ManuscriptFinding[] = [];
  const byId = new Map(sections.map(section => [section.id, section]));
  const add = (sectionId: string, code: string, level: ManuscriptFinding["level"], message: string) =>
    findings.push({ sectionId, code, level, message });
  for (const section of sections) {
    const text = whole(section);
    if (!PERSONALITY_SECTION_BOUNDARIES[section.id]) continue;
    // Repeated defensive framing may be safe but creates a generic, machine-written report.
    const excessiveFrame = count(text, /이 해석(?:은|에서는)|(?:모습으로 )?(?:풀이|해석)할 수 있습니다/g);
    if (excessiveFrame >= 3) add(section.id, "FORMULAIC_HEDGING", "REVIEW", "같은 해석 안내 문구가 반복됩니다. 한 번만 범위를 밝히고 구체적인 내용을 설명하세요.");
    if (section.id === "P01-02") {
      const publicContext = /처음 만|첫인상|여러 사람|공적인 자리|낯선 자리|바깥에서|처음 보는/.test(text);
      const privateContext = /친해|가까운|편한 사이|사적인|친밀|오래 알고|개인적인/.test(text);
      if (!publicContext || !privateContext) add(section.id, "MISSING_PUBLIC_PRIVATE_CONTRAST", "BLOCK", "첫 상황과 가까운 관계의 대비가 빠졌습니다.");
      // A natal reading has no observation of real people's impressions.
      add(section.id, "FIRST_IMPRESSION_NEEDS_READER_VALIDATION", "REVIEW", "실제로 다른 사람이 어떻게 평가하는지는 원국만으로 알 수 없습니다. 고객 반응 검증이 필요합니다.");
      if (/(?:누구나|사람들은 (?:모두|항상)|처음 (?:보는|만나는) 사람은 (?:반드시|무조건)).{0,35}(?:느낍니다|생각합니다|알아봅니다)/.test(text))
        add(section.id, "ASSERTED_EXTERNAL_OBSERVATION", "BLOCK", "다른 사람이 실제로 가진 첫인상을 확인한 사실처럼 쓰지 마세요.");
    }
    if (section.id === "P01-03") {
      if (!count(text, patterns.solo)) add(section.id, "NO_PRIVATE_CONTEXT", "BLOCK", "혼자 있는 상황의 차이가 설명되지 않았습니다.");
      if (count(text, patterns.preparation) >= 3 && count(text, patterns.result) >= 2)
        add(section.id, "SOLO_CHAPTER_REPEATS_WORK", "REVIEW", "혼자 있을 때의 성향 대신 시작, 학습, 완성을 반복하고 있습니다.");
      add(section.id, "PRIVATE_HABIT_UNOBSERVED", "REVIEW", "혼자 있을 때 실제 무엇을 하는지는 확인하지 못했습니다. 관찰 사실처럼 단정하지 마세요.");
    }
    if (section.id === "P01-09") {
      if (!count(text, patterns.result)) add(section.id, "MISSING_STRENGTH_SCENE", "REVIEW", "실행 또는 결과물로 이어지는 강점 장면이 부족합니다.");
      if (count(text, patterns.choice) >= 3 && count(text, patterns.result) <= 1)
        add(section.id, "STRENGTH_REPEATS_DECISION", "REVIEW", "09번 강점에서 05번의 선택 기준을 다시 설명하고 있습니다.");
    }
    if (section.id === "P01-10" && count(text, patterns.joint) >= 3 && count(text, patterns.burden) <= 1)
      add(section.id, "WEAKNESS_REPEATS_TEAMWORK", "REVIEW", "09번 강점의 부담보다 07번 역할 분담을 반복하고 있습니다.");
  }
  const first = byId.get("P01-01"), alone = byId.get("P01-03"), strength = byId.get("P01-09");
  if (first && alone && strength) {
    const a=whole(first), b=whole(alone), c=whole(strength);
    if (count(a,patterns.preparation) >= 3 && count(b,patterns.preparation)>=3)
      add("P01-03", "START_THEME_REPEATED", "REVIEW", "01번과 03번에서 시작과 학습 방식을 반복합니다.");
    if (count(b,patterns.result) >= 2 && count(c,patterns.result)>=2)
      add("P01-03", "RESULT_THEME_REPEATED", "REVIEW", "03번과 09번에서 결과물 완성 주제가 겹칩니다.");
  }
  return { status:findings.some(f=>f.level==="BLOCK") ? "blocked" : findings.length ? "review_required" : "no_rule_flags",findings };
}
