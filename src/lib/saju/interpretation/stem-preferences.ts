import { STEM_PREFERENCES_V1 as RULE } from "@/rules/stem-preferences.v1";
import { USEFUL_GOD_SYNTHESIS_V1 } from "@/rules/useful-god-synthesis.v1";
import { stemTrait } from "./ten-gods";
import { normalizeSignal, synthesizeWeightedSignals } from "./useful-god-synthesis";
import type { BranchHiddenStems } from "./hidden-stems";
import type { Pillar, PillarPosition, RelationsResult, Stem } from "@/types/saju-analysis";
import type { StemAvailability, StemPreference, StemPreferencesResult } from "@/types/stem-preferences";
import type { SynthesisRole, SynthesisSignal, UsefulGodsResult } from "@/types/useful-gods";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const visiblePositions = ["year", "month", "hour"] as const;

function availability(stem: Stem, pillars: Record<PillarPosition, Pillar>,
  hidden: Record<PillarPosition, BranchHiddenStems>): StemAvailability {
  const visible = visiblePositions.filter(position => pillars[position].stem === stem);
  const hiddenOccurrences = positions.flatMap(pillar => {
    const branch = hidden[pillar];
    return [branch.mainQi, branch.middleQi, branch.residualQi]
      .filter((row): row is NonNullable<typeof row> => row !== null && row.stem === stem)
      .map(row => ({ pillar, branch: branch.branch, hiddenStem: row.stem, qiRole: row.role }));
  });
  const dayStemSelf = pillars.day.stem === stem;
  return { state: visible.length ? "VISIBLE" : hiddenOccurrences.length ? "HIDDEN" : "ABSENT",
    visiblePositions: visible, hiddenOccurrences, dayStemSelf };
}

function relationContext(stem: Stem, relations: RelationsResult): StemPreference["relationContext"] {
  const ids = new Set(relations.heavenlyStems.combinations
    .filter(row => row.members.includes(stem)).map(row => row.id));
  return relations.transformation.evaluations.filter(row => ids.has(row.relationId))
    .map(({ relationId, relationType, state }) => ({ relationId, relationType, state }));
}

export function evaluateStemPreferences(pillars: Record<PillarPosition, Pillar>,
  hidden: Record<PillarPosition, BranchHiddenStems>, relations: RelationsResult,
  usefulGods: UsefulGodsResult): StemPreferencesResult {
  if (usefulGods.synthesis.status !== "implemented")
    throw new Error("Implemented useful-god synthesis required");
  const synthesis = usefulGods.synthesis;
  const stems = RULE.canonicalStemOrder.map((stem): StemPreference => {
    const trait = stemTrait(stem);
    const parent = synthesis.elements.find(row => row.element === trait.element);
    if (!parent) throw new Error(`Missing parent element synthesis for ${stem}`);
    const inherited = parent.engineSignals.filter(row => row.engine !== "johu")
      .map(row => structuredClone(row));
    const johu = usefulGods.johu.stemPreferences.find(row => row.stem === stem);
    const signals: SynthesisSignal[] = johu ? [...inherited, {
      engine: "johu", rawScore: johu.preferenceScore,
      normalizedScore: normalizeSignal("johu", johu.preferenceScore),
      baseWeight: synthesis.baseEngineWeights.johu,
      effectiveWeight: synthesis.effectiveEngineWeights.johu
    }] : inherited;
    const calculated = synthesizeWeightedSignals(signals);
    return { stem, element: trait.element, yinYang: trait.polarity,
      score: calculated.score, baseStemScore: calculated.baseScore, role: calculated.role,
      confidence: calculated.confidence, parentElementScore: parent.score,
      parentElementRole: parent.role, engineSignals: signals,
      coverage: { engineCount: signals.length, effectiveWeight: calculated.weightSum,
        engines: signals.map(row => row.engine) }, availability: availability(stem, pillars, hidden),
      relationContext: relationContext(stem, relations), consensusBonus: calculated.consensusBonus,
      conflictPenalty: calculated.conflictPenalty, conflictingSignals: calculated.conflictingSignals,
      evidence: signals.map(row => `${row.engine}: raw=${row.rawScore}, normalized=${row.normalizedScore}, effectiveWeight=${row.effectiveWeight}`)
        .concat(`base=${calculated.baseScore}; consensus=${calculated.consensusBonus}; conflict=${calculated.conflictPenalty}; final=${calculated.score}`) };
  }).sort((a, b) => b.score - a.score || RULE.canonicalStemOrder.indexOf(a.stem) -
    RULE.canonicalStemOrder.indexOf(b.stem));
  const group = (role: SynthesisRole) => stems.filter(row => row.role === role).map(row => row.stem);
  return { status: "implemented", ruleVersion: RULE.ruleVersion,
    synthesisVersion: RULE.synthesisVersion, stems, rankedStems: stems.map(row => row.stem),
    primaryStems: group("PRIMARY"), secondaryStems: group("SECONDARY"),
    favorableStems: group("FAVORABLE"), conditionalStems: group("CONDITIONAL"),
    neutralStems: group("NEUTRAL"), unfavorableStems: group("UNFAVORABLE") };
}

export const STEM_PREFERENCE_SHARED_CONFIG = USEFUL_GOD_SYNTHESIS_V1;
