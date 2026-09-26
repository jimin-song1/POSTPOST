import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";
import type { InterpretationInput,StructuredInterpretation } from "@/types/ai-interpretation";
import {LIFETIME_REPORT_V2} from "@/rules/lifetime-report.v2";

export class GroundingValidationError extends Error {readonly code="GROUNDING_VALIDATION_FAILED" as const;
  constructor(message:string){super(message);this.name="GroundingValidationError";}}
function visit(value:unknown,handle:(value:unknown)=>void){handle(value);if(Array.isArray(value))for(const item of value)visit(item,handle);
  else if(value&&typeof value==="object")for(const item of Object.values(value))visit(item,handle);}
function texts(report:StructuredInterpretation){return[report.headline,report.summary,report.disclaimer,...report.highlights,...report.cautions,
  ...report.sections.flatMap(row=>[row.title,row.body,row.headline??"",row.lead??"",...(row.paragraphs??[]),...(row.keyPoints??[]),row.mascotComment??"",row.professionalDetails?.summary??""]),...report.timeline.flatMap(row=>[row.title,row.body])];}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-9;

function factInventory(values:unknown[]){
  const numbers:number[]=[],strings:string[]=[];for(const root of values)visit(root,value=>{
    if(typeof value==="number")numbers.push(value);else if(typeof value==="string")strings.push(value);});
  const allowedNumbers=new Set<number>();for(const number of numbers)for(const candidate of
    [number,Math.round(number),Number(number.toFixed(1)),Number(number.toFixed(2))])allowedNumbers.add(candidate);
  for(const value of strings)for(const match of Array.from(value.matchAll(/-?\d+(?:\.\d+)?/g)))allowedNumbers.add(Number(match[0]));
  const years=new Set<number>();for(const value of strings)for(const match of Array.from(value.matchAll(/(?:19|20|21)\d{2}/g)))years.add(Number(match[0]));
  const pillars=new Set<string>();for(const value of strings)for(const match of Array.from(value.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g)))pillars.add(match[0]);
  return{allowedNumbers,strings,years,pillars};
}
function validateLockedText(text:string,values:unknown[],requestedYear?:number){
  const inventory=factInventory(values);if(requestedYear)inventory.years.add(requestedYear);
  for(const match of Array.from(text.matchAll(/(?:19|20|21)\d{2}/g)))if(!inventory.years.has(Number(match[0])))
    throw new GroundingValidationError(`입력에 없는 연도: ${match[0]}`);
  for(const match of Array.from(text.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g)))if(!inventory.pillars.has(match[0]))
    throw new GroundingValidationError(`입력에 없는 간지: ${match[0]}`);
  for(const match of Array.from(text.matchAll(/-?\d+(?:\.\d+)?/g))){const number=Number(match[0]);if(number>=1900&&number<=2199&&Number.isInteger(number))continue;
    if(!Array.from(inventory.allowedNumbers).some(value=>close(value,number)))throw new GroundingValidationError(`입력에 없는 숫자: ${match[0]}`);}
  const allLabels=[...RULE.lockedLabels.strength,...RULE.lockedLabels.structure,...RULE.lockedLabels.usefulGod];
  for(const label of allLabels)if(text.includes(label)&&!inventory.strings.some(value=>value.includes(label)))
    throw new GroundingValidationError(`입력에 없는 고정 label: ${label}`);
}

export function validateGrounding(report:StructuredInterpretation,input:InterpretationInput){
  if(report.reportType!==input.reportType)throw new GroundingValidationError("reportType이 요청과 다릅니다.");
  const evidenceById=new Map(input.evidence.map(row=>[row.id,row])),ids=new Set(evidenceById.keys()),
    timelineById=new Map(input.timeline.map(row=>[row.id,row])),timelineIds=new Set(timelineById.keys());
  for(const row of [...report.sections,...report.timeline])for(const id of row.evidenceIds)
    if(!ids.has(id))throw new GroundingValidationError(`알 수 없는 evidence ID: ${id}`);
  for(const row of report.timeline){if(!timelineIds.has(row.periodId))throw new GroundingValidationError(`알 수 없는 period ID: ${row.periodId}`);
    const allowed=new Set(timelineById.get(row.periodId)!.evidenceIds);for(const id of row.evidenceIds)if(!allowed.has(id))
      throw new GroundingValidationError(`기간 ${row.periodId}에 속하지 않는 evidence ID: ${id}`);}

  if(input.reportType==="LIFETIME_GENERAL"){
    if(!input.reportPlan)throw new GroundingValidationError("평생총운 report plan이 없습니다.");
    const expected=input.reportPlan.map(row=>`${row.chapterNumber}:${row.id}:${row.title}`),actual=report.sections.map(row=>`${row.chapterNumber}:${row.id}:${row.title}`);
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw new GroundingValidationError("평생총운 01~18 section 순서 또는 제목이 다릅니다.");
    for(const row of report.sections){if(!row.headline||!row.lead||!row.paragraphs||row.paragraphs.length<2||!row.keyPoints?.length)throw new GroundingValidationError(`${row.id} section의 v2 서술 구조가 불완전합니다.`);
      const plan=input.reportPlan.find(item=>item.id===row.id)!;for(const id of row.evidenceIds)if(!plan.evidenceIds.includes(id))throw new GroundingValidationError(`${row.id} 범위를 벗어난 evidence ID: ${id}`);
      for(const metric of row.metrics??[]){if(!row.evidenceIds.includes(metric.evidenceId))throw new GroundingValidationError(`metric evidence가 section에 인용되지 않았습니다: ${metric.evidenceId}`);
        const inventory=factInventory([evidenceById.get(metric.evidenceId)!.value]);if(!inventory.allowedNumbers.has(metric.value))throw new GroundingValidationError(`근거에 없는 metric 값: ${metric.value}`);}
      if(row.id==="professional"){if(!row.professionalDetails)throw new GroundingValidationError("전문 분석실 technical details가 없습니다.");for(const id of row.professionalDetails.evidenceIds)if(!row.evidenceIds.includes(id))throw new GroundingValidationError(`전문 분석 근거가 section 범위를 벗어났습니다: ${id}`);}}
  }

  for(const row of report.sections)validateLockedText([...(input.reportType==="LIFETIME_GENERAL"?[]:[row.title]),row.body,row.headline,row.lead,...(row.paragraphs??[]),...(row.keyPoints??[]),row.mascotComment,row.professionalDetails?.summary].filter(Boolean).join("\n"),
    row.evidenceIds.map(id=>evidenceById.get(id)!.value),input.minimalContext.requestedYear);
  for(const row of report.timeline)validateLockedText(`${row.title}\n${row.body}`,
    row.evidenceIds.map(id=>evidenceById.get(id)!.value),input.minimalContext.requestedYear);

  const combined=texts(report).join("\n");
  for(const phrase of [...RULE.prohibitedCertainty,...RULE.prohibitedStarClaims])if(combined.includes(phrase))
    throw new GroundingValidationError(`금지된 확정 표현: ${phrase}`);
  if(input.reportType==="LIFETIME_GENERAL")for(const phrase of [...LIFETIME_REPORT_V2.prohibitedChildrenClaims,...LIFETIME_REPORT_V2.prohibitedWellnessClaims,...LIFETIME_REPORT_V2.prohibitedAxisConfusion])if(combined.includes(phrase))throw new GroundingValidationError(`평생총운 금지 표현: ${phrase}`);
  validateLockedText(combined,[...input.evidence.map(row=>row.value),...(input.reportPlan??[])],input.minimalContext.requestedYear);
  return true;
}
