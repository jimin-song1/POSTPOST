'use strict';
/** V16 six-chart deterministic editorial diversity test, not customer accuracy. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(__dirname,'verify-personality-realcharts-v14.cjs')],{cwd:root,stdio:'ignore'});
const d=JSON.parse(fs.readFileSync(path.join(root,'docs/v14_real_chart_audit/six_date_charts.json'),'utf8'));
const sec=id=>d.charts.flatMap(c=>c.sections.filter(s=>s.id===id && s.type==='structured'));
const four=sec('P01-04'),nine=sec('P01-09');
assert.equal(d.total,60);assert.equal(d.selected,60);assert.equal(d.structured,50);assert.equal(d.empty,0);
assert.equal(d.qualityAlerts.length,0);
assert.equal(four.length,4);assert(new Set(four.map(x=>x.action)).size>=3);
assert.equal(nine.length,6);assert(new Set(nine.map(x=>x.action)).size>=4);
assert(four.every(s=>/^P01-04:output:(식신|상관)\|/.test(s.scenarioRuleId) && s.sourceIds.length===2));
assert(nine.every(s=>/^P01-09:[a-z]+\|[a-z]+:/.test(s.scenarioRuleId) && s.sourceIds.length===2));
for(const s of [...four,...nine])assert(!/(반드시|무조건|100%|평생|확실히)/.test(s.action));
const out={test:'offline six synthetic birth-date/time charts; Swiss solar term adapter, not production JPL',
  selected:d.selected,structured:d.structured,uniqueAction:d.uniqueBehavioralActions,uniqueTriggers:d.uniqueTriggers,
  chapter04:{count:four.length,actions:new Set(four.map(s=>s.action)).size,rules:new Set(four.map(s=>s.scenarioRuleId)).size},
  chapter09:{count:nine.length,actions:new Set(nine.map(s=>s.action)).size,rules:new Set(nine.map(s=>s.scenarioRuleId)).size},
  customerAIManuscriptVerified:false,psychologicalAccuracyVerified:false,passed:true};
const dir=path.join(root,'docs/v16_scene_audit');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
