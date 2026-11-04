import { z } from "zod";
import type { SajuAnalysis } from "@/types/saju-analysis";
import type { InterpretationEvidence, RelationshipStatus } from "@/types/ai-interpretation";

import {
  selectPersonalityInterpretations, createPersonalityWritingBrief,
  validatePersonalityBriefEvidence,
  type PersonalityWritingBrief,
} from "./personality-editorial.v1";
import { PERSONALITY_SECTIONS } from "./personality-candidates.v1";
import { KOREAN_CUSTOMER_WRITING_STYLE_PROMPT, lintCustomerKoreanWriting, reviewCustomerKoreanWriting } from "./korean-writing-style.v1";
import { findUnsupportedPersonalityClaims } from "./personality-claim-guard.v1";
import { auditPersonalityManuscript, PERSONALITY_SECTION_BOUNDARIES } from "./personality-manuscript-audit.v1";

/** V5.6 draft is separate from the existing V2 report pipeline and never delivered automatically. */
export const personalitySectionSchema = z.object({
  id: z.string().min(1), title: z.string().min(1),
  headline: z.string().min(1), lead: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(2).max(5),
  evidenceIds: z.array(z.string().min(1)).min(1),
}).strict();
export const personalityDraftSchema = z.object({
  version: z.literal("personality-v56-draft-v1"),
  sections: z.array(personalitySectionSchema).length(10),
}).strict();
export type PersonalityDraft = z.infer<typeof personalityDraftSchema>;

// The output schema is intentionally distinct from lifetime-report-v2's 18-chapter JSON contract.
const strings = { type: "array", items: { type: "string" } } as const;
export const PERSONALITY_DRAFT_JSON_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["version", "sections"],
  properties: {
    version: { type: "string", const: "personality-v56-draft-v1" },
    sections: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["id", "title", "headline", "lead", "paragraphs", "evidenceIds"],
      properties: {
        id: { type: "string" }, title: { type: "string" },
        headline: { type: "string" }, lead: { type: "string" },
        paragraphs: strings, evidenceIds: strings,
      },
    } },
  },
} as const;

export const PERSONALITY_V56_SYSTEM_PROMPT = `당신은 POSTPOST 사주빛 V5.6의 성격 PART01 해설 작가입니다.
엔진 계산은 서버가 확정합니다. 원국·십성·강약·격국·용신을 재계산하거나 새로운 간지·신살·수치를 만들지 마세요.
제공된 editorialBrief의 READY_FOR_REVIEW 항목만 해석하세요. 입력에 없는 과거 사건, 가족관계, 심리 진단, 투자·직업 성과를 창작하지 마세요.
소제목의 primary 가설은 전통 명리의 해석 후보이며 확인된 실제 성격 사실이 아닙니다. 다양한 상황의 가능성을 명확히 구분해 주세요.
장점·약점·의외의 특징을 전체 성격 PART 안에서 균형 있게 보여주세요. 모든 장을 동일한 구조로 만들지 마세요.
한 장의 핵심 주장을 다른 장에서 되풀이하지 말고, 예시 장면은 실화로 서술하지 마세요.
behaviorHypothesis가 있다면 trigger→observableBehavior→decisionBasis→counterCondition 순서로 사람을 묘사하되, 명리학 용어를 본문에 나열하지 마세요.
P01-02는 공적 역할과 사적 판단을, P01-08은 제약과 대응 순서를 구분하세요. P01-10에 linkedStrengthCandidateId가 있다면 P01-09의 같은 강점이 부담으로 바뀌는 조건만 다루세요. 장점을 다시 나열하지 마세요.
01번은 시작할 때의 기본 성향, 03번은 외부 요구가 없는 시간의 관심과 사고, 09번은 실제 수행과 결과를 설명합니다. 시작·학습·성과를 세 항목에서 반복하지 마세요.
02번 첫인상과 03번 혼자 있을 때는 실제 관찰 정보가 없으므로 단정적 사실로 쓰지 말고, 고객 반응으로 확인할 가설로 남기세요.
07번은 다른 사람과 역할을 조정하는 문제를, 10번은 09번의 강점이 지나칠 때 생길 수 있는 부담을 설명합니다.
각 소제목의 편집 범위: ${Object.entries(PERSONALITY_SECTION_BOUNDARIES).map(([id, scope]) => id+": "+scope).join("; ")}
P01-09는 제공된 scenarioRuleId의 장면만 설명하세요. 예를 들어 resource와 output이 함께 없는 후보에 '배운 것을 실천한다'는 장면을 임의로 붙이지 마세요.
서로 다른 소제목이 결정권, 책임, 정보 확인 같은 행동을 반복하면 표현만 바꾸지 말고 각 절에서 다루는 판단과 상황의 범위를 분명히 구분하세요.
선택된 근거 ID가 유효하더라도 행동 가설에 없는 독심술, 거짓말을 단번에 알아채는 능력, 타인의 숨은 의도를 정확히 파악하는 능력 같은 새 주장을 만들어내지 마세요.
P01-10은 P01-09 강점에 연결된 부담 조건만 풀어 쓰고, 연결이 검증되지 않았다면 자동 생성하지 마세요.
possibleMotive가 null이면 내면의 공포, 열등감, 숨겨진 야망 등 임의의 동기를 만들어내지 마세요. 구조 및 inferenceSteps는 내부 추론용으로 고객 문장에 노출하지 마세요.
고객에게 쉬운 존댓말로 직접 이야기하되 '모르겠네요', '그럴지도 모르겠네요' 같은 어미를 반복하지 마세요.
자체 심리 측정 점수·확률·고정 지표를 발명하지 말고 숫자·연도·간지의 신규 언급을 피하세요.
각 section의 evidenceIds는 제공된 해당 장의 primary.evidenceIds 안에서 선택하세요.
불확실성을 화려한 단정으로 숨기지 마세요. 오직 요청된 JSON 스키마를 반환하세요.

${KOREAN_CUSTOMER_WRITING_STYLE_PROMPT}`;

