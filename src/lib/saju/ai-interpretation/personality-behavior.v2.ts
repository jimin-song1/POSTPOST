import type { PillarPosition, SajuAnalysis } from "@/types/saju-analysis";
import type { TenGodName } from "@/lib/saju/interpretation/ten-gods";
import type { PersonalityCandidate, PersonalitySectionId } from "./personality-candidates.v1";

/**
 * Conditional, evidence-traceable writing hypotheses for PART01.
 * A natal configuration is NOT an observation or proof of an actual habit.
 * No names, user profile, or retrospective feedback are used here.
 */
export interface PersonalityBehaviorHypothesis {
  axis: string;
  trigger: string;
  observableBehavior: string;
  decisionBasis: string;
  /** V34: Explicitly evidenced goal; null if the scene does not specify one. */
  actionGoal: string | null;
  /** V34: Tangible/observable result in the scene; never an inferred achievement. */
  observableOutput: string | null;
  /** Whether goal and output are directly supported, rather than inferred. */
  goalOutputEvidence: "EXPLICIT_SCENE" | "INSUFFICIENT_SCENE";
  /** V35: canonical goal category from the scene rule table. Comparison key, not customer text. */
  goalKey?: GoalKeyV35 | null;
  /** V35: canonical output category from the scene rule table. */
  outputKey?: string | null;
  /** V35: SCENE_RULE = fixed in the rule table; TEXT_EXTRACTION = V34 phrase match only. */
  goalOutputSource?: "SCENE_RULE" | "TEXT_EXTRACTION" | null;
  /** A possible interpretation, never an established unconscious motive. */
  possibleMotive: string | null;
  counterCondition: string;
  structuralContext: string[];
  inferenceSteps: string[];
  inferenceLevel: "CONDITIONAL_INTERPRETATION";
  /** Exact ten-god contrast, independent of chapter heading and natal position. */
  semanticPairKey: string;
  /** What actually supports the scene, separate from the two ten-god labels. */
  scenarioRuleId?: string;
  /** Family-level semantic contrast: different ten-god names can mean the same theme. */
  semanticFamilyPairKey?: string;
  /** Lexical-semantic review cues, not proof of the person's behavior. */
  semanticMotifs?: string[];
  /** On P01-10, the already-selected strength whose limits this scene extends. */
  linkedStrengthCandidateId?: string;
}

/** V35: what the scene is for. Same key in two chapters means the same narrative job. */
export type GoalKeyV35 =
  | "START_ORDER" | "EXPLAIN_VIEW" | "CHOOSE_OPTION" | "REVISE_COMMITMENT"
  | "ALLOCATE_RESPONSIBILITY" | "RESPOND_TO_PROBLEM" | "COMPLETE_OUTPUT"
  | "APPLY_PROCEDURE_SCOPE" | "PRODUCE_FROM_KNOWLEDGE" | "ALLOCATE_OUTPUT_USE" | "SET_DECISION_SCOPE";
export interface GoalOutputSpecV35 {
  goalKey: GoalKeyV35; outputKey: string; actionGoal: string; observableOutput: string;
}
type Family = "peer" | "output" | "wealth" | "officer" | "resource";
type StemOrBranch = "stem" | "branch";
type Signal = {
  key: string; position: PillarPosition; kind: StemOrBranch;
  character: string; god: TenGodName; family: Family;
  sourceId: string;
};
const FAMILIES: Record<TenGodName, Family> = {
  비견:"peer", 겁재:"peer", 식신:"output", 상관:"output",
  정재:"wealth", 편재:"wealth", 정관:"officer", 편관:"officer",
  정인:"resource", 편인:"resource",
};
const EXPRESSIONS: Record<TenGodName, { focus: string; condition: string }> = {
  비견:{focus:"내가 맡을 몫과 결정권",condition:"혼자 책임질 범위가 분명해질 때"},
  겁재:{focus:"다른 사람과 나눌 몫과 주도권",condition:"공로·역할을 함께 조정해야 할 때"},
  식신:{focus:"하나씩 끝까지 만드는 과정",condition:"꾸준히 쌓아야 할 결과가 있을 때"},
  상관:{focus:"기존 절차에서 바꿀 만한 부분",condition:"정해진 방식에 빈틈이 보일 때"},
  정재:{focus:"예측 가능한 비용과 관리 범위",condition:"유지 비용을 감당해야 할 때"},
  편재:{focus:"열려 있는 선택지와 기회비용",condition:"여러 제안이 동시에 나타날 때"},
  정관:{focus:"합의된 절차와 명확한 책임",condition:"공식적인 기준에 맞춰야 할 때"},
  편관:{focus:"압박 속 우선 처리할 책임",condition:"기한이나 요구가 갑자기 엄격해질 때"},
  정인:{focus:"이미 알고 있는 정보와 이해의 근거",condition:"설명을 검토할 시간이 주어질 때"},
  편인:{focus:"익숙하지 않은 방식의 가능성",condition:"기존 설명만으로 납득되지 않을 때"},
};
function hasFinalConsonant(word:string):boolean {
  const code=word.charCodeAt(word.length-1);
  return code>=0xAC00 && code<=0xD7A3 && (code-0xAC00)%28!==0;
}
function objectParticle(word:string):string { return hasFinalConsonant(word) ? "을" : "를"; }
function andParticle(word:string):string { return hasFinalConsonant(word) ? "과" : "와"; }
function subjectParticle(word:string):string { return hasFinalConsonant(word) ? "이" : "가"; }
type StrengthScene = {
  trigger: string; action: string; alternative: string;
};
/**
 * V35: goal/output of each P01-09 family scene, defined at the data source.
 * `clause` is appended to the action so the output is explicit in the scene
 * text itself; it is a scene descriptor, never a claim of success or skill.
 */
const STRENGTH_GOALS: Record<string, GoalOutputSpecV35 & {clause:string|null}> = {
  "officer|output": {goalKey:"COMPLETE_OUTPUT",outputKey:"finished-work",actionGoal:"정해진 기준 안에서 작업을 끝맺는 것",observableOutput:"기준에 맞춰 마무리한 작업 결과물",clause:"기준에 맞는 결과물로 마무리하려는"},
  "officer|peer": {goalKey:"ALLOCATE_RESPONSIBILITY",outputKey:"role-allocation",actionGoal:"자기 몫과 공동 절차의 경계를 정하는 것",observableOutput:"구분된 자기 역할 범위",clause:"자기 몫과 공동 절차를 나눈 역할 범위를 정하려는"},
  "officer|resource": {goalKey:"APPLY_PROCEDURE_SCOPE",outputKey:"procedure-application-scope",actionGoal:"새 절차를 실제 일에 어디까지 적용할지 정하는 것",observableOutput:"공식 기준과 대조해 정한 적용 범위",clause:"새 절차를 어디까지 적용할지 정하려는"},
  "officer|wealth": {goalKey:"CHOOSE_OPTION",outputKey:"narrowed-options",actionGoal:"공식 기준에 맞는 선택지를 고르는 것",observableOutput:"기준을 충족하는 선택지",clause:"기준을 충족하는 선택지를 고르려는"},
  "output|peer": {goalKey:"COMPLETE_OUTPUT",outputKey:"finished-work",actionGoal:"자기 몫의 일을 직접 끝맺는 것",observableOutput:"직접 끝낸 자기 몫의 결과물",clause:"맡은 몫을 결과물로 끝맺으려는"},
  "output|resource": {goalKey:"PRODUCE_FROM_KNOWLEDGE",outputKey:"practice-result",actionGoal:"익힌 내용을 실제 결과물로 옮기는 것",observableOutput:"실제 수행 순서와 그 결과",clause:"익힌 내용을 실제 결과물로 옮겨 보려는"},
  "output|wealth": {goalKey:"ALLOCATE_OUTPUT_USE",outputKey:"output-use-plan",actionGoal:"만든 결과물의 활용 방법을 고르는 것",observableOutput:"활용 방법을 정한 결과물",clause:null},
  "peer|resource": {goalKey:"SET_DECISION_SCOPE",outputKey:"own-decision-scope",actionGoal:"확인한 정보로 스스로 결정할 범위를 정하는 것",observableOutput:"스스로 결정할 범위",clause:"스스로 결정할 범위를 정하려는"},
  "peer|wealth": {goalKey:"CHOOSE_OPTION",outputKey:"narrowed-options",actionGoal:"맡을 범위 안에서 선택지를 좁히는 것",observableOutput:"좁혀진 선택지",clause:"선택지를 좁히려는"},
  "resource|wealth": {goalKey:"CHOOSE_OPTION",outputKey:"narrowed-options",actionGoal:"설명이 다른 제안 가운데 선택지를 좁히는 것",observableOutput:"좁혀진 선택지",clause:"선택지를 좁히려는"},
};
/**
 * V35.1: 겁재 is a SHARED-ownership signal. A family-level peer scene written
 * for 비견 ("내 몫을 직접", "스스로 결정") contradicts it, so a 겁재 pair gets
 * its own scene and goal. When the goal becomes allocation, it carries the
 * same goal key as P01-07 so the duplicate check sees it honestly.
 */
