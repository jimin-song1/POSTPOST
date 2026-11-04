'use strict';
/**
 * V35: goal/output-aware overlap judgment for P01-09 and the P01-09 -> P01-10 link.
 * Offline only: Swiss-ephemeris fixture replaces lunisolar-ephemeris (same harness as V17).
 * This verifies selection contracts. It does NOT prove personality accuracy or AI manuscript quality.
 */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..');
const ephem=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/solar_terms_swiss.json'),'utf8'));
const oR=Module._resolveFilename,oL=Module._load;
Module._resolveFilename=function(n,p,...r){return oR.call(this,n.startsWith('@/')?path.join(root,'src',n.slice(2)):n,p,...r)};
Module._load=function(n,p,...r){if(n==='lunisolar-ephemeris')return{FIRST_YEAR:1985,LAST_YEAR:2109,Instant:{toDate:v=>new Date(v)},solarTermsOfYear:y=>{const d=ephem[String(y)];if(!d)throw new Error('Missing solar year '+y);return d.map((dt,index)=>({index,isJie:index%2===0,instant:dt}))}};return oL.call(this,n,p,...r)};
require.extensions['.ts']=function(m,f){m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f)};
const {calculateSaju}=require(root+'/src/lib/saju/engine.ts');
const {selectPersonalityInterpretations,createPersonalityWritingBrief}=require(root+'/src/lib/saju/ai-interpretation/personality-editorial.v1.ts');
const {behavioralOverlap,goalOutputRelation,canonicalBehaviorCandidates}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const {extractGoalOutputV34,goalOutputForScene}=require(root+'/src/lib/saju/ai-interpretation/personality-behavior.v2.ts');

const RECORDS=[
 ['RC01','female','1989-08-15','13:15'],['RC02','male','1992-03-18','09:20'],['RC03','female','1995-09-17','08:40'],
 ['RC04','male','1998-12-17','20:10'],['RC05','female','2001-01-25','10:30'],['RC06','male','2003-05-15','16:20'],
 ['RC07','female','1986-11-03','23:10'],['RC08','male','1990-06-28','06:35'],['RC09','female','1994-02-09','18:55'],
 ['RC10','male','1997-07-24','11:05'],['RC11','female','2000-10-31','02:45'],['RC12','male','2005-04-07','14:25'],
];
const pairOf=c=>c.sourceIds.filter(x=>x.startsWith('PILLAR:')).slice().sort().join('|');
const analyses=new Map(RECORDS.map(([id,gender,birthDate,birthTime])=>[id,calculateSaju({name:id,gender,calendarType:'solar',birthDate,birthTime,birthTimeKnown:true,birthCountry:'KR',birthCityKnown:true,birthCity:'서울'})]));
const run=(scope)=>RECORDS.map(([id])=>{const a=analyses.get(id);const plan=selectPersonalityInterpretations(a,[],scope?{goalOutputScope:scope}:{});return {id,a,plan,brief:createPersonalityWritingBrief(plan)}});
const live=run();
const v34=JSON.parse(fs.readFileSync(path.join(root,'docs/v35_goal_output_overlap/v34_baseline_twelve_date_charts.json'),'utf8'));
const checks=[];const check=(name,fn)=>{try{fn();checks.push({name,status:'PASS'})}catch(e){checks.push({name,status:'FAIL',error:String(e.message).slice(0,400)})}};

