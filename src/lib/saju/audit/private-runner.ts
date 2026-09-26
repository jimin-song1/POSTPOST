import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateSaju } from "@/lib/saju/engine";
import { renderCalibrationTraceHtml } from "./html-renderer";
import { buildCalibrationSummary, buildSummaryTable } from "./summary";
import { buildCalibrationTrace, stableTraceJson } from "./trace-builder";
import type { CalibrationCaseFile } from "@/types/calibration-trace";

const PRIVATE_ROOTS = ["calibration/private", "benchmarks/private", "fixtures/private"];
function assertPrivatePath(target: string) {
  const relative = path.relative(process.cwd(), path.resolve(target)).replaceAll("\\", "/");
  if (!PRIVATE_ROOTS.some((root) => relative === root || relative.startsWith(`${root}/`))) throw new Error(`Private calibration files must stay under: ${PRIVATE_ROOTS.join(", ")}`);
}
function parseCase(value: string): CalibrationCaseFile {
  const parsed = JSON.parse(value) as CalibrationCaseFile;
  if (!/^CASE-\d{3,}$/.test(parsed.caseId)) throw new Error("caseId must use anonymous CASE-001 form.");
  if (!parsed.input || typeof parsed.input !== "object") throw new Error("A case input is required.");
  return parsed;
}

export async function runPrivateCalibrationCase(caseFile: string, outputDirectory = "calibration/private/output") {
  assertPrivatePath(caseFile); assertPrivatePath(outputDirectory);
  const calibrationCase = parseCase(await readFile(caseFile, "utf8")), analysis = calculateSaju(calibrationCase.input);
  const trace = buildCalibrationTrace(analysis, { caseId:calibrationCase.caseId,includeSensitiveInput:true,assessments:calibrationCase.assessments,externalComparisons:calibrationCase.externalComparisons });
  if (trace.reconstruction.some((row)=>row.status==="FAIL")) throw new Error("TRACE_ERROR: production result reconstruction failed.");
  await mkdir(outputDirectory,{recursive:true});
  const base=path.join(outputDirectory,calibrationCase.caseId);
  await Promise.all([
    writeFile(`${base}.trace.json`,stableTraceJson(trace),"utf8"),
    writeFile(`${base}.trace.html`,renderCalibrationTraceHtml(trace),"utf8"),
    writeFile(`${base}.summary.json`,JSON.stringify(buildCalibrationSummary(calibrationCase.caseId,analysis,calibrationCase.assessments),null,2)+"\n","utf8"),
  ]);
  return { caseId:calibrationCase.caseId, traceJson:`${base}.trace.json`, traceHtml:`${base}.trace.html`, summaryJson:`${base}.summary.json` };
}

export async function runPrivateCalibrationSummary(caseFiles: string[], outputFile = "calibration/private/output/calibration-summary.json") {
  if(!caseFiles.length)throw new Error("At least one private case is required.");
  assertPrivatePath(outputFile);
  const rows=[];
  for(const caseFile of caseFiles){assertPrivatePath(caseFile);const calibrationCase=parseCase(await readFile(caseFile,"utf8")),analysis=calculateSaju(calibrationCase.input);
    rows.push(buildCalibrationSummary(calibrationCase.caseId,analysis,calibrationCase.assessments));}
  await mkdir(path.dirname(outputFile),{recursive:true});
  await writeFile(outputFile,JSON.stringify(buildSummaryTable(rows),null,2)+"\n","utf8");
  return{outputFile,caseIds:rows.map((row)=>row.caseId)};
}
