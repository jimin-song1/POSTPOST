'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
// V35: the V32 experiment is compared with the pre-V35 engine it was run against, archived from V34.
const baseline=JSON.parse(fs.readFileSync(path.join(base,'docs/v35_goal_output_overlap/v34_baseline_twelve_date_charts.json'),'utf8'));
const experimental=JSON.parse(fs.readFileSync(path.join(base,'docs/v32_experiment/experimental_twelve_charts.json'),'utf8'));
const get=(data,id,section)=>data.charts.find(c=>c.id===id)?.sections.find(x=>x.id===section);
const a=get(baseline,'RC11','P01-09'), b=get(experimental,'RC11','P01-09'),c=get(experimental,'RC11','P01-10');
const checks=[
 ['baseline preserved',()=>{assert.equal(baseline.selected,119);assert.equal(baseline.structured,96);assert.equal(a.type,'legacy')}],
 ['experiment changed RC11',()=>{assert.equal(experimental.selected,120);assert.equal(experimental.structured,98);assert.equal(b.type,'structured');assert.equal(c.type,'structured')}],
 ['overlap risk is recorded',()=>{assert(b.flags.includes('SEMANTIC_OVERLAP'));assert(b.flags.includes('REUSED_SOURCE_PAIR'))}],
 ['no unreviewed promotion',()=>{assert.equal(experimental.charts.find(x=>x.id==='RC11').ready,7);assert.equal(baseline.charts.find(x=>x.id==='RC11').ready,5)}],
];
const results=checks.map(([name,fn])=>{try{fn();return{name,status:'PASS'}}catch(e){return{name,status:'FAIL',message:String(e)}}});
const report={version:'V32',experimentOnly:true,engineChangeAccepted:false,checks:results,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};
fs.writeFileSync(path.join(base,'docs/v32_experiment/v32_validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
