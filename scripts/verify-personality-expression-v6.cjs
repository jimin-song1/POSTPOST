const Module=require('node:module'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const old=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return old.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {generateConditionalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-behavior.v2.ts');
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {verifyGeneratedBehaviorContract,canonicalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const sample=require(root+'/samples/SYNTHETIC_CORE_001.json').response;
const results=[];function check(name,fn){try {const data=fn();results.push({name,status:'PASS',...(data?{detail:data}:{})});}catch(e){results.push({name,status:'FAIL',error:String(e.stack||e)});}}
const plan=selectPersonalityInterpretations(sample);
const p04=plan.sections[3].selected;
check('P01-04 selects structured output-based hypothesis',()=>{assert(p04?.id?.startsWith('V56-B2-P01-04')); assert.equal(p04.behaviorHypothesis.inferenceLevel,'CONDITIONAL_INTERPRETATION');assert(p04.behaviorHypothesis.scenarioRuleId.startsWith('P01-04:'));assert(p04.behaviorHypothesis.semanticPairKey.includes('식신')||p04.behaviorHypothesis.semanticPairKey.includes('상관'));assert(verifyGeneratedBehaviorContract(sample,p04,canonicalBehaviorCandidates(sample))); return {id:p04.id,sourceIds:p04.sourceIds,claim:p04.claim}});
check('P01-04 pair has output plus a genuinely distinct family',()=>{const gods=p04.behaviorHypothesis.semanticPairKey.split('|'); assert(gods.length===2); assert(gods.includes('식신')||gods.includes('상관'));assert.equal(new Set(p04.sourceIds).size,2); return {pair:gods,scene:p04.behaviorHypothesis.observableBehavior}});
check('no output signal means no P01-04 B2 candidate',()=>{const clone=structuredClone(sample), gods=new Set(['식신','상관']);for(const pos of ['year','month','day','hour']){let stem=clone.tenGods.value.heavenlyStems[pos];if(stem&&gods.has(stem.korean))stem.korean='정인';for(const h of clone.tenGods.value.hiddenStems[pos]||[])if(gods.has(h.tenGod.korean))h.tenGod.korean='정인';}assert.equal(generateConditionalBehaviorCandidates(clone).filter(c=>c.sectionId==='P01-04').length,0);});
check('tampered behavioral meaning fails canonical contract',()=>{const candidate=generateConditionalBehaviorCandidates(sample).find(c=>c.id===p04.id);const bad={...candidate,behaviorHypothesis:{...candidate.behaviorHypothesis,observableBehavior:'처음 본 사람의 거짓말을 단번에 알아내는 능력'}};assert.equal(verifyGeneratedBehaviorContract(sample,bad,canonicalBehaviorCandidates(sample)),false);});
check('normal behavior passes canonical contract',()=>{assert.equal(verifyGeneratedBehaviorContract(sample,p04,canonicalBehaviorCandidates(sample)),true)});
check('all ten sections still have selected candidates',()=>{assert.equal(plan.sections.length,10);assert.equal(plan.sections.filter(s=>!!s.selected).length,10);return {behaviorCount:plan.sections.filter(s=>!!s.selected?.behaviorHypothesis).length,legacyFallbacks:plan.sections.filter(s=>!s.selected?.behaviorHypothesis).map(s=>s.sectionId)}});
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
check('writer brief receives P01-04 hypothesis',()=>{const brief=createPersonalityWritingBrief(plan);const chapter=brief.sections[3];assert(chapter.primary?.behaviorHypothesis);assert.equal(chapter.primary.behaviorHypothesis.possibleMotive,null);assert(chapter.primary.claim.includes('가설'))});
check('missing ten-gods has no conditional behavior candidate',()=>{const m=structuredClone(sample);m.tenGods={status:'not_implemented',value:null,evidence:[]};assert.deepEqual(generateConditionalBehaviorCandidates(m),[])});
check('TypeScript syntax check of modified/new code',()=>{const files=['src/lib/saju/ai-interpretation/personality-behavior.v2.ts','tests/personality-expression.v6.spec.ts'];for(const file of files){const src=fs.readFileSync(path.join(root,file),'utf8');const out=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});assert.equal((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file)}});
const summary={testType:'offline targeted runtime, NOT vitest or full app build',tests:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,overlapReviews:plan.audit.semanticOverlapReviews.length,selected:plan.sections.map(s=>({section:s.sectionId,candidate:s.selected?.id??null,behavior:!!s.selected?.behaviorHypothesis})),results};
fs.writeFileSync(path.join(root,'docs','v6_offline_results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({tests:summary.tests,passed:summary.passed,failed:summary.failed,overlapReviews:summary.overlapReviews,selected04:p04?.id},null,2));if(summary.failed)process.exit(1);