const STRENGTH_VARIANTS: Record<string, {scene:StrengthScene; goal:GoalOutputSpecV35 & {clause:string|null}}> = {
  "output|peer:겁재": {
    scene:{trigger:"여럿이 나눠 맡은 일에서 내 몫을 마무리해야 할 때",action:"",alternative:"맡은 몫의 경계가 정해지지 않았다면 결과물보다 분담을 먼저 정해야 할 수 있음"},
    goal:{goalKey:"COMPLETE_OUTPUT",outputKey:"finished-work",actionGoal:"함께 하는 일 안에서 자기 몫을 끝맺는 것",observableOutput:"공동 작업 속에서 끝낸 자기 몫의 결과물",clause:"공동 작업 안에서 맡은 몫을 결과물로 끝맺으려는"},
  },
  "peer|resource:겁재": {
    scene:{trigger:"함께 판단할 사람들과 필요한 정보를 나눌 수 있을 때",action:"",alternative:"혼자 결정해도 되는 일이라면 정보를 나누는 과정을 줄일 수 있음"},
    goal:{goalKey:"ALLOCATE_RESPONSIBILITY",outputKey:"decision-allocation",actionGoal:"함께 정할 부분과 스스로 정할 부분을 나누는 것",observableOutput:"함께 정할 부분과 스스로 정할 부분의 구분",clause:"함께 정할 부분과 스스로 정할 부분을 나누려는"},
  },
  "peer|wealth:겁재": {
    scene:{trigger:"함께 맡은 범위 안에서 여러 선택지를 좁혀야 할 때",action:"",alternative:"선택 범위가 이미 정해져 있다면 가능한 대안만 검토할 수 있음"},
    goal:{goalKey:"CHOOSE_OPTION",outputKey:"narrowed-options",actionGoal:"함께 맡은 범위 안에서 선택지를 좁히는 것",observableOutput:"좁혀진 선택지",clause:"선택지를 좁히려는"},
  },
};
function strengthGoalSpec(key:string):(GoalOutputSpecV35 & {clause:string|null})|undefined {
  return STRENGTH_VARIANTS[key]?.goal ?? STRENGTH_GOALS[key];
}
/** V35: section-level goals. P01-02/03/10 have no tangible output and stay null. */
const SECTION_GOALS: Partial<Record<PersonalitySectionId, GoalOutputSpecV35>> = {
  "P01-01": {goalKey:"START_ORDER",outputKey:"start-sequence",actionGoal:"새 일을 어디서부터 시작할지 정하는 것",observableOutput:"정해진 시작 단계"},
  "P01-04": {goalKey:"EXPLAIN_VIEW",outputKey:"structured-explanation",actionGoal:"의견을 상대에게 전달하는 것",observableOutput:"구분해 전달한 설명"},
  "P01-05": {goalKey:"CHOOSE_OPTION",outputKey:"priority-conditions",actionGoal:"제안을 고르기 전에 우선 확인할 조건을 정하는 것",observableOutput:"선택 전에 우선 확인할 조건"},
  "P01-06": {goalKey:"REVISE_COMMITMENT",outputKey:"revision-boundary",actionGoal:"이미 내린 결정을 유지할지 고칠지 정하는 것",observableOutput:"유지할 부분과 바꿀 부분의 구분"},
  "P01-08": {goalKey:"RESPOND_TO_PROBLEM",outputKey:"problem-response-order",actionGoal:"예상 밖의 문제에 대응할 순서를 정하는 것",observableOutput:"문제 대응의 우선순위"},
};
function cooperationGoal(action:string):GoalOutputSpecV35 {
  return /비용|지출|부담|예산/.test(action)
    ? {goalKey:"ALLOCATE_RESPONSIBILITY",outputKey:"role-cost-allocation",actionGoal:"함께 하는 일의 역할과 비용 부담을 정하는 것",observableOutput:"합의된 역할과 비용 분담"}
    : {goalKey:"ALLOCATE_RESPONSIBILITY",outputKey:"role-allocation",actionGoal:"함께 하는 일의 역할을 정하는 것",observableOutput:"합의된 역할 분담"};
}
/**
 * A strength needs a scene supported by BOTH symbolic families. The earlier
 * fixed learning-to-practice scene was applied even to peer+wealth and
 * attributed a learning skill that did not appear in the candidate facts.
 */
const STRENGTH_SCENES: Record<string,StrengthScene> = {
  "officer|output": {
    trigger:"공동의 절차 안에서 결과물을 완성해야 할 때",
    action:"정해진 기준을 살피고 작업의 결과를 마무리하는 두 방향을 함께 검토하는 모습",
    alternative:"절차 자체가 불분명하면 작업을 시작하기 전에 기준을 확인할 수 있음",
  },
  "officer|peer": {
    trigger:"협력하면서 개인의 책임과 공동 규칙을 함께 정할 때",
    action:"스스로 맡을 부분과 공동의 절차를 구분해 역할을 정하는 모습",
    alternative:"책임과 권한이 이미 합의됐다면 직접 조율할 필요가 줄어들 수 있음",
  },
  "officer|resource": {
    trigger:"새로운 절차의 이유를 이해한 뒤 실제 적용 여부를 판단할 때",
    action:"기존 정보에서 이해한 내용과 공식 기준을 대조하는 모습",
    alternative:"이미 충분히 익숙한 절차라면 별도의 설명을 확인할 일이 줄어들 수 있음",
  },
  "officer|wealth": {
    trigger:"여러 거래 조건 중 공식 기준에 맞는 선택지를 골라야 할 때",
    action:"가능한 제안의 범위와 반드시 지켜야 할 조건을 함께 따지는 모습",
    alternative:"선택권이 거의 없다면 기준을 충족하는 데 집중할 수 있음",
  },
  "output|peer": {
    trigger:"자기 몫의 일을 직접 마무리할 수 있을 때",
    action:"스스로 맡은 부분을 정하고 결과를 끝까지 만드는 과정에 집중하는 모습",
    alternative:"공동의 결정이 필요한 작업이라면 자기 방식만으로 끝낼 수는 없음",
  },
  "output|resource": {
    trigger:"새로 익힌 내용을 직접 결과물로 만들어 볼 때",
    action:"알고 있는 내용을 실제 수행 순서로 옮겨 결과를 확인하는 모습",
    alternative:"실습 기회나 필요한 자원이 부족하면 이해와 실행 사이에 간격이 생길 수 있음",
  },
  "output|wealth": {
    trigger:"결과물을 만들어 여러 활용 방법 중 하나를 골라야 할 때",
    action:"만드는 과정의 완성도와 결과가 활용될 가능성을 함께 비교하는 모습",
    alternative:"활용처가 정해져 있다면 결과물을 만드는 일 자체에 집중할 수 있음",
  },
  "peer|resource": {
    trigger:"자기 판단에 필요한 정보를 충분히 확인할 수 있을 때",
    action:"익힌 내용을 살피고 스스로 결정할 범위를 정하는 모습",
    alternative:"함께 판단해야 하는 일에서는 내 기준만으로 결론 내리지 않을 수 있음",
  },
  "peer|wealth": {
    trigger:"자신이 맡을 범위를 정한 뒤 여러 선택지를 좁혀야 할 때",
    action:"결정할 수 있는 범위와 선택지의 기회비용을 나누어 살피는 모습",
    alternative:"선택 범위가 이미 정해져 있다면 가능한 대안만 검토할 수 있음",
  },
  "resource|wealth": {
    trigger:"설명이 서로 다른 제안을 비교해야 할 때",
    action:"알고 있는 정보와 제안별 조건을 대조해 선택지를 좁히는 모습",
    alternative:"검증할 정보가 부족하면 당장 결론을 내리지 않을 수도 있음",
  },
};
/**
 * Expression hypotheses require a computed output signal. The companion
 * symbol changes the situation in which an opinion might be shared, rather
 * than implying that output alone proves actual talkativeness.
 */