// ---------- unit contracts ----------
const H=(o)=>({axis:'a',trigger:'t',observableBehavior:'행동',decisionBasis:'b',possibleMotive:null,counterCondition:'c',structuralContext:[],inferenceSteps:[],inferenceLevel:'CONDITIONAL_INTERPRETATION',semanticPairKey:'x|y',actionGoal:null,observableOutput:null,goalOutputEvidence:'INSUFFICIENT_SCENE',...o});
const C=(id,src,h)=>({id,sectionId:'P01-09',sourceIds:src,evidenceIds:[],behaviorHypothesis:h});
const rule=(g,o,extra={})=>({actionGoal:'goal:'+g,observableOutput:'out:'+o,goalOutputEvidence:'EXPLICIT_SCENE',goalKey:g,outputKey:o,goalOutputSource:'SCENE_RULE',...extra});
const motifs=['role-boundary','verification','rules'];
check('V34 extractor false positive fixed: 기회비용…합의 is not a cost agreement',()=>{
  const x=extractGoalOutputV34('대안별 기회비용과 활용 가능성을 검토한 다음 합의된 기준과 절차를 확인하는 모습','여러 거래 조건 중 공식 기준에 맞는 선택지를 골라야 할 때');
  assert.equal(x.goalOutputEvidence,'INSUFFICIENT_SCENE');
  assert.equal(extractGoalOutputV34('누가 지출을 맡을지 합의하는 모습','여럿이 비용을 나눌 때').goalOutputEvidence,'EXPLICIT_SCENE');
  assert.equal(extractGoalOutputV34('각자 부담할 비용과 함께 처리할 역할을 구분해 합의하는 모습','공동 작업').goalOutputEvidence,'EXPLICIT_SCENE');
});
check('same goal key with different wording and motifs is a duplicate',()=>{
  const a=C('a',['PILLAR:a','PILLAR:b'],H({observableBehavior:'선택지를 좁히는 모습',semanticMotifs:['opportunity-choice'],...rule('CHOOSE_OPTION','narrowed-options')}));
  const b=C('b',['PILLAR:c','PILLAR:d'],H({observableBehavior:'우선 확인할 조건을 고르는 모습',semanticMotifs:['rules'],...rule('CHOOSE_OPTION','priority-conditions')}));
  assert.equal(goalOutputRelation(a.behaviorHypothesis,b.behaviorHypothesis),'SAME_GOAL_OR_OUTPUT');
  assert.equal(behavioralOverlap(a,b,{allowGoalOutputDistinct:true}).nearDuplicate,true);
});
check('distinct goal AND output clears a motif-only duplicate only when allowed',()=>{
  const a=C('a',['PILLAR:a','PILLAR:b'],H({observableBehavior:'A',semanticMotifs:motifs,semanticFamilyPairKey:'officer|resource',...rule('APPLY_PROCEDURE_SCOPE','procedure-application-scope')}));
  const b=C('b',['PILLAR:a','PILLAR:c'],H({observableBehavior:'B',semanticMotifs:motifs,semanticFamilyPairKey:'officer|resource',...rule('START_ORDER','start-sequence')}));
  const without=behavioralOverlap(a,b),withOpt=behavioralOverlap(a,b,{allowGoalOutputDistinct:true});
  assert.equal(without.nearDuplicate,true,'default must keep the legacy motif verdict');
  assert.equal(withOpt.nearDuplicate,false);assert.equal(withOpt.motifNearDuplicate,true);assert.equal(withOpt.goalOutput,'DISTINCT_GOAL_AND_OUTPUT');
});
check('same output key with a different goal key is still a duplicate',()=>{
  const a=C('a',['PILLAR:a','PILLAR:b'],H({observableBehavior:'A',...rule('COMPLETE_OUTPUT','finished-work')}));
  const b=C('b',['PILLAR:c','PILLAR:d'],H({observableBehavior:'B',...rule('PRODUCE_FROM_KNOWLEDGE','finished-work')}));
  assert.equal(goalOutputRelation(a.behaviorHypothesis,b.behaviorHypothesis),'SAME_GOAL_OR_OUTPUT');
});
check('missing or text-extracted goal can never prove independence',()=>{
  const a=C('a',['PILLAR:a','PILLAR:b'],H({observableBehavior:'A',semanticMotifs:motifs,...rule('APPLY_PROCEDURE_SCOPE','procedure-application-scope')}));
  const none=C('b',['PILLAR:c','PILLAR:d'],H({observableBehavior:'B',semanticMotifs:motifs}));
  const text=C('c',['PILLAR:c','PILLAR:d'],H({observableBehavior:'C',semanticMotifs:motifs,actionGoal:'g',observableOutput:'o',goalOutputEvidence:'EXPLICIT_SCENE',goalOutputSource:'TEXT_EXTRACTION'}));
  for(const other of [none,text]){const r=behavioralOverlap(a,other,{allowGoalOutputDistinct:true});assert.equal(r.goalOutput,'UNVERIFIED');assert.equal(r.nearDuplicate,true)}
});
check('identical action stays a duplicate even with distinct goal/output (V29 floor)',()=>{
  const a=C('a',['PILLAR:a','PILLAR:b'],H({observableBehavior:'같은 행동',...rule('APPLY_PROCEDURE_SCOPE','procedure-application-scope')}));
  const b=C('b',['PILLAR:c','PILLAR:d'],H({observableBehavior:'같은 행동',...rule('START_ORDER','start-sequence')}));
  assert.equal(behavioralOverlap(a,b,{allowGoalOutputDistinct:true}).nearDuplicate,true);
});
check('goal/output comes from the rule table, not from ten-god labels; P01-02/03/10 stay null',()=>{
  for(const id of ['P01-02','P01-03','P01-10']){const g=goalOutputForScene(id,'officer|resource',false,false,false,false,false,'압박 속 우선 처리할 책임을 먼저 확인','문제');assert.equal(g.goalOutputSource,null);assert.equal(g.actionGoal,null)}
  assert.equal(goalOutputForScene('P01-09','officer|resource',false,false,false,false,false,'x','y').goalOutputSource,null,'no strength scene -> no rule goal');
  assert.equal(goalOutputForScene('P01-09','officer|resource',false,false,true,false,false,'x','y').goalKey,'APPLY_PROCEDURE_SCOPE');
});

