/** Shared copy-editing rules for the V2 and V5.6 interpretation prompts.
 * The corresponding authoring skill is .agents/skills/korean-writing-style/SKILL.md.
 * These rules concern language quality, not the correctness of saju predictions.
 */
export const KOREAN_CUSTOMER_WRITING_STYLE_PROMPT = `고객에게 보여 주는 제목과 본문은 자연스럽고 정돈된 한국어 존댓말로 작성하세요.
직역한 영어 어순, 이중 피동, 거친 개발자 구어, 명사 나열, 불필요한 추상 문장을 피하세요.
'판단되어진다' 대신 '판단된다', '보여집니다' 대신 '보입니다', '이 문제에 있어서' 대신 '이 문제에서'처럼 쓰세요.
'데이터 분석을 통해', '강한 경쟁력을 가지고', '새로운 가능성의 토대를 마련', '이 결과가 시사하는 바' 같은 표현은 실제 행동이나 구체적인 판단으로 풀어 쓰세요.
의미 없는 도입문, 상투적인 결론, 비슷한 접속사, 반복되는 완곡어법을 줄이고 단문과 복문을 섞어 자연스럽게 이어 가세요.
고객용 본문에서 '이 해석은', '이 장에서는', '풀이할 수 있습니다', '이런 뜻은 아닙니다'처럼 글 자체를 설명하지 마세요. 해석 방법에 대한 주석은 편집자 검토 자료에 남기고, 고객에게는 실제 행동 장면과 판단 기준을 전달하세요.
각 소제목마다 '수 있습니다', '수도 있습니다'로만 끝나는 문장을 반복하지 마세요. 그러나 추정을 무리하게 확정하는 문장으로 바꾸지는 마세요.
고객용 문장에 em dash(긴 줄표), 가운데점은 쓰지 마세요. en dash는 숫자 또는 영문 범위를 표시할 때만 허용합니다.
명리 용어와 계산 이유를 장황하게 설명하지 말고, 고객이 읽는 본문에서는 성격 특징, 드러나는 상황, 판단 기준을 먼저 묘사하세요. 근거는 별도 근거 표시에서 설명합니다.
해석 후보를 실제로 관찰한 행동이나 심리 사실로 단정하지 마세요. 문체를 다듬기 위해 없는 경험이나 독특한 성격을 지어내지 마세요.
사실의 정확성, 엔진 근거 제한, 위험 영역에 관한 기존 지침을 글쓰기보다 우선 적용하세요.`;

const HARD_STYLE_RULES: ReadonlyArray<{code:string;pattern:RegExp}> = [
  {code:"EM_DASH",pattern:/\u2014/u},
  {code:"MIDDLE_DOT",pattern:/\u00b7/u},
  {code:"HARSH_COLOQUIALISM",pattern:/박아\s*두|박아둠|때려\s*박|갈아\s*끼우/u},
  {code:"DOUBLE_PASSIVE",pattern:/판단되어진|보여집/u},
  {code:"TRANSLATION_CALQUE",pattern:/에\s*있어서|으로부터의|로의\s+전환|(?:문제|방법|결과)의\s+가치가\s+분명/u},
  {code:"AI_STOCK_PHRASE",pattern:/이\s*결과가\s*시사하는\s*바|새로운\s*가능성의\s*토대를\s*마련|혁신적인\s*방식으로\s*풀|요약하면\s*(?:두|세|[0-9]+)\s*가지/u},
  {code:"AI_META_EXPLANATION",pattern:/(?:이|본)\s*(?:해석|풀이)(?:은|에서는|의|으로)|(?:이|이번)\s*장(?:의|에서는)|풀이할\s*수\s*있습니다|(?:그런|이런)\s*뜻은\s*아닙니다/u},
];

/** Deterministic hard check. Nuanced Korean style still requires human review. */
export function lintCustomerKoreanWriting(text: string): string[] {
  const errors:string[]=[];
  const enDashOutsideRange=text.replace(/(?:[A-Za-z0-9]\s*\u2013\s*[A-Za-z0-9])/gu,"");
  if (enDashOutsideRange.includes("\u2013")) errors.push("EN_DASH_OUTSIDE_RANGE");
  for (const rule of HARD_STYLE_RULES) if (rule.pattern.test(text)) errors.push(rule.code);
  return errors;
}
