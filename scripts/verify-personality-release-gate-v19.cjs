'use strict';
// Non-mutating release gate. Fail closed when a selected paragraph is not writing-ready.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/v17_cross_chart_audit/twelve_date_charts.json'),'utf8'));
const regression=JSON.parse(fs.readFileSync(path.join(root,'docs/v19_diagnostics/regression_matrix.json'),'utf8'));
const slots=audit.charts.flatMap(c=>c.sections.map(s=>({...s,chart:c.id})));
const failures=[];
for(const s of slots){if(s.type==='empty'||s.status==='DO_NOT_GENERATE') failures.push({kind:'UNAPPROVED_SLOT',chart:s.chart,section:s.id,type:s.type,status:s.status,candidateId:s.candidateId});}
for(const t of regression.filter(x=>!['V17','V18'].includes(x.test)&&x.exitCode!==0)) failures.push({kind:'REGRESSION',test:t.test,exitCode:t.exitCode,log:t.log});
const summary={version:'V19 diagnostic gate',charts:audit.charts.length,slots:slots.length,selected:slots.filter(x=>x.type!=='empty').length,writingReady:slots.filter(x=>x.status==='READY_FOR_REVIEW').length,unapproved:slots.filter(x=>x.status!=='READY_FOR_REVIEW').length,failedRegressions:regression.filter(x=>!['V17','V18'].includes(x.test)&&x.exitCode!==0).map(x=>x.test),releaseReady:failures.length===0,failures};
const dest=path.join(root,'docs/v19_diagnostics/release_gate.json');fs.writeFileSync(dest,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({charts:summary.charts,slots:summary.slots,selected:summary.selected,writingReady:summary.writingReady,unapproved:summary.unapproved,failedRegressions:summary.failedRegressions,releaseReady:summary.releaseReady},null,2));
// Tool invocation exits 0 for successful diagnosis, but releaseReady MUST be true to approve deployment.