const EXPRESSION_SCENES: Partial<Record<Family, StrengthScene>> = {
  resource: {
    trigger:"익숙하지 않은 내용을 설명해 달라는 요청을 받았을 때",
    action:"지금 설명할 수 있는 내용과 먼저 확인할 내용을 나누어 전달하는 방식",
    alternative:"내용을 충분히 익힌 상황이라면 확인 절차 없이 의견을 말할 수 있음",
  },
  officer: {
    trigger:"공식적인 자리에서 의견을 전달해야 할 때",
    action:"말하고 싶은 내용과 합의된 기준에 맞춰 전달할 내용을 구별하는 방식",
    alternative:"격식이 필요 없는 자리에서는 설명의 순서를 달리할 수 있음",
  },
  wealth: {
    trigger:"제안의 조건을 설명하거나 여러 선택지를 논의할 때",
    action:"전달하려는 생각과 구체적인 비용 또는 선택 조건을 구분해 말하는 방식",
    alternative:"결정할 조건이 이미 분명하다면 의견을 짧게 전달할 수 있음",
  },
};
/** V16: differentiate evidence-supported subtypes, never merely paraphrase. */
function specificExpressionScene(primary:Signal, secondary:Signal): (StrengthScene & {ruleId:string}) | undefined {
  if(primary.family!=="output")return undefined;
  const base=EXPRESSION_SCENES[secondary.family];
  if(!base)return undefined;
  // 식신: 설명을 결과나 순서에 연결; 상관: 절차의 수정 가능성을 설명.
  // Companion ten-god must also be computed, not deduced from demographics.
  const actions:Partial<Record<TenGodName,string>>={
    정인:"기존에 확인한 설명에서 전달할 핵심과 추가 검토할 자료를 구분하는 방식",
    편인:"익숙한 설명과 다른 가능성을 제시하되 확인되지 않은 부분을 구분하는 방식",
    정관:"공식 기준에서 지켜야 할 부분과 자신의 의견을 구분해 전달하는 방식",
    편관:"시급한 요청에서 당장 알려야 할 문제와 나중에 검토할 제안을 나누는 방식",
    정재:"예측 가능한 비용과 설명하려는 제안의 범위를 구별하는 방식",
    편재:"여러 대안 중 무엇을 선택할 수 있는지와 그 대가를 나누어 설명하는 방식",
  };
  const detail=actions[secondary.god];
  if(!detail)return undefined;
  const production=primary.god==="식신";
  const positionContext:Record<PillarPosition,string>={
    year:"여러 사람이 공유하는 공개적인 설명에서는",
    month:"업무나 공식적인 역할의 설명에서는",
    day:"가까운 관계에서 의견을 주고받을 때에는",
    hour:"개별적인 계획이나 이후의 실행을 논의할 때에는",
  };
  return {
    trigger:production ? `만든 결과나 진행 순서를 다른 사람에게 설명할 때, ${base.trigger}` :
      `기존 설명에서 개선점을 이야기할 때, ${base.trigger}`,
    action:production ? `${positionContext[primary.position]} ${detail}과 실제로 진행한 순서를 함께 설명하는 방식` :
      `${positionContext[primary.position]} ${detail}과 기존 절차에서 조정할 부분을 함께 제안하는 방식`,
    alternative:base.alternative,
    ruleId:`P01-04:output:${primary.god}|${secondary.god}`,
  };
}
function specificStrengthScene(primary:Signal,secondary:Signal): (StrengthScene & {ruleId:string; motifAction:string; goalSpecKey:string}) | undefined {
  const pair=familyPair(primary.family,secondary.family);
  const base=STRENGTH_SCENES[pair];
  if(!base)return undefined;
  // The exact stems have distinct domains, but not verified personality traits.
  // Only add specifics when the corresponding natal ten-god is present.
  const specific:Partial<Record<TenGodName,string>>={
    비견:"스스로 결정하고 맡을 몫을 구분",
    겁재:"공동의 성과와 배분 책임을 조정",
    식신:"작업을 단계적으로 완성",
    상관:"기존 과정에서 바꿀 만한 부분을 찾아 제안",
    정재:"정해진 예산과 관리 가능한 범위를 확인",
    편재:"대안별 기회비용과 활용 가능성을 검토",
    정관:"합의된 기준과 절차를 확인",
    편관:"시급한 요청의 우선 책임을 정리",
    정인:"익숙한 설명의 근거를 확인",
    편인:"기존 설명과 다른 접근의 가능성을 검토",
  };
  const a=specific[primary.god],b=specific[secondary.god];
  if(!a||!b)return undefined;
  const variantKey=[primary.god,secondary.god].includes("겁재") && STRENGTH_VARIANTS[`${pair}:겁재`] ? `${pair}:겁재` : pair;
  const variant=STRENGTH_VARIANTS[variantKey];
  const clause=strengthGoalSpec(variantKey)?.clause ?? "결과를 정하려는";
  return {
    trigger:variant?.scene.trigger ?? base.trigger,
    // V35.1: "A한 다음 B" asserted an order the chart does not support (it only
    // reflected which position was listed first). Both clauses are now parallel.
    action:pair==="output|wealth" ?
      "만드는 과정의 완성도와 결과가 활용될 가능성을 함께 비교해 결과물의 활용 방법을 정하려는 모습" :
      `${a}하는 일과 ${b}하는 일을 함께 살펴 ${clause} 모습`,
    alternative:variant?.scene.alternative ?? base.alternative,
    goalSpecKey:variantKey,
    // V35: motif tags describe the behavior only. The goal/output clause is
    // compared through goalKey/outputKey, so it must not inflate motif overlap.
    motifAction:pair==="output|wealth" ? base.action : `${a}한 다음 ${b}하는 두 과정을 연결`,
    ruleId:`P01-09:${pair}:${primary.god}|${secondary.god}`,
  };
}
/**
 * After a decision, the relevant question is whether a new circumstance
 * changes the original commitment. Never reuse the P01-05 first-choice scene.
 * Each pair needs a commitment-side symbol and a genuinely different
 * information/output-side symbol. This is an editorial interpretation only.
 */
const REVISION_SCENES: Partial<Record<string,StrengthScene>> = {
  "peer|resource": {
    trigger:"이미 맡기로 한 일에 새로운 정보가 들어왔을 때",
    action:"처음 맡기로 한 책임을 유지할지, 새 정보가 바꾼 조건만 다시 합의할지 구분하는 모습",
    alternative:"새 정보가 처음 결정의 전제와 무관하면 맡은 일을 그대로 이어갈 수 있음",
  },
  "officer|resource": {
    trigger:"합의한 절차를 진행하다 설명이 달라졌을 때",
    action:"기존 약속에서 지켜야 할 부분과 새 설명 때문에 변경할 부분을 구분하는 모습",
    alternative:"변경된 설명이 핵심 규칙을 바꾸지 않는다면 기존 절차를 이어갈 수 있음",
  },
  "officer|output": {
    trigger:"정해진 절차대로 일을 진행했는데 실제 결과가 다르게 나왔을 때",
    action:"기존 절차를 유지할지 실제 결과에 맞춰 작업 순서를 수정할지 나누어 보는 모습",
    alternative:"결과 차이가 일시적인 경우에는 절차를 유지하며 지켜볼 수 있음",
  },
  "peer|output": {
    trigger:"스스로 마무리하기로 한 일이 예상과 다르게 진행될 때",
    action:"완료하겠다는 약속을 유지하면서 실행 방법만 조정할지 살피는 모습",
    alternative:"예상과 다른 결과가 작업 목표와 무관하다면 원래 방법을 유지할 수 있음",
  },
  "resource|wealth": {
    trigger:"이미 선택한 제안의 조건을 뒷받침하는 정보가 달라졌을 때",
    action:"처음 선택한 비용이나 조건을 그대로 수용할지 새 정보에 맞춰 선택 범위를 바꿀지 구분하는 모습",
    alternative:"바뀐 정보가 비용과 계약 조건에 영향을 주지 않으면 기존 선택을 유지할 수 있음",
  },
  "output|wealth": {
    trigger:"선택한 계획의 실제 성과가 예상과 다르게 나타날 때",
    action:"처음 정한 활용 계획을 유지할지 실제 결과에 맞춰 다음 실행 방법을 조정할지 구분하는 모습",
    alternative:"차이가 작고 다시 시도할 수 있다면 당장 계획을 바꾸지 않을 수도 있음",
  },
};
/**
 * Chapter 01 describes a starting approach, not teamwork boundaries or a
 * verified personality trait. Only supported symbolic pairs receive scenes.
 */
