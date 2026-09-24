import { ELEMENT_WEIGHT_V1 } from "@/rules/element-weight.v1";
import { SEASONAL_ELEMENT_STATE_V1 } from "@/rules/seasonal-element-state.v1";
import { SEASONAL_STRENGTH_V1 } from "@/rules/seasonal-strength.v1";
import { stemTrait } from "../interpretation/ten-gods";
import type { BranchHiddenStems } from "../interpretation/hidden-stems";
import type { Element, ElementContribution, Pillar, PillarPosition } from "@/types/saju-analysis";

const positions: PillarPosition[] = ["year", "month", "day", "hour"];
const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];

/** Sum each original contribution after applying its element's month-branch state. */
export function calculateNativeStrength(
  pillars: Record<PillarPosition, Pillar>,
  hiddenBranches: Record<PillarPosition, BranchHiddenStems>
) {
  const monthBranch = pillars.month.branch;
  if (!monthBranch) throw new Error("Month branch is required for native strength");
  const states = SEASONAL_ELEMENT_STATE_V1.byMonthBranch[monthBranch];
  const evidence: ElementContribution[] = [];
  const add = (entry: Omit<ElementContribution, "id" | "sourceType" | "pillar" | "character" | "originalElement" |
    "nativeContribution" | "seasonalState" | "seasonalMultiplier" | "finalContribution">) => {
    const seasonalState = states[entry.element];
    const seasonalMultiplier = SEASONAL_STRENGTH_V1.multipliers[seasonalState];
    const pillar = positions.find((position) => entry.source === `${position}Stem` || entry.source === `${position}Branch`);
    if (!pillar) throw new Error(`Unknown contribution source ${entry.source}`);
    const visible = entry.stem !== undefined;
    const character = visible ? entry.stem! : entry.hiddenStem;
    if (!character || (!visible && !entry.hiddenRole)) throw new Error(`Incomplete contribution ${entry.source}`);
    const nativeContribution = entry.baseContribution * seasonalMultiplier;
    evidence.push({ ...entry, id: visible ? `stem:${pillar}` : `branch:${pillar}:hidden:${entry.hiddenRole}`,
      sourceType: visible ? "VISIBLE_STEM" : "HIDDEN_STEM", pillar, character,
      originalElement: entry.element, nativeContribution, seasonalState, seasonalMultiplier,
      finalContribution: nativeContribution });
  };
  for (const position of positions) {
    const stem = pillars[position].stem;
    if (!stem) throw new Error(`Missing ${position} stem`);
    const stemWeight = ELEMENT_WEIGHT_V1.stems[position];
    add({ source: `${position}Stem`, stem, stemWeight, baseContribution: stemWeight, element: stemTrait(stem).element });
  }
  for (const position of positions) {
    const { mainQi, middleQi, residualQi, branch } = hiddenBranches[position];
    const hidden = [mainQi, middleQi, residualQi].filter((item) => item !== null);
    const allocation = hidden.length === 1 ? ELEMENT_WEIGHT_V1.allocations.one
      : hidden.length === 2 ? ELEMENT_WEIGHT_V1.allocations.two : ELEMENT_WEIGHT_V1.allocations.three;
    if (hidden.length < 1 || hidden.length > 3 || (hidden.length === 2 && (!mainQi || !residualQi)) ||
      (hidden.length === 3 && (!mainQi || !middleQi || !residualQi))) {
      throw new Error(`Unexpected hidden-stem roles for ${branch}`);
    }
    const branchWeight = ELEMENT_WEIGHT_V1.branches[position];
    for (const detail of hidden) {
      const allocationRatio = allocation[detail.role];
      add({ source: `${position}Branch`, branch, branchWeight, hiddenStem: detail.stem,
        hiddenRole: detail.role, allocationRatio, baseContribution: branchWeight * allocationRatio, element: detail.element });
    }
  }
  const scores = Object.fromEntries(elements.map((element) => [element, 0])) as Record<Element, number>;
  for (const item of evidence) scores[item.element] += item.finalContribution;
  const total = elements.reduce((sum, element) => sum + scores[element], 0);
  const nativeStrength = Object.fromEntries(elements.map((element) => [element, {
    score: scores[element], percentage: scores[element] / total * 100
  }])) as Record<Element, { score: number; percentage: number }>;
  return { nativeStrength, evidence };
}
