"use strict";
/** V20: fail-closed diagnostics, without changing selection behavior or pretending to resolve the underlying conflict. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const charts=JSON.parse(fs.readFileSync(path.join(root,'docs/v17_cross_chart_audit/twelve_date_charts.json'),'utf8'));
const regressions=JSON.parse(fs.readFileSync(path.join(root,'docs/v19_diagnostics/regression_matrix.json'),'utf8'));
const slots=charts.charts.flatMap(c=>c.sections.map(s=>({caseId:c.id,...s})));
const problems=slots.filter(s=>s.status!=='READY_FOR_REVIEW');
const categorized=problems.map(s=>({caseId:s.caseId,section:s.id,candidateId:s.candidateId||null,
 reason:s.type==='empty'?'NO_SELECTED_CANDIDATE':s.type==='legacy'?'NO_STRUCTURED_BEHAVIOR':'STRUCTURED_BUT_NOT_WRITING_READY',
 blocked:true}));
const rc11=slots.filter(s=>s.caseId==='RC11'&&['P01-09','P01-10'].includes(s.id));
assert.equal(rc11.length,2,'RC11 pair expected');
const regFailed=regressions.filter(r=>r.exitCode!==0).map(r=>({test:r.test,log:r.log,failedNames:(()=>{try{return JSON.parse(r.summary).failedNames||[]}catch{return []}})(),
 classification:['V6','V8'].includes(r.test)?'ASSERTION_REVIEW_REQUIRED':r.test==='V13'?'MULTIPLE_BEHAVIOR_CONTRACT_OR_FIXTURE_ASSUMPTIONS':r.test==='V15'?'HISTORICAL_DIVERSITY_EXPECTATION_MISMATCH':'UNCLASSIFIED',status:'OPEN'}));
const result={version:'V20 root-cause audit',testMode:'offline 12 fictional birth dates using Swiss solar-term substitute',total:slots.length,selected:slots.filter(s=>s.type!=='empty').length,writingReady:slots.length-problems.length,unapproved:problems.length,unapprovedReasons:Object.fromEntries(['NO_SELECTED_CANDIDATE','NO_STRUCTURED_BEHAVIOR','STRUCTURED_BUT_NOT_WRITING_READY'].map(k=>[k,categorized.filter(s=>s.reason===k).length])),rc11,failedRegressions:regFailed,releaseReady:false,
status:'BLOCKED_UNRESOLVED',note:'No inference behavior was changed. RC11 candidate generation must be improved without relaxing provenance/semantic-overlap checks. Passing this diagnostic is not release approval.'};
assert.equal(result.total,120);assert.equal(result.unapproved,result.total-result.writingReady);
fs.mkdirSync(path.join(root,'docs/v20_diagnostics'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/v20_diagnostics/audit.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'docs/v20_diagnostics/unapproved_slots.json'),JSON.stringify(categorized,null,2)+'\n');
console.log(JSON.stringify({total:result.total,selected:result.selected,writingReady:result.writingReady,unapproved:result.unapproved,unapprovedReasons:result.unapprovedReasons,failedRegressions:regFailed.map(r=>r.test),releaseReady:false},null,2));
