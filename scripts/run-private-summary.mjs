import { spawnSync } from "node:child_process";

const caseFiles=process.argv.slice(2);
if(!caseFiles.length){console.error("Usage: node scripts/run-private-summary.mjs calibration/private/CASE-001.json [CASE-002.json ...]");process.exit(1);}
const result=spawnSync("./node_modules/.bin/vitest",["run","tests/private-calibration-runner.spec.ts"],{
  cwd:process.cwd(),stdio:"inherit",env:{...process.env,POSTPOST_PRIVATE_CASES:caseFiles.join("\n"),POSTPOST_PRIVATE_SUMMARY_OUTPUT:"calibration/private/output/calibration-summary.json"},
});
process.exit(result.status??1);
