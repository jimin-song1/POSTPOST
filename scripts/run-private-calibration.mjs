import { spawnSync } from "node:child_process";

const [caseFile,outputDirectory="calibration/private/output"]=process.argv.slice(2);
if(!caseFile){console.error("Usage: node scripts/run-private-calibration.mjs calibration/private/CASE-001.json [calibration/private/output]");process.exit(1);}
const result=spawnSync("./node_modules/.bin/vitest",["run","tests/private-calibration-runner.spec.ts"],{
  cwd:process.cwd(),stdio:"inherit",env:{...process.env,POSTPOST_PRIVATE_CASE:caseFile,POSTPOST_PRIVATE_OUTPUT:outputDirectory},
});
process.exit(result.status??1);