// ---------- live 12-chart contracts ----------
check('deterministic: two runs produce identical selections',()=>{
  const again=run();for(let i=0;i<live.length;i++)assert.deepEqual(again[i].plan.sections.map(s=>s.selected?.id??null),live[i].plan.sections.map(s=>s.selected?.id??null),live[i].id);
});
check('scope containment: P01-01..P01-08 selections are identical to V34 on all 12 charts',()=>{
  for(const r of live){const b=v34.charts.find(c=>c.id===r.id);for(const s of r.plan.sections.filter(s=>!['P01-09','P01-10'].includes(s.sectionId)))assert.equal(s.selected?.id??'',b.sections.find(x=>x.id===s.sectionId).candidateId,r.id+' '+s.sectionId)}
});
check('every structured P01-09 carries rule-table goal/output and an explicit output in its action',()=>{
  for(const r of live){const h=r.plan.sections.find(s=>s.sectionId==='P01-09').selected?.behaviorHypothesis;if(!h)continue;
    assert.equal(h.goalOutputSource,'SCENE_RULE',r.id);assert(h.actionGoal&&h.observableOutput&&h.goalKey&&h.outputKey,r.id);}
});
check('no selected P01-09 shares a goal or output with any earlier structured chapter',()=>{
  for(const r of live){const s9=r.plan.sections.find(s=>s.sectionId==='P01-09').selected;if(!s9?.behaviorHypothesis)continue;
    for(const s of r.plan.sections){if(s.sectionId==='P01-09')break;const p=s.selected?.behaviorHypothesis;if(!p)continue;
      assert.notEqual(goalOutputRelation(s9.behaviorHypothesis,p),'SAME_GOAL_OR_OUTPUT',r.id+' 09 vs '+s.sectionId);}}
});
check('a motif overlap with an earlier chapter is cleared only by DISTINCT goal/output on a different source pair, and is logged for editing',()=>{
  for(const r of live){const s9=r.plan.sections.find(s=>s.sectionId==='P01-09').selected;if(!s9?.behaviorHypothesis)continue;
    for(const s of r.plan.sections){if(s.sectionId==='P01-09')break;const p=s.selected;if(!p?.behaviorHypothesis)continue;
      const o=behavioralOverlap(s9,p);if(!o.nearDuplicate)continue;
      assert.equal(o.goalOutput,'DISTINCT_GOAL_AND_OUTPUT',r.id+' '+s.sectionId);assert.notEqual(pairOf(s9),pairOf(p),r.id+' same pair');
      assert(r.plan.audit.goalOutputReviews.some(x=>x.priorId===p.id&&x.candidateId===s9.id),r.id+' review missing');}}
});
check('every selected P01-10 is linked to the selected P01-09 with exactly one shared natal source',()=>{
  for(const r of live){const s9=r.plan.sections.find(s=>s.sectionId==='P01-09').selected,s10=r.plan.sections.find(s=>s.sectionId==='P01-10').selected;
    if(!s10)continue;assert(s9?.behaviorHypothesis,r.id);assert.equal(s10.behaviorHypothesis.linkedStrengthCandidateId,s9.id,r.id);
    assert.equal(s10.sourceIds.filter(x=>x.startsWith('PILLAR:')&&s9.sourceIds.includes(x)).length,1,r.id);}
});
check('no selected P01-10 retells another chapter (same exact pair AND near-duplicate behavior)',()=>{
  for(const r of live){const s10=r.plan.sections.find(s=>s.sectionId==='P01-10').selected;if(!s10)continue;
    for(const s of r.plan.sections.filter(s=>!['P01-09','P01-10'].includes(s.sectionId))){const p=s.selected;if(!p?.behaviorHypothesis)continue;
      assert(!(pairOf(p)===pairOf(s10)&&behavioralOverlap(s10,p).nearDuplicate),r.id+' 10 retells '+s.sectionId)}}
});
check('RC11: P01-09 structured and READY, P01-10 linked and READY',()=>{
  const r=live.find(x=>x.id==='RC11');const b9=r.brief.sections.find(s=>s.id==='P01-09'),b10=r.brief.sections.find(s=>s.id==='P01-10');
  assert.equal(b9.status,'READY_FOR_REVIEW');assert.equal(b10.status,'READY_FOR_REVIEW');
  assert.equal(b9.primary.strengthDevelopmentChain.goalOutputSource,'SCENE_RULE');
  assert.equal(b10.primary.linkedStrengthContext.candidateId,r.plan.sections.find(s=>s.sectionId==='P01-09').selected.id);
});
check('V35.1: P01-09 sentences do not assert an unsupported order ("한 다음") and carry no internal ten-god note',()=>{
  for(const r of live){for(const c of canonicalBehaviorCandidates(r.a).values()){if(c.sectionId!=='P01-09')continue;const t=c.behaviorHypothesis.observableBehavior;
    assert(!/한 다음/.test(t),r.id+' '+c.id);assert(!/계산된 상징/.test(t),r.id+' '+c.id);}}
});
check('V35.1: a 겁재 strength is never labelled with a solo-ownership scene or goal',()=>{
  let seen=0;for(const r of live){for(const c of canonicalBehaviorCandidates(r.a).values()){const h=c.behaviorHypothesis;if(c.sectionId!=='P01-09'||!h.semanticPairKey.split('|').includes('겁재'))continue;seen++;
    assert(!/자기 몫의 일을 직접|스스로 결정할 범위를 정하려는/.test(h.trigger+' '+h.observableBehavior),r.id+' '+c.id);
    if(h.semanticFamilyPairKey==='peer|resource')assert.equal(h.goalKey,'ALLOCATE_RESPONSIBILITY',c.id);}}
  assert(seen>0,'no 겁재 strength candidate exercised');
});
const freshPairs=rs=>rs.filter(r=>{const s9=r.plan.sections.find(s=>s.sectionId==='P01-09').selected;if(!s9?.behaviorHypothesis)return false;
  return !r.plan.sections.filter(s=>s.sectionId!=='P01-09'&&s.sectionId!=='P01-10').some(s=>s.selected&&pairOf(s.selected)===pairOf(s9))}).length;
