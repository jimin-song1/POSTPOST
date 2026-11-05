'use strict';
/** V24 shadow comparator: no production selection change without validation. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..');const original=Module._resolveFilename;
Module._resolveFilename=function(n,p,...rest){return original.call(this,n.startsWith('@/')?path.join(root,'src',n.slice(2)):n,p,...rest)};
require.extensions['.ts']=function(m,f){m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f)};
const {behavioralOverlap}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const fixture=(motifs,action,basis,trigger,family='officer|wealth')=>({behaviorHypothesis:{semanticMotifs:motifs,semanticFamilyPairKey:family,observableBehavior:action,decisionBasis:basis,trigger}});
const norm=s=>String(s||'').replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g,'').toLowerCase();
const similarity=(x,y)=>{x=norm(x);y=norm(y);if(!x||!y)return null;if(x===y)return 1;const gram=s=>new Set([...Array(Math.max(0,s.length-2))].map((_,i)=>s.slice(i,i+3)));const a=gram(x),b=gram(y);if(!a.size||!b.size)return null;return [...a].filter(v=>b.has(v)).length/(a.size+b.size-[...a].filter(v=>b.has(v)).length)};
function shadow(a,b){const h=a.behaviorHypothesis,k=b.behaviorHypothesis,old=behavioralOverlap(a,b);const dims={action:similarity(h?.observableBehavior,k?.observableBehavior),basis:similarity(h?.decisionBasis,k?.decisionBasis),trigger:similarity(h?.trigger,k?.trigger)};
 const complete=Object.values(dims).every(x=>x!==null);const exactAction=norm(h?.observableBehavior)!==''&&norm(h?.observableBehavior)===norm(k?.observableBehavior);
 // Exact action repetition blocks regardless of motifs. Missing dimensions retain the old outcome.
 // Any motif-based over-block is only FLAGGED for manual review: lexical dissimilarity alone cannot prove a new meaning.
 const decision=exactAction?'BLOCK_EXACT_ACTION':!complete?'REVIEW_INCOMPLETE':old.nearDuplicate?'REVIEW_MOTIF_OVERLAP':'ALLOW_WITH_AUDIT';
 return {legacyBlock:old.nearDuplicate,decision,dimensions:dims,sharedMotifs:old.repeatedMotifs};}
const examples=[
 {name:'same motifs, distinct action',a:fixture(['verification','opportunity-choice','responsibility'],'예산 지출 내역을 확인한다','금액과 잔액을 비교','결산할 때'),b:fixture(['verification','opportunity-choice','responsibility'],'고객의 요청을 담당자에게 전달한다','담당 구역을 확인','민원이 접수될 때'),expected:'REVIEW_MOTIF_OVERLAP'},
 {name:'different motifs, exact action',a:fixture(['execution'],'제안을 비교하고 조건을 확인한다','비용','제안을 받을 때'),b:fixture(['communication'],'제안을 비교하고 조건을 확인한다','일정','제안을 받을 때'),expected:'BLOCK_EXACT_ACTION'},
 {name:'same motifs, same action',a:fixture(['verification','opportunity-choice','responsibility'],'선택지를 비교한다','비용','계약할 때'),b:fixture(['verification','opportunity-choice','responsibility'],'선택지를 비교한다','비용','계약할 때'),expected:'BLOCK_EXACT_ACTION'},
 {name:'missing dimensions',a:fixture(['execution'],'실행한다','',''),b:fixture(['communication'],'정리한다','근거','회의'),expected:'REVIEW_INCOMPLETE'}
 ];
const results=examples.map(e=>({name:e.name,...shadow(e.a,e.b)}));examples.forEach((e,i)=>assert.equal(results[i].decision,e.expected));
const rc=JSON.parse(fs.readFileSync(root+'/docs/v21_diagnostics/rc11_strength_candidates.json','utf8'));assert.equal(rc.candidates.length,9);assert(rc.candidates.every(c=>c.assessment.flags.includes('SEMANTIC_OVERLAP')));
const data={version:'V24',status:'SHADOW_DIAGNOSTIC_NOT_DEPLOYABLE',notes:['No production guard or editorial-selection change.','3-gram similarity reflects lexical overlap, not semantic equivalence.','No original behaviorHypothesis decisionBasis/trigger persisted for all RC11 candidates in V21 snapshot; cannot retroactively reclassify them.'],synthetic:results,rc11:{candidates:rc.candidates.length,overlapRejected:rc.candidates.filter(c=>c.assessment.flags.includes('SEMANTIC_OVERLAP')).length}};
const out=root+'/docs/v24_overlap_shadow';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/shadow_results.json',JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(out+'/report.md',`# V24 중복 판정 개선 예비 실험\n\n- 행동·판단기준·상황 세 축의 텍스트 유사도 진단을 별도 구현함.\n- 같은 행동 문구는 모티프가 달라도 차단하는 규칙을 테스트함.\n- 모티프는 같지만 행동이 다른 경우 자동 허용하지 않고 수작업 검토 대상으로 분류함.\n- 실제 선정 엔진은 변경하지 않았으므로 120/120 복구로 보고하지 않음.\n- RC11 후보 9개는 V21 데이터에서 전부 중복 판정으로 탈락한 상태.\n- 패턴 검사 통과는 고객 성격 적중률이나 실제 의미적 구별의 검증이 아님.\n- 원고 검토 가능 수 96/120, 기존 회귀 실패 4건은 별도 해결 필요. 배포 금지.\n`);
console.log(JSON.stringify(data,null,2));
