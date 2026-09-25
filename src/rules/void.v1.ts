import type { Branch } from "@/types/saju-analysis";

export const VOID_V1 = {
  ruleVersion:"void-v1",
  xun:[
    {start:"甲子",voidBranches:["戌","亥"]},{start:"甲戌",voidBranches:["申","酉"]},
    {start:"甲申",voidBranches:["午","未"]},{start:"甲午",voidBranches:["辰","巳"]},
    {start:"甲辰",voidBranches:["寅","卯"]},{start:"甲寅",voidBranches:["子","丑"]}
  ] satisfies Array<{start:string;voidBranches:[Branch,Branch]}>,
  dayBranchPolicy:"EXCLUDED_SELF" as const
} as const;
