import type { Branch, Element, PillarPosition, Stem } from "./saju-analysis";
import type { SynthesisRole } from "./useful-gods";

export type ProspectiveBranchRelationType = "SIX_COMBINATION" | "THREE_HARMONY" |
  "DIRECTIONAL_COMBINATION" | "BRANCH_CLASH" | "THREE_PUNISHMENT" |
  "MUTUAL_PUNISHMENT" | "SELF_PUNISHMENT" | "BRANCH_HARM" | "BRANCH_BREAK" | "WONJIN";
export interface ProspectiveBranchRelation {
  type: ProspectiveBranchRelationType;
  state: "PAIR" | "PARTIAL" | "COMPLETE";
  members: Branch[];
  natalMembers: Array<{ branch: Branch; positions: PillarPosition[] }>;
  targetElement?: Element;
  ruleVersion: string;
  rule: string;
}
export interface BranchHiddenComponent {
  stem: Stem; qiRole: "mainQi" | "middleQi" | "residualQi"; weight: number;
  stemScore: number; stemRole: SynthesisRole; stemConfidence: "HIGH" | "MEDIUM" | "LOW";
  weightedScore: number;
}
export interface BranchPreference {
  branch: Branch; representativeElement: Element;
  score: number; baseScore: number; role: SynthesisRole; confidence: "HIGH" | "MEDIUM" | "LOW";
  hiddenComponents: BranchHiddenComponent[];
  availability: { state: "PRESENT" | "ABSENT"; positions: PillarPosition[]; count: number };
  prospectiveRelations: ProspectiveBranchRelation[];
  evidence: string[];
}
export interface BranchPreferencesResult {
  status: "implemented";
  ruleVersion: "branch-preferences-v1";
  synthesisVersion: "branch-preference-synthesis-v1";
  hiddenStemRuleVersion: "hidden-stems-v1";
  weightRuleVersion: "element-weight-v1";
  branches: BranchPreference[]; rankedBranches: Branch[];
  primaryBranches: Branch[]; secondaryBranches: Branch[]; favorableBranches: Branch[];
  conditionalBranches: Branch[]; neutralBranches: Branch[]; unfavorableBranches: Branch[];
}
