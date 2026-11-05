import type { SajuAnalysis, PillarPosition } from "@/types/saju-analysis";
import type { InterpretationEvidence } from "@/types/ai-interpretation";
import {
  buildPersonalityCandidatePlan, type PersonalityCandidate, type PersonalitySectionId,
} from "./personality-candidates.v1";
import { evaluatePersonalityPriority, type PrioritySignal } from "./personality-priority.v1";
import { behavioralOverlap, canonicalBehaviorCandidates, verifyGeneratedBehaviorContract, findUnsupportedPersonalityClaims } from "./personality-claim-guard.v1";

/**
 * Prewriting selection and audit for V5.6 PART01. Not attached to the V2 runtime.
 * Scores/ranks are editorial heuristics, NOT s​​aju measurements, probabilities,
 * psychological validation, or deterministic engine outputs.
 */
export type CandidateDecision = "SELECTED" | "ALTERNATIVE" | "REJECTED";
export type EditorialFlag =
  | "INSUFFICIENT_EVIDENCE" | "STALE_PROVENANCE" | "DUPLICATE_NARRATIVE"
  | "LOW_CONFIDENCE" | "DERIVED_FACT_NOT_INDEPENDENT" | "ONE_SOURCE_FAMILY"
  | "SINGLE_CANDIDATE" | "SCENE_MISMATCH" | "WEAKNESS_LINK_INVALID" | "SEMANTIC_OVERLAP"
  | "UNSUPPORTED_BEHAVIOR_CONTRACT" | "REUSED_SOURCE_PAIR" | "SCENE_COMPARISON_UNAVAILABLE";

export interface CandidateAssessment {
  candidateId: string;
  decision: CandidateDecision;
  /** Editorial ranking only. Never send as a score in the paid report. */
  editorialRank: number;
  evidenceIds: string[];
  independentSourcePositions: PillarPosition[];
  flags: EditorialFlag[];
  reasons: string[];
  /** Why this candidate outranked another; NOT a human trait measurement. */
  prioritySignals: PrioritySignal[];
  counterConsiderations: string[];
}

export interface PersonalityEditorialSection {
  sectionId: PersonalitySectionId;
  title: string;
  selected: PersonalityCandidate | null;
  alternatives: PersonalityCandidate[];
  assessments: CandidateAssessment[];
}
export interface PersonalityEditorialPlan {
  version: "personality-editorial-v1";
  status: "reviewable" | "needs_more_evidence";
  sections: PersonalityEditorialSection[];
  audit: {
    emptySections: PersonalitySectionId[];
    singleCandidateSections: PersonalitySectionId[];
    repeatedThemes: Array<{ candidateIds: string[]; theme: string }>;
    semanticOverlapReviews: Array<{ priorId: string; candidateId: string; overlappingMotifs: string[] }>;
    /** V35: motif heuristic said "duplicate" but rule-table goal AND output differ. Writer must keep them apart. */
    goalOutputReviews: Array<{ priorId: string; candidateId: string; overlappingMotifs: string[];
      priorGoal: string; candidateGoal: string; priorOutput: string; candidateOutput: string }>;
    droppedCandidateIds: string[];
    warnings: string[];
  };
}
/** V31: editorial chain is a trace of a conditional *interpretation*, not a proven skill. */
export interface StrengthDevelopmentChain {
  status: "SUPPORTED_SCENE" | "RESULT_UNSPECIFIED";
  sourceIds: string[];
  evidenceIds: string[];
  condition: string;
  decisionBasis: string;
  observableAction: string;
  /** Never infer success or achievement beyond the observable action itself. */
  possibleResult: string | null;
  /** V35: rule-table goal of the scene (null when not defined). */
  actionGoal: string | null;
  goalOutputSource: "SCENE_RULE" | "TEXT_EXTRACTION" | null;
  burdenCondition: string;
  counterCondition: string;
  linkedWeaknessCandidateId: string | null;
}

/** Do not invent a successful outcome when the selected scene only describes a decision. */
export function buildStrengthDevelopmentChain(
  strength: PersonalityCandidate | null,
  weakness: PersonalityCandidate | null,
): StrengthDevelopmentChain | null {
  if (!strength || !strengthSceneIsAligned(strength)) return null;
  const h = strength.behaviorHypothesis!;
  const linked = weakness?.behaviorHypothesis?.linkedStrengthCandidateId === strength.id;
  const action = h.observableBehavior.trim();
  // V35: use the rule-table output when the scene carries one; it is already
  // written into the action text. Otherwise keep the V31 explicit-word check.
  const ruleOutput = h.goalOutputSource === "SCENE_RULE" && h.observableOutput ? h.observableOutput : null;
  const hasObservableResult = !!ruleOutput || /결과|완성|마무리|만들|수행|적용|확인/.test(action);
  return {
    status: hasObservableResult ? "SUPPORTED_SCENE" : "RESULT_UNSPECIFIED",
    actionGoal: h.goalOutputSource === "SCENE_RULE" ? h.actionGoal : null,
    goalOutputSource: h.goalOutputSource ?? null,
    sourceIds: [...strength.sourceIds],
    evidenceIds: [...strength.evidenceIds],
    condition: h.trigger,
    decisionBasis: h.decisionBasis,
    observableAction: action,
    possibleResult: ruleOutput ?? (hasObservableResult ? action : null),
    burdenCondition: linked ? weakness!.behaviorHypothesis!.trigger : "근거 있는 부담 조건이 선정되지 않아 자동 서술하지 않음",
    counterCondition: h.counterCondition,
    linkedWeaknessCandidateId: linked ? weakness!.id : null,
  };
}

