'use strict';
/** Synthetic, dependency-light editorial regression. Not real natal psychology or AI generation. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const Module=require('node:module');
const root=path.resolve(__dirname,'..');
let ts; try {ts=require(process.env.TYPESCRIPT_MODULE||'typescript')} catch {ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const old=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return old.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {behavioralOverlap,canonicalBehaviorCandidates,verifyGeneratedBehaviorContract}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const sample=require(root+'/samples/SYNTHETIC_CORE_001.json').response;
const cross=require(root+'/docs/v11_cross_chart/results.json');
const checks=[];
function check(name,fn){try{const value=fn();checks.push({name,passed:true,...(value?{details:value}:{})})}catch(e){checks.push({name,passed:false,error:String(e)})}}
check('all 12 synthetic cases executed without crash',()=>{assert.equal(cross.cases.length,12);assert.equal(cross.failures.length,0)});
check('strength chapter 09 now has supported structured scenes in different signal combinations',()=>{
 const s=cross.perSection.find(s=>s.id==='P01-09');assert(s.behavior>=8);assert(s.distinctTriggers>=3);return {behavior:s.behavior,triggers:s.distinctTriggers};
});
check('weakness chapter 10 only follows a linked structured strength',()=>{
 const rows=cross.sections.filter(s=>s.id==='P01-10'&&s.behavior);
 const strengths=new Map(cross.sections.filter(s=>s.id==='P01-09').map(s=>[s.case,s]));
 assert(rows.length>=8);
 for(const row of rows){const strong=strengths.get(row.case);assert(strong?.behavior);assert(row.sourceIds);}
 return {behavior:rows.length};
});
check('public/private, choice, and pressure triggers are not one fixed sentence',()=>{
 for(const id of ['P01-02','P01-05','P01-08'])assert(cross.perSection.find(s=>s.id===id).distinctTriggers>=3,id);
 return cross.perSection.filter(s=>['P01-02','P01-05','P01-08'].includes(s.id)).map(s=>({section:s.id,triggers:s.distinctTriggers}));
});
check('every selected source ID still agrees with synthetic source positions',()=>{assert(cross.cases.every(c=>c.supported===c.selected));});
const p=selectPersonalityInterpretations(sample), brief=createPersonalityWritingBrief(p);
check('original reference case still returns ten selected behavior hypotheses',()=>{assert.equal(p.sections.length,10);assert(p.sections.every(s=>s.selected?.behaviorHypothesis));});
check('strength hypothesis retains the exact natal candidate contract',()=>{
 const canonical=canonicalBehaviorCandidates(sample);
 for(const section of p.sections)assert(verifyGeneratedBehaviorContract(sample,section.selected,canonical),section.sectionId);
});
check('weakness linkage reuses exactly one strength position and carries the selected strength to the brief',()=>{
 const strength=p.sections[8].selected,weak=p.sections[9].selected;
 assert(weak?.behaviorHypothesis?.linkedStrengthCandidateId===strength.id);
 assert.equal(weak.sourceIds.filter(x=>strength.sourceIds.includes(x)).length,1);
 const w=brief.sections[9].primary.linkedStrengthContext;
 assert.equal(w.candidateId,strength.id);
 assert.equal(w.behavior,strength.behaviorHypothesis.observableBehavior);
});
check('strength does not repeat the pre-decision choice scene',()=>{
 assert(!behavioralOverlap(p.sections[4].selected,p.sections[8].selected).nearDuplicate);
});
check('unresolved overlap reports remain visible rather than silently disappearing',()=>{
 const selected=new Set(p.sections.map(s=>s.selected?.id));
 for(const r of p.audit.semanticOverlapReviews){assert(selected.has(r.priorId));assert(selected.has(r.candidateId))}
 return {alerts:p.audit.semanticOverlapReviews.length};
});
check('full section coverage is not falsely claimed across all synthetic cases',()=>{
 assert(cross.cases.some(x=>x.empty>0));assert(cross.cases.some(x=>x.behaviorReady<10));
});
check('edited TypeScript files contain no syntax errors',()=>{
 for(const name of ['src/lib/saju/ai-interpretation/personality-behavior.v2.ts','src/lib/saju/ai-interpretation/personality-editorial.v1.ts']){
  const code=fs.readFileSync(path.join(root,name),'utf8');
  const result=ts.transpileModule(code,{fileName:name,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,name);
 }
});
check('selection remains deterministic',()=>{
 const b=selectPersonalityInterpretations(sample);
 assert.deepEqual(b.sections.map(s=>s.selected?.id),p.sections.map(s=>s.selected?.id));
});
const result={note:'synthetic rule coverage, not personality accuracy; legacy checks for god-pair uniqueness replaced by constrained chapter-role reuse',checks,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,stats:{selected:cross.cases.reduce((n,c)=>n+c.selected,0),behaviorReady:cross.cases.reduce((n,c)=>n+c.behaviorReady,0),strength:cross.perSection.find(x=>x.id==='P01-09').behavior,weakness:cross.perSection.find(x=>x.id==='P01-10').behavior,alerts:p.audit.semanticOverlapReviews}};
fs.writeFileSync(path.join(root,'docs/v12_diversity_results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({tests:checks.length,passed:result.passed,failed:result.failed,...result.stats},null,2));if(result.failed)process.exitCode=1;
