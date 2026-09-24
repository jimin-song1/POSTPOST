import { HIDDEN_STEMS_V1 } from "@/rules/hidden-stems.v1";
import { STEM_KOREAN } from "@/rules/ganzhi.v1";
import type { Branch, Stem } from "@/types/saju-analysis";
import { getTenGod, stemTrait, type TenGod } from "./ten-gods";

export type QiRole = "mainQi" | "middleQi" | "residualQi";
export interface HiddenStemDetail {
  role: QiRole;
  stem: Stem;
  stemKorean: string;
  element: ReturnType<typeof stemTrait>["element"];
  polarity: ReturnType<typeof stemTrait>["polarity"];
  tenGod: TenGod;
}
export interface BranchHiddenStems {
  branch: Branch;
  mainQi: HiddenStemDetail;
  middleQi: HiddenStemDetail | null;
  residualQi: HiddenStemDetail | null;
}

export function getHiddenStems(branch: Branch, dayStem: Stem): BranchHiddenStems {
  const rule = HIDDEN_STEMS_V1.branches[branch];
  const detail = (role: QiRole, stem: Stem | null): HiddenStemDetail | null => stem ? {
    role, stem, stemKorean: STEM_KOREAN[stem], ...stemTrait(stem), tenGod: getTenGod(dayStem, stem)
  } : null;
  return {
    branch,
    mainQi: detail("mainQi", rule.mainQi)!,
    middleQi: detail("middleQi", rule.middleQi),
    residualQi: detail("residualQi", rule.residualQi)
  };
}
