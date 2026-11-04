'use strict';
/** Date-derived natal charts using POSTPOST calculateSaju with an offline astronomical solar-term adapter. 
 * The SWISS ephemeris input REPLACES the unavailable `lunisolar-ephemeris` JPL provider for this integration test.
 * It must not be represented as the exact production pipeline or proof of psychological accuracy.
 */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
let ts; try { ts=require('typescript'); } catch (_) {ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');}
const root=path.resolve(__dirname,'..');
const ephem=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/solar_terms_swiss.json'),'utf8'));
const origResolve=Module._resolveFilename,origLoad=Module._load;
Module._resolveFilename=function(name,parent,...rest){return origResolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
Module._load=function(name,parent,...rest){
 if(name==='lunisolar-ephemeris')return {FIRST_YEAR:1985,LAST_YEAR:2109, Instant:{toDate:v=>new Date(v)},solarTermsOfYear:year=>{
   const data=ephem[String(year)];if(!data)throw new Error('Missing solar year '+year);
   return data.map((dt,index)=>({index,isJie:index%2===0,instant:dt}));
 }};
 return origLoad.call(this,name,parent,...rest);
};
require.extensions['.ts']=function(mod,file){const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});mod._compile(r.outputText,file)};
const {calculateSaju}=require(root+'/src/lib/saju/engine.ts');
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {PERSONALITY_SECTIONS}=require(root+'/src/lib/saju/ai-interpretation/personality-candidates.v1.ts');
const {generateConditionalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-behavior.v2.ts');
const records=[
 {id:'RC01',gender:'female',birthDate:'1989-08-15',birthTime:'13:15'},
 {id:'RC02',gender:'male',birthDate:'1992-03-18',birthTime:'09:20'},
 {id:'RC03',gender:'female',birthDate:'1995-09-17',birthTime:'08:40'},
 {id:'RC04',gender:'male',birthDate:'1998-12-17',birthTime:'20:10'},
 {id:'RC05',gender:'female',birthDate:'2001-01-25',birthTime:'10:30'},
 {id:'RC06',gender:'male',birthDate:'2003-05-15',birthTime:'16:20'},
 {id:'RC07',gender:'female',birthDate:'1986-11-03',birthTime:'23:10'},
 {id:'RC08',gender:'male',birthDate:'1990-06-28',birthTime:'06:35'},
 {id:'RC09',gender:'female',birthDate:'1994-02-09',birthTime:'18:55'},
 {id:'RC10',gender:'male',birthDate:'1997-07-24',birthTime:'11:05'},
 {id:'RC11',gender:'female',birthDate:'2000-10-31',birthTime:'02:45'},
 {id:'RC12',gender:'male',birthDate:'2005-04-07',birthTime:'14:25'},
];
const output=[],all=[];
for(const t of records){
 const input={name:t.id,gender:t.gender,calendarType:'solar',birthDate:t.birthDate,birthTime:t.birthTime,birthTimeKnown:true,birthCountry:'KR',birthCityKnown:true,birthCity:'서울'};
 console.error('calculate',t.id);
 let analysis=calculateSaju(input);
 const plan=selectPersonalityInterpretations(analysis);
 const brief=createPersonalityWritingBrief(plan);
 if(t.id==='RC11'){
   const sourceCandidates=generateConditionalBehaviorCandidates(analysis).filter(x=>x.sectionId==='P01-09');
   const section9=plan.sections.find(x=>x.sectionId==='P01-09');
   const report={testCase:t.id, section:'P01-09', generatedCount:sourceCandidates.length, selectedId:section9?.selected?.id||null, selectedStructured:!!section9?.selected?.behaviorHypothesis,
     candidates:sourceCandidates.map(c=>({id:c.id,sourceIds:c.sourceIds,scenarioRuleId:c.behaviorHypothesis?.scenarioRuleId,action:c.behaviorHypothesis?.observableBehavior,assessment:section9?.assessments.find(a=>a.candidateId===c.id)||null})),
     chapter10:plan.sections.find(x=>x.sectionId==='P01-10')?.selected?.id||null};
   fs.mkdirSync(path.join(root,'docs/v21_diagnostics'),{recursive:true});
   fs.writeFileSync(path.join(root,'docs/v21_diagnostics/rc11_strength_candidates.json'),JSON.stringify(report,null,2)+'\n');
 }

 const sections=plan.sections.map(s=>{
  const chosen=s.selected;
  const decision=brief.sections.find(x=>x.id===s.sectionId);
  const obj={caseId:t.id,id:s.sectionId,title:PERSONALITY_SECTIONS.find(x=>x.id===s.sectionId)?.title||s.sectionId, candidateId:chosen?.id||'',type:chosen?.behaviorHypothesis?'structured':chosen?'legacy':'empty',status:decision?.status||'unknown',claim:chosen?.claim||'',sourceIds:chosen?.sourceIds||[],evidenceIds:chosen?.evidenceIds||[],trigger:chosen?.behaviorHypothesis?.trigger||'',action:chosen?.behaviorHypothesis?.observableBehavior||'',scenarioRuleId:chosen?.behaviorHypothesis?.scenarioRuleId||'',basis:chosen?.behaviorHypothesis?.decisionBasis||'',counter:chosen?.behaviorHypothesis?.counterCondition||'',semantic:chosen?.behaviorHypothesis?.semanticFamilyPairKey||'',flags:s.assessments.find(a=>a.candidateId===chosen?.id)?.flags||[]};all.push(obj);return obj;
 });
 const sum={id:t.id,gender:t.gender,birthDate:t.birthDate,birthTime:t.birthTime,pillars:Object.fromEntries(['year','month','day','hour'].map(k=>[k,analysis.pillars[k].hanja])),dayMaster:analysis.dayMaster,structure:analysis.structure.primary?.type||null,strength:analysis.strength?.adjusted?.level||analysis.strength?.level||null,selected:sections.filter(x=>x.type!=='empty').length,structured:sections.filter(x=>x.type==='structured').length,ready:sections.filter(x=>x.status==='READY_FOR_REVIEW').length,absent:sections.filter(x=>x.type==='empty').map(x=>x.id),semanticReviewWarnings:plan.audit.semanticOverlapReviews,sections};
 output.push(sum);
 console.error(t.id,JSON.stringify({pillars:sum.pillars,selected:sum.selected,structured:sum.structured,ready:sum.ready}));
}
const counter=(list,key)=>Object.entries(list.reduce((o,x)=>(o[x[key]]=(o[x[key]]||0)+1,o),{})).sort((a,b)=>b[1]-a[1]);
const behavioral=all.filter(x=>x.type==='structured');
const duplicateTriggers=counter(behavioral,'trigger').filter(([k,v])=>v>1);
const duplicateAction=counter(behavioral,'action').filter(([k,v])=>v>1);
const qualityAlerts=PERSONALITY_SECTIONS.flatMap(sec=>{const arr=all.filter(x=>x.id===sec.id&&x.type==='structured');if(arr.length<3)return [];const variety=new Set(arr.map(x=>x.action)).size;const ratio=variety/arr.length;return ratio<0.6?[{code:'REPEATED_BEHAVIOR_TEMPLATE',sectionId:sec.id,unique:variety,count:arr.length,ratio}]:[]});
const withinChartOverlap=output.map(c=>({caseId:c.id, collisions:c.sections.filter(s=>s.type==='structured').flatMap((s,i,a)=>a.slice(i+1).filter(t=>t.type==='structured' && (s.action===t.action || (s.semantic && s.semantic===t.semantic))).map(t=>({a:s.id,b:t.id,exactAction:s.action===t.action,sharedSemantic:s.semantic===t.semantic,semantic:s.semantic}))) })).filter(c=>c.collisions.length);
const rc11Report=JSON.parse(fs.readFileSync(path.join(root,'docs/v21_diagnostics/rc11_strength_candidates.json'),'utf8'));
assert.equal(rc11Report.candidates.length,rc11Report.generatedCount);
assert(rc11Report.candidates.every(c=>c.assessment && c.assessment.decision==='REJECTED'), 'RC11 rejection trace changed; review required');
const summary={withinChartOverlap,qualityAlerts, testType:'12 birth date/time derived anonymized synthetic people; Swiss Ephemeris solar terms injected into POSTPOST engine',accuracyDisclaimer:'Dates are fabricated for testing. Behavior is classical-symbolic hypothesis, not verified personal attributes. Replacement Swiss terms, not original JPL provider.',total:all.length,selected:all.filter(x=>x.type!=='empty').length,structured:behavioral.length,ready:all.filter(x=>x.status==='READY_FOR_REVIEW').length,empty:all.filter(x=>x.type==='empty').length,legacy:all.filter(x=>x.type==='legacy').length,uniqueBehavioralActions:new Set(behavioral.map(x=>x.action)).size,uniqueTriggers:new Set(behavioral.map(x=>x.trigger)).size,duplicateTriggers,duplicateAction,perSection:PERSONALITY_SECTIONS.map(s=>({id:s.id,title:s.title,structured:all.filter(x=>x.id===s.id&&x.type==='structured').length,ready:all.filter(x=>x.id===s.id&&x.status==='READY_FOR_REVIEW').length,actions:new Set(all.filter(x=>x.id===s.id&&x.action).map(x=>x.action)).size})),charts:output};
const folder=path.join(root,'docs','v17_cross_chart_audit');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'twelve_date_charts.json'),JSON.stringify(summary,null,2)+'\n');
const quote=s=>'"'+String(s??'').replace(/"/g,'""').replace(/\n/g,' ')+'"';
const columns=['caseId','id','title','type','status','candidateId','semantic','claim','trigger','action','scenarioRuleId','basis','counter','sourceIds','evidenceIds','flags'];
fs.writeFileSync(path.join(folder,'one_hundred_twenty_slots.csv'),'\ufeff'+columns.join(',')+'\n'+all.map(x=>columns.map(k=>quote(Array.isArray(x[k])?x[k].join(' | '):x[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify({withinChartOverlap:summary.withinChartOverlap,total:summary.total,selected:summary.selected,structured:summary.structured,ready:summary.ready,empty:summary.empty,legacy:summary.legacy,uniqueBehavioralActions:summary.uniqueBehavioralActions,uniqueTriggers:summary.uniqueTriggers,duplicateTriggers:summary.duplicateTriggers.length,duplicateAction:summary.duplicateAction.length,qualityAlerts:summary.qualityAlerts,perSection:summary.perSection.map(x=>[x.id,x.structured,x.ready])},null,2));
