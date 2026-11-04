'use strict';
/** Targeted V15 multi-chart scene audit. Not a psychological accuracy test. */
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(root,'scripts/verify-personality-realcharts-v14.cjs')],{cwd:root,stdio:'ignore'});
const charts=JSON.parse(fs.readFileSync(path.join(root,'docs/v14_real_chart_audit/six_date_charts.json'),'utf8'));
const sections=key=>charts.charts.flatMap(c=>c.sections.filter(s=>s.id===key && s.type==='structured'));
const unique=(rows,key)=>new Set(rows.map(r=>r[key]));
const checks=[];
function check(name,cb){try{const detail=cb();checks.push({name,result:'PASS',detail:detail??''})}catch(e){checks.push({name,result:'FAIL',error:String(e.stack||e)})}}
const one=sections('P01-01'),seven=sections('P01-07'),nine=sections('P01-09'),four=sections('P01-04');
check('6 computed-date charts have stable 60 slots',()=>{assert.equal(charts.total,60);assert.equal(charts.structured,50);assert.equal(charts.selected,60)});
check('01 has at least four distinct starting-scene meanings',()=>{assert(unique(one,'action').size>=4);for(const r of one) assert(r.scenarioRuleId.startsWith('P01-01:baseline:'));return `${unique(one,'action').size}/${one.length}`});
check('07 has distinct shared-cost, joint-authority and shared-credit scenes',()=>{
 assert.equal(seven.length,5);assert(unique(seven,'action').size>=4);
 for(const r of seven){assert(r.scenarioRuleId.startsWith('P01-07:cooperation:'));assert(/합의/.test(r.action));assert(r.sourceIds.length===2)}
 const text=seven.map(r=>r.action).join(' ');
 assert(/비용|지출/.test(text));assert(/제안/.test(text));assert(/성과/.test(text));return [...unique(seven,'scenarioRuleId')];
});
check('07 mode is traceable to actual computed ten-god and position values',()=>{
 const expected={
  RC01:{key:'public-budget-vs-own-scope', pair:'정재.*비견'},
  RC02:{key:'personal-expenditure-vs-joint-role', pair:'비견.*정재'},
  RC03:{key:'opportunity-vs-decision-authority', pair:'비견.*편재'},
  RC05:{key:'personal-expenditure-vs-joint-role', pair:'비견.*정재'},
  RC06:{key:'collective-credit-vs-cost', pair:'겁재.*정재'},
 };
 for(const r of seven){const spec=expected[r.caseId];assert(spec);assert(r.scenarioRuleId.includes(spec.key),r.caseId+' '+r.scenarioRuleId);assert(new RegExp(spec.pair).test(r.basis),r.caseId+' '+r.basis)}
});
check('all emitted scenes are conditional and do not claim proven personality',()=>{
 for(const r of [...one,...seven]){
  assert(!/[—–·]/.test(r.trigger+' '+r.action));
  assert(!/(반드시|무조건|100%|평생|확실히)/.test(r.action));
  assert(/가설/.test(r.action));
 }
});
check('09 and 04 remaining template repetition is explicitly flagged rather than hidden',()=>{
 assert(unique(nine,'action').size>=3);
 assert(unique(four,'action').size>=2);
 const a=charts.qualityAlerts.map(x=>x.sectionId);
 if(unique(four,'action').size<=2)assert(a.includes('P01-04'));if(unique(nine,'action').size<=3)assert(a.includes('P01-09'));return {four:unique(four,'action').size,nine:unique(nine,'action').size,alerts:a};
});
check('selection stays deterministic in stored chart run',()=>{
 const rows=charts.charts.flatMap(c=>c.sections.map(s=>s.caseId+':'+s.id+':'+s.candidateId));
 assert.equal(new Set(rows).size,60);return {rows:rows.length};
});
const summary={mode:'2026-11-02 offline Swiss-term adapter, six fabricated birth date/time charts, NOT the production JPL path',
 originalBehaviorV14:34,currentBehaviorV15:charts.uniqueBehavioralActions,
 originalTriggersV14:25,currentTriggersV15:charts.uniqueTriggers,
 chapter07:{structured:seven.length,uniqueAction:unique(seven,'action').size,uniqueRule:unique(seven,'scenarioRuleId').size},
 chapter01:{structured:one.length,uniqueAction:unique(one,'action').size},
 unresolved:charts.qualityAlerts,checks,passed:checks.filter(x=>x.result==='PASS').length,failed:checks.filter(x=>x.result==='FAIL').length};
const folder=path.join(root,'docs/v15_scene_audit');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'audit.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,chapter01:summary.chapter01,chapter07:summary.chapter07,originalBehaviorV14:summary.originalBehaviorV14,currentBehaviorV15:summary.currentBehaviorV15,unresolved:summary.unresolved},null,2));
if(summary.failed)process.exitCode=1;
