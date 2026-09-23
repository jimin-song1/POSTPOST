import { TEN_GODS_V1 } from "@/rules/ten-gods.v1";
import type { Stem } from "@/types/saju-analysis";

export type TenGodName = keyof typeof TEN_GODS_V1.labels;
export interface TenGod { korean: TenGodName; hanja: (typeof TEN_GODS_V1.labels)[TenGodName] }

export function stemTrait(stem: Stem) { return TEN_GODS_V1.stemTraits[stem]; }

export function getTenGod(dayStem: Stem, targetStem: Stem): TenGod {
  const day = stemTrait(dayStem), target = stemTrait(targetStem);
  const elements = TEN_GODS_V1.elements;
  const distance = (elements.indexOf(target.element) - elements.indexOf(day.element) + 5) % 5;
  const samePolarity = day.polarity === target.polarity;
  const names = [
    samePolarity ? "비견" : "겁재", samePolarity ? "식신" : "상관",
    samePolarity ? "편재" : "정재", samePolarity ? "편관" : "정관",
    samePolarity ? "편인" : "정인"
  ] as const;
  const korean = names[distance];
  return { korean, hanja: TEN_GODS_V1.labels[korean] };
}