export interface PersonalityWritingBrief {
  version: "personality-writing-brief-v1";
  /** Internal instructions for an LLM, never a customer-visible diagnostic claim. */
  instructions: string[];
  sections: Array<{
    id: PersonalitySectionId;
    title: string;
    status: "READY_FOR_REVIEW" | "DO_NOT_GENERATE";
    primary: null | {
      claim: string;
      strength: string;
      drawback: string;
      unexpected: string;
      exampleScene: string;
      sourceIds: string[];
      evidenceIds: string[];
      limits: string[];
      editorialContext: string[];
      counterConsiderations: string[];
      behaviorHypothesis?: PersonalityCandidate["behaviorHypothesis"];
      strengthDevelopmentChain?: StrengthDevelopmentChain;
      /** A cross-section editorial reference, not a newly inferred trait. */
      linkedStrengthContext?: { candidateId: string; trigger: string; behavior: string; sourceIds: string[] };
    };
    otherInterpretations: string[];
    reservations: string[];
  }>;
}

const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];

function nearDuplicateClaim(left: string, right: string): boolean {
  const clean = (text: string) => text.replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g, "").toLowerCase();
  const a = clean(left), b = clean(right);
  if (a.length < 22 || b.length < 22) return false;
  if (a === b) return true;
  const grams = (s: string) => {
    const result = new Set<string>();
    for (let i = 0; i <= s.length - 4; i++) result.add(s.slice(i, i + 4));
    return result;
  };
  const x = grams(a), y = grams(b);
  const overlap = Array.from(x).filter(gram => y.has(gram)).length;
  const union = x.size + y.size - overlap;
  return union > 0 && overlap / union >= 0.87;
}

/** Alignment is required for chapter 09, not just two valid sourceIds. */
function strengthSceneIsAligned(candidate:PersonalityCandidate):boolean {
  const h=candidate.behaviorHypothesis;
  if(!h)return false;
  const gods=h.semanticPairKey.split("|");
  const familyByGod:Record<string,string>={
    "비견":"peer","겁재":"peer","식신":"output","상관":"output",
    "정재":"wealth","편재":"wealth","정관":"officer","편관":"officer",
    "정인":"resource","편인":"resource",
  };
  const familyPair=gods.map(god=>familyByGod[god]).filter(Boolean).sort().join("|");
  if(gods.length!==2 || !familyPair || h.semanticFamilyPairKey!==familyPair || !(h.scenarioRuleId==="P01-09:"+familyPair || (h.scenarioRuleId?.startsWith("P01-09:"+familyPair+":") && gods.every(g=>h.scenarioRuleId?.includes(g)))))return false;
  if(/새로 (?:배운|익힌)/.test(h.trigger) && familyPair!=="output|resource")return false;
  return h.trigger.length>10 && h.observableBehavior.length>10;
}

/** Semantic overlap is a reviewer alert, not a natal or clinical fact. */
function sourcePositions(candidate: PersonalityCandidate, analysis: SajuAnalysis): {
  positions: PillarPosition[]; invalid: boolean; derived: boolean;
} {
  const found = new Set<PillarPosition>();
  let invalid = false;
  let derived = false;
  for (const id of candidate.sourceIds) {
    if (id === "NATAL:STRENGTH:ADJUSTED") {
      // This score reuses underlying natal facts. It is contextual, not a new source.
      derived = true;
      if (analysis.strength.adjusted.status !== "implemented") invalid = true;
      continue;
    }
    const match = /^PILLAR:(year|month|day|hour):(stem|branch):(.+)$/.exec(id);
    if (!match) { invalid = true; continue; }
    const position = match[1] as PillarPosition;
    const field = match[2] as "stem" | "branch";
    if (analysis.pillars[position][field] !== match[3]) { invalid = true; continue; }
    found.add(position);
  }
  return { positions: POSITIONS.filter(p => found.has(p)), invalid, derived };
}

function availableEvidence(analysis: SajuAnalysis): Set<string> {
  const allowed = new Set(["NATAL:PILLARS"]);
  if (analysis.tenGods.status === "implemented" && analysis.tenGods.value) allowed.add("NATAL:TEN_GODS");
  if (analysis.structure.status === "implemented" && analysis.structure.primary) allowed.add("NATAL:STRUCTURE:PRIMARY");
  if (analysis.structure.status === "implemented" && analysis.structure.qualityEvaluation.evaluationScope !== "UNAVAILABLE") allowed.add("NATAL:STRUCTURE:QUALITY");
  if (analysis.relations.status === "implemented") allowed.add("NATAL:RELATIONS");
  if (analysis.strength.adjusted.status === "implemented") allowed.add("NATAL:STRENGTH:ADJUSTED");
  return allowed;
}

