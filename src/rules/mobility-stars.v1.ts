import type { Branch } from "@/types/saju-analysis";

export const MOBILITY_STARS_V1 = {
  ruleVersion:"mobility-stars-v1",
  groups:[
    {members:["申","子","辰"],peach:"酉",travel:"寅",canopy:"辰"},
    {members:["亥","卯","未"],peach:"子",travel:"巳",canopy:"未"},
    {members:["寅","午","戌"],peach:"卯",travel:"申",canopy:"戌"},
    {members:["巳","酉","丑"],peach:"午",travel:"亥",canopy:"丑"}
  ] satisfies Array<{members:readonly Branch[];peach:Branch;travel:Branch;canopy:Branch}>
} as const;