const BASELINE_SCENES: Partial<Record<string,StrengthScene>> = {
  "peer|resource": {
    trigger:"처음 접하는 일을 어떻게 시작할지 생각할 때",
    action:"직접 시도할 부분과 먼저 배워야 할 부분을 나누어 출발하는 모습",
    alternative:"이미 익숙한 일이라면 설명을 기다리지 않고 바로 시도할 수도 있음",
  },
  "officer|resource": {
    trigger:"낯선 규칙을 처음 적용해야 할 때",
    action:"규칙을 먼저 이해한 뒤 어느 순서로 시작할지 가늠하는 모습",
    alternative:"절차가 이미 충분히 익숙하다면 별도 확인 없이 시작할 수도 있음",
  },
  "officer|peer": {
    trigger:"기준이 정해진 일을 처음 맡았을 때",
    action:"정해진 절차를 따를 부분과 스스로 진행할 부분을 가려 시작하는 모습",
    alternative:"맡은 범위가 뚜렷하다면 구분 없이 바로 시작할 수 있음",
  },
};
/**
 * Chapter 07 concerns an agreement with other people, not the person's
 * general starting style. A shared resource is a condition, not a prediction.
 */
const COOPERATION_SCENES: Partial<Record<string,StrengthScene>> = {
  "peer|wealth": {
    trigger:"여럿이 함께 맡은 일의 비용과 담당 범위를 합의해야 할 때",
    action:"누가 어떤 일을 맡고 어느 비용까지 책임질지 서로 합의하는 모습",
    alternative:"역할과 비용이 이미 정리됐다면 세부 범위를 다시 협상할 필요가 없을 수 있음",
  },
  "officer|peer": {
    trigger:"공동 업무에서 공식 규칙과 개인 역할을 정해야 할 때",
    action:"공통으로 지킬 절차와 사람마다 맡을 역할을 합의하는 모습",
    alternative:"담당자가 이미 정해져 있다면 절차를 따르는 데 집중할 수 있음",
  },
  "officer|wealth": {
    trigger:"공동의 일에서 합의된 규칙과 비용 분담을 정해야 할 때",
    action:"공식적으로 지켜야 할 기준과 실제로 나눌 부담을 조율하는 모습",
    alternative:"비용 부담이 없는 일이라면 규칙 확인만으로 충분할 수 있음",
  },
};
/**
 * V15: These conditional narrative scenes are tied to the EXACT computed
 * ten-god pair and its positions. They are possible reading examples, never
 * measured behaviors. A new phrase alone must never count as a new insight.
 */
type AnchoredScene = StrengthScene & { ruleId: string; semanticMode: string };
function anchoredBaselineScene(left:Signal,right:Signal):AnchoredScene|undefined {
  const peer=[left,right].find(s=>s.family==="peer");
  const officer=[left,right].find(s=>s.family==="officer");
  const resource=[left,right].find(s=>s.family==="resource");
  if(peer && officer) {
    if(officer.god==="편관")return {
      ruleId:"P01-01:urgent-duty-vs-autonomy",semanticMode:"pressure-and-autonomy",
      trigger:"새로운 일을 맡으면서 마감이나 책임이 갑자기 정해졌을 때",
      action:"급한 요구를 먼저 처리할 부분과 직접 결정할 수 있는 부분을 구분해 시작하는 모습",
      alternative:"기한이 넉넉하고 권한이 분명하면 시작 순서를 직접 정할 수 있음",
    };
    if(peer.god==="겁재")return {
      ruleId:"P01-01:shared-duty-vs-team-autonomy",semanticMode:"shared-rule-and-role",
      trigger:"처음 협업을 시작하면서 공동 규칙과 역할을 함께 정할 때",
      action:"모두가 따를 규칙과 사람마다 맡을 몫을 먼저 나누어 시작하는 모습",
      alternative:"역할이 이미 정해져 있다면 따로 분담을 논의하지 않을 수 있음",
    };
    return {
      ruleId:"P01-01:standard-vs-self-direction",semanticMode:"individual-role-and-standard",
      trigger:"새 과제에서 정해진 절차와 개인의 재량이 함께 주어질 때",
      action:"공통으로 따라야 할 절차를 확인한 뒤 스스로 진행할 단계를 정해 시작하는 모습",
      alternative:"재량이 거의 없는 업무라면 정해진 순서에 따라 시작할 수 있음",
    };
  }
  if(peer && resource) {
    if(resource.god==="편인")return {
      ruleId:"P01-01:unfamiliar-information-vs-own-approach",semanticMode:"unfamiliar-information-and-initiative",
      trigger:"기존 설명만으로 해결하기 어려운 일을 처음 맡았을 때",
      action:"새로운 가능성을 살펴볼 부분과 직접 시도할 부분을 나누어 시작하는 모습",
      alternative:"검증된 방법이 충분하다면 낯선 방법을 찾지 않을 수 있음",
    };
    return {
      ruleId:"P01-01:established-learning-vs-initiative",semanticMode:"prior-knowledge-and-initiative",
      trigger:"이미 배운 지식을 활용할 수 있는 과제를 처음 맡았을 때",
      action:"알고 있는 방법을 먼저 확인하고 스스로 시험할 단계를 정하는 모습",
      alternative:"직접 시도할 여건이 없다면 배운 내용을 정리하는 데 그칠 수 있음",
    };
  }
  return undefined;
}
function anchoredCooperationScene(left:Signal,right:Signal):AnchoredScene|undefined {
  const peer=[left,right].find(s=>s.family==="peer");
  const wealth=[left,right].find(s=>s.family==="wealth");
  const officer=[left,right].find(s=>s.family==="officer");
  if(peer && wealth){
    if(peer.god==="겁재")return {
      ruleId:"P01-07:cooperation:collective-credit-vs-cost",semanticMode:"shared-credit-cost",
      trigger:"여럿이 공동으로 성과를 내면서 지출도 나누어야 할 때",
      action:"함께 낸 성과를 어떻게 인정하고 고정적인 비용을 누가 맡을지 합의하는 모습",
      alternative:"성과 배분과 지출 담당이 이미 정해졌다면 새로 협상할 필요가 없을 수 있음",
    };
    if(wealth.god==="편재")return {
      ruleId:"P01-07:cooperation:opportunity-vs-decision-authority",semanticMode:"opportunity-authority",
      trigger:"공동의 제안에 참여하면서 선택권과 책임을 나눠야 할 때",
      action:"누가 제안을 결정하고 실행을 맡을지 먼저 합의하는 모습",
      alternative:"각자의 결정 권한이 이미 확실하면 기회 자체를 검토하는 데 집중할 수 있음",
    };
    if(wealth.position==="month")return {
      ruleId:"P01-07:cooperation:public-budget-vs-own-scope",semanticMode:"common-budget-individual-scope",
      trigger:"함께 정한 예산의 기준과 개인이 맡은 일을 맞춰야 할 때",
      action:"공통 지출 기준을 살피면서 자신이 책임질 작업 범위를 따로 합의하는 모습",
      alternative:"공동 예산이 이미 확정됐다면 자신의 업무 범위를 실행하는 데 집중할 수 있음",
    };
    if(wealth.position==="day")return {
      ruleId:"P01-07:cooperation:personal-expenditure-vs-joint-role",semanticMode:"personal-expense-joint-role",
      trigger:"공동 작업에서 개인 부담과 함께할 몫이 섞여 있을 때",
      action:"각자 부담할 비용과 함께 처리할 역할을 구분해 합의하는 모습",
      alternative:"개인 비용이 없는 공동 작업에서는 역할만 나누면 될 수 있음",
    };
    return {
      ruleId:"P01-07:cooperation:assigned-duty-vs-fixed-cost",semanticMode:"responsibility-fixed-cost",
      trigger:"함께 진행하는 일의 담당 범위와 반복 비용을 정할 때",
      action:"일을 맡는 사람과 비용을 관리할 사람을 구분해 합의하는 모습",
      alternative:"담당자와 관리비가 이미 결정됐다면 분담 논의가 짧아질 수 있음",
    };
  }
  if(peer && officer)return {
    ruleId:officer.god==="편관"?"P01-07:cooperation:urgent-role-responsibility":"P01-07:cooperation:formal-role-responsibility",
    semanticMode:officer.god==="편관"?"urgent-role":"formal-role",
    trigger:officer.god==="편관"?"일정이 촉박한 공동 작업에서 책임자를 정해야 할 때":"공동 업무에서 정해진 규칙과 개인 역할을 함께 맞출 때",
    action:officer.god==="편관"?"당장 처리할 일과 나중에 조정할 담당 범위를 구분해 합의하는 모습":"모두가 지킬 절차와 사람별로 맡을 역할을 나누어 합의하는 모습",
    alternative:"담당 범위가 이미 정해져 있다면 절차를 따르는 데 집중할 수 있음",
  };
  if(wealth && officer)return {
    ruleId:"P01-07:cooperation:budget-vs-shared-rule",semanticMode:"common-budget-rule",
    trigger:"공동의 규칙을 지키면서 비용을 나누어야 할 때",
    action:"꼭 지켜야 할 기준과 조정할 수 있는 지출 항목을 따로 합의하는 모습",
    alternative:"비용 분담이 없는 관계라면 규칙만 확인해도 될 수 있음",
  };
  return undefined;
}
/** Editorial scene choices vary with the actual public/private or task signals.
 * They are conditional examples, not observed personal history. */