check('P01-09 independent-evidence floor: fresh natal source pairs do not drop below the V35 measurement (8/12)',()=>{assert(freshPairs(live)>=8,String(freshPairs(live)))});

// ---------- summaries ----------
const summarize=(rs)=>{const secs=rs.flatMap(r=>r.brief.sections.map(s=>({r:r.id,s})));return{
  selected:rs.reduce((n,r)=>n+r.plan.sections.filter(s=>s.selected).length,0),
  structured:rs.reduce((n,r)=>n+r.plan.sections.filter(s=>s.selected?.behaviorHypothesis).length,0),
  ready:secs.filter(x=>x.s.status==='READY_FOR_REVIEW').length,
  p09Structured:rs.filter(r=>r.plan.sections.find(s=>s.sectionId==='P01-09').selected?.behaviorHypothesis).length,
  p10Selected:rs.filter(r=>r.plan.sections.find(s=>s.sectionId==='P01-10').selected).length,
  p09FreshSourcePair:freshPairs(rs),
  goalOutputReviews:rs.reduce((n,r)=>n+r.plan.audit.goalOutputReviews.length,0),
  semanticOverlapReviews:rs.reduce((n,r)=>n+r.plan.audit.semanticOverlapReviews.length,0),
  rc11:{p09:rs.find(r=>r.id==='RC11').plan.sections.find(s=>s.sectionId==='P01-09').selected?.id??null,p10:rs.find(r=>r.id==='RC11').plan.sections.find(s=>s.sectionId==='P01-10').selected?.id??null}}};
