import type { Branch } from "@/types/saju-analysis";

const names=["겁살","재살","천살","지살","년살","월살","망신살","장성살","반안살","역마살","육해살","화개살"] as const;
export const TWELVE_SINSAL_V1={ruleVersion:"twelve-sinsal-v1",names,groups:[
  {members:["申","子","辰"],targets:["巳","午","未","申","酉","戌","亥","子","丑","寅","卯","辰"]},
  {members:["亥","卯","未"],targets:["申","酉","戌","亥","子","丑","寅","卯","辰","巳","午","未"]},
  {members:["寅","午","戌"],targets:["亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌"]},
  {members:["巳","酉","丑"],targets:["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"]}
] satisfies Array<{members:readonly Branch[];targets:readonly Branch[]}>} as const;