const PUBLIC_CONTEXT: Record<Family,string> = {
  peer:"처음 만난 사람들과 함께 맡을 역할을 정할 때",
  output:"여러 사람 앞에서 의견이나 결과를 설명할 때",
  wealth:"공적인 자리에서 제안의 조건을 논의할 때",
  officer:"공적인 자리에서 절차와 책임을 정할 때",
  resource:"처음 만난 사람들과 정보를 주고받을 때",
};
const PRIVATE_CONTEXT: Record<Family,string> = {
  peer:"가까운 사람과 서로의 선택을 조율할 때",
  output:"친한 사람에게 생각을 편하게 표현할 때",
  wealth:"가까운 사람과 개인적인 선택을 상의할 때",
  officer:"친한 사이에서도 약속의 범위를 정할 때",
  resource:"신뢰하는 사람에게 의견의 이유를 설명할 때",
};
const ALONE_CONTEXT: Record<Family,string> = {
  peer:"아무도 역할을 정해 주지 않는 자유 시간이 생길 때",
  output:"혼자서 만들거나 마무리할 일을 선택할 때",
  wealth:"혼자서 다음에 활용할 기회를 가늠할 때",
  officer:"혼자서 생활의 약속이나 순서를 정할 때",
  resource:"새로 알게 된 내용을 혼자 정리할 때",
};
const CHOICE_CONTEXT: Record<Family,string> = {
  peer:"내가 결정할 범위를 정해야 하는 선택 앞에서",
  output:"실제로 만들어 낼 결과가 다른 선택지 앞에서",
  wealth:"비용과 얻을 것이 서로 다른 제안 앞에서",
  officer:"규칙과 책임 조건이 다른 선택지 앞에서",
  resource:"설명이 서로 다른 두 방안을 검토할 때",
};
/** These are possible limits of a previously selected strength, not diagnoses. */
const BURDEN_CONTEXT: Record<Family,string> = {
  peer:"스스로 맡는 일의 범위를 계속 넓히다 일정에 여유가 없어질 때",
  output:"여러 결과를 한꺼번에 마무리하려고 할 때",
  wealth:"여러 기회를 동시에 고려하느라 집중할 범위를 정해야 할 때",
  officer:"정해진 절차를 모두 지키려다 일정과 조율해야 할 때",
  resource:"새 정보를 더 알아볼지 현재 자료로 결론을 낼지 결정해야 할 때",
};
const PRESSURE_CONTEXT: Record<Family,string> = {
  peer:"공동의 책임을 다시 나누어야 하는 문제가 생겼을 때",
  output:"하던 일의 결과가 예상과 다르게 나왔을 때",
  wealth:"비용이나 선택지가 예상과 달라졌을 때",
  officer:"기한이나 공식 기준이 갑자기 달라졌을 때",
  resource:"알고 있던 정보로 설명하기 어려운 문제가 생겼을 때",
};
function sceneForSection(id:PersonalitySectionId, primary:Signal, secondary:Signal):string|undefined {
  if(id==="P01-02")return `${PUBLIC_CONTEXT[primary.family]}와 ${PRIVATE_CONTEXT[secondary.family]}를 비교하는 상황`;
  if(id==="P01-03")return ALONE_CONTEXT[primary.family];
  if(id==="P01-05")return `${CHOICE_CONTEXT[primary.family]} ${secondary.family==="resource" ? "확인할 정보" : secondary.family==="output" ? "실행 가능성" : "책임과 조건"}도 함께 고려하는 상황`;
  if(id==="P01-08")return `${PRESSURE_CONTEXT[primary.family]} ${secondary.family==="resource" ? "정보를 다시 이해하는 과정" : "가능한 실행 방법"}을 선택해야 하는 상황`;
  if(id==="P01-10")return BURDEN_CONTEXT[primary.family];
  return undefined;
}
const COMMITMENT_FAMILIES = new Set<Family>(["peer","officer","wealth"]);
const REVISION_FAMILIES = new Set<Family>(["resource","output"]);
const SEMANTIC_MOTIFS: Record<string, RegExp> = {
  "role-boundary":/책임|역할|공동|맡을|권한|공로/,
  "self-direction":/결정권|주도권|스스로|자기 몫|자신이 맡을|내 기준/,
  "verification":/정보|이해|설명|확인|근거|검토|살피|대조/,
  "opportunity-choice":/기회|선택지|제안|대안|비용|거래/,
  "rules":/기준|규칙|절차|공식|합의/,
  "execution":/만들|수행|실행|처리|마무리|결과물|완성/,
  "expression":/의견|표현|말하|전달/,
  "pressure":/손실|압박|마감|제약|급하|문제/,
  "starting-approach":/시작|출발|시도|처음 접하는/,
  "learning-before-action":/배우|익히|설명을 듣|먼저 이해/,
  "negotiating-joint-work":/누가 어떤 일을 맡|서로 합의|조율|비용 분담/,
  "finishing-work":/끝까지 만드는|마무리|결과물|완성/,
};
function motifsFrom(text:string):string[] {
  return Object.entries(SEMANTIC_MOTIFS).filter(([,rx])=>rx.test(text)).map(([name])=>name);
}
function familyPair(left:Family,right:Family):string { return [left,right].sort().join("|"); }
const POSITIONS: PillarPosition[] = ["year","month","day","hour"];
const POSITION_KR: Record<PillarPosition,string> = {year:"연",month:"월",day:"일",hour:"시"};
const SECTION_SCENES: Record<PersonalitySectionId, {
  axis:string; trigger:string; response:string; alternative:string;
  focus:readonly Family[]; positions:readonly PillarPosition[];
}> = {
  "P01-01":{axis:"스스로 세우는 기준",trigger:"익숙한 방식과 새 요구가 서로 맞지 않을 때",response:"어느 기준을 먼저 확인할지 순서를 정하는 모습",alternative:"우선순위가 명확하거나 책임자가 정해지면 다른 판단을 할 수 있음",focus:["peer","officer","resource"],positions:["month","day"]},
  "P01-02":{axis:"공적인 역할과 사적인 거리",trigger:"처음 만난 자리와 친해진 관계에서 맡는 역할이 달라질 때",response:"공적인 자리에서 보여 주는 태도와 사적으로 선택하는 기준을 구분하는 모습",alternative:"처음부터 친밀한 분위기이거나 역할 구분이 없는 관계에서는 같은 태도가 나타날 수 있음",focus:["officer","resource","peer","output","wealth"],positions:["year","month","day","hour"]},
  "P01-03":{axis:"혼자 있을 때의 처리 방식",trigger:"바깥의 요청에서 잠시 떨어져 시간을 쓸 수 있을 때",response:"혼자 있는 시간을 무엇을 익히거나 처리하는 데 쓸지 고르는 모습",alternative:"충분히 쉬어야 하는 날에는 아무것도 정리하지 않을 수 있음",focus:["resource","output","peer"],positions:["day","hour"]},
  "P01-04":{axis:"생각을 전달하는 순서",trigger:"의견을 즉시 말하라는 요청을 받았을 때",response:"먼저 확인할 내용과 바로 전달할 말을 구분하는 모습",alternative:"주제에 익숙하거나 충분히 준비했다면 바로 답할 수도 있음",focus:["output","resource","officer"],positions:["month","day"]},
  "P01-05":{axis:"선택할 때 비교하는 기준",trigger:"새로운 제안에 비용·책임·기회가 동시에 붙어 있을 때",response:"눈에 띄는 장점보다 우선 확인할 조건을 선택하는 모습",alternative:"손실이 작고 되돌릴 수 있는 선택이라면 간단히 결정할 수도 있음",focus:["wealth","resource","officer"],positions:["hour","day"]},
  "P01-06":{axis:"결정을 유지하거나 고치는 기준",trigger:"이미 결정한 뒤 예상 밖의 정보를 들었을 때",response:"기존 판단을 바꿀 만한 근거인지 따져보는 모습",alternative:"새 정보가 핵심 조건과 무관하다면 처음 선택을 유지할 수 있음",focus:["peer","resource","officer"],positions:["day","hour"]},
  "P01-07":{axis:"협력과 책임의 경계",trigger:"여럿이 한 일을 마무리하며 역할을 나눠야 할 때",response:"협조할 부분과 맡아야 할 책임을 분리하는 모습",alternative:"서로의 권한이 명확하면 사소한 몫은 크게 신경 쓰지 않을 수도 있음",focus:["peer","officer","wealth"],positions:["year","month"]},
  "P01-08":{axis:"예상 밖의 문제를 다루는 순서",trigger:"계획이 어긋나 책임을 조정하고 해결책을 골라야 할 때",response:"지금 감당할 제약과 문제를 풀기 위한 다음 행동의 순서를 비교하는 모습",alternative:"손실이나 마감이 급하면 확인보다 임시 대응이 앞설 수 있음",focus:["officer","wealth","peer","output","resource"],positions:["month","day","hour"]},
  "P01-09":{axis:"서로 다른 강점을 연결하는 방식",trigger:"새로 배운 내용을 실제 과제에 적용할 때",response:"이해하는 단계와 결과를 만드는 단계를 연결하는 모습",alternative:"과제의 목적이 모호하면 장점보다 시행착오가 두드러질 수 있음",focus:["resource","output","peer","officer","wealth"],positions:["month","day"]},
  "P01-10":{axis:"강점이 부담으로 바뀌는 경계",trigger:"자신이 중요하게 여기는 기준을 다른 일에도 적용하려 할 때",response:"꼭 지킬 조건과 내려놓아도 되는 조건을 구분하는 모습",alternative:"책임이나 정보가 제한된 상황에서는 기준을 완화하는 게 유리할 수 있음",focus:["officer","peer","resource","wealth","output"],positions:["month","day"]},
};
function extractSignals(a:SajuAnalysis):Signal[] {
  if(!a.dayMaster || a.tenGods.status!=="implemented" || !a.tenGods.value ||
     a.tenGods.value.dayMaster!==a.dayMaster)return [];
  const t=a.tenGods.value,results:Signal[]=[];
  for(const pos of POSITIONS){
    const stem=a.pillars[pos].stem;
    if(stem && pos!=="day"){
      const god=t.heavenlyStems[pos]?.korean;
      if(god && FAMILIES[god])results.push({key:pos+"Stem",position:pos,kind:"stem",character:stem,god,
        family:FAMILIES[god],sourceId:`PILLAR:${pos}:stem:${stem}`});
    }
    const branch=a.pillars[pos].branch;
    const main=t.hiddenStems[pos]?.find(x=>x.role==="mainQi");
    if(branch && main && FAMILIES[main.tenGod.korean])results.push({key:pos+"Branch",position:pos,kind:"branch",character:branch,
      god:main.tenGod.korean,family:FAMILIES[main.tenGod.korean],sourceId:`PILLAR:${pos}:branch:${branch}`});
  }
  return results;
}
function getStructuralNotes(a:SajuAnalysis,s:Signal):{notes:string[];evidenceIds:string[]} {
  const notes:string[]=[],evidenceIds:string[]=[];
  if(s.kind==="branch" && a.tenGods.value){
    const hidden=a.tenGods.value.hiddenStems[s.position] ?? [];
    const secondary=hidden.filter(h=>h.role!=="mainQi");
    if(secondary.length){
      notes.push(`${POSITION_KR[s.position]}지 ${s.character}의 지장간에는 본기 ${s.god} 외에 ${secondary.map(h=>h.tenGod.korean+"("+h.role+")").join("·")}도 있음. 동일 지지의 파생 정보이므로 독립 증거로 세지 않음`);
    }
  }
  const primary=a.structure.primary;
  if(s.position==="month" && s.kind==="branch" && a.structure.status==="implemented" && primary){
    if(primary.source.branch===s.character && primary.source.tenGod===s.god){
      notes.push(`격국 상태 ${primary.status}와 월지 본기 ${s.god}${subjectParticle(s.god)} 연결됨. 격이 존재한다는 사실만으로 실제 행동을 증명하지 않음`);
      evidenceIds.push("NATAL:STRUCTURE:PRIMARY");
    }
  }
  return {notes,evidenceIds};
}
function relationshipNotes(a:SajuAnalysis,left:Signal,right:Signal):{notes:string[];hasRelation:boolean} {
  if(a.relations.status!=="implemented" || left.kind!==right.kind)return {notes:[],hasRelation:false};
  const matches=a.relations.evidence.filter(e=>e.positions.includes(left.position) && e.positions.includes(right.position) &&
    e.characters.includes(left.character as never) && e.characters.includes(right.character as never) &&
    (left.kind==="stem" ? e.type.startsWith("STEM_") : !e.type.startsWith("STEM_")) && e.complete!==false);
  if(!matches.length)return {notes:[],hasRelation:false};
  return {notes:[`두 글자 사이 실제 관계 ${matches.map(e=>e.type).join("·")} 확인. 충돌·합화가 실제 다툼이나 관계 사건을 입증하지는 않음`],hasRelation:true};
}
function preferredPairs(signals:Signal[],section:typeof SECTION_SCENES[PersonalitySectionId],id:PersonalitySectionId){
  const pairs: Array<{left:Signal;right:Signal;score:number}>=[];
  const publicPositions=new Set<PillarPosition>(["year","month"]);
  const pressureFamilies=new Set<Family>(["officer","wealth","peer"]);
  const responseFamilies=new Set<Family>(["resource","output"]);
  for(let i=0;i<signals.length;i++)for(let j=i+1;j<signals.length;j++){
    let left=signals[i],right=signals[j];
    if(left.position===right.position || left.family===right.family)continue;
    if(id==="P01-02"){
      // Position-specific public/private contrast, rather than simply two
      // unrelated ten gods being described as a change of personality.
      if(publicPositions.has(left.position)===publicPositions.has(right.position))continue;
      if(!publicPositions.has(left.position))[left,right]=[right,left];
    }else if(id==="P01-08"){
      // At least one source for the externally imposed constraint, and another
      // for a different response mode. Never call strength scores stress tolerance.
      const forward=pressureFamilies.has(left.family)&&responseFamilies.has(right.family);
      const reverse=pressureFamilies.has(right.family)&&responseFamilies.has(left.family);
      if(!forward&&!reverse)continue;
      if(reverse)[left,right]=[right,left];
    }else if(id==="P01-06"){
      // A prior commitment AND a distinct reason to revise it must both exist.
      // One family alone, or two symbols about initial choice, is insufficient.
      const forward=COMMITMENT_FAMILIES.has(left.family)&&REVISION_FAMILIES.has(right.family);
      const reverse=COMMITMENT_FAMILIES.has(right.family)&&REVISION_FAMILIES.has(left.family);
      if((!forward&&!reverse)||!REVISION_SCENES[familyPair(left.family,right.family)])continue;
      if(reverse)[left,right]=[right,left];
    }else if(id==="P01-04"){
      // A speech-related hypothesis requires actual output symbolism. The
      // second family supplies its context. Without this pair, leave an
      // ordinary candidate for manual review instead of inventing a habit.
      const forward=left.family==="output" && !!EXPRESSION_SCENES[right.family];
      const reverse=right.family==="output" && !!EXPRESSION_SCENES[left.family];
      if(!forward&&!reverse)continue;
      if(reverse)[left,right]=[right,left];
    }else{
      if([left,right].filter(s=>section.focus.includes(s.family)).length<2)continue;
      if(![left,right].some(s=>section.positions.includes(s.position)))continue;
    }
    const domainCount=[left,right].filter(s=>section.positions.includes(s.position)).length;
    const monthBranch=Number(left.position==="month"&&left.kind==="branch")+
      Number(right.position==="month"&&right.kind==="branch");
    const specialized=id==="P01-02" ?
      (Number(left.position==="month")*2+Number(right.position==="day")*2+
       Number(["officer","peer","output"].includes(left.family))*2+
       Number(["resource","wealth"].includes(right.family))*2) :
      id==="P01-08" ?
      (Number(["officer","wealth"].includes(left.family))*2+
       Number(["resource","output"].includes(right.family))*2) :
      id==="P01-04" ?
      (Number(left.position==="month")*2+Number(right.position==="day")+
       Number(["resource","officer"].includes(right.family))) :
      id==="P01-06" ?
      (Number(["day","hour"].includes(left.position))+Number(["day","hour"].includes(right.position))+
       Number(right.family==="resource")) : 0;
    const score=5+domainCount*2+monthBranch+specialized;
    pairs.push({left,right,score});
  }
  return pairs.sort((a,b)=>b.score-a.score||
    (a.left.sourceId+"|"+a.right.sourceId).localeCompare(b.left.sourceId+"|"+b.right.sourceId))
    // P01-09 must search beyond the first few high-scoring contrasts: a
    // supported output/action scene may rank below generic option comparison.
    // Never fabricate a scene merely to fill the strongest-advantage chapter.
    .slice(0,id==="P01-02"||id==="P01-04"||id==="P01-06"||id==="P01-08"||id==="P01-09"||id==="P01-10"?30:7);
}

