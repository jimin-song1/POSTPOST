import "server-only";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertCaseId } from "./local-mode";
import type { CalibrationTrace } from "@/types/calibration-trace";
import type { LocalCalibrationAudit, LocalCalibrationInput, CalibrationCaseListItem } from "@/types/local-calibration";
import type { SajuAnalysis } from "@/types/saju-analysis";

const base = path.resolve(process.cwd(), "calibration/private/cases");
const suffixes = ["input", "audit", "trace", "result"] as const;
function file(caseId: string, suffix: typeof suffixes[number]) { assertCaseId(caseId); const resolved=path.resolve(base,`${caseId}.${suffix}.json`); if(!resolved.startsWith(`${base}${path.sep}`)) throw new Error("INVALID_CASE_PATH"); return resolved; }
async function json<T>(target:string):Promise<T|null>{ try{return JSON.parse(await readFile(target,"utf8")) as T;}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;} }
async function atomic(target:string,value:unknown){await mkdir(base,{recursive:true});const temporary=`${target}.${process.pid}.tmp`;await writeFile(temporary,`${JSON.stringify(value,null,2)}\n`,{encoding:"utf8",mode:0o600});await rename(temporary,target);}

export async function nextCaseId(){await mkdir(base,{recursive:true});const names=await readdir(base);const max=names.map(name=>/^CASE-(\d+)\./.exec(name)?.[1]).filter(Boolean).reduce((n,row)=>Math.max(n,Number(row)),0);return `CASE-${String(max+1).padStart(3,"0")}`;}
export async function createCase(input:LocalCalibrationInput){const caseId=await nextCaseId(),now=new Date().toISOString();const audit:LocalCalibrationAudit={caseId,status:"NEW",alias:input.alias,createdAt:now,updatedAt:now,stale:false,overallNotes:"",factAssessments:{},assessments:[]};await atomic(file(caseId,"input"),input);await atomic(file(caseId,"audit"),audit);return {caseId,audit};}
export async function listCases():Promise<CalibrationCaseListItem[]>{await mkdir(base,{recursive:true});const names=await readdir(base);const ids=Array.from(new Set(names.map(name=>/^(CASE-\d+)\.audit\.json$/.exec(name)?.[1]).filter((row):row is string=>Boolean(row)))).sort().reverse();return Promise.all(ids.map(async caseId=>{const audit=await json<LocalCalibrationAudit>(file(caseId,"audit"));return {caseId,alias:audit?.alias,status:audit?.status??"NEW",stale:Boolean(audit?.stale),updatedAt:audit?.updatedAt??"",analyzed:Boolean(await json(file(caseId,"result")))};}));}
export async function readCase(caseId:string){const [input,audit,result,trace]=await Promise.all([json<LocalCalibrationInput>(file(caseId,"input")),json<LocalCalibrationAudit>(file(caseId,"audit")),json<SajuAnalysis>(file(caseId,"result")),json<CalibrationTrace>(file(caseId,"trace"))]);if(!input||!audit)return null;return {input,audit,result,trace};}
export async function saveAnalysis(caseId:string,result:SajuAnalysis,trace:CalibrationTrace){const current=await readCase(caseId);if(!current)throw new Error("CASE_NOT_FOUND");await atomic(file(caseId,"result"),result);await atomic(file(caseId,"trace"),trace);const audit={...current.audit,status:"ANALYZED" as const,stale:false,updatedAt:new Date().toISOString()};await atomic(file(caseId,"audit"),audit);return audit;}
export async function updateCase(caseId:string,patch:{input?:LocalCalibrationInput;audit?:Partial<LocalCalibrationAudit>}){const current=await readCase(caseId);if(!current)throw new Error("CASE_NOT_FOUND");let stale=current.audit.stale;if(patch.input){const before=JSON.stringify(current.input);await atomic(file(caseId,"input"),patch.input);stale=Boolean(current.result)&&before!==JSON.stringify(patch.input);}const audit={...current.audit,...patch.audit,alias:patch.input?.alias??patch.audit?.alias??current.audit.alias,stale,updatedAt:new Date().toISOString(),caseId};await atomic(file(caseId,"audit"),audit);return {input:patch.input??current.input,audit};}
export async function deleteCase(caseId:string){for(const suffix of suffixes)await unlink(file(caseId,suffix)).catch(error=>{if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;});}
export async function readTraceStep(caseId:string,index:number){const trace=await json<CalibrationTrace>(file(caseId,"trace"));return trace?.steps.find(step=>step.index===index)??null;}