const v34Fresh=v34.charts.filter(c=>{const s9=c.sections.find(s=>s.id==='P01-09');if(s9.type!=='structured')return false;const k=s9.sourceIds.filter(x=>x.startsWith('PILLAR:')).sort().join('|');return !c.sections.filter(s=>!['P01-09','P01-10'].includes(s.id)&&s.type!=='empty').some(s=>s.sourceIds.filter(x=>x.startsWith('PILLAR:')).sort().join('|')===k)}).length;
const ablation={
  V34_snapshot:{selected:v34.selected,structured:v34.structured,ready:v34.ready,p09Structured:v34.charts.filter(c=>c.sections.find(s=>s.id==='P01-09').type==='structured').length,p10Selected:v34.charts.filter(c=>c.sections.find(s=>s.id==='P01-10').type!=='empty').length,p09FreshSourcePair:v34Fresh},
  V35_scope_none:summarize(run('none')),V35_default_P01_09:summarize(live),V35_scope_all_experiment:summarize(run('all')),
  note:'scope_none = V35 tables + SAME tightening + fresh-pair preference, without the DISTINCT relaxation. scope_all relaxes every chapter and changes 01-08; rejected as default.'};

// RC11 candidate table (작업 C)
const rc=live.find(x=>x.id==='RC11');const canon=canonicalBehaviorCandidates(rc.a);const sec9=rc.plan.sections.find(s=>s.sectionId==='P01-09');
const POS={year:'연',month:'월',day:'일',hour:'시'};
const earlier=rc.plan.sections.filter(s=>['P01-01','P01-02','P01-03','P01-04','P01-05','P01-06','P01-07','P01-08'].includes(s.sectionId));
const rc11Rows=Array.from(canon.values()).filter(c=>c.sectionId==='P01-09').map(c=>{const h=c.behaviorHypothesis,as=sec9.assessments.find(a=>a.candidateId===c.id);
  const vs=earlier.filter(s=>s.selected?.behaviorHypothesis).map(s=>{const o=behavioralOverlap(c,s.selected,{allowGoalOutputDistinct:pairOf(c)!==pairOf(s.selected)});return{section:s.sectionId,goalOutput:o.goalOutput,motifNearDuplicate:o.motifNearDuplicate,nearDuplicate:o.nearDuplicate,samePair:pairOf(c)===pairOf(s.selected)}});
  const legacyPairReuse=earlier.filter(s=>s.selected&&!s.selected.behaviorHypothesis&&pairOf(s.selected)===pairOf(c)).map(s=>s.sectionId);
  return{candidateId:c.id,sources:c.sourceIds.map(id=>{const m=/^PILLAR:(\w+):(\w+):(.+)$/.exec(id);return POS[m[1]]+(m[2]==='stem'?'간':'지')+' '+m[3]}).join(', '),tenGods:h.semanticPairKey,family:h.semanticFamilyPairKey,
    trigger:h.trigger,action:h.observableBehavior,actionGoal:h.actionGoal,observableOutput:h.observableOutput,goalKey:h.goalKey,decisionBasis:h.decisionBasis,counterCondition:h.counterCondition,
    decision:as.decision,editorialRank:as.editorialRank,flags:as.flags,reasons:as.reasons.filter(x=>/겹|중복|동일|재사용|목표|반려|제외/.test(x)),
    comparisonWithEarlier:vs,legacyPairReuse,evidenceInsufficient:h.goalOutputSource!=='SCENE_RULE'}}).sort((a,b)=>b.editorialRank-a.editorialRank);

