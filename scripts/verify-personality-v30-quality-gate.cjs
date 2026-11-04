'use strict';
/** V30 local safeguard: run only against locally regenerated offline data.
 * This is a regression FLOOR, not an assertion of psychological validity or release approval.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const six=JSON.parse(fs.readFileSync(path.join(root,'docs/v14_real_chart_audit/six_date_charts.json'),'utf8'));
const twelve=JSON.parse(fs.readFileSync(path.join(root,'docs/v17_cross_chart_audit/twelve_date_charts.json'),'utf8'));
const rc11=twelve.charts.find(c=>c.id==='RC11');
const checks=[];
function check(name,fn){try{fn();checks.push({name,status:'PASS'})}catch(e){checks.push({name,status:'FAIL',error:String(e.message)})}}
check('six chart selection completeness unchanged',()=>{assert.equal(six.total,60);assert.equal(six.selected,60);assert(six.structured>=50,'structured chapters declined below V29 baseline')});
check('twelve chart selection and reviewability do not regress',()=>{assert.equal(twelve.total,120);assert(twelve.selected>=119);assert(twelve.ready>=96);assert(twelve.structured>=96)});
// V35: the two RC11 checks below originally pinned the V29~V34 *unresolved* state
// (09 legacy, 10 empty). V35 resolves RC11 through rule-table goal/output comparison, so the
// checks now require that EITHER the unresolved state holds, OR the resolution carries evidence.
const rc9=rc11.sections.find(s=>s.id==='P01-09'), rc10=rc11.sections.find(s=>s.id==='P01-10');
check('RC11 outcome is explicit: unresolved, or resolved with evidence (not silently approved)',()=>{assert(rc11);
  if(rc9.type!=='structured'){assert.equal(rc10.type,'empty');return;}
  assert.equal(rc9.goalOutputSource,'SCENE_RULE');assert(rc9.actionGoal&&rc9.observableOutput);
  assert(!rc9.flags.includes('SEMANTIC_OVERLAP'));assert(!rc9.flags.includes('REUSED_SOURCE_PAIR'));});
check('RC11 P01-10 is only filled when linked to the selected P01-09 strength',()=>{
  if(rc10.type==='empty')return; assert.equal(rc9.type,'structured');assert.equal(rc10.linkedStrengthCandidateId,rc9.candidateId);
  const shared=rc10.sourceIds.filter(x=>rc9.sourceIds.includes(x)&&x.startsWith('PILLAR:')).length;assert.equal(shared,1);});
const report={baseline:'V29',gateVersion:'V30 (V35 RC11 clauses)',description:'Regression floor only; not production accuracy or coverage certification',checks,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,six:{total:six.total,selected:six.selected,structured:six.structured},twelve:{total:twelve.total,selected:twelve.selected,structured:twelve.structured,ready:twelve.ready,empty:twelve.empty},rc11:{selected:rc11.selected,ready:rc11.ready,chapter09:rc11.sections.find(s=>s.id==='P01-09')?.type,chapter10:rc11.sections.find(s=>s.id==='P01-10')?.type}};
const dir=path.join(root,'docs/v30_quality_gate');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