/**
 * V34 conservative extraction: record only goals/results already explicitly
 * present in the selected scene. No output is inferred from a ten-god label.
 * Null means missing evidence, not that the person lacks an ability.
 */
export function extractGoalOutputV34(action: string, trigger: string): {
  actionGoal: string | null;
  observableOutput: string | null;
  goalOutputEvidence: "EXPLICIT_SCENE" | "INSUFFICIENT_SCENE";
} {
  const a = action.trim();
  const t = trigger.trim();
  if (!a || !t) return {actionGoal:null,observableOutput:null,goalOutputEvidence:"INSUFFICIENT_SCENE"};
  const explicitResults: readonly [RegExp,string,string][] = [
    [/결과물.{0,18}(완성|마무리)|작업의 결과.{0,12}마무리/, "작업을 완결하는 것", "완성된 작업 결과물"],
    [/담당.{0,14}(합의|정리)|역할.{0,14}(합의|분담)/, "책임과 역할을 명확히 하는 것", "합의된 담당 범위"],
    // V35 fix: "기회비용" is an option-comparison term, not a cost-sharing agreement,
    // and the agreement must follow the cost phrase within the same clause.
    [/(?<!기회)비용[^.,]{0,8}(합의|정리)|지출[^.,]{0,8}(합의|정리)/, "비용 부담을 정하는 것", "합의된 비용 부담 범위"],
    [/진행.{0,12}순서.{0,15}(설명|정리)/, "진행 과정을 전달하는 것", "설명된 진행 순서"],
  ];
  for(const [pattern,goal,output] of explicitResults){
    if(pattern.test(a))return {actionGoal:goal,observableOutput:output,goalOutputEvidence:"EXPLICIT_SCENE"};
  }
  return {actionGoal:null,observableOutput:null,goalOutputEvidence:"INSUFFICIENT_SCENE"};
}

