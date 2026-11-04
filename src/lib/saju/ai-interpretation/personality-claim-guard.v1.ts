import type { SajuAnalysis } from "@/types/saju-analysis";
import type { PersonalityCandidate } from "./personality-candidates.v1";
import { generateConditionalBehaviorCandidates } from "./personality-behavior.v2";

/**
 * A claim contract is an internal trace, not a scientific validation of personality.
 * For V56-B2 generated hypotheses, the full behavioral scenario must still be the
 * scenario actually produced from the chart. Matching a real evidence ID alone
 * never authorizes changing the behavior or claiming special abilities.
 */
export function verifyGeneratedBehaviorContract(
  analysis: SajuAnalysis, candidate: PersonalityCandidate,
  canonical: ReadonlyMap<string, PersonalityCandidate>,
): boolean {
  if (!candidate.id.startsWith("V56-B2-")) return true;
  const original = canonical.get(candidate.id);
  if (!original || !original.behaviorHypothesis || !candidate.behaviorHypothesis) return false;
  const lhs = original.behaviorHypothesis, rhs = candidate.behaviorHypothesis;
  // Ignore the linked-strength marker: the editorial pass adds it after
  // P01-09 is selected. No other narrative fact is editable at this boundary.
  const fields = ["axis", "trigger", "observableBehavior", "decisionBasis",
    "possibleMotive", "counterCondition", "semanticPairKey", "scenarioRuleId",
    "semanticFamilyPairKey", "inferenceLevel"] as const;
  return candidate.sectionId === original.sectionId &&
    candidate.sourceIds.length === original.sourceIds.length &&
    candidate.sourceIds.every((id, i) => id === original.sourceIds[i]) &&
    candidate.evidenceIds.length === original.evidenceIds.length &&
    candidate.evidenceIds.every((id, i) => id === original.evidenceIds[i]) &&
    fields.every(key => lhs[key] === rhs[key]) &&
    JSON.stringify(lhs.semanticMotifs) === JSON.stringify(rhs.semanticMotifs) &&
    // This chart is required in the signature so callers cannot pass arbitrary data.
    analysis.tenGods.status === "implemented";
}

/**
 * Narrow, high-confidence blockers for claims that natal evidence does not
 * license. These do NOT measure psychological truth or detect every unsupported
 * claim. Fail closed for clear special abilities, hidden thoughts and diagnoses.
 */
export function findUnsupportedPersonalityClaims(text: string): string[] {
  const checks: ReadonlyArray<[string, RegExp]> = [
    ["CLAIM_MIND_READING", /(?:상대|타인|다른 사람|처음 본 사람|누구든지).{0,28}(?:속마음|생각|의도|거짓말).{0,22}(?:다 (?:읽|알)|단번에 (?:알|파악|간파)|정확히 (?:알|파악)|꿰뚫어 (?:보|읽)|모두 (?:알|파악)|알아내는 능력)/],
    ["CLAIM_UNVERIFIED_GIFT", /(?:타고난|선천적인|특별한|남다른).{0,20}(?:독심술|예지력|초능력|투시력|귀신 감지 능력)|(?:미래|전생).{0,15}(?:정확하게|모두|확실히).{0,12}(?:예측|기억|알아)/],
    ["CLAIM_CLINICAL_DIAGNOSIS", /(?:당신은|고객님은|본인은|이 사람은).{0,25}(?:우울증|공황장애|조울증|ADHD|자폐증).{0,16}(?:있|앓|환자|진단)|(?:우울증|공황장애|조울증|ADHD|자폐증).{0,10}(?:임이 분명|확실|입니다)/],
    ["CLAIM_ABSOLUTE_PERSONAL_FACT", /(?:사람을 처음 보면|처음 만나는 사람의).{0,24}(?:반드시|무조건|항상).{0,24}(?:성격|거짓말|본심|속마음).{0,20}(?:알|읽|판단)/],
  ];
  return checks.filter(([, re]) => re.test(text)).map(([code]) => code);
}

/** Candidate novelty is only a writing-level heuristic. Preserve reviews when
 * no distinctive candidate exists instead of inventing a new trait. */
export function behavioralOverlap(left: PersonalityCandidate, right: PersonalityCandidate): {
  repeatedMotifs: string[]; nearDuplicate: boolean; penalty: number;
} {
  const a = left.behaviorHypothesis, b = right.behaviorHypothesis;
  if (!a || !b) return {repeatedMotifs: [], nearDuplicate: false, penalty: 0};
  // V29: identical observable behavior is duplicate even if motif tags differ.
  // This is a conservative blocker. Motif-based near-duplicates remain blocked,
  // since textual differences alone do not prove a distinct strength.
  const normalizeAction = (value: string) => value.replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g, "").toLowerCase();
  const sameAction = !!a.observableBehavior && !!b.observableBehavior &&
    normalizeAction(a.observableBehavior) === normalizeAction(b.observableBehavior);
  const aMotifs = a.semanticMotifs ?? [], bMotifs = b.semanticMotifs ?? [];
  const matches = aMotifs.filter(m => bMotifs.includes(m));
  const coverage = matches.length / Math.max(aMotifs.length, bMotifs.length, 1);
  const sameFamily = !!a.semanticFamilyPairKey && a.semanticFamilyPairKey === b.semanticFamilyPairKey;
  // A pair of passages can both describe "checking and comparing options"
  // even when their ten-god source families differ. This is a writing-level
  // alert, not a claim that the underlying natal signals are identical.
  const sameDecisionLoop = matches.includes("verification") &&
    matches.includes("opportunity-choice") &&
    [a, b].every(scene => /(?:선택|제안|조건)/.test(scene.trigger+" "+scene.observableBehavior));
  const nearDuplicate = sameAction || (matches.length >= 3 && coverage >= 0.7) ||
    (sameFamily && matches.length >= 2 && coverage >= 0.5) || sameDecisionLoop;
  return {repeatedMotifs: matches, nearDuplicate,
    penalty: nearDuplicate ? 8 : sameFamily ? 4 : matches.length >= 2 ? 2 : 0};
}

export function canonicalBehaviorCandidates(analysis: SajuAnalysis): Map<string, PersonalityCandidate> {
  return new Map(generateConditionalBehaviorCandidates(analysis).map(c => [c.id, c]));
}
