export function isLocalCalibrationEnabled(env: Record<string, string | undefined> = process.env) {
  return env.CALIBRATION_MODE === "1" && env.NODE_ENV !== "production";
}

export const CASE_ID_PATTERN = /^CASE-\d{3,}$/;
export function assertCaseId(caseId: string) {
  if (!CASE_ID_PATTERN.test(caseId)) throw new Error("INVALID_CASE_ID");
  return caseId;
}