/**
 * V35: prefer the rule-table goal/output. Only scenes actually produced by that
 * rule receive it; otherwise fall back to the conservative V34 phrase match.
 */
export function goalOutputForScene(
  id:PersonalitySectionId, pairFamily:string, baseline:boolean, cooperation:boolean,
  strength:boolean, expression:boolean, revision:boolean, action:string, trigger:string,
):Pick<PersonalityBehaviorHypothesis,"actionGoal"|"observableOutput"|"goalOutputEvidence"|"goalKey"|"outputKey"|"goalOutputSource"> {
  let spec:GoalOutputSpecV35|undefined;
  if(id==="P01-09" && strength)spec=strengthGoalSpec(pairFamily);
  else if(id==="P01-07" && cooperation)spec=cooperationGoal(action);
  else if(id==="P01-01" && baseline)spec=SECTION_GOALS["P01-01"];
  else if(id==="P01-04" && expression)spec=SECTION_GOALS["P01-04"];
  else if(id==="P01-06" && revision)spec=SECTION_GOALS["P01-06"];
  else if(id==="P01-05" || id==="P01-08")spec=SECTION_GOALS[id];
  if(spec)return {actionGoal:spec.actionGoal,observableOutput:spec.observableOutput,goalOutputEvidence:"EXPLICIT_SCENE",
    goalKey:spec.goalKey,outputKey:spec.outputKey,goalOutputSource:"SCENE_RULE"};
  const v34=extractGoalOutputV34(action,trigger);
  return {...v34,goalKey:null,outputKey:null,goalOutputSource:v34.goalOutputEvidence==="EXPLICIT_SCENE"?"TEXT_EXTRACTION":null};
}

