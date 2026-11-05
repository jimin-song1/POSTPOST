'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const v6=load('docs/v6_offline_results.json');
const v8=load('docs/v8_compatibility_results.json');
const v13=load('docs/v13_personality_diversity_results.json');
const v15=load('docs/v15_scene_audit/audit.json');
const failures=(rows)=>rows.filter(x=>x.status==='FAIL'||x.result==='FAIL'||x.ok===false).map(x=>({name:x.name,error:(x.error||x.reason||'').split('\n').slice(0,4).join(' ')}));
const cases=[
 {version:'V6',passed:v6.passed,failed:v6.failed,failures:failures(v6.results),classification:'outdated-rule-id-contract',guidance:'P01-04 scenarioRuleId prefix changed; validate current documented rule schema without weakening ten-god evidence checks.'},
 {version:'V8',passed:v8.passed,failed:v8.failed,failures:failures(v8.checks),classification:'outdated-rule-id-contract',guidance:'Same P01-04 legacy prefix check; keep P01-06 separate assertion.'},
 {version:'V13',passed:v13.passed,failed:v13.failed,failures:failures(v13.checks),classification:'selection-behavior-regression-and-old-fixtures',guidance:'115 selections vs expected 118, 63 structured vs 69; B05/B10 decisions reversed; audit causal candidates, not numeric expectation updates. Rule ID also gained ten-god suffix.'},
 {version:'V15',passed:v15.passed,failed:v15.failed,failures:failures(v15.checks),classification:'outdated-exact-diversity-count',guidance:'09 observed 5 vs old 3; compare minimum diversity and semantic differentiation, not fixed count.'}
];
assert.equal(cases.length,4);assert.deepEqual(cases.map(x=>x.failed),[1,1,5,1]);
const result={version:'V27',basedOn:'V26',purpose:'Classify persistent historical regression failures without changing production selection or silently rewriting historical tests',cases,failedAssertions:cases.reduce((a,c)=>a+c.failed,0),suitesFailed:4,productionLogicChanged:false,releaseApproved:false};
const dir=path.join(root,'docs/v27_regression_rootcause');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'classification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({suites:cases.length,failedAssertions:result.failedAssertions,classified:cases.map(c=>c.version+':'+c.classification)},null,2));
