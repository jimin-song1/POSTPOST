import { AI_INTERPRETATION_V1 as RULE } from "@/rules/ai-interpretation.v1";
import type { InterpretationInput,StructuredInterpretation } from "@/types/ai-interpretation";

export class GroundingValidationError extends Error {readonly code="GROUNDING_VALIDATION_FAILED" as const;
  constructor(message:string){super(message);this.name="GroundingValidationError";}}
function visit(value:unknown,handle:(value:unknown)=>void){handle(value);if(Array.isArray(value))for(const item of value)visit(item,handle);
  else if(value&&typeof value==="object")for(const item of Object.values(value))visit(item,handle);}
function texts(report:StructuredInterpretation){return[report.headline,report.summary,report.disclaimer,...report.highlights,...report.cautions,
  ...report.sections.flatMap(row=>[row.title,row.body]),...report.timeline.flatMap(row=>[row.title,row.body])];}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-9;

export function validateGrounding(report:StructuredInterpretation,input:InterpretationInput){
  if(report.reportType!==input.reportType)throw new GroundingValidationError("reportType이 요청과 다릅니다.");
  const ids=new Set(input.evidence.map(row=>row.id)),timelineIds=new Set(input.timeline.map(row=>row.id));
  for(const row of [...report.sections,...report.timeline])for(const id of row.evidenceIds)
    if(!ids.has(id))throw new GroundingValidationError(`알 수 없는 evidence ID: ${id}`);
  for(const row of report.timeline)if(!timelineIds.has(row.periodId))throw new GroundingValidationError(`알 수 없는 period ID: ${row.periodId}`);

  const numbers:number[]=[],allowedStrings:string[]=[];
  visit(input,value=>{if(typeof value==="number")numbers.push(value);else if(typeof value==="string")allowedStrings.push(value);});
  const allowedNumbers=new Set<number>();for(const number of numbers)for(const candidate of [number,Math.round(number),Number(number.toFixed(1)),Number(number.toFixed(2))])allowedNumbers.add(candidate);
  const allowedYears=new Set<number>();for(const value of allowedStrings)for(const match of Array.from(value.matchAll(/(?:19|20|21)\d{2}/g)))allowedYears.add(Number(match[0]));
  if(input.minimalContext.requestedYear)allowedYears.add(input.minimalContext.requestedYear);
  const allowedPillars=new Set<string>();for(const value of allowedStrings)for(const match of Array.from(value.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g)))allowedPillars.add(match[0]);
  const combined=texts(report).join("\n");
  for(const phrase of [...RULE.prohibitedCertainty,...RULE.prohibitedStarClaims])if(combined.includes(phrase))
    throw new GroundingValidationError(`금지된 확정 표현: ${phrase}`);
  for(const match of Array.from(combined.matchAll(/(?:19|20|21)\d{2}/g)))if(!allowedYears.has(Number(match[0])))
    throw new GroundingValidationError(`입력에 없는 연도: ${match[0]}`);
  for(const match of Array.from(combined.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g)))if(!allowedPillars.has(match[0]))
    throw new GroundingValidationError(`입력에 없는 간지: ${match[0]}`);
  for(const match of Array.from(combined.matchAll(/-?\d+(?:\.\d+)?/g))){const number=Number(match[0]);if(number>=1900&&number<=2199&&Number.isInteger(number))continue;
    if(!Array.from(allowedNumbers).some(value=>close(value,number)))throw new GroundingValidationError(`입력에 없는 숫자: ${match[0]}`);}
  const allLabels=[...RULE.lockedLabels.strength,...RULE.lockedLabels.structure,...RULE.lockedLabels.usefulGod];
  for(const label of allLabels)if(combined.includes(label)&&!allowedStrings.some(value=>value.includes(label)))
    throw new GroundingValidationError(`입력에 없는 고정 label: ${label}`);
  return true;
}
