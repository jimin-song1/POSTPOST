import { STRUCTURE_QUALITY_V1 as config } from "@/rules/structure-quality.v1";
import { STRUCTURE_INTERACTIONS_V1 as interactions } from "@/rules/structure-interactions.v1";
import { STRUCTURE_RESCUE_V1 as rescueRules } from "@/rules/structure-rescue.v1";
import { getTenGod, type TenGodName } from "./ten-gods";
import type { Pillar, PillarPosition, RelationsResult, StructureQualityEvidence,
  StructureQualityResult, StructureQualitySignal, StructureResult, StructureType } from "@/types/saju-analysis";

type Standard = keyof typeof interactions.standard;
const isStandard = (type: StructureType): type is Standard => type in interactions.standard;

export function emptyStructureQuality(): StructureQualityResult {
  return { status: "not_implemented", ruleVersion: config.ruleVersion,
    interactionRuleVersion: interactions.ruleVersion, rescueRuleVersion: rescueRules.ruleVersion,
    evaluationScope: "UNAVAILABLE", integrity: "UNRESOLVED", qualityScore: null,
    supportSignals: [], damageSignals: [], rescueSignals: [], mixedSignals: [], relationContext: [], evidence: [] };
}

export function clampStructureQualityScore(score: number): number {
  return Math.min(config.scoreMax, Math.max(config.scoreMin, score));
}

export function evaluateStructureQuality(pillars: Record<PillarPosition, Pillar>,
  structure: Pick<StructureResult, "primary" | "secondary" | "mixedPatterns">,
  relations: RelationsResult): StructureQualityResult {
  const result = emptyStructureQuality();
  result.status = "implemented";
  const type = structure.primary?.type;
  const standard = type && isStandard(type) ? interactions.standard[type] : null;
  result.evaluationScope = standard ? "STANDARD" : "LIMITED";
  result.relationContext = relations.evidence.filter((row) =>
    row.positions.includes("month") && (config.relationTypes as readonly string[]).includes(row.type))
    .map((row) => ({ relationId: row.relationId, relationType: row.type, sourcePillar: "month" }));
  if (!standard || !type || !pillars.day.stem) return result;

  const evidence: StructureQualityEvidence[] = [{ factor: "BASELINE", delta: config.baseline }];
  if (structure.primary?.exposed) evidence.push({ factor: "SOURCE_EXPOSED", delta: config.exposed });
  type SignalSource = { position: PillarPosition; stem: NonNullable<Pillar["stem"]>;
    role?: StructureQualitySignal["sourceRole"] };
  // An exposed month hidden stem is the same visible character, so count it only once.
  const sources: SignalSource[] = config.visiblePillars.map((position) => ({
    position, stem: pillars[position].stem! ,
    role: structure.secondary.find((entry) => entry.source.hiddenStem === pillars[position].stem &&
      entry.exposedPositions.includes(position))?.source.hiddenRole
  }));
  const has = (values: readonly string[], god: TenGodName) => values.includes(god);
  const makeSignal = (kind: StructureQualitySignal["type"], source: SignalSource,
    tenGod: TenGodName): StructureQualitySignal => ({
    id: `${kind.toLowerCase()}:${source.position}:${source.stem}`,
    type: kind, tenGod, stem: source.stem, position: source.position,
    source: source.role ? "exposedMonthHiddenStem" : "visibleStem",
    ...(source.role ? { sourceRole: source.role } : {})
  });
  for (const source of sources) {
    const god = getTenGod(pillars.day.stem, source.stem).korean;
    if (has(standard.support, god)) result.supportSignals.push(makeSignal("SUPPORT", source, god));
    if (has(standard.damage, god)) {
      const severity = god === "비견" && (type === "정재격" || type === "편재격") ? "WEAKER" : "FULL";
      result.damageSignals.push({ ...makeSignal("DAMAGE", source, god), severity });
    }
    if (has(standard.mixed, god) || structure.mixedPatterns.some((pattern) =>
      pattern.positions.includes(source.position) && pattern.candidate !== type))
      result.mixedSignals.push(makeSignal("MIXED", source, god));
  }
  // A rescue needs a specific damage record. A source can rescue at most one damage.
  for (const source of sources) {
    const god = getTenGod(pillars.day.stem, source.stem).korean;
    if (!has(standard.rescue, god)) continue;
    const damage = result.damageSignals.find((entry) =>
      has(rescueRules.triggers[type as Standard], entry.tenGod));
    if (damage) result.rescueSignals.push({ ...makeSignal("RESCUE", source, god), rescuesDamageId: damage.id });
  }

  const capped = (signals: StructureQualitySignal[], factor: StructureQualityEvidence["factor"],
    delta: number, cap: number, weight = (_: StructureQualitySignal) => 1) => {
    let applied = 0;
    for (const signal of signals) {
      const raw = delta * weight(signal);
      const next = Math.max(Math.min(applied + raw, Math.max(0, cap)), Math.min(0, cap));
      evidence.push({ factor, signalId: signal.id,
        ...(signal.rescuesDamageId ? { rescuesDamageId: signal.rescuesDamageId } : {}),
        delta: next - applied });
      applied = next;
    }
  };
  capped(result.supportSignals, "STRUCTURE_SUPPORT", config.support.delta, config.support.cap);
  capped(result.damageSignals, "STRUCTURE_DAMAGE", config.damage.delta, config.damage.cap,
    (signal) => signal.severity === "WEAKER" ? interactions.damageWeight.비견 : interactions.damageWeight.겁재);
  capped(result.rescueSignals, "STRUCTURE_RESCUE", config.rescue.delta, config.rescue.cap);
  capped(result.mixedSignals, "STRUCTURE_MIXED", config.mixed.delta, config.mixed.cap);
  const total = evidence.reduce((sum, item) => sum + item.delta, 0);
  const score = clampStructureQualityScore(total);
  if (score !== total) evidence.push({ factor: "CLAMP", delta: score - total });
  result.qualityScore = score;
  result.evidence = evidence;
  result.integrity = result.damageSignals.length ? result.rescueSignals.length ? "RESCUED" : "DAMAGED"
    : result.mixedSignals.length ? "MIXED" : result.supportSignals.length ? "SUPPORTED" : "CLEAN";
  return result;
}
