'use strict';
/** Targeted Node regression. This is neither production AI generation nor a Vitest run. */
const Module=require('node:module');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const tsPath=process.env.TYPESCRIPT_MODULE || '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript';
let ts;try{ts=require(process.env.TYPESCRIPT_MODULE||'typescript')}catch{ts=require(tsPath)}
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return originalResolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {generateConditionalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-behavior.v2.ts');
const {verifyGeneratedBehaviorContract,canonicalBehaviorCandidates,behavioralOverlap}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const sample=require(root+'/samples/SYNTHETIC_CORE_001.json').response;
const plan=selectPersonalityInterpretations(sample),brief=createPersonalityWritingBrief(plan);
const checks=[];
function check(name,fn){try{const detail=fn();checks.push({name,status:'PASS',...(detail?{detail}:{})});}catch(e){checks.push({name,status:'FAIL',reason:String(e.stack||e)})}}
function chosen(id){const section=plan.sections.find(s=>s.sectionId==='P01-'+id);assert(section?.selected,`Missing P01-${id}`);return section.selected}
function h(id){const b=chosen(id).behaviorHypothesis;assert(b,`No behavior P01-${id}`);return b}
check('10 sections have selected behavior hypotheses',()=>{assert.equal(plan.sections.length,10);assert(plan.sections.every(s=>s.selected?.behaviorHypothesis));return {count:10}});
check('01 has rule-backed start scene, not joint agreement',()=>{const x=h('01');assert(x.scenarioRuleId.startsWith('P01-01:baseline:'));assert(/처음|시작|출발/.test(x.trigger+' '+x.observableBehavior));assert(!/누가 어떤 일을 맡고/.test(x.observableBehavior));return {rule:x.scenarioRuleId,trigger:x.trigger,behavior:x.observableBehavior}});
check('07 has actual agreement scene, not first start',()=>{const x=h('07');assert(x.scenarioRuleId.startsWith('P01-07:cooperation:'));assert(/함께|여럿|공동/.test(x.trigger));assert(/합의/.test(x.observableBehavior));return {rule:x.scenarioRuleId,trigger:x.trigger,behavior:x.observableBehavior}});
check('09 has evidence-aligned practical advantage',()=>{const x=h('09');assert(x.scenarioRuleId.startsWith('P01-09:'));assert(x.observableBehavior.length>10);assert(x.counterCondition.length>15);return {rule:x.scenarioRuleId,trigger:x.trigger,behavior:x.observableBehavior}});
check('old 01/07 alert is absent after distinct scenes',()=>{const a=chosen('01'),b=chosen('07');assert(!behavioralOverlap(a,b).nearDuplicate);assert(!plan.audit.semanticOverlapReviews.some(x=>x.priorId===a.id&&x.candidateId===b.id));return {first:a.id,second:b.id}});
check('old 07/09 alert is absent after scene review',()=>{const a=chosen('07'),b=chosen('09');assert(!behavioralOverlap(a,b).nearDuplicate);assert(!plan.audit.semanticOverlapReviews.some(x=>x.priorId===a.id&&x.candidateId===b.id));return {first:a.id,second:b.id}});
check('old 05/09 repetitive candidate is detected but not selected',()=>{const canonical=canonicalBehaviorCandidates(sample);const old05=canonical.get('V56-B2-P01-05-dayBranch-hourStem');const old09=canonical.get('V56-B2-P01-09-monthBranch-dayBranch');assert(old05&&old09);const originalOverlap=behavioralOverlap(old05,old09);assert(originalOverlap.nearDuplicate);assert(originalOverlap.repeatedMotifs.includes('verification'));assert(originalOverlap.repeatedMotifs.includes('opportunity-choice'));assert(!behavioralOverlap(chosen('05'),chosen('09')).nearDuplicate);return {rejectedRepetition:old09.id,replacement:chosen('09').id}});
check('all selected claims match untouched canonical natal-derived candidates',()=>{const map=canonicalBehaviorCandidates(sample);for(const sec of plan.sections)assert(verifyGeneratedBehaviorContract(sample,sec.selected,map),sec.sectionId)});
check('tampered co-operation behavior is rejected',()=>{const a=chosen('07'),fake={...a,behaviorHypothesis:{...a.behaviorHypothesis,observableBehavior:'상대의 속마음을 모두 알아내는 능력'}};assert(!verifyGeneratedBehaviorContract(sample,fake,canonicalBehaviorCandidates(sample)))});
check('repeated natal pair only serves a distinct 09 scene and is flagged',()=>{
 const seen=new Map(); let reuse=0;
 for(const sec of plan.sections){
  const c=sec.selected, pair=c.sourceIds.filter(v=>v.startsWith('PILLAR:')).sort().join('|');
  const previous=seen.get(pair);
  if(previous){
   assert.equal(sec.sectionId,'P01-09','Only strength may reuse a prior pair');
   assert(c.behaviorHypothesis&&previous.behaviorHypothesis);
   assert(!behavioralOverlap(c,previous).nearDuplicate,'Same scene cannot reuse exact pair');
   assert(sec.assessments.some(row=>row.candidateId===c.id&&row.flags.includes('REUSED_SOURCE_PAIR')));
   reuse++;
  }
  if(!previous)seen.set(pair,c);
 }
 return {sourcePairReuse:reuse};
});
check('10 weakness still points at selected 09 strength',()=>{const strength=chosen('09'),weak=chosen('10');assert.equal(weak.behaviorHypothesis.linkedStrengthCandidateId,strength.id);assert.equal(strength.sourceIds.filter(id=>weak.sourceIds.includes(id)).length,1);return {strength:strength.id,weakness:weak.id}});
check('existing 04 output and 06 revision special rules retained',()=>{assert(h('04').scenarioRuleId.startsWith('P01-04:'));assert(['식신','상관'].some(g=>h('04').semanticPairKey.includes(g))); assert(h('06').scenarioRuleId.startsWith('P01-06:revision:'))});
check('writing brief carries distinct scenes unchanged',()=>{for(const id of ['01','07','09']){const s=brief.sections.find(s=>s.id==='P01-'+id);assert.equal(s.status,'READY_FOR_REVIEW');assert.deepEqual(s.primary.behaviorHypothesis,h(id))}});
check('new scenes require appropriate symbolic families',()=>{const clone=structuredClone(sample);for(const p of ['year','month','day','hour']){const stem=clone.tenGods.value.heavenlyStems[p];if(stem&&['비견','겁재'].includes(stem.korean))stem.korean='식신';for(const n of clone.tenGods.value.hiddenStems[p]||[])if(['비견','겁재'].includes(n.tenGod.korean))n.tenGod.korean='식신'}const c=generateConditionalBehaviorCandidates(clone);assert(c.filter(x=>x.sectionId==='P01-07'&&x.behaviorHypothesis?.scenarioRuleId?.includes('peer|wealth')).length===0)});
check('changed TS and test files parse as TS',()=>{for(const file of ['src/lib/saju/ai-interpretation/personality-behavior.v2.ts','src/lib/saju/ai-interpretation/personality-editorial.v1.ts','src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts','tests/personality-diversity.v8.spec.ts']){const src=fs.readFileSync(path.join(root,file),'utf8');const result=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file)}});
check('deterministic re-selection',()=>{const again=selectPersonalityInterpretations(sample);assert.deepEqual(again.sections.map(s=>s.selected?.id),plan.sections.map(s=>s.selected?.id));assert.deepEqual(again.audit.semanticOverlapReviews,plan.audit.semanticOverlapReviews)});
const result={runner:'targeted dependency-free Node regression; not full typecheck, Vitest, real AI, or production build',testCase:'SYNTHETIC_CORE_001 (synthetic, not a verified person)',tests:checks.length,passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,semanticOverlapReviews:plan.audit.semanticOverlapReviews,chosen:plan.sections.map(s=>({sectionId:s.sectionId,candidateId:s.selected?.id,scene:s.selected?.behaviorHypothesis?.trigger,behavior:s.selected?.behaviorHypothesis?.observableBehavior,scenarioRuleId:s.selected?.behaviorHypothesis?.scenarioRuleId??null})),checks};
fs.writeFileSync(path.join(root,'docs/v8_compatibility_results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({tests:result.tests,passed:result.passed,failed:result.failed,overlapWarnings:result.semanticOverlapReviews.length,selected:result.chosen.length},null,2));
if(result.failed)process.exitCode=1;
