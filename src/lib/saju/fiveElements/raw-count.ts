import type { Element, Pillar } from "@/types/saju-analysis";

const STEM_ELEMENT: Record<string, Element> = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" };
const BRANCH_ELEMENT: Record<string, Element> = { 寅: "wood", 卯: "wood", 巳: "fire", 午: "fire", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth", 申: "metal", 酉: "metal", 亥: "water", 子: "water" };

export function countRawElements(pillars: Record<Pillar["position"], Pillar>) {
  const counts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  Object.values(pillars).forEach(({ stem, branch }) => {
    if (stem) counts[STEM_ELEMENT[stem]] += 1;
    if (branch) counts[BRANCH_ELEMENT[branch]] += 1;
  });
  return counts;
}
