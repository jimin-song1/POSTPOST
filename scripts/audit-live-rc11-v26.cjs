'use strict';
/** V26 read-only live chart trace: no candidate promotion and no production editor mutation. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..'),ephem=JSON.parse(fs.readFileSync(__dirname+'/fixtures/solar_terms_swiss.json','utf8'));
const resolve=Module._resolveFilename,load=Module._load;
Module._resolveFilename=function(name,parent,...rest){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
Module._load=function(name,parent,...rest){if(name==='lunisolar-ephemeris')return {FIRST_YEAR:1985,LAST_YEAR:2109,Instant:{toDate:v=>new Date(v)},solarTermsOfYear:y=>ephem[String(y)].map((dt,index)=>({index,isJie:index%2===0,instant:dt}))};return load.call(this,name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {calculateSaju}=require(root+'/src/lib/saju/engine.ts');
const {selectPersonalityInterpretations}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {generateConditionalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-behavior.v2.ts');
const {behavioralOverlap}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const chart=calculateSaju({name:'RC11',gender:'female',calendarType:'solar',birthDate:'2000-10-31',birthTime:'02:45',birthTimeKnown:true,birthCountry:'KR',birthCityKnown:true,birthCity:'서울'});
const plan=selectPersonalityInterpretations(chart),generated=generateConditionalBehaviorCandidates(chart);
const previous=plan.sections.filter(s=>s.sectionId<'P01-09'&&s.selected).map(s=>({sectionId:s.sectionId,candidate:s.selected}));
const section9=plan.sections.find(s=>s.sectionId==='P01-09'),section10=plan.sections.find(s=>s.sectionId==='P01-10');
const text=s=>String(s||'').replace(/\s+/g,' ').trim();
const normalize=s=>text(s).replace(/[.,!?~:;(){}\[\]"'“”‘’·—–|<>#*_-]/g,'');
const rows=generated.filter(c=>c.sectionId==='P01-09').map(c=>{
 const h=c.behaviorHypothesis;assert(h && h.trigger && h.observableBehavior && h.decisionBasis,'Live structured candidate incomplete: '+c.id);
 const pairs=previous.map(p=>{const b=p.candidate.behaviorHypothesis;const old=behavioralOverlap(c,p.candidate);const exactAction=!!b&&normalize(h.observableBehavior)===normalize(b.observableBehavior);
 const exactBasis=!!b&&normalize(h.decisionBasis)===normalize(b.decisionBasis);
 const exactTrigger=!!b&&normalize(h.trigger)===normalize(b.trigger);
 return {priorSection:p.sectionId,priorId:p.candidate.id,priorStructured:!!b,prior:{trigger:b?.trigger||null,observableBehavior:b?.observableBehavior||null,decisionBasis:b?.decisionBasis||null,semanticMotifs:b?.semanticMotifs||[],sourceIds:p.candidate.sourceIds},oldNearDuplicate:old.nearDuplicate,repeatedMotifs:old.repeatedMotifs,exactAction,exactBasis,exactTrigger,classification:!b?'INSUFFICIENT_PREVIOUS_DATA':exactAction?'EXACT_ACTION_OVERLAP':old.nearDuplicate?'SEMANTIC_REVIEW':'NOT_PROVEN_DUPLICATE'};});
 const decision=section9.assessments.find(a=>a.candidateId===c.id);
 return {id:c.id,sourceIds:c.sourceIds,scenarioRuleId:h.scenarioRuleId,live:{trigger:h.trigger,observableBehavior:h.observableBehavior,decisionBasis:h.decisionBasis,counterCondition:h.counterCondition,semanticMotifs:h.semanticMotifs||[]},oldDecision:decision?.decision||null,oldFlags:decision?.flags||[],comparisons:pairs,shadowDecision:'REVIEW_ONLY',promote:false};
});
const out={version:'V26',mode:'OFFLINE_LIVE_CALCULATION_SHADOW_ONLY',ephemeris:'Swiss term fixture, NOT production JPL provider',caseId:'RC11',structuredCandidates:rows.length,selected9:section9.selected?.id||null,structuredSelected9:!!section9.selected?.behaviorHypothesis,selected10:section10.selected?.id||null,automaticPromotions:0,priorSections:previous.length,rows};
const dest=root+'/docs/v26_live_candidate_audit';fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(dest+'/rc11_live_pairs.json',JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(dest+'/report.md',`# V26 실시간 계산 후보 3축 보존·비교 진단\n\n- RC11 생성된 09번 구조화 후보: ${rows.length}개. 앞선 선정 항목: ${previous.length}개.\n- 후보별 trigger, observableBehavior, decisionBasis, semanticMotifs, sourceIds 및 선행 장의 대응값을 JSON에 저장.\n- 기존 09번 선정: ${out.selected9}; 구조화 여부: ${out.structuredSelected9}. 10번 선정: ${out.selected10}.\n- 진단은 신규 후보를 자동 승인하지 않으며 기존 편집기/중복 차단 로직을 변경하지 않음.\n- 실제 행동/심리 적중 검증이 아닌 오프라인 명리 기반 가설 생성 테스트. Swiss 절기 fixture는 원운영 JPL과 다름.\n- 신규 로직이 적용됐다고 주장하지 않음. RC11 문제 및 과거 회귀 실패가 해결되기 전 배포 금지.\n`);
console.log(JSON.stringify({candidateCount:rows.length,comparisons:rows.reduce((n,r)=>n+r.comparisons.length,0),selected9:out.selected9,selected10:out.selected10,automaticallyPromoted:0,exactActionPairs:rows.flatMap(r=>r.comparisons).filter(p=>p.exactAction).length,semanticReviewPairs:rows.flatMap(r=>r.comparisons).filter(p=>p.classification==='SEMANTIC_REVIEW').length},null,2));
