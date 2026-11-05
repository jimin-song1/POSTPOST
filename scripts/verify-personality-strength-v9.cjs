'use strict';
/** Isolated Node regression for V9. Does not run the API or measure human personality. */
const Module=require('node:module'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const ts=require(process.env.TYPESCRIPT_MODULE||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require('../src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {canonicalBehaviorCandidates,behavioralOverlap,verifyGeneratedBehaviorContract}=require('../src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const {generateConditionalBehaviorCandidates}=require('../src/lib/saju/ai-interpretation/personality-behavior.v2.ts');
const sample=require('../samples/SYNTHETIC_CORE_001.json').response;
const plan=selectPersonalityInterpretations(sample),brief=createPersonalityWritingBrief(plan);
const get=id=>{const s=plan.sections.find(s=>s.sectionId===`P01-${id}`);assert(s?.selected,`missing P01-${id}`);return s.selected};
const checks=[];
function check(name,fn){try{const details=fn();checks.push({name,status:'PASS',...(details?{details}:{})})}catch(e){checks.push({name,status:'FAIL',reason:String(e.stack||e)})}}
check('all 10 sections selected in this one synthetic scenario',()=>{assert.equal(plan.sections.length,10);assert(plan.sections.every(s=>s.selected?.behaviorHypothesis));});
check('05 is about criteria before deciding',()=>{const b=get('05').behaviorHypothesis;assert(/선택|제안|조건/.test(b.trigger+' '+b.observableBehavior));return {scene:b.observableBehavior}});
check('09 is an evidence-backed concrete output action, not more choice',()=>{const b=get('09').behaviorHypothesis;assert(b.scenarioRuleId?.startsWith('P01-09:'));assert(b.semanticFamilyPairKey?.split('|').includes('output'));assert(/완성|마무리|결과|수행|만들/.test(b.observableBehavior));return {scene:b.observableBehavior,rule:b.scenarioRuleId}});
check('05 / 09 are different behaviors',()=>{const a=get('05'),b=get('09');assert(!behavioralOverlap(a,b).nearDuplicate);return {similarity:behavioralOverlap(a,b)}});
check('original problematic 05 / 09 remains detectable',()=>{const c=canonicalBehaviorCandidates(sample);const a=c.get('V56-B2-P01-05-dayBranch-hourStem'),b=c.get('V56-B2-P01-09-monthBranch-dayBranch');assert(a&&b);assert(behavioralOverlap(a,b).nearDuplicate)});
check('10 inherits the exact selected 09 in writing brief',()=>{const x=brief.sections.find(x=>x.id==='P01-10')?.primary?.linkedStrengthContext;assert.equal(x?.candidateId,get('09').id);assert.equal(x?.behavior,get('09').behaviorHypothesis.observableBehavior);assert.equal(get('10').behaviorHypothesis.linkedStrengthCandidateId,get('09').id)});
check('canonical behavior contract remains intact',()=>{const c=canonicalBehaviorCandidates(sample);for(const s of plan.sections)assert(verifyGeneratedBehaviorContract(sample,s.selected,c))});
check('tampered strength behavior blocked',()=>{const c=canonicalBehaviorCandidates(sample);const a=get('09');assert(!verifyGeneratedBehaviorContract(sample,{...a,behaviorHypothesis:{...a.behaviorHypothesis,observableBehavior:'거짓말을 단번에 알아냄'}},c))});
check('no output signal means no output-based strength rule',()=>{const mock=structuredClone(sample);for(const pos of ['year','month','day','hour']){const stem=mock.tenGods.value.heavenlyStems[pos];if(stem&&['식신','상관'].includes(stem.korean))stem.korean='정인';for(const v of mock.tenGods.value.hiddenStems[pos]||[])if(['식신','상관'].includes(v.tenGod.korean))v.tenGod.korean='정인'}const pool=generateConditionalBehaviorCandidates(mock);assert(!pool.some(x=>x.sectionId==='P01-09'&&x.behaviorHypothesis?.semanticFamilyPairKey?.split('|').includes('output')));const p=selectPersonalityInterpretations(mock);const choice=p.sections.find(s=>s.sectionId==='P01-05')?.selected, strength=p.sections.find(s=>s.sectionId==='P01-09')?.selected;if(choice?.behaviorHypothesis&&strength?.behaviorHypothesis)assert(!behavioralOverlap(choice,strength).nearDuplicate);return {strength:strength?.id??null}});
check('all remaining semantic alerts stay visible for editorial review',()=>{
 const byId=new Set(plan.sections.map(s=>s.selected?.id).filter(Boolean));
 for(const a of plan.audit.semanticOverlapReviews){assert(byId.has(a.priorId));assert(byId.has(a.candidateId));assert(a.overlappingMotifs.length>0)}
 return {overlapWarnings:plan.audit.semanticOverlapReviews.length};
});
check('modified TS files transpile with no diagnostics',()=>{for(const f of ['src/lib/saju/ai-interpretation/personality-behavior.v2.ts','src/lib/saju/ai-interpretation/personality-editorial.v1.ts','tests/personality-diversity.v8.spec.ts','tests/personality-distinct-strength.v9.spec.ts']){const a=ts.transpileModule(fs.readFileSync(path.join(root,f),'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});assert.equal(a.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length??0,0,f)}});
check('selection is deterministic',()=>{assert.deepEqual(selectPersonalityInterpretations(sample).sections.map(s=>s.selected?.id),plan.sections.map(s=>s.selected?.id))});
const result={runType:'isolated Node transpilation and regression, not full typecheck, Vitest, actual model writing or clinical/personality validation',sample:'SYNTHETIC_CORE_001',checks,tests:checks.length,passed:checks.filter(s=>s.status==='PASS').length,failed:checks.filter(s=>s.status==='FAIL').length,selection:plan.sections.map(s=>({section:s.sectionId,candidate:s.selected?.id,rule:s.selected?.behaviorHypothesis?.scenarioRuleId??null,trigger:s.selected?.behaviorHypothesis?.trigger??null,behavior:s.selected?.behaviorHypothesis?.observableBehavior??null,sourceIds:s.selected?.sourceIds??[]})),audit:plan.audit};
fs.writeFileSync(path.join(root,'docs/v9_offline_results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({tests:result.tests,passed:result.passed,failed:result.failed,overlapWarnings:result.audit.semanticOverlapReviews.length,sectionsSelected:result.selection.filter(x=>x.candidate).length},null,2));if(result.failed)process.exitCode=1;
