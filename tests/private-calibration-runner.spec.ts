import { expect, test } from "vitest";
import { runPrivateCalibrationCase, runPrivateCalibrationSummary } from "@/lib/saju/audit/private-runner";

const caseFile=process.env.POSTPOST_PRIVATE_CASE;
test("runs one explicitly requested private calibration case", async () => {
  const caseFiles=process.env.POSTPOST_PRIVATE_CASES?.split("\n").filter(Boolean);
  if(caseFiles?.length){const result=await runPrivateCalibrationSummary(caseFiles,process.env.POSTPOST_PRIVATE_SUMMARY_OUTPUT??"calibration/private/output/calibration-summary.json");expect(result.caseIds).toHaveLength(caseFiles.length);return;}
  if(!caseFile){expect(process.env.POSTPOST_PRIVATE_OUTPUT).toBeUndefined();return;}
  const result=await runPrivateCalibrationCase(caseFile!,process.env.POSTPOST_PRIVATE_OUTPUT??"calibration/private/output");
  expect(result.caseId).toMatch(/^CASE-\d{3,}$/);
});
