import type { SajuAnalysis } from "@/types/saju-analysis";
import type { CalibrationTrace } from "@/types/calibration-trace";

const ELEMENTS=["wood","fire","earth","metal","water"] as const;
export function buildCalibrationView(analysis:SajuAnalysis,trace:CalibrationTrace){
 const fortune=analysis.fortune as any, useful=analysis.usefulGods.synthesis as any;
 return {caseId:trace.caseId,traceError:trace.reconstruction.some(row=>row.status==="FAIL"),facts:{birthInput:analysis.birthInput.birthTime,legal:analysis.birthNormalized.legalDateTime,instant:analysis.birthNormalized.absoluteBirthInstant,natural:analysis.birthNormalized.adjustedDateTime,pillars:Object.values(analysis.pillars),hiddenStems:analysis.hiddenStems,tenGods:analysis.tenGods},
 elements:ELEMENTS.map(element=>({element,raw:analysis.fiveElements.rawCount[element],native:analysis.fiveElements.nativeStrength?.[element],adjusted:analysis.fiveElements.adjustedStrength.elements?.[element]})),strength:analysis.strength,structure:analysis.structure,usefulGods:useful.status==="implemented"?useful.elements:[],stemPreferences:analysis.stemPreferences,branchPreferences:analysis.branchPreferences,stars:analysis.nobleAndSpecialStars,
 daeun:fortune.daeun?.periods??[],seunCount:fortune.seun?.periods?.length??0,wolunCount:fortune.wolun?.periods?.length??0,categories:fortune.categories?.daeun??[],wellness:analysis.wellness,children:analysis.childrenFortune,
 traceSteps:trace.steps.map(step=>({index:step.index,id:step.id,title:step.title,status:step.reconstructionChecks.some(row=>row.status==="FAIL")?"FAIL":"PASS",group:step.index<=11?"FACT":step.index<=17?"오행":step.index<=18?"강약":step.index<=21?"격국":step.index<=31?"용신":step.index<=37?"운세":step.index===38?"분야":step.index===39?"건강":step.index===40?"자녀":"AI INPUT"}))};
}