/** Audit before writing. A candidate's stated evidence must really exist. */
export function selectPersonalityInterpretations(
  analysis: SajuAnalysis,
  extraCandidates: readonly PersonalityCandidate[] = [],
  /** V35 experiment hook. Default "P01-09"; "all"/"none" are for offline comparison only. */
  options: { goalOutputScope?: "P01-09" | "all" | "none" } = {},
): PersonalityEditorialPlan {
  const plan = buildPersonalityCandidatePlan(analysis);
  const allow = availableEvidence(analysis);
  const canonicalBehaviors = canonicalBehaviorCandidates(analysis);
  const assignedThemes = new Map<string, string>();
  const assignedSourcePairs = new Map<string, string>();
  const assignedBehaviorPairs = new Map<string, string>();
  const assignedClaims: Array<{ id:string; claim:string }> = [];
  const selectedBySection = new Map<PersonalitySectionId, PersonalityEditorialSection>();
  const repeatedThemes: PersonalityEditorialPlan["audit"]["repeatedThemes"] = [];
  const semanticOverlapReviews: PersonalityEditorialPlan["audit"]["semanticOverlapReviews"] = [];
  const goalOutputReviews: PersonalityEditorialPlan["audit"]["goalOutputReviews"] = [];
  const selectedBehaviors: Array<{id:string;sectionId:PersonalitySectionId;candidate:PersonalityCandidate}> = [];
  const droppedCandidateIds: string[] = [];

  // Alternative candidates supplied by future rules must pass the same audit.
  for (const section of plan.sections) {
    let pool = [
      ...section.candidates,
      ...extraCandidates.filter(c => c.sectionId === section.id),
    ];
    if (section.id === "P01-10") {
      const strong = selectedBySection.get("P01-09")?.selected;
      // The weakness must inherit an aligned, reviewable behavioral strength.
      // An abstract or mismatched predecessor must not silently be treated as verified.
      if (!strong || !strengthSceneIsAligned(strong)) {
        pool = [];
        // No validated strength means no supported linked drawback. Leave blank.
      } else {
        const strongSources = new Set(strong.sourceIds.filter(id => id.startsWith("PILLAR:")));
        pool = pool.map(candidate => {
          if (!candidate.behaviorHypothesis) return candidate;
          const reused = candidate.sourceIds.filter(id => strongSources.has(id)).length;
          // A drawback must be connected to the earlier selected strength, while
          // adding a separate position. Repeating both sources is not a new reading.
          if (reused !== 1) return candidate;
          const h = candidate.behaviorHypothesis;
          return { ...candidate,
            editorialPriority: (candidate.editorialPriority ?? 0) + 3,
            behaviorHypothesis: {
              ...h,
              linkedStrengthCandidateId: strong.id,
              inferenceSteps: [ ...h.inferenceSteps,
                `앞 절의 강점 ${strong.id}에서 확인된 원국 위치 한 곳에 새로운 위치의 신호를 연결해 부담 조건을 검토` ],
            },
            limits: [...candidate.limits,"앞 절의 장점과 같은 단어를 반복하지 말고 그것이 부담으로 바뀌는 조건만 설명합니다."],
          };
        });
      }
    }
    // V35: goal/output may clear a motif-only duplicate on P01-09 alone.
    // Never on the exact same natal source pair: identical evidence plus shared
    // vocabulary is not made independent by a different goal label alone.
    const sectionAllows = options.goalOutputScope === "all" || (options.goalOutputScope !== "none" && section.id === "P01-09");
    const pairOf = (c: PersonalityCandidate) => c.sourceIds.filter(id=>id.startsWith("PILLAR:")).slice().sort().join("|");
    const optFor = (c: PersonalityCandidate, prior: PersonalityCandidate) =>
      ({allowGoalOutputDistinct: sectionAllows && pairOf(c) !== pairOf(prior)});
    const unique = new Map(pool.map(c => [c.id, c]));
    const assessments = Array.from(unique.values()).map(candidate => {
      const provenance = sourcePositions(candidate, analysis);
      const flags: EditorialFlag[] = [];
      const reasons: string[] = [];
      if (!candidate.evidenceIds.length || candidate.evidenceIds.some(id => !allow.has(id))) {
        flags.push("INSUFFICIENT_EVIDENCE"); reasons.push("참조한 engine evidence를 확인하지 못함");
      }
      if (provenance.invalid) { flags.push("STALE_PROVENANCE"); reasons.push("출생 원국과 sourceIds 값 불일치"); }
      const unsupportedClaims = findUnsupportedPersonalityClaims([
        candidate.claim, candidate.strength, candidate.drawback,
        candidate.unexpected, candidate.exampleScene,
        candidate.behaviorHypothesis?.observableBehavior ?? "",
      ].join(" "));
      if (unsupportedClaims.length) {
        flags.push("UNSUPPORTED_BEHAVIOR_CONTRACT");
        reasons.push("선택 후보에 명식으로 뒷받침할 수 없는 능력 주장이 있음: " + unsupportedClaims.join(", "));
      }
      if (!verifyGeneratedBehaviorContract(analysis, candidate, canonicalBehaviors)) {
        if (!flags.includes("UNSUPPORTED_BEHAVIOR_CONTRACT")) flags.push("UNSUPPORTED_BEHAVIOR_CONTRACT");
        reasons.push("원국에서 생성한 원래 행동 장면과 다름. 승인된 근거 ID로 새 능력을 주장할 수 없음");
      }
      if (provenance.derived) { flags.push("DERIVED_FACT_NOT_INDEPENDENT"); reasons.push("강약 등 파생값을 독립 근거에서 제외"); }
      if (provenance.positions.length < 2) { flags.push("ONE_SOURCE_FAMILY"); reasons.push("독립된 위치 두 곳 이상의 기초 신호가 필요"); }
      if (section.id === "P01-09" && candidate.behaviorHypothesis && !strengthSceneIsAligned(candidate)) {
        flags.push("SCENE_MISMATCH");
        reasons.push("장점 장면과 십성 계열이 맞지 않아 후보를 반려함");
      }
      if (section.id === "P01-10" && !candidate.behaviorHypothesis?.linkedStrengthCandidateId) {
        flags.push("WEAKNESS_LINK_INVALID");
        reasons.push("검증된 앞 절의 강점과 연결되지 않아 부담 가설을 생성하지 않음");
      }
      if (candidate.confidence === "LOW_CONFIDENCE_HYPOTHESIS") {
        flags.push("LOW_CONFIDENCE"); reasons.push("낮은 신뢰도의 전통적 해석 가설 — 에디터 검토 필요");
      }
      // Counts structural diversity rather than giving bonus points for multiple
      // derived engine scores that share the same natal origin.
      const priority = evaluatePersonalityPriority(analysis,candidate);
      const semanticPenalty = selectedBehaviors.reduce((max, previous) =>
        // Chapter 10 deliberately carries the chapter 09 strength forward,
        // so do not penalize the required causal link. Other duplicates count.
        Math.max(max, section.id === "P01-10" && previous.sectionId === "P01-09"
          ? 0 : behavioralOverlap(candidate, previous.candidate, optFor(candidate, previous.candidate)).penalty), 0);
      const noveltyPenalty = Math.min(semanticPenalty, section.id === "P01-10" ? 8 : 4);
      // On P01-06, prefer a genuinely supported post-decision revision scene
      // over a generic contrast, but never override provenance/contract failures.
      const specificRevision=section.id==="P01-06" && candidate.behaviorHypothesis?.scenarioRuleId?.startsWith("P01-06:revision:") ? 2 : 0;
      // A chapter about one's strongest practical advantage must not simply
      // retell the earlier decision or teamwork chapters. Prefer an executable
      // strength with a supported output symbol only when such a candidate
      // actually exists, and still require all ordinary evidence checks.
      // Distinguish practical strengths from P01-05's decision criteria.
      // An output-related natal signal plus a canonical task/result scene
      // receives priority; this is editorial relevance, not proven ability.
      const strengthScene=candidate.behaviorHypothesis;
      const validatedStrength=section.id==="P01-09" && strengthSceneIsAligned(candidate);
      const strengthExecution=validatedStrength ?
        (strengthScene!.semanticFamilyPairKey?.split("|").includes("output") &&
        /결과|완성|마무리|수행|만들|적용/.test(strengthScene!.observableBehavior) ? 10 : 7) : 0;
      // P01-03 is about how time alone is used, not merely setting one's
      // responsibility boundary again. Give supported learning-to-practice
      // contrasts a modest preference when both symbols are actually present.
      const privatePractice=section.id==="P01-03" &&
        candidate.behaviorHypothesis?.semanticFamilyPairKey==="output|resource" ? 3 : 0;
      // Reusing an exact pair of source positions is allowed only for a linked
      // weakness, but a fresh pair is preferred when one is available.
      const linkedWeaknessRank=section.id==="P01-10" && !!candidate.behaviorHypothesis?.linkedStrengthCandidateId;
      const sourcePairKey=candidate.sourceIds.filter(id=>id.startsWith("PILLAR:")).slice().sort().join("|");
      const exactPairReusePenalty=linkedWeaknessRank && assignedSourcePairs.has(sourcePairKey) ? 20 : 0;
      // Avoid consuming a chapter 09 strength if its exact earlier source pair
      // has only an unstructured claim: novelty cannot be verified automatically.
      const sameEarlierSource = section.id==="P01-09" ?
        Array.from(selectedBySection.values()).map(s=>s.selected).find(c=>
          c?.sourceIds.filter(id=>id.startsWith("PILLAR:")).slice().sort().join("|")===sourcePairKey) : null;
      const uncheckableReusePenalty = sameEarlierSource && !sameEarlierSource.behaviorHypothesis ? 12 : 0;
      // V35: a structured earlier chapter already used this exact pair. The
      // scene may differ, but no independent natal evidence is added, so a
      // fresh position pair is preferred when one passes the same checks.
      const structuredReusePenalty = sameEarlierSource?.behaviorHypothesis ? 3 : 0;
      const editorialRank = specificRevision + strengthExecution + privatePractice + Math.min(4, provenance.positions.length) +
        (candidate.confidence === "EDITORIAL_HYPOTHESIS" ? 1 : 0) +
        (candidate.kind === "CONTRAST" ? 1 : 0) +
        (candidate.editorialPriority ?? 0) + priority.adjustment +
        (candidate.behaviorHypothesis ? 3 : 0) - noveltyPenalty - exactPairReusePenalty - uncheckableReusePenalty - structuredReusePenalty;
      if(noveltyPenalty) reasons.push("앞 장에서 다룬 행동 주제와 겹칠 수 있어 후보 선정 점수를 낮춤");
      if(exactPairReusePenalty) reasons.push("앞 장에서 이미 사용한 동일 원국 위치쌍을 약점 해석에 재참조함. 다른 위치쌍을 우선 선정함");
      reasons.push(...priority.signals.filter(s=>s.status!=="CONTEXT").map(s=>s.note));
      return {candidate, evaluation: {
        candidateId: candidate.id, decision: "ALTERNATIVE" as CandidateDecision,
        editorialRank, evidenceIds: [...candidate.evidenceIds],
        independentSourcePositions: provenance.positions, flags, reasons,
        prioritySignals: priority.signals, counterConsiderations: priority.counterConsiderations,
      }};
    }).sort((a,b) => b.evaluation.editorialRank-a.evaluation.editorialRank ||
      a.candidate.id.localeCompare(b.candidate.id));

    let selected: PersonalityCandidate | null = null;
    const alternatives: PersonalityCandidate[] = [];
    for (const entry of assessments) {
      const { candidate, evaluation } = entry;
      const fatal = evaluation.flags.includes("INSUFFICIENT_EVIDENCE") ||
        evaluation.flags.includes("STALE_PROVENANCE") || evaluation.flags.includes("ONE_SOURCE_FAMILY") ||
        evaluation.flags.includes("SCENE_MISMATCH") || evaluation.flags.includes("WEAKNESS_LINK_INVALID") ||
        evaluation.flags.includes("UNSUPPORTED_BEHAVIOR_CONTRACT");
      if (fatal) { evaluation.decision = "REJECTED"; droppedCandidateIds.push(candidate.id); continue; }
      // Do not retell the same two natal signals in another chapter under a new title.
      const pairSignature = candidate.sourceIds.filter(id=>id.startsWith("PILLAR:")).slice().sort().join("|");
      const semanticPair = candidate.behaviorHypothesis?.semanticPairKey;
      // Chapter 09 can express a different strength using the same ten-god
      // names as an earlier chapter, provided the exact natal position pair is
      // different and the actual behavioral scene is not a near duplicate.
      // A bare god-name pair is not proof of identical behavior.
      // A linked P01-10 paragraph intentionally revisits one source position
      // from its selected P01-09 strength, but describes a possible burden.
      // Reusing the symbolic pair is not itself duplicate storytelling here;
      // this exception applies ONLY after the exact-one-source link check.
      const linkedWeakness=section.id==="P01-10" &&
        !!candidate.behaviorHypothesis?.linkedStrengthCandidateId;
      const earlier = assignedThemes.get(candidate.narrativeKey) ??
        (!linkedWeakness && section.id!=="P01-09" && semanticPair ? assignedBehaviorPairs.get(semanticPair) : undefined) ??
        // Chapter 09 may revisit the *same valid natal positions* only when
        // the later action is substantively distinct. The behavioral overlap
        // filter below remains mandatory; the reuse is recorded for audit.
        (!linkedWeakness && section.id!=="P01-09" && pairSignature ? assignedSourcePairs.get(pairSignature) : undefined) ??
        (!linkedWeakness ? assignedClaims.find(row=>nearDuplicateClaim(candidate.claim,row.claim))?.id : undefined);
      if (earlier) {
        evaluation.flags.push("DUPLICATE_NARRATIVE");
        evaluation.reasons.push("다른 섹션에서 동일 서사 사용됨: " + earlier);
        evaluation.decision = "REJECTED";
        droppedCandidateIds.push(candidate.id);
        repeatedThemes.push({candidateIds:[earlier,candidate.id],theme:candidate.narrativeKey});
        continue;
      }
      // Chapter 09 must give a different account from chapter 05. If every
      // supported alternative restates the pre-decision comparison, leave it
      // unselected rather than selling a duplicate as a personal strength.
      if (section.id === "P01-09" && candidate.behaviorHypothesis) {
        // Reusing the semantic god pair is only allowed when its actual
        // behavioral scene differs from every earlier selected section.
        // V35: compare with EARLIER chapters only; a same-chapter runner-up is an alternative, not a duplicate.
        const repeatedBehavior=selectedBehaviors.find(previous => previous.sectionId!==section.id &&
          behavioralOverlap(candidate,previous.candidate,optFor(candidate,previous.candidate)).nearDuplicate);
        if(repeatedBehavior){
          const why=behavioralOverlap(candidate,repeatedBehavior.candidate,optFor(candidate,repeatedBehavior.candidate));
          evaluation.flags.push("SEMANTIC_OVERLAP");
          evaluation.reasons.push("다른 장과 행동 장면이 겹쳐 장점 후보를 제외함: "+repeatedBehavior.sectionId+
            (why.goalOutput==="SAME_GOAL_OR_OUTPUT" ? " (목표 또는 산출물이 같음)" :
             why.goalOutput==="UNVERIFIED" ? " (목표와 산출물 근거가 부족해 독립성 확인 불가)" : ""));
          evaluation.decision="REJECTED";droppedCandidateIds.push(candidate.id);continue;
        }
        const priorDecision = selectedBySection.get("P01-05")?.selected;
        if (priorDecision?.behaviorHypothesis && behavioralOverlap(candidate, priorDecision, optFor(candidate, priorDecision)).nearDuplicate) {
          evaluation.flags.push("SEMANTIC_OVERLAP");
          evaluation.reasons.push("결정 이전의 선택지 비교를 장점으로 반복하므로 반려함");
          evaluation.decision = "REJECTED";
          droppedCandidateIds.push(candidate.id);
          continue;
        }
      }
      // V35: a linked weakness may reuse one P01-09 source, but if it also reuses
      // another chapter's exact source pair AND repeats that chapter's behavior,
      // it retells that chapter rather than describing the strength's burden.
      if (linkedWeakness && pairSignature && candidate.behaviorHypothesis) {
        const retold = selectedBehaviors.find(previous => previous.sectionId!=="P01-09" &&
          previous.candidate.sourceIds.filter(id=>id.startsWith("PILLAR:")).slice().sort().join("|")===pairSignature &&
          behavioralOverlap(candidate,previous.candidate).nearDuplicate);
        if (retold) {
          evaluation.flags.push("DUPLICATE_NARRATIVE");
          evaluation.reasons.push("부담 후보가 "+retold.sectionId+"와 같은 원국 위치쌍과 행동 주제를 반복함. 장점의 부담이 아니라 앞 장의 재서술이므로 제외");
          evaluation.decision="REJECTED";droppedCandidateIds.push(candidate.id);
          repeatedThemes.push({candidateIds:[retold.id,candidate.id],theme:candidate.narrativeKey});
          continue;
        }
      }
      if (section.id === "P01-09" && pairSignature && assignedSourcePairs.has(pairSignature)) {
        evaluation.flags.push("REUSED_SOURCE_PAIR");
        const previous = Array.from(selectedBySection.values()).map(s=>s.selected).find(c=>
          c?.sourceIds.filter(id=>id.startsWith("PILLAR:")).slice().sort().join("|")===pairSignature);
        if (!previous?.behaviorHypothesis) {
          evaluation.flags.push("SCENE_COMPARISON_UNAVAILABLE");
          evaluation.reasons.push("앞 장의 후보가 추상 해석이므로 행동 장면의 차이를 확인할 수 없음. 수작업 검토 전 자동 발행 금지");
        } else {
          evaluation.reasons.push("앞 장의 원국 위치쌍을 재사용함. 행동 장면은 다르지만 독립적인 명리 근거가 추가된 것은 아님");
        }
      }
      if (!selected) {
        selected = candidate;
        evaluation.decision = "SELECTED";
        assignedThemes.set(candidate.narrativeKey,candidate.id);
        if (pairSignature && !linkedWeakness) assignedSourcePairs.set(pairSignature,candidate.id);
        if (semanticPair && !linkedWeakness) assignedBehaviorPairs.set(semanticPair,candidate.id);
        assignedClaims.push({id:candidate.id,claim:candidate.claim});
        if(candidate.behaviorHypothesis) {
          for(const prior of selectedBehaviors) {
            // Chapter 10 intentionally reuses the validated strength's basis,
            // but must describe a drawback rather than presenting it as another strength.
            if(section.id==="P01-10" && prior.sectionId==="P01-09")continue;
            const comparison=behavioralOverlap(candidate,prior.candidate,optFor(candidate,prior.candidate));
            const overlap=comparison.repeatedMotifs;
            const ph=prior.candidate.behaviorHypothesis, ch=candidate.behaviorHypothesis;
            if(!comparison.nearDuplicate && comparison.motifNearDuplicate && comparison.goalOutput==="DISTINCT_GOAL_AND_OUTPUT" && ph && ch) {
              goalOutputReviews.push({priorId:prior.id,candidateId:candidate.id,overlappingMotifs:overlap,
                priorGoal:ph.actionGoal ?? "",candidateGoal:ch.actionGoal ?? "",
                priorOutput:ph.observableOutput ?? "",candidateOutput:ch.observableOutput ?? ""});
              evaluation.reasons.push(`목표와 산출물을 비교해 ${prior.sectionId}와 구별함: 목표(${ph.actionGoal} ↔ ${ch.actionGoal}), 산출물(${ph.observableOutput} ↔ ${ch.observableOutput}). 공통 어휘(${overlap.join(", ")})는 본문에서 반복하지 않도록 검토`);
            }
            if(comparison.nearDuplicate) {
              // Only the closest earlier chapter gets a diagnostic, rather than
              // flooding the writer with every shared common Korean verb.
              const other=semanticOverlapReviews.some(r=>r.candidateId===candidate.id);
              if(!other) {
                semanticOverlapReviews.push({priorId:prior.id,candidateId:candidate.id,overlappingMotifs:overlap});
                evaluation.flags.push("SEMANTIC_OVERLAP");
                evaluation.reasons.push("행동 주제의 유사성이 높음: "+overlap.join(", ")+". 문장 단위 편집 검토 필요");
              }
            }
          }
          selectedBehaviors.push({id:candidate.id,sectionId:section.id,candidate});
        }
      } else {
        alternatives.push(candidate);
        evaluation.decision = "ALTERNATIVE";
      }
    }
    if (selected && alternatives.length === 0) {
      const row=assessments.find(entry=>entry.candidate.id===selected.id);
      if (row) {
        row.evaluation.flags.push("SINGLE_CANDIDATE");
        row.evaluation.reasons.push("같은 소제목에서 통과한 대안 후보가 없어 비교가 완료된 것으로 보지 않음");
      }
    }
    selectedBySection.set(section.id, {
      sectionId:section.id,title:section.title,selected,alternatives,
      assessments:assessments.map(e=>e.evaluation),
    });
  }
  const sections = plan.sections.map(s=>selectedBySection.get(s.id)!);
  const emptySections = sections.filter(s=>!s.selected).map(s=>s.sectionId);
  return {
    version:"personality-editorial-v1",
    status:emptySections.length ? "needs_more_evidence" : "reviewable",
    sections,
    audit:{emptySections, singleCandidateSections:sections.filter(s=>s.selected && s.alternatives.length===0).map(s=>s.sectionId), repeatedThemes,semanticOverlapReviews,goalOutputReviews,droppedCandidateIds,warnings:[
      "편집상 우선순위는 심리 정확도, 미래 사건 예측, 용신 점수가 아닙니다.",
      "다른 섹션의 가설/생활 장면은 장별로 반복하지 않습니다.",
      ...emptySections.map(id => id === "P01-10" && !sections.find(s=>s.sectionId==="P01-09")?.selected?.behaviorHypothesis
        ? "P01-10: 앞 절 P01-09에 검증 가능한 행동 가설이 없어 약점 후보 생성 차단. 사실을 만들어 채우지 말고 근거 확충 및 수동 검토 필요"
        : `${id}: 검증을 통과한 후보가 없어 고객용 자동 생성 차단`),
      ...semanticOverlapReviews.map(r=>`${r.priorId}와 ${r.candidateId}는 행동 주제(${r.overlappingMotifs.join(", ")})가 겹침: 최종 문장 재검토 필요`),
      ...goalOutputReviews.map(r=>`${r.priorId}와 ${r.candidateId}는 목표와 산출물이 다르지만 공통 어휘(${r.overlappingMotifs.join(", ")})가 있음: 같은 표현을 반복하지 않는지 편집 검토 필요`),
      ...sections.filter(s=>s.assessments.some(a=>a.candidateId===s.selected?.id && a.flags.includes("SCENE_COMPARISON_UNAVAILABLE")))
        .map(s=>`${s.sectionId}: 같은 원국 근거를 사용한 앞 장에 행동 가설이 없어 차별화 확인 불가. 고객용 자동 생성 보류`),
      "대안 후보가 없는 소제목은 단일 규칙 매칭이며 후보 비교 검증을 완료한 것으로 간주하지 않습니다.",
      "낮은 신뢰도의 가설은 독자에게 사실로 단정하지 않고 검증 가능한 명리 근거와 함께 설명합니다.",
      "별도 작업이 완료되기 전까지 V5.6 해석을 고객에게 자동 제공하지 않습니다.",
      ...sections.filter(s=>s.selected && !s.selected.behaviorHypothesis)
        .map(s=>s.sectionId+": 조건부 행동 후보 대신 기존 추상 후보 선정 — 구체성 심사 필요"),
    ]},
  };
}

