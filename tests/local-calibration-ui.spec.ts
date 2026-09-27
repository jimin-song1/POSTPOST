import { readFileSync } from "node:fs";
import { describe,expect,test } from "vitest";
import { isLocalCalibrationEnabled,assertCaseId } from "@/lib/saju/calibration/local-mode";
import { calculateSaju } from "@/lib/saju/engine";
import { buildCalibrationTrace } from "@/lib/saju/audit/trace-builder";
import { buildCalibrationView } from "@/lib/saju/calibration/view-model";
import type { SajuInput } from "@/types/saju-input";

const root=process.cwd(),source=(file:string)=>readFileSync(`${root}/${file}`,"utf8");
const synthetic:SajuInput={name:"SYNTHETIC_LOCAL_QA",gender:"female",calendarType:"solar",birthDate:"1995-09-30",birthTime:"08:29",birthTimeKnown:true,birthCountry:"KR",birthCityKnown:true,birthCity:"서울특별시"};

describe("M23 local calibration security",()=>{
 test("requires both development and explicit mode",()=>{expect(isLocalCalibrationEnabled({NODE_ENV:"development",CALIBRATION_MODE:"1"})).toBe(true);expect(isLocalCalibrationEnabled({NODE_ENV:"production",CALIBRATION_MODE:"1"})).toBe(false);expect(isLocalCalibrationEnabled({NODE_ENV:"development"})).toBe(false);});
 test("rejects traversal and invalid case IDs",()=>{expect(()=>assertCaseId("../../CASE-001")).toThrow("INVALID_CASE_ID");expect(()=>assertCaseId("CASE-1")).toThrow();expect(assertCaseId("CASE-001")).toBe("CASE-001");});
 test("server-gates page and every write API",()=>{for(const file of ["src/app/dev/calibration/page.tsx","src/app/api/dev/calibration/cases/route.ts","src/app/api/dev/calibration/cases/[caseId]/route.ts","src/app/api/dev/calibration/cases/[caseId]/analyze/route.ts"])expect(source(file)).toContain("isLocalCalibrationEnabled");});
 test("keeps private storage inside ignored directory",()=>{const body=source("src/lib/saju/calibration/local-store.ts");expect(body).toContain('"calibration/private/cases"');expect(source(".gitignore")).toContain("calibration/private/**");});
 test("does not log private payloads",()=>{expect(source("src/lib/saju/calibration/local-store.ts")).not.toMatch(/console\.(log|error)/);expect(source("src/app/api/dev/calibration/cases/[caseId]/analyze/route.ts")).not.toMatch(/console\.(log|error)/);});
});

describe("M23 local calibration engine and trace",()=>{
 const analysis=calculateSaju(synthetic),trace=buildCalibrationTrace(analysis,{caseId:"CASE-001",synthetic:true,relationshipStatus:"SINGLE"}),view=buildCalibrationView(analysis,trace);
 test("uses the production engine without a second calibration engine",()=>{expect(view.facts.pillars).toEqual(Object.values(analysis.pillars));});
 test("renders all 41 trace steps",()=>{expect(view.traceSteps).toHaveLength(41);expect(view.traceSteps[0].id).toBe("INPUT_NORMALIZATION");expect(view.traceSteps[40].id).toBe("LIFETIME_GENERAL_INPUT");});
 test("surfaces trace reconstruction failure",()=>{const broken={...trace,reconstruction:[{...trace.reconstruction[0],status:"FAIL" as const}]};expect(buildCalibrationView(analysis,broken).traceError).toBe(true);});
 test("keeps support and activation as independent raw results",()=>{expect(source("src/components/calibration/CalibrationClient.tsx")).toContain("도움 흐름과 변화 활성도는 합산하지 않습니다");});
 test("keeps large wolun behind a lazy trace request",()=>{const ui=source("src/components/calibration/CalibrationClient.tsx");expect(ui).toContain("전체 월운은 초기 DOM에 렌더하지 않으며");expect(ui).toContain("/trace/${index}");});
});

describe("M23 case workflow and self report",()=>{
 const ui=source("src/components/calibration/CalibrationClient.tsx"),store=source("src/lib/saju/calibration/local-store.ts");
 test("supports automatic numbering, reopen, update, delete and stale state",()=>{expect(store).toContain("max+1");expect(store).toContain("readCase");expect(store).toContain("updateCase");expect(store).toContain("deleteCase");expect(store).toContain("stale=");});
 test("offers all four classifications",()=>{for(const label of ["MATCH","PARTIAL","MISMATCH","UNKNOWN"])expect(ui).toContain(label);});
 test("offers every mismatch classification",()=>{for(const label of ["FACT_ERROR","SCHOOL_DIFFERENCE","COEFFICIENT_DIFFERENCE","INTERPRETATION_DIFFERENCE","USER_EXPERIENCE_MISMATCH","TRACE_ERROR"])expect(ui).toContain(label);});
 test("includes pre-analysis and post-analysis notes",()=>{expect(ui).toContain("사전 메모");expect(ui).toContain("전체 메모");});
 test("does not ask for a real name",()=>{expect(ui).not.toContain("이름을 입력");expect(ui).toContain("실명은 받지 않습니다");});
});

describe("M23 responsive accessible UI contract",()=>{
 const css=source("src/app/globals.css"),ui=source("src/components/calibration/CalibrationClient.tsx");
 test("has mobile breakpoints and avoids page-width expansion",()=>{expect(css).toContain("@media(max-width:430px)");expect(css).toContain("overflow-x:auto");});
 test("reuses typed date, time, country and city controls",()=>{for(const token of ["HybridDateField","HybridTimeField","SearchSelect","COUNTRY_OPTIONS","KR_CITY_OPTIONS"])expect(ui).toContain(token);});
 test("separates FACT, CORE, FORTUNE and DOMAIN navigation",()=>{for(const token of ["FACT","CORE","FORTUNE","DOMAIN","SELF REPORT","TRACE"])expect(ui).toContain(token);});
 test("keeps customer navigation unchanged",()=>{expect(source("src/app/page.tsx")).not.toContain("calibration");});
});