export interface PersonalityWritingRequest {
  systemPrompt: string;
  brief: PersonalityWritingBrief;
  evidence: InterpretationEvidence[];
  schema: Record<string, unknown>;
  repair?: { previousOutput: unknown; errors: string[] };
}
export interface PersonalityWritingProvider {
  generate(request: PersonalityWritingRequest): Promise<unknown>;
}
export type PersonalityGenerationResult =
  | { status: "draft_needs_review"; draft: PersonalityDraft; brief: PersonalityWritingBrief; repaired: boolean; reviewWarnings: string[] }
  | { status: "needs_more_evidence"; missingSections: string[]; reasons: string[] }
  | { status: "failed_validation"; errors: string[]; attempts: number }
  | { status: "provider_error"; error: string };

function visit(value: unknown, handle: (value: unknown) => void): void {
  handle(value);
  if (Array.isArray(value)) for (const child of value) visit(child, handle);
  else if (value && typeof value === "object") for (const child of Object.values(value)) visit(child, handle);
}
function supportedLiterals(evidence: InterpretationEvidence[]) {
  const numbers: number[] = [], pillars = new Set<string>(), years = new Set<number>();
  visit(evidence.map(e => e.value), value => {
    if (typeof value === "number") {
      for (const n of [value, Math.round(value), Number(value.toFixed(1)), Number(value.toFixed(2))]) numbers.push(n);
    }
    if (typeof value === "string") {
      for (const match of Array.from(value.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g))) pillars.add(match[0]);
      for (const match of Array.from(value.matchAll(/(?:19|20|21)\d{2}/g))) years.add(Number(match[0]));
    }
  });
  return { numbers, pillars, years };
}
function normalize(text: string) {
  return text.replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g, "").toLowerCase();
}
function ngrams(text: string) {
  const chars = normalize(text);
  const grams = new Set<string>();
  for (let i = 0; i <= chars.length-4; i++) grams.add(chars.slice(i, i+4));
  return grams;
}
function highlySimilar(a: string, b: string) {
  if (normalize(a).length < 30 || normalize(b).length < 30) return false;
  if (normalize(a) === normalize(b)) return true;
  const left=ngrams(a),right=ngrams(b);
  const same=Array.from(left).filter(gram=>right.has(gram)).length;
  const union=left.size+right.size-same;
  return union > 0 && same/union >= 0.82;
}

