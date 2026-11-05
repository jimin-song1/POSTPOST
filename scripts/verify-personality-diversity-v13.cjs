'use strict';
/** Controlled mutation probes for V11 personality selection; not real date-derived charts. */
const Module=require('node:module'); const fs=require('node:fs'); const path=require('node:path'); const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const orig=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return orig.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {getTenGod}=require(root+'/src/lib/saju/interpretation/ten-gods.ts');
const {HIDDEN_STEMS_V1}=require(root+'/src/rules/hidden-stems.v1.ts');
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {canonicalBehaviorCandidates,verifyGeneratedBehaviorContract,behavioralOverlap}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const baseline=require(root+'/samples/SYNTHETIC_CORE_001.json').response;
const specs=[
 {id:'B00_original',stem:['甲','丁','乙','壬'],branch:['辰','卯','未','午']},
 {id:'B01_peer_heavy',stem:['甲','乙','乙','甲'],branch:['寅','卯','未','亥']},
 {id:'B02_output_heavy',stem:['丙','丁','乙','丙'],branch:['巳','午','未','寅']},
 {id:'B03_wealth_heavy',stem:['戊','己','乙','戊'],branch:['辰','丑','未','戌']},
 {id:'B04_officer_heavy',stem:['庚','辛','乙','庚'],branch:['申','酉','未','丑']},
 {id:'B05_resource_heavy',stem:['壬','癸','乙','壬'],branch:['亥','子','未','申']},
 {id:'B06_peer_wealth',stem:['甲','己','乙','戊'],branch:['卯','辰','未','丑']},
 {id:'B07_output_officer',stem:['丁','庚','乙','辛'],branch:['午','申','未','酉']},
 {id:'B08_resource_output',stem:['癸','丙','乙','丁'],branch:['子','巳','未','午']},
 {id:'B09_wealth_officer',stem:['己','庚','乙','辛'],branch:['辰','申','未','酉']},
 {id:'B10_resource_peer',stem:['壬','甲','乙','癸'],branch:['亥','寅','未','子']},
 {id:'B11_mixed',stem:['辛','戊','乙','丁'],branch:['酉','辰','未','巳']},
];
function chart(spec){
 const a=structuredClone(baseline);
 a.person.name='합성 시험'; a.birthInput.name='합성 시험';
 const pos=['year','month','day','hour'];
 for(let i=0;i<4;i++){
   const p=pos[i],stem=spec.stem[i],branch=spec.branch[i];
   a.pillars[p].stem=stem;a.pillars[p].branch=branch;a.pillars[p].hanja=stem+branch;
   a.tenGods.value.heavenlyStems[p]=getTenGod(a.dayMaster,stem);
   const hidden=HIDDEN_STEMS_V1.branches[branch]; assert(hidden,branch);
   a.tenGods.value.hiddenStems[p]=['mainQi','middleQi','residualQi'].filter(k=>hidden[k]).map(role=>({role,stem:hidden[role],tenGod:getTenGod(a.dayMaster,hidden[role])}));
 }
 // Recombination invalidates all derived full-chart calculations: explicitly neutralize them.
 a.relations.status='not_implemented'; a.relations.evidence=[];a.relations.transformation.evaluations=[];
 a.structure.status='not_implemented';a.structure.primary=null;a.structure.qualityEvaluation.evaluationScope='UNAVAILABLE';
 a.strength.adjusted.status='not_implemented';a.strength.adjusted.level=null;
 a.usefulGods.synthesis.status='not_implemented';
 return a;
}