const out=path.join(root,'docs/v35_goal_output_overlap');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'rc11_p09_candidates.json'),JSON.stringify({chart:'RC11',section:'P01-09',earlierSelections:earlier.map(s=>({section:s.sectionId,id:s.selected?.id??null,structured:!!s.selected?.behaviorHypothesis,goalKey:s.selected?.behaviorHypothesis?.goalKey??null,actionGoal:s.selected?.behaviorHypothesis?.actionGoal??null,observableOutput:s.selected?.behaviorHypothesis?.observableOutput??null})),candidates:rc11Rows,p10:rc.brief.sections.find(s=>s.id==='P01-10').primary},null,2)+'\n');
const q=v=>'"'+String(Array.isArray(v)?v.join(' | '):typeof v==='object'&&v?JSON.stringify(v):v??'').replace(/"/g,'""')+'"';
const cols=['candidateId','sources','tenGods','family','goalKey','actionGoal','observableOutput','decision','editorialRank','flags','reasons','legacyPairReuse','trigger','action','decisionBasis','counterCondition'];
fs.writeFileSync(path.join(out,'rc11_p09_candidates.csv'),'﻿'+cols.join(',')+'\n'+rc11Rows.map(r=>cols.map(k=>q(r[k])).join(',')).join('\n')+'\n');
// before/after P01-09/10 per chart
const compare=live.map(r=>{const b=v34.charts.find(c=>c.id===r.id);const row=id=>{const s=r.plan.sections.find(x=>x.sectionId===id).selected;const o=b.sections.find(x=>x.id===id);
  return{v34:{id:o.candidateId||null,type:o.type,status:o.status,action:o.action||null},v35:{id:s?.id??null,status:r.brief.sections.find(x=>x.id===id).status,action:s?.behaviorHypothesis?.observableBehavior??null,trigger:s?.behaviorHypothesis?.trigger??null,actionGoal:s?.behaviorHypothesis?.actionGoal??null,observableOutput:s?.behaviorHypothesis?.observableOutput??null,linked:s?.behaviorHypothesis?.linkedStrengthCandidateId??null}}};
  return{chart:r.id,P01_09:row('P01-09'),P01_10:row('P01-10'),goalOutputReviews:r.plan.audit.goalOutputReviews}});
fs.writeFileSync(path.join(out,'p09_p10_v34_vs_v35.json'),JSON.stringify(compare,null,2)+'\n');
fs.writeFileSync(path.join(out,'ablation.json'),JSON.stringify(ablation,null,2)+'\n');
const report={version:'V35',scope:'P01-09 goal/output overlap + P01-10 link; offline Swiss-fixture charts; not personality accuracy, not AI manuscript validation',
  checks,passed:checks.filter(c=>c.status==='PASS').length,failed:checks.filter(c=>c.status==='FAIL').length,ablation,releaseReady:false};
fs.writeFileSync(path.join(out,'test_results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,failures:checks.filter(c=>c.status==='FAIL'),ablation},null,2));
if(report.failed)process.exitCode=1;