/** Hard checks; they cannot scientifically verify the psychological accuracy of prose. */
export function validatePersonalityDraft(
  output: unknown, brief: PersonalityWritingBrief, evidence: readonly InterpretationEvidence[],
): { ok: true; draft: PersonalityDraft } | { ok: false; errors: string[] } {
  const parsed = personalityDraftSchema.safeParse(output);
  if (!parsed.success) return {ok:false,errors:["SCHEMA: "+parsed.error.message]};
  const draft=parsed.data, errors:string[]=[];
  const byId=new Map(brief.sections.map(s=>[s.id,s]));
  const factsById=new Map(evidence.map(row=>[row.id,row]));
  const paragraphHistory: Array<{id:string;text:string}>=[];
  const headlineHistory: Array<{id:string;text:string}>=[];
  for (let i=0; i<draft.sections.length; i++) {
    const section=draft.sections[i], expected=PERSONALITY_SECTIONS[i];
    const owner=expected ? byId.get(expected.id) : undefined;
    if (!expected || expected.id!==section.id || expected.title!==section.title || !owner || owner.status!=="READY_FOR_REVIEW" || !owner.primary) {
      errors.push(section.id+": section order/title or approved candidate mismatch");
      continue;
    }
    if (normalize(section.headline).length < 8) errors.push(section.id+": headline too generic");
    for (const earlier of headlineHistory) if (normalize(section.headline) === normalize(earlier.text))
      errors.push(section.id+": repeats headline from "+earlier.id);
    headlineHistory.push({id:section.id,text:section.headline});
    if (section.paragraphs.join("").length < 100) errors.push(section.id+": insufficient explanation");
    const allowed=new Set(owner.primary.evidenceIds);
    if (section.evidenceIds.some(id=>!allowed.has(id) || !factsById.has(id)))
      errors.push(section.id+": unapproved evidence citation");
    // Never authorize a year, pillar or numeric metric using a fact cited by another section.
    const citedEvidence=section.evidenceIds.map(id=>factsById.get(id)).filter((row):row is InterpretationEvidence=>!!row && allowed.has(row.id));
    const inventory=supportedLiterals(citedEvidence);
    const text=[section.headline,section.lead,...section.paragraphs].join("\n");
    for (const violation of lintCustomerKoreanWriting(text))
      errors.push(section.id+": korean writing style "+violation);
    for (const violation of findUnsupportedPersonalityClaims(text))
      errors.push(section.id+": unsupported personality claim "+violation);
    if (/\b(?:undefined|null|NaN|true|false)\b|\[object Object\]|\b(?:sourceIds|evidenceIds|narrativeKey|dayJiHap|dayGanHap|behaviorHypothesis|inferenceSteps|structuralContext|editorialPriority|possibleMotive|semanticPairKey|semanticFamilyPairKey|scenarioRuleId|semanticMotifs)\b|(?:PILLAR:|NATAL:|V56-B2-|F_TEN_)/.test(text))
      errors.push(section.id+": leaked internal data");
    // Competitor audits exposed medical/fertility/financial certainty disguised as fortune interpretation.
    // This is a conservative editorial gate, not a classifier of all harmful claims.
    if (/(?:반드시|확실히|틀림없이|무조건).{0,25}(?:임신|출산|합격|승진|재산|투자|병|질환|치료|회복)|(?:임신|출산|합격|승진|재산|투자|질환).{0,18}(?:보장|확정|예정)/.test(text))
      errors.push(section.id+": unsupported real-world prediction");
    if (/모르겠네요|그럴지도 모르겠네요|확실히 임신|반드시 성공|틀림없이 합격/.test(text))
      errors.push(section.id+": unsupported certainty or repetitive hedging");
    for (const m of Array.from(text.matchAll(/(?:19|20|21)\d{2}/g))) if (!inventory.years.has(Number(m[0])))
      errors.push(section.id+": invented year "+m[0]);
    for (const m of Array.from(text.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g))) if (!inventory.pillars.has(m[0]))
      errors.push(section.id+": invented pillar "+m[0]);
    for (const m of Array.from(text.matchAll(/\d+(?:\.\d+)?/g))) {
      const n=Number(m[0]);
      if (!inventory.numbers.some(v=>Math.abs(v-n)<1e-9) && !inventory.years.has(n)) errors.push(section.id+": ungrounded number "+m[0]);
    }
    for (const paragraph of section.paragraphs) {
      for (const previous of paragraphHistory) if (highlySimilar(paragraph,previous.text))
        errors.push(section.id+": repeats paragraph from "+previous.id);
      paragraphHistory.push({id:section.id,text:paragraph});
    }
  }
  const manuscriptAudit = auditPersonalityManuscript(draft.sections);
  for (const finding of manuscriptAudit.findings.filter(f=>f.level==="BLOCK"))
    errors.push(finding.sectionId+": manuscript " + finding.code + " " + finding.message);
  return errors.length ? {ok:false,errors:Array.from(new Set(errors))} : {ok:true,draft};
}

