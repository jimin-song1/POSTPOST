import type { Branch } from "@/types/saju-analysis";
export const SAMJAE_V1={ruleVersion:"samjae-v1",groups:[
  {members:["申","子","辰"],stages:{들삼재:"寅",눌삼재:"卯",날삼재:"辰"}},
  {members:["亥","卯","未"],stages:{들삼재:"巳",눌삼재:"午",날삼재:"未"}},
  {members:["寅","午","戌"],stages:{들삼재:"申",눌삼재:"酉",날삼재:"戌"}},
  {members:["巳","酉","丑"],stages:{들삼재:"亥",눌삼재:"子",날삼재:"丑"}}
] satisfies Array<{members:readonly Branch[];stages:Record<string,Branch>}>} as const;
