import { STRUCTURE_USEFUL_GOD_V1, type TenGodCategory } from "@/rules/structure-useful-god.v1";
import type { Element, Stem } from "@/types/saju-analysis";
import { stemTrait, type TenGodName } from "./ten-gods";

export function tenGodCategory(tenGod: TenGodName): TenGodCategory {
  if (tenGod === "비견" || tenGod === "겁재") return "companion";
  if (tenGod === "식신" || tenGod === "상관") return "output";
  if (tenGod === "정재" || tenGod === "편재") return "wealth";
  if (tenGod === "정관" || tenGod === "편관") return "officer";
  return "resource";
}

export function categoryElement(dayStem: Stem, category: TenGodCategory): Element {
  const order = STRUCTURE_USEFUL_GOD_V1.canonicalElementOrder;
  const dayIndex = order.indexOf(stemTrait(dayStem).element);
  return order[(dayIndex + STRUCTURE_USEFUL_GOD_V1.categoryDistance[category]) % order.length];
}