/** Personality-only facts, independent of fortune, child and wellness modules. */
export function buildPersonalityEvidence(analysis: SajuAnalysis): InterpretationEvidence[] {
  if (!analysis.dayMaster || analysis.tenGods.status !== "implemented" || !analysis.tenGods.value
      || analysis.tenGods.value.dayMaster !== analysis.dayMaster) return [];
  return [
    {id:"NATAL:PILLARS",kind:"NATAL",value:analysis.pillars},
    {id:"NATAL:TEN_GODS",kind:"NATAL",value:analysis.tenGods},
    ...(analysis.strength.adjusted.status === "implemented"
      ? [{id:"NATAL:STRENGTH:ADJUSTED",kind:"NATAL" as const,value:analysis.strength.adjusted}]
      : []),
    ...(analysis.structure.status === "implemented" && analysis.structure.primary
      ? [{id:"NATAL:STRUCTURE:PRIMARY",kind:"NATAL" as const,value:analysis.structure.primary}]
      : []),
    ...(analysis.structure.status === "implemented" && analysis.structure.qualityEvaluation.evaluationScope !== "UNAVAILABLE"
      ? [{id:"NATAL:STRUCTURE:QUALITY",kind:"NATAL" as const,value:analysis.structure.qualityEvaluation}]
      : []),
    ...(analysis.relations.status === "implemented"
      ? [{id:"NATAL:RELATIONS",kind:"NATAL" as const,value:analysis.relations}]
      : []),
  ];
}

/** V35: non-blocking Korean style review hits for the human editor (appended to the manuscript audit). */
export function styleReviewWarnings(draft: PersonalityDraft): string[] {
  return draft.sections.flatMap(section=>reviewCustomerKoreanWriting([section.headline,section.lead,...section.paragraphs].join("\n"))
    .map(code=>section.id+": korean writing review "+code));
}

/** One generate + at most one repair; no output is customer-published. */
export async function generatePersonalityV56Draft(
  analysis:SajuAnalysis, provider:PersonalityWritingProvider, relationshipStatus:RelationshipStatus,
): Promise<PersonalityGenerationResult> {
  const plan=selectPersonalityInterpretations(analysis);
  const brief=createPersonalityWritingBrief(plan);
  if (plan.status!=="reviewable") return {
    status:"needs_more_evidence",missingSections:[...plan.audit.emptySections],
    reasons:[...plan.audit.warnings],
  };
  // Relationship status is not a source of natal facts and must not affect this layer.
  void relationshipStatus;
  const required=new Set(brief.sections.flatMap(s=>s.primary?.evidenceIds??[]));
  const evidence=buildPersonalityEvidence(analysis).filter(e=>required.has(e.id));
  const missing=validatePersonalityBriefEvidence(brief,evidence);
  if (missing.length) return {status:"needs_more_evidence",missingSections:[],reasons:missing};
  const request:PersonalityWritingRequest={systemPrompt:PERSONALITY_V56_SYSTEM_PROMPT,brief,evidence,
    schema:PERSONALITY_DRAFT_JSON_SCHEMA as unknown as Record<string,unknown>};
  let output:unknown;
  try {output=await provider.generate(request);} catch(error) {
    return {status:"provider_error",error:error instanceof Error?error.message:"provider failed"};
  }
  let checked=validatePersonalityDraft(output,brief,evidence);
  if (checked.ok) return {status:"draft_needs_review",draft:checked.draft,brief,repaired:false,reviewWarnings:auditPersonalityManuscript(checked.draft.sections).findings.map(f=>f.sectionId+": "+f.code+" "+f.message).concat(styleReviewWarnings(checked.draft))};
  const firstErrors=checked.errors;
  try {output=await provider.generate({...request,repair:{previousOutput:output,errors:firstErrors}});} catch(error) {
    return {status:"provider_error",error:error instanceof Error?error.message:"provider failed during repair"};
  }
  checked=validatePersonalityDraft(output,brief,evidence);
  if (checked.ok) return {status:"draft_needs_review",draft:checked.draft,brief,repaired:true,reviewWarnings:auditPersonalityManuscript(checked.draft.sections).findings.map(f=>f.sectionId+": "+f.code+" "+f.message).concat(styleReviewWarnings(checked.draft))};
  return {status:"failed_validation",attempts:2,errors:checked.errors};
}
