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
const {canonicalBehaviorCandidates,verifyGeneratedBehaviorContract}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
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
function pct(v,d){return d?Math.round(v/d*1000)/10:0}
const cases=[],sections=[], failures=[];
for(const sp of specs){
 let a,plan,brief;try{a=chart(sp);plan=selectPersonalityInterpretations(a);brief=createPersonalityWritingBrief(plan)}catch(e){failures.push({case:sp.id,error:String(e.stack||e)});continue}
 const canon=canonicalBehaviorCandidates(a);let supported=0,selected=0,behaviorReady=0;
 const t=plan.sections.find(s=>s.sectionId==='P01-10'), st=plan.sections.find(s=>s.sectionId==='P01-09'); const counter={};for(const x of t.assessments){for(const f of x.flags)counter[f]=(counter[f]||0)+1;}console.log(sp.id,'strength',st.selected?.id,'weak',t.selected?.id,'counts',JSON.stringify(counter),'validlink',t.assessments.filter(v=>!v.flags.includes('WEAKNESS_LINK_INVALID')).map(v=>[v.candidateId,v.flags.filter(f=>f!=='LOW_CONFIDENCE')]).slice(0,8));
 for(const section of plan.sections){
  const c=section.selected,h=c?.behaviorHypothesis;
  if(c)selected++; if(h)behaviorReady++;
  if(c){if(verifyGeneratedBehaviorContract(a,c,canon))supported++;else failures.push({case:sp.id,section:section.sectionId,error:'canonical claim contract mismatch'})}
  const briefSection=brief.sections.find(s=>s.id===section.sectionId);
  sections.push({case:sp.id,id:section.sectionId,selected:!!c,behavior:!!h,sourceIds:c?.sourceIds.filter(x=>x.startsWith('PILLAR:')).join('|')||'',candidateId:c?.id||'',familyPair:h?.semanticFamilyPairKey||'',scenarioRuleId:h?.scenarioRuleId||'',trigger:h?.trigger||'',observable:h?.observableBehavior||'',decisionBasis:h?.decisionBasis||'',status:briefSection?.status||'',hypothesisLevel:c?.confidence||''});
 }
 cases.push({case:sp.id,selected,behaviorReady,supported,empty:plan.audit.emptySections.length,semanticOverlap:plan.audit.semanticOverlapReviews.length,status:plan.status,stems:sp.stem.join(''),branches:sp.branch.join('')});
}
const perSection=[];
for(let i=1;i<=10;i++){
 const id='P01-'+String(i).padStart(2,'0'),rows=sections.filter(s=>s.id===id),withBeh=rows.filter(s=>s.behavior),cnt=(k)=>new Set(withBeh.map(r=>r[k])).size;
 const counts=new Map();for(const r of withBeh) counts.set(r.trigger,(counts.get(r.trigger)||0)+1);
 const most=[...counts].sort((a,b)=>b[1]-a[1])[0]||['',0];
 perSection.push({id,cases:rows.length,selected:rows.filter(r=>r.selected).length,behavior:withBeh.length,distinctCandidateIds:new Set(rows.map(r=>r.candidateId)).size,distinctSourceIds:new Set(rows.map(r=>r.sourceIds)).size,distinctFamilyPairs:cnt('familyPair'),distinctScenarioRules:cnt('scenarioRuleId'),distinctTriggers:cnt('trigger'),distinctBehaviorTexts:cnt('observable'),mostCommonTrigger:most[0],mostCommonTriggerCount:most[1],mostCommonTriggerShare:pct(most[1],withBeh.length)});
}
// Tests check contracts and deterministic data, NOT forced model accuracy or invented thresholds.
const checks=[
 ['fixtures executed',cases.length===specs.length],
 ['no crash or canonical drift',failures.length===0],
 ['every selected candidate has verified source positions',sections.filter(r=>r.selected).every(r=>r.sourceIds.split('|').filter(Boolean).length>=2)],
 ['at least two distinct ten-god explanations appear',new Set(sections.map(r=>r.familyPair).filter(Boolean)).size>1],
 ['repeated template triggers are measured',perSection.every(r=>r.mostCommonTriggerCount<=r.behavior)],
];
const result={testType:'controlled synthetic symbol recombination; not actual birthdate calculations, psychological validation, or OpenAI output',cases,perSection,failures,checks:checks.map(([name,passed])=>({name,passed})),sections};
const dir=path.join(root,'docs','v11_cross_chart');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(result,null,2)+'\n');
function csv(pathout,rows){const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';const keys=Object.keys(rows[0]||{});fs.writeFileSync(pathout,'\ufeff'+keys.map(esc).join(',')+'\n'+rows.map(r=>keys.map(k=>esc(r[k])).join(',')).join('\n')+'\n')}
csv(path.join(dir,'cases.csv'),cases);csv(path.join(dir,'per_section.csv'),perSection);csv(path.join(dir,'selected_claims.csv'),sections);
console.log(JSON.stringify({cases:cases.length,failed:failures.length,selected:cases.reduce((n,c)=>n+c.selected,0),behaviors:cases.reduce((n,c)=>n+c.behaviorReady,0),sectionStats:perSection.map(r=>({id:r.id,triggers:r.distinctTriggers,behaviors:r.distinctBehaviorTexts,mostCommonTriggerShare:r.mostCommonTriggerShare})),checks:result.checks},null,2));
if(failures.length||checks.some(([,pass])=>!pass))process.exitCode=1;
