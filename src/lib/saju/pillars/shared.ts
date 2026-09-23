import { BRANCH_KOREAN, EARTHLY_BRANCHES, HEAVENLY_STEMS, STEM_KOREAN } from "@/rules/ganzhi.v1";
import type { Branch, Pillar, PillarPosition, Stem } from "@/types/saju-analysis";

export function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

export function makePillar(position: PillarPosition, stemIndex: number, branchIndex: number): Pillar {
  const stem = HEAVENLY_STEMS[positiveModulo(stemIndex, HEAVENLY_STEMS.length)] as Stem;
  const branch = EARTHLY_BRANCHES[positiveModulo(branchIndex, EARTHLY_BRANCHES.length)] as Branch;
  return { position, stem, branch, hanja: `${stem}${branch}`, korean: `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}` };
}

export function makeSexagenaryPillar(position: PillarPosition, cycleIndex: number): Pillar {
  return makePillar(position, cycleIndex, cycleIndex);
}