const selectedPlans=specs.map(sp=>({spec:sp,plan:selectPersonalityInterpretations(chart(sp))}));
const rows=selectedPlans.flatMap(({spec,plan})=>plan.sections.map(sec=>({case:spec.id,section:sec.sectionId,candidateId:sec.selected?.id||'',type:sec.selected?.behaviorHypothesis?'structured':sec.selected?'legacy':'empty',trigger:sec.selected?.behaviorHypothesis?.trigger||'',family:sec.selected?.behaviorHypothesis?.semanticFamilyPairKey||'',sourceIds:sec.selected?.sourceIds||[],flags:sec.assessments.find(x=>x.candidateId===sec.selected?.id)?.flags||[]})));
const get=(caseId,id)=>rows.find(r=>r.case===caseId&&r.section==='P01-'+id);
const checks=[];function check(name,fn){try{const detail=fn();checks.push({name,ok:true,detail})}catch(e){checks.push({name,ok:false,error:String(e.stack||e)})}}
check('same 12 synthetic cases and 120 slots',()=>{assert.equal(selectedPlans.length,12);assert.equal(rows.length,120)});
check('all selected candidates retain canonical source contracts',()=>{
 for(const {spec,plan} of selectedPlans){const a=chart(spec),canon=canonicalBehaviorCandidates(a);for(const sec of plan.sections)if(sec.selected)assert(verifyGeneratedBehaviorContract(a,sec.selected,canon),spec.id+':'+sec.sectionId)}
});
check('current selection counts are bounded by valid evidence, not historical snapshots',()=>{
 const n=rows.filter(r=>r.type!=='empty').length, structured=rows.filter(r=>r.type==='structured').length;assert(n>=110&&n<=120);assert(structured<=n);return {selected:n,structured}
});
check('structured weaknesses require a structured linked strength',()=>{
 for(const {plan} of selectedPlans){const nine=plan.sections.find(s=>s.sectionId==='P01-09').selected,ten=plan.sections.find(s=>s.sectionId==='P01-10').selected;if(ten?.behaviorHypothesis){assert(nine?.behaviorHypothesis);assert.equal(ten.behaviorHypothesis.linkedStrengthCandidateId,nine.id)}}
});
check('resource heavy B05 does not fabricate unsupported linked weakness',()=>{
 const a=get('B05_resource_heavy','09'),b=get('B05_resource_heavy','10');if(a.type!=='structured')assert.equal(b.type,'empty');return {strength:a.type,weakness:b.type};
});
check('one family B03 cannot manufacture distinct evidence',()=>{
 assert.equal(get('B03_wealth_heavy','09').type,'legacy');assert.equal(get('B03_wealth_heavy','10').type,'empty')
});
check('B10 selected pair has canonical trace and strength-to-weakness link',()=>{
 const a=get('B10_resource_peer','09'),b=get('B10_resource_peer','10');assert.equal(a.type,'structured');assert.equal(b.type,'structured');const p=selectedPlans.find(x=>x.spec.id==='B10_resource_peer').plan;const strength=p.sections.find(s=>s.sectionId==='P01-09').selected,weak=p.sections.find(s=>s.sectionId==='P01-10').selected;assert.equal(weak.behaviorHypothesis.linkedStrengthCandidateId,strength.id);assert(p.sections.find(s=>s.sectionId==='P01-09').assessments.some(x=>x.flags.includes('SEMANTIC_OVERLAP')));
});
check('exact natal source pair reuse in strength requires a distinct actual scene',()=>{
 let reused=0;
 for(const {plan} of selectedPlans){const seen=new Map();for(const s of plan.sections){const c=s.selected;if(!c)continue;
  const key=c.sourceIds.filter(x=>x.startsWith('PILLAR:')).slice().sort().join('|');if(!key)continue;
  const old=seen.get(key);if(old&&s.sectionId==='P01-09'&&c.behaviorHypothesis){
   assert(c.behaviorHypothesis);
   const selectedAudit=s.assessments.find(a=>a.candidateId===c.id);
   assert(selectedAudit?.flags.includes('REUSED_SOURCE_PAIR'));
   if(old.behaviorHypothesis) {
     assert(!behavioralOverlap(c,old).nearDuplicate);
   } else {
     assert(selectedAudit.flags.includes('SCENE_COMPARISON_UNAVAILABLE'));
     const brief=createPersonalityWritingBrief(plan);
     assert.equal(brief.sections.find(x=>x.id==='P01-09').status,'DO_NOT_GENERATE');
     assert.equal(brief.sections.find(x=>x.id==='P01-10').status,'DO_NOT_GENERATE');
   }
   reused++;
  }
  if(!old)seen.set(key,c);
 }}assert(reused>=1);return {reusedDistinctScenes:reused}
});
check('all structured P01-09 scenes match symbolic family rule',()=>{
 for(const {plan} of selectedPlans){const c=plan.sections.find(s=>s.sectionId==='P01-09').selected;if(!c?.behaviorHypothesis)continue;
  assert(c.behaviorHypothesis.scenarioRuleId.startsWith('P01-09:'+c.behaviorHypothesis.semanticFamilyPairKey))
 }
});
check('every structured weakness is linked to the exact selected strength and one shared position',()=>{
 for(const {plan} of selectedPlans){const a=plan.sections.find(s=>s.sectionId==='P01-09').selected,b=plan.sections.find(s=>s.sectionId==='P01-10').selected;
  if(!b?.behaviorHypothesis)continue;
  assert(a?.behaviorHypothesis);assert.equal(b.behaviorHypothesis.linkedStrengthCandidateId,a.id);
  assert.equal(a.sourceIds.filter(id=>b.sourceIds.includes(id)).length,1);
  const brief=createPersonalityWritingBrief(plan),w=brief.sections.find(s=>s.id==='P01-10');assert.equal(w.primary.linkedStrengthContext.candidateId,a.id)
 }
});
check('weakness trigger is no longer one fixed text',()=>{
 const triggers=new Set(rows.filter(r=>r.section==='P01-10'&&r.type==='structured').map(r=>r.trigger));assert(triggers.size>=3);return {differentTriggers:triggers.size}
});
check('source pair reuse cannot be mistaken for independent corroboration',()=>{
 for(const {plan} of selectedPlans){for(const s of plan.sections){const c=s.selected;if(!c)continue;
  const flags=s.assessments.find(a=>a.candidateId===c.id)?.flags||[];
  if(flags.includes('REUSED_SOURCE_PAIR'))assert(s.assessments.find(a=>a.candidateId===c.id).reasons.some(x=>x.includes('독립적인 명리 근거가 추가된 것은 아님') || x.includes('자동 발행 금지')))
 }}
});
check('editorial warnings remain visible for unresolved overlap',()=>{
 const r=selectedPlans.flatMap(x=>x.plan.audit.semanticOverlapReviews);assert(r.length>=1);return {warnings:r.length}
});
check('deterministic source selection',()=>{for(const {spec,plan} of selectedPlans){const again=selectPersonalityInterpretations(chart(spec));assert.deepEqual(again.sections.map(x=>x.selected?.id),plan.sections.map(x=>x.selected?.id))}});
check('changed TS sources pass transpile parse',()=>{
 for(const f of ['src/lib/saju/ai-interpretation/personality-editorial.v1.ts','src/lib/saju/ai-interpretation/personality-behavior.v2.ts']){const t=ts.transpileModule(fs.readFileSync(path.join(root,f),'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});assert(!(t.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),f)}
});
const writingReadyStrength=selectedPlans.filter(x=>createPersonalityWritingBrief(x.plan).sections.find(s=>s.id==='P01-09')?.status==='READY_FOR_REVIEW').length;
const writingReadyWeakness=selectedPlans.filter(x=>createPersonalityWritingBrief(x.plan).sections.find(s=>s.id==='P01-10')?.status==='READY_FOR_REVIEW').length;
const summary={suite:'V13 focused offline regression',fixtureType:'synthetic ten-god signal recombination, not independent calendar calculation or personality accuracy',selected:rows.filter(r=>r.type!=='empty').length,structured:rows.filter(r=>r.type==='structured').length,strength:rows.filter(r=>r.section==='P01-09'&&r.type==='structured').length,weakness:rows.filter(r=>r.section==='P01-10'&&r.type==='structured').length,writingReadyStrength,writingReadyWeakness,passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks,cases:selectedPlans.map(x=>({id:x.spec.id,empty:x.plan.audit.emptySections,overlapWarnings:x.plan.audit.semanticOverlapReviews.length})),rows};
fs.writeFileSync(path.join(root,'docs/v13_personality_diversity_results.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,selected:summary.selected,structured:summary.structured,strength:summary.strength,weakness:summary.weakness,writingReadyStrength:summary.writingReadyStrength,writingReadyWeakness:summary.writingReadyWeakness,failedNames:checks.filter(x=>!x.ok).map(x=>x.name)},null,2));if(summary.failed)process.exitCode=1;
