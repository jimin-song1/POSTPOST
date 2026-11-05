'use strict';
/** Dependency-free targeted runtime check. Does NOT replace Vitest or app build. */
const Module=require('node:module');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const tsPath=process.env.TYPESCRIPT_MODULE || '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript';
let ts; try { ts=require(process.env.TYPESCRIPT_MODULE || 'typescript'); } catch { ts=require(tsPath); }
const previous=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return previous.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {generateConditionalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-behavior.v2.ts');
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {verifyGeneratedBehaviorContract,canonicalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const sample=require(root+'/samples/SYNTHETIC_CORE_001.json').response;
const plan=selectPersonalityInterpretations(sample),brief=createPersonalityWritingBrief(plan);
const checks=[];
function check(label,fn){try{const detail=fn();checks.push({name:label,status:'PASS',...(detail?{detail}:{})});}catch(err){checks.push({name:label,status:'FAIL',error:String(err.stack||err)});}}
const p05=plan.sections[4].selected,p06=plan.sections[5].selected;
check('full section coverage',()=>{assert.equal(plan.sections.length,10);assert(plan.sections.every(s=>s.selected));return {count:10}});
check('P01-06 selects a rule-backed conditional behavior',()=>{assert(p06?.id.startsWith('V56-B2-P01-06'));assert(p06?.behaviorHypothesis?.scenarioRuleId?.startsWith('P01-06:revision:'));return {id:p06.id,rule:p06.behaviorHypothesis.scenarioRuleId}});
check('P01-06 has two distinct original pillars',()=>{assert.equal(new Set(p06.sourceIds.map(x=>x.split(':')[1])).size,2);assert.equal(p06.sourceIds.length,2);return {sourceIds:p06.sourceIds}});
check('P01-05 first-choice and P01-06 revision have distinct triggers',()=>{assert(p05?.behaviorHypothesis);assert.notEqual(p05.behaviorHypothesis.trigger,p06.behaviorHypothesis.trigger);assert(/이미|진행|선택한|합의/.test(p06.behaviorHypothesis.trigger));assert(!/이미|진행|선택한|합의/.test(p05.behaviorHypothesis.trigger));return {firstChoice:p05.behaviorHypothesis.trigger,revision:p06.behaviorHypothesis.trigger}});
check('P01-06 has explicit new-information, revision and counter-condition',()=>{const h=p06.behaviorHypothesis;assert(h.observableBehavior.includes('바꿀지')||h.observableBehavior.includes('수정할지')||h.observableBehavior.includes('조정할지'));assert(h.counterCondition.length>25);assert(h.possibleMotive===null);return {behavior:h.observableBehavior,counter:h.counterCondition}});
check('P01-06 candidate remains canonical and unaltered',()=>{assert(verifyGeneratedBehaviorContract(sample,p06,canonicalBehaviorCandidates(sample)))});
check('tampering P01-06 behavior with same evidence is rejected',()=>{const fake={...p06,behaviorHypothesis:{...p06.behaviorHypothesis,observableBehavior:'상대 마음을 모두 읽고 후회하지 않는 완벽한 결정을 내림'}};assert(!verifyGeneratedBehaviorContract(sample,fake,canonicalBehaviorCandidates(sample)))});
check('no revision family produces no revision candidates',()=>{const clone=structuredClone(sample);const mods=new Set(['식신','상관','정인','편인']);for(const pos of ['year','month','day','hour']){const stem=clone.tenGods.value.heavenlyStems[pos];if(stem&&mods.has(stem.korean))stem.korean='비견';for(const h of clone.tenGods.value.hiddenStems[pos]||[])if(mods.has(h.tenGod.korean))h.tenGod.korean='비견'}const c=generateConditionalBehaviorCandidates(clone).filter(x=>x.sectionId==='P01-06');assert.equal(c.length,0)});
check('no commitment family produces no revision candidates',()=>{const clone=structuredClone(sample);const mods=new Set(['비견','겁재','정관','편관','정재','편재']);for(const pos of ['year','month','day','hour']){const stem=clone.tenGods.value.heavenlyStems[pos];if(stem&&mods.has(stem.korean))stem.korean='정인';for(const h of clone.tenGods.value.hiddenStems[pos]||[])if(mods.has(h.tenGod.korean))h.tenGod.korean='정인'}const c=generateConditionalBehaviorCandidates(clone).filter(x=>x.sectionId==='P01-06');assert.equal(c.length,0)});
check('V7 leaves prior P01-04 expression choice intact',()=>{assert(plan.sections[3].selected?.id.startsWith('V56-B2-P01-04'))});
check('V7 P01-06 writer brief gets rule-backed scenario',()=>{const section=brief.sections[5];assert.equal(section.status,'READY_FOR_REVIEW');assert.equal(section.primary.behaviorHypothesis.scenarioRuleId,p06.behaviorHypothesis.scenarioRuleId);assert(brief.instructions.some(s=>s.includes('P01-05')&&s.includes('P01-06')))});
check('repeated ten-god names require distinct chapter roles and a verified strength link',()=>{
 const reused=new Map();for(const sec of plan.sections){const h=sec.selected?.behaviorHypothesis;if(!h)continue;
 const entries=reused.get(h.semanticPairKey)||[];entries.push(sec);reused.set(h.semanticPairKey,entries)}
 for(const entries of reused.values())if(entries.length>1){
   assert(entries.some(s=>['P01-09','P01-10'].includes(s.sectionId)), 'unjustified reuse of a god-name pair');
   const keys=entries.map(s=>s.selected.behaviorHypothesis.scenarioRuleId||s.sectionId);
   assert.equal(new Set(keys).size,keys.length,'same behavior rule repeated');
   for(const e of entries.filter(s=>s.sectionId==='P01-10'))assert.equal(e.selected.behaviorHypothesis.linkedStrengthCandidateId,plan.sections[8].selected?.id);
 }
 return {reusedPairs:[...reused].filter(([,entries])=>entries.length>1).length};
});
check('change files parse as TypeScript',()=>{for(const file of ['src/lib/saju/ai-interpretation/personality-behavior.v2.ts','src/lib/saju/ai-interpretation/personality-editorial.v1.ts','tests/personality-revision.v7.spec.ts']){const src=fs.readFileSync(path.join(root,file),'utf8');const result=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file)}});
check('second run deterministic',()=>{const repeat=selectPersonalityInterpretations(sample);assert.deepEqual(repeat.sections.map(x=>x.selected?.id),plan.sections.map(x=>x.selected?.id))});
const summary={testType:'dependency-free targeted runtime, not Vitest / real AI / full build',tests:checks.length,passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,overlapReviews:plan.audit.semanticOverlapReviews,chosen:plan.sections.map(s=>({section:s.sectionId,id:s.selected?.id,structured:!!s.selected?.behaviorHypothesis})),checks};
fs.writeFileSync(path.join(root,'docs/v7_offline_results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({tests:summary.tests,passed:summary.passed,failed:summary.failed,overlapPairs:summary.overlapReviews.length,p06:p06?.id,structured:summary.chosen.filter(x=>x.structured).length},null,2));if(summary.failed)process.exitCode=1;