export function createPersonalityWritingBrief(plan: PersonalityEditorialPlan): PersonalityWritingBrief {
  const strengthSection = plan.sections.find(s=>s.sectionId==="P01-09");
  const strengthCandidate = strengthSection?.selected ?? null;
  const weaknessCandidate = plan.sections.find(s=>s.sectionId==="P01-10")?.selected ?? null;
  const strengthChain = buildStrengthDevelopmentChain(strengthCandidate,weaknessCandidate);
  const strengthComparisonUnknown = !!strengthSection?.assessments.some(a=>
    a.candidateId===strengthSection.selected?.id && a.flags.includes("SCENE_COMPARISON_UNAVAILABLE"));
  return {
    version: "personality-writing-brief-v1",
    instructions: [
      "입력된 사주팔자와 계산된 명리 근거를 바꾸거나 새로 계산하지 마세요.",
      "선택된 후보는 전통 해석의 가설이며 독자의 실제 과거·행동을 관찰한 사실이 아닙니다.",
      "장점, 그 장점의 한계, 의외의 면을 균형 있게 다루되 모든 장을 같은 구조로 반복하지 마세요.",
      "behaviorHypothesis가 있으면 행동·발생 조건·판단 기준·반대 조건을 서로 구별해 설명하세요. 명리 용어 나열로 문단을 시작하지 마세요.",
      "possibleMotive가 null이면 숨은 심리 동기를 꾸며내지 마세요. 행동 장면은 가능성의 예시이며 실제 경험이라고 단정하지 마세요.",
      "structuralContext와 inferenceSteps는 내부 검증용입니다. 고객용 본문에 내부 코드·가중치·증거 식별자를 노출하지 마세요.",
      "모르겠네요·그럴지도 모르겠네요 같은 반복적 추측형 결말 대신 해석의 범위를 분명히 서술하세요.",
      "생활 장면은 실제 사건처럼 꾸미지 말고 예시로 쓰세요. 신살·용신·대운·질병·임신·재물 성과를 임의로 확정하지 마세요.",
      "다른 소제목에서 다룬 주제와 장면을 재사용하지 마세요.",
      "semanticOverlapReviews에 기록된 의미 중복은 십성 쌍이 달라도 본문에서 반복하지 마세요. 공통 단어를 단순히 다른 표현으로 바꿔서는 해결되지 않습니다.",
      "P01-09에서는 P01-05의 선택지 비교를 반복하지 마세요. 실제 십성 계열이 출력/수행을 뒷받침할 때만 결과물을 만드는 강점 장면을 우선합니다. 이 장면은 성격이 사실임을 증명하지 않습니다.",
      "P01-09에서 실제 십성 계열과 일치하는 scenarioRuleId의 장면만 사용하세요. 자원과 표현의 조합이 없으면 학습 내용을 실제에 적용한다고 설명하지 마세요.",
      "선택된 해석이 없는 항목은 채우지 말고 근거 추가 검토 대상으로 남기세요.",
      "근거 ID를 인용하더라도 승인된 행동 가설에 없는 새로운 능력, 상대의 숨은 생각을 알아채는 능력, 의학적 진단을 추가하지 마세요.",
      "선택 후보에 behaviorHypothesis가 없다면 행동이나 숨은 동기를 새로 만들어내지 말고 편집 심사 대상으로 남기세요.",
      "P01-02는 공적인 자리와 사적인 관계의 판단 기준을 구분하되 실제 낯가림과 친밀도를 단정하지 마세요.",
      "P01-05는 결정하기 전 선택지 비교, P01-06은 이미 결정한 후 변경할 이유와 유지할 조건을 구분합니다. 두 장에서 같은 선택 장면을 반복하지 마세요.",
      "P01-06에는 revision scenarioRuleId가 확인된 후보만 결정 유지·변경의 구체적 장면을 쓸 수 있습니다. 확인되지 않으면 구체적인 결단력이나 고집을 꾸며내지 마세요.",
      "P01-08은 제약 조건과 해결 행동의 순서를 비교하되 실제 위기 대응력과 정신적 회복력을 진단하지 마세요.",
      "V31: P01-09 strengthDevelopmentChain은 실제 성격이나 능력의 증명이 아닌 조건부 편집 구조입니다. possibleResult가 null이면 성공·성과·실행 능력을 덧붙이지 마세요.",
      "V31: P01-09의 판단기준과 행동은 구별해 설명하고, 10번 부담은 linkedWeaknessCandidateId가 확인된 경우에만 연결하세요.",
      "V35: behaviorHypothesis의 actionGoal과 observableOutput은 장면 규칙표에서 정한 목표와 산출물입니다. 그 범위를 넘는 성과, 성공, 능력을 덧붙이지 말고, null이면 목표나 결과를 새로 만들지 마세요.",
      "V35: goalOutputReviews에 있는 두 장은 목표와 산출물로 구별된 것이므로, 본문에서도 각 장의 목표와 산출물 차이가 드러나게 쓰고 공통 어휘를 반복하지 마세요.",
      "P01-09의 조건부 행동 후보가 검증되지 않았다면 P01-10의 약점 서술을 자동 생성하지 마세요.",
      "P01-10의 linkedStrengthContext가 있으면 P01-09의 실제 선정된 장점 행동을 참고해 부담 조건을 설명하세요. 서로 무관한 약점을 만들어 내지 말고, 연결 근거가 부족하면 재검토 대상으로 남기세요.",
      "P01-10의 linkedStrengthCandidateId는 앞선 P01-09 강점 후보를 가리킵니다. 장점을 반복 설명하지 말고, 같은 성향이 부담으로 바뀔 수 있는 조건만 별도로 설명하세요. 이 연관성도 명리 해석 가설입니다.",
      "P01-10은 앞 장과 같은 십성 계열 또는 원국 근거 하나를 의도적으로 재참조할 수 있습니다. 다른 장의 같은 문장을 복사하지 말고, 실제 선정된 강점의 조건이 지나칠 때의 부담만 설명하세요.",
    ],
    sections: plan.sections.map(section => ({
      id:section.sectionId,title:section.title,
      status:section.selected?.behaviorHypothesis && !(section.sectionId==="P01-10" && strengthComparisonUnknown) &&
        !section.assessments.some(a=>
          a.candidateId===section.selected?.id && a.flags.includes("SCENE_COMPARISON_UNAVAILABLE"))
        ? "READY_FOR_REVIEW" : "DO_NOT_GENERATE",
      primary: section.selected ? {
        claim:section.selected.claim,strength:section.selected.strength,
        drawback:section.selected.drawback,unexpected:section.selected.unexpected,
        exampleScene:section.selected.exampleScene,
        sourceIds:[...section.selected.sourceIds],evidenceIds:[...section.selected.evidenceIds],
        limits:[...section.selected.limits],
        editorialContext:section.assessments.find(a=>a.candidateId===section.selected?.id)?.prioritySignals
          .filter(s=>s.status==="SUPPORT").map(s=>s.note) ?? [],
        counterConsiderations:section.assessments.find(a=>a.candidateId===section.selected?.id)?.counterConsiderations ?? [],
        ...(section.selected.behaviorHypothesis ? {behaviorHypothesis:section.selected.behaviorHypothesis} : {}),
        ...(section.sectionId === "P01-09" && strengthChain && !strengthComparisonUnknown ? {strengthDevelopmentChain:strengthChain} : {}),
        ...(section.sectionId === "P01-10" && section.selected.behaviorHypothesis?.linkedStrengthCandidateId ? (() => {
          const strength = plan.sections.find(s => s.sectionId === "P01-09")?.selected;
          if (!strength?.behaviorHypothesis || strength.id !== section.selected?.behaviorHypothesis?.linkedStrengthCandidateId) return {};
          return {linkedStrengthContext: {
            candidateId: strength.id,
            trigger: strength.behaviorHypothesis.trigger,
            behavior: strength.behaviorHypothesis.observableBehavior,
            sourceIds: [...strength.sourceIds],
          }};
        })() : {}),
      } : null,
      // Keep the AI brief bounded even when the review pool is broad.
      otherInterpretations:section.alternatives.slice(0,3).map(c=>c.claim),
      reservations:[
        ...(section.selected && !section.selected.behaviorHypothesis ? ["조건부 행동 가설 없음 — 구체성 심사 필요"] : []),
        ...section.assessments.flatMap(a=>a.reasons).filter((v,i,arr)=>arr.indexOf(v)===i).slice(0,8),
      ],
    })),
  };
}

export function validatePersonalityBriefEvidence(brief: PersonalityWritingBrief, evidence: readonly InterpretationEvidence[]): string[] {
  const allowed = new Set(evidence.map(e=>e.id));
  const errors: string[] = [];
  for (const section of brief.sections) {
    if (!section.primary) continue;
    for (const id of section.primary.evidenceIds) {
      if (!allowed.has(id)) errors.push(section.id + ": " + id + " unavailable");
    }
  }
  return errors;
}
