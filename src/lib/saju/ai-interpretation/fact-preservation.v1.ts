import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";

/**
 * 문체를 다듬기 전 문장과 다듬은 뒤 문장의 사실 값을 대조한다.
 * 연도, 간지, 숫자, 십성 이름, 강약, 격국 라벨이 하나라도 생기거나 사라지면 통과시키지 않는다.
 * 한글로 쓴 숫자(서른, 다섯 해 등)와 문장의 뜻은 이 검사로 확인하지 못한다. 사람이 읽어 확인한다.
 */
export type PreservedFactKind = "year" | "pillar" | "number" | "tenGod" | "lockedLabel";
export interface PreservedFact { kind: PreservedFactKind; value: string }
export interface FactPreservationResult { ok: boolean; missing: PreservedFact[]; added: PreservedFact[] }

const TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;
/** 긴 라벨을 먼저 찾아 '중화신약' 안의 '신약'을 따로 세지 않는다. */
const LOCKED_LABELS = [...RULE.lockedLabels.strength, ...RULE.lockedLabels.structure]
  .sort((a, b) => b.length - a.length);

function countInto(map: Map<string, number>, key: string) { map.set(key, (map.get(key) ?? 0) + 1); }

/** 문장에서 사실 값을 뽑아 종류별 개수로 센다. */
export function extractFacts(text: string): Map<string, number> {
  const facts = new Map<string, number>();
  let rest = text;
  for (const label of LOCKED_LABELS) {
    const parts = rest.split(label);
    for (let i = 1; i < parts.length; i++) countInto(facts, `lockedLabel:${label}`);
    rest = parts.join(" ");
  }
  for (const match of Array.from(rest.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g))) countInto(facts, `pillar:${match[0]}`);
  for (const name of TEN_GODS) for (let i = 1; i < rest.split(name).length; i++) countInto(facts, `tenGod:${name}`);
  for (const match of Array.from(rest.matchAll(/\d+(?:[.,]\d+)*/g))) {
    const value = match[0].replace(/,/g, "");
    const year = /^(?:19|20|21)\d{2}$/.test(value);
    countInto(facts, `${year ? "year" : "number"}:${value}`);
  }
  return facts;
}

const toFacts = (entries: Array<[string, number]>): PreservedFact[] => entries.flatMap(([key, count]) => {
  const [kind, value] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  return Array.from({ length: count }, () => ({ kind: kind as PreservedFactKind, value }));
});

/** 다듬기 전후의 사실 값이 개수까지 같아야 통과한다. */
export function checkFactPreservation(original: string, revised: string): FactPreservationResult {
  const before = extractFacts(original), after = extractFacts(revised);
  const missing: Array<[string, number]> = [], added: Array<[string, number]> = [];
  for (const [key, count] of Array.from(before)) { const diff = count - (after.get(key) ?? 0); if (diff > 0) missing.push([key, diff]); }
  for (const [key, count] of Array.from(after)) { const diff = count - (before.get(key) ?? 0); if (diff > 0) added.push([key, diff]); }
  const result = { missing: toFacts(missing), added: toFacts(added) };
  return { ok: result.missing.length === 0 && result.added.length === 0, ...result };
}
