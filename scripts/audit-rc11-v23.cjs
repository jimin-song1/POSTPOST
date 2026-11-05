'use strict';
/** V23: read-only semantic-overlap audit against the actual editor guard. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..');
const oldResolve=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...args){return oldResolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...args)};
require.extensions['.ts']=function(mod,file){const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});mod._compile(r.outputText,file)};
const {behavioralOverlap}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const charts=JSON.parse(fs.readFileSync(root+'/docs/v17_cross_chart_audit/twelve_date_charts.json','utf8'));
const detail=JSON.parse(fs.readFileSync(root+'/docs/v21_diagnostics/rc11_strength_candidates.json','utf8'));
const rc=charts.charts.find(x=>x.id==='RC11');assert(rc);
const priors=rc.sections.filter(x=>x.id<'P01-09'&&x.type==='structured');
const norm=s=>String(s||'').replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g,'').toLowerCase();
const grams=s=>{const t=norm(s),v=new Set();for(let i=0;i+2<t.length;i++)v.add(t.slice(i,i+3));return v};
const similarity=(a,b)=>{const x=grams(a),y=grams(b);if(!x.size||!y.size)return null;const intersection=[...x].filter(v=>y.has(v)).length;return Math.round(1000*intersection/(x.size+y.size-intersection))/1000};
const reasonTarget=x=>String(x.assessment?.reasons?.find(v=>v.includes('다른 장과 행동 장면이 겹쳐'))||'').match(/P01-\d\d/)?.[0]||null;
const result=detail.candidates.map(c=>{
 const target=reasonTarget(c);const comparison=priors.map(p=>({section:p.id,sharedSources:c.sourceIds.filter(v=>p.sourceIds.includes(v)),actionSimilarity:similarity(c.action,p.action),editorReportedMatch:p.id===target}));
 const exact=comparison.find(x=>x.editorReportedMatch);
 return {id:c.id,rule:c.scenarioRuleId,originalDecision:c.assessment?.decision,originalFlags:c.assessment?.flags,editorReportedMatch:target,reportedMatchPresent:!!exact,reportedMatchSharedSources:exact?.sharedSources||[],closestByAction:comparison.slice().sort((a,b)=>(b.actionSimilarity??-1)-(a.actionSimilarity??-1)).slice(0,3),sourceCount:c.sourceIds.length,action:c.action};
});
assert.equal(result.length,9);assert(result.every(x=>x.originalDecision==='REJECTED'&&x.originalFlags.includes('SEMANTIC_OVERLAP')));
// Adversarial isolated cases for the actual production guard; lexical scores are NOT semantic proof.
const candidate=(motifs,scene,family='wealth|officer')=>({behaviorHypothesis:{semanticMotifs:motifs,semanticFamilyPairKey:family,trigger:scene,observableBehavior:scene}});
const comparisons={
 sameMotifsDifferentAction:behavioralOverlap(candidate(['verification','opportunity-choice','responsibility'],'예산 사용 조건을 확인한다'),candidate(['verification','opportunity-choice','responsibility'],'민원 처리 후 기록을 남긴다')),
 sameSceneSameMotifs:behavioralOverlap(candidate(['verification','opportunity-choice','responsibility'],'제안을 비교하고 조건을 확인한다'),candidate(['verification','opportunity-choice','responsibility'],'제안을 비교하고 조건을 확인한다')),
 distinctMotifsSimilarWords:behavioralOverlap(candidate(['execution'],'조건을 확인하고 제안을 비교한다'),candidate(['communication'],'조건을 확인하고 제안을 비교한다','resource|output')),
};
assert(comparisons.sameMotifsDifferentAction.nearDuplicate,'document current false-positive risk');
assert(comparisons.sameSceneSameMotifs.nearDuplicate);
assert(!comparisons.distinctMotifsSimilarWords.nearDuplicate,'document current false-negative risk');
const out={version:'V23',mode:'read-only production-algorithm risk inspection',notes:['Candidate text scores are tri-gram lexical indicators only, not semantic ground truth.','The production editor uses motif overlap and family matching; no candidate selection rules modified.','Adversarial synthetic examples demonstrate both potential over-blocking and under-blocking.'],rc11:{candidateCount:result.length,priorStructured:priors.length,rows:result},guardCounterexamples:comparisons,selected:charts.selected,ready:charts.ready,warning:'Do not deploy: RC11 P01-10 missing and legacy regressions unresolved.'};
const folder=root+'/docs/v23_overlap_audit';fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/rc11_production_guard_audit.json',JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(folder+'/report.md',`# 사주빛 V23 중복 판정 위험 진단\n\n- 원본 V22 편집기 판단을 유지한 읽기 전용 감사. 12개 명식의 저장 결과 사용.\n- RC11 09번 후보 **${result.length}개 모두 SEMANTIC_OVERLAP으로 탈락**, 10번 미선정 유지.\n- 기존 에디터가 보고한 충돌 대상과 원국 출처 공유 여부를 비교함.\n- 실제 guard를 모의 입력으로 테스트: **같은 모티프·다른 행동**도 중복 처리 가능, **다른 모티프·같은 행동**도 미검출 가능.\n- 따라서 단순 모티프 경계 완화는 안전하지 않음. 다음 버전은 행동/판단기준/트리거 별 검증된 구조화 특징이 필요.\n- 문장 3-gram은 보조 진단일 뿐 실제 의미 판정이 아님.\n- 현재 선정 ${charts.selected}/120, READY_FOR_REVIEW ${charts.ready}/120. 실제 고객용 AI API 원고 검증 안 함.\n\n## 배포 판단\nBLOCK. 후보 생성과 중복 판정 모두 기존 유지; V6/V8/V13/V15 기존 실패와 RC11 미해결.\n`);
console.log(JSON.stringify({candidates:result.length,targets:result.map(r=>r.editorReportedMatch),counterexamples:comparisons,selected:charts.selected,ready:charts.ready},null,2));
