import type {SajuAnalysis} from "@/types/saju-analysis";
import type {FortuneResult} from "@/types/fortune";
/** Display projection only. Interpretation always recalculates from the small birth input. */
export function lifetimeDisplayAnalysis(analysis:SajuAnalysis):SajuAnalysis{
  const fortune=analysis.fortune as FortuneResult;
  return {...analysis,fortune:{...fortune,
    seun:fortune.seun.status==="implemented"?{...fortune.seun,periods:[],evidence:[]}:fortune.seun,
    wolun:fortune.wolun.status==="implemented"?{...fortune.wolun,periods:[],evidence:[]}:fortune.wolun,
    transformation:{status:"not_implemented"},synthesis:{status:"not_implemented"},
    categories:fortune.categories.status==="implemented"?{...fortune.categories,daeun:[],seun:[],wolun:[],seunPeriodSummaries:[],wolunPeriodSummaries:[],evidence:[]}:fortune.categories}};
}
