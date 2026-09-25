import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";
import type { InterpretationInput,StructuredInterpretation } from "@/types/ai-interpretation";

export class GroundingValidationError extends Error {readonly code="GROUNDING_VALIDATION_FAILED" as const;
  constructor(message:string){super(message);this.name="GroundingValidationError";}}
function visit(value:unknown,handle:(value:unknown)=>void){handle(value);if(Array.isArray(value))for(const item of value)visit(item,handle);
  else if(value&&typeof value==="object")for(const item of Object.values(value))visit(item,handle);}
function texts(report:StructuredInterpretation){return[report.headline,report.summary,report.disclaimer,...report.highlights,...report.cautions,
  ...report.sections.flatMap(row=>[row.title,row.body]),...report.timeline.flatMap(row=>[row.title,row.body])];}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-9;

function factInventory(values:unknown[]){
  const numbers:number[]=[],strings:string[]=[];for(const root of values)visit(root,value=>{
    if(typeof value==="number")numbers.push(value);else if(typeof value==="string")strings.push(value);});
  const allowedNumbers=new Set<number>();for(const number of numbers)for(const candidate of
    [number,Math.round(number),Number(number.toFixed(1)),Number(number.toFixed(2))])allowedNumbers.add(candidate);
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

  for(const row of report.sections)validateLockedText(`${row.title}\n${row.body}`,
    row.evidenceIds.map(id=>evidenceById.get(id)!.value),input.minimalContext.requestedYear);
  for(const row of report.timeline)validateLockedText(`${row.title}\n${row.body}`,
    row.evidenceIds.map(id=>evidenceById.get(id)!.value),input.minimalContext.requestedYear);

  const combined=texts(report).join("\n");
  for(const phrase of [...RULE.prohibitedCertainty,...RULE.prohibitedStarClaims])if(combined.includes(phrase))
    throw new GroundingValidationError(`금지된 확정 표현: ${phrase}`);
  validateLockedText(combined,input.evidence.map(row=>row.value),input.minimalContext.requestedYear);
  return true;
}