/** A bounded, differentiated candidate pool. No claim of verified psychology. */
export function generateConditionalBehaviorCandidates(a:SajuAnalysis):PersonalityCandidate[]{
  const signals=extractSignals(a),result:PersonalityCandidate[]=[];
  if(signals.length<2)return [];
  for(const [id,section] of Object.entries(SECTION_SCENES) as Array<[PersonalitySectionId,typeof SECTION_SCENES[PersonalitySectionId]]>){
    for(const {left,right,score} of preferredPairs(signals,section,id)){
      // P01-02: public before private. P01-08: external constraint before response.
      // Other sections keep the month-branch-first editorial preference.
      const primary=(id==="P01-02"||id==="P01-04"||id==="P01-06"||id==="P01-08") ? left :
        left.position==="month"&&left.kind==="branch" ? left :
        right.position==="month"&&right.kind==="branch" ? right : left;
      const secondary=primary===left?right:left;
      const first=EXPRESSIONS[primary.god],second=EXPRESSIONS[secondary.god];
      const pairFamily=familyPair(primary.family,secondary.family);
      const baselineScene=id==="P01-01" ? anchoredBaselineScene(primary,secondary) ?? BASELINE_SCENES[pairFamily] : undefined;
      const cooperationScene=id==="P01-07" ? anchoredCooperationScene(primary,secondary) ?? COOPERATION_SCENES[pairFamily] : undefined;
      const strengthScene=id==="P01-09" ? specificStrengthScene(primary,secondary) : undefined;
      const expressionScene=id==="P01-04" ? specificExpressionScene(primary,secondary) : undefined;
      const revisionScene=id==="P01-06" && COMMITMENT_FAMILIES.has(primary.family) && REVISION_FAMILIES.has(secondary.family) ?
        REVISION_SCENES[familyPair(primary.family,secondary.family)] : undefined;
      // Never substitute a generic learning or speaking scene for unrelated facts.
      if(id==="P01-09" && !strengthScene)continue;
      if(id==="P01-07" && !cooperationScene)continue;
      if(id==="P01-04" && !expressionScene)continue;
      if(id==="P01-06" && !revisionScene)continue;
      const sceneTrigger=(baselineScene ?? cooperationScene ?? strengthScene ?? expressionScene ?? revisionScene)?.trigger ?? sceneForSection(id,primary,secondary) ?? section.trigger;
      const sceneAlternative=(baselineScene ?? cooperationScene ?? strengthScene ?? expressionScene ?? revisionScene)?.alternative ?? section.alternative;
      const extra1=getStructuralNotes(a,primary),extra2=getStructuralNotes(a,secondary);
      const relation=relationshipNotes(a,primary,secondary);
      const context=[...extra1.notes,...extra2.notes,...relation.notes,
        ...(id==="P01-07" && cooperationScene && "ruleId" in cooperationScene ?
          [`협업 장면 ${cooperationScene.ruleId}: ${primary.god}(${POSITION_KR[primary.position]}${primary.kind==="stem"?"간":"지"})와 ${secondary.god}(${POSITION_KR[secondary.position]}${secondary.kind==="stem"?"간":"지"}) 조합에만 적용. 검증된 행동 사실 아님`] : [])];
      const sourceIds=[primary.sourceId,secondary.sourceId];
      const evidenceIds=["NATAL:PILLARS","NATAL:TEN_GODS",...extra1.evidenceIds,...extra2.evidenceIds,
        ...(relation.hasRelation?["NATAL:RELATIONS"]:[])];
      const pairSignature=[...sourceIds].sort().join("|");
      const roleSpecific=id==="P01-01" && baselineScene ?
        `${baselineScene.action}이라는 조건부 가설` :
        id==="P01-07" && cooperationScene ?
        `${cooperationScene.action}이라는 조건부 가설` :
        id==="P01-02" ?
        `처음 만난 자리에서는 ${first.focus}${subjectParticle(first.focus)} 먼저 드러날 수 있고, 가까워진 뒤에는 ${second.focus}${objectParticle(second.focus)} 판단 기준으로 삼을 수도 있다는 가설` :
        id==="P01-08" ?
        `문제가 생기면 ${first.focus}${objectParticle(first.focus)} 먼저 확인할지, ${second.focus}에 집중할지 비교하는 가설` :
        id==="P01-04" && expressionScene ?
        `${expressionScene.action}을 가능성으로 검토하는 가설` :
        id==="P01-06" && revisionScene ?
        `${revisionScene.action}을 명리 상징으로 풀이한 조건부 가설` :
        id==="P01-09" && strengthScene ? strengthScene.action :
        id==="P01-10" ?
        `${first.focus}${objectParticle(first.focus)} 모든 상황에 적용하려 하면 ${second.focus}${objectParticle(second.focus)} 고려할 여유가 줄어들 수 있다는 부담 가설` :
        `${section.response}. 이때 ${first.focus}${objectParticle(first.focus)} 먼저 고려하고 ${second.focus}도 검토하는 가설`;
      const behavior:PersonalityBehaviorHypothesis={
        axis:section.axis,trigger:sceneTrigger,
        observableBehavior:roleSpecific,
        ...goalOutputForScene(id,id==="P01-09" && strengthScene ? strengthScene.goalSpecKey : pairFamily,!!baselineScene,!!cooperationScene,!!strengthScene,!!expressionScene,!!revisionScene,roleSpecific,sceneTrigger),
        decisionBasis:`우선 기준: ${first.focus} / 함께 보는 기준: ${second.focus} (출처: ${POSITION_KR[primary.position]}${primary.kind==="stem"?"간":"지"} ${primary.god}, ${POSITION_KR[secondary.position]}${secondary.kind==="stem"?"간":"지"} ${secondary.god})`,
        possibleMotive:null,
        counterCondition:`${sceneAlternative}. ${second.condition}에는 다른 반응도 함께 검토`,
        structuralContext:context,
        inferenceSteps:[`원국에서 ${primary.sourceId}(${primary.god}) 확인`,`다른 기둥의 ${secondary.sourceId}(${secondary.god}) 확인`,
          `소제목 '${section.axis}'에 두 상징의 우선순위가 달라질 조건을 가설로 연결`,...context],
        inferenceLevel:"CONDITIONAL_INTERPRETATION",
        semanticPairKey:[primary.god,secondary.god].sort().join("|"),
        ...(baselineScene ? {scenarioRuleId:"P01-01:baseline:" + ("ruleId" in baselineScene ? baselineScene.ruleId.slice("P01-01:".length) : pairFamily)} : {}),
        ...(cooperationScene ? {scenarioRuleId:("ruleId" in cooperationScene ? cooperationScene.ruleId : "P01-07:cooperation:"+pairFamily)} : {}),
        ...(strengthScene ? {scenarioRuleId:strengthScene.ruleId} : {}),
        ...(expressionScene ? {scenarioRuleId:expressionScene.ruleId} : {}),
        ...(revisionScene ? {scenarioRuleId:"P01-06:revision:"+familyPair(primary.family,secondary.family)} : {}),
        semanticFamilyPairKey:familyPair(primary.family,secondary.family),
        semanticMotifs: id==="P01-01" && baselineScene ? motifsFrom(baselineScene.trigger+" "+baselineScene.action) :
            id==="P01-07" && cooperationScene ? ["joint-role",...motifsFrom(cooperationScene.action)] :
          id==="P01-04" ? ["expression",...motifsFrom(expressionScene?.action ?? roleSpecific).filter(m=>m!=="expression")] :
          id==="P01-06" ? ["decision-revision","commitment-boundary",...motifsFrom(revisionScene?.action ?? roleSpecific).filter(m=>m!=="verification")] :
          id==="P01-09" && strengthScene ? motifsFrom(strengthScene.motifAction) :
          motifsFrom(roleSpecific),
      };
      result.push({
        id:`V56-B2-${id}-${primary.key}-${secondary.key}`,sectionId:id,kind:"CONTRAST",
        narrativeKey:`behavior-v2:${id}:${pairSignature}`,
        claim: id==="P01-06" && revisionScene ?
          `${sceneTrigger} ${revisionScene.action}이라는 조건부 해석입니다. 실제 결정을 관찰한 것은 아닙니다.` :
          id==="P01-10" ?
          `앞 절의 강점을 적용하는 범위가 넓어질 때의 부담을 검토합니다. ${first.focus}${andParticle(first.focus)} ${second.focus} 사이에 조정이 필요한 상황을 살펴봅니다.` :
          id==="P01-04" && expressionScene ?
          `${sceneTrigger}, ${expressionScene.action}을 해석 가설로 검토합니다. 말의 양이나 실제 대화 습관을 단정하지 않습니다.` :
          `${sceneTrigger}의 조건부 해석. 우선 확인할 기준: ${first.focus}. 함께 검토할 기준: ${second.focus}.`,
        strength: id==="P01-06" && revisionScene ?
          "결정 자체를 지킬 부분과 바꿀 수 있는 실행 조건을 구별하는 가설" :
          id==="P01-04" && expressionScene ?
          `의견을 전달할 때 표현할 내용과 ${second.focus}${objectParticle(second.focus)} 구별하는 가설` :
          `주요 기준 두 가지를 구분할 수 있음: ${first.focus} / ${second.focus}`,
        drawback: id==="P01-06" && revisionScene ?
          "상황이 달라져도 처음 약속과 실행 방법을 함께 유지하려 할 때 조정이 늦어질 수 있는 조건부 부담" :
          id==="P01-04" && expressionScene ?
          `표현할 내용과 ${second.focus}${objectParticle(second.focus)} 함께 고려하려다 설명이 길어질 수 있다는 조건부 부담` :
          `첫째 기준(${first.focus})에만 집중하면 둘째 기준(${second.focus})을 놓칠 수 있는 조건`,
        unexpected: id==="P01-06" && revisionScene ?
          `${revisionScene.alternative}이라는 반대 조건` :
          id==="P01-04" && expressionScene ?
          `${expressionScene.alternative}이라는 반대 조건` :
          `${second.condition}에는 기준의 우선순위가 바뀔 수 있다는 점`,
        exampleScene:`예시: ${sceneTrigger} ${behavior.observableBehavior}. 실제 과거 사건을 확인한 것이 아님`,
        evidenceIds:Array.from(new Set(evidenceIds)),sourceIds,
        relationRuleId:"conditional-behavior-v2:"+id,
        limits:["명리 상징에서 구성한 가설이며 당사자 행동·의도·감정을 관찰한 사실이 아닙니다.",
          "지장간·격국은 같은 원국에서 파생된 자료이며 독립적인 인격 증거가 아닙니다.",
          "심리적 동기·질환·가족 경험·직업 성과를 새로 만들어내지 않습니다."],
        confidence:"LOW_CONFIDENCE_HYPOTHESIS",editorialPriority:Math.min(4,Math.max(1,Math.floor(score/2))),
        behaviorHypothesis:behavior,
      });
    }
  }
  return result;
}
