'use strict';
/** V33 review gate: never infer a behavioral outcome from superficial variation. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const data=read('docs/v32_experiment/experimental_rc11_candidates.json');
const chart=read('docs/v32_experiment/experimental_twelve_charts.json').charts.find(x=>x.id==='RC11');
const preceding=chart.sections.filter(x=>/^P01-0[1-8]$/.test(x.id));
const normalize=s=>String(s||'').replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g,'').toLowerCase();
const overlap=(a,b)=>a.filter(x=>b.includes(x));
function classify(candidate,prior){
 const a=candidate.action||'', b=prior.action||'';
 const sameAction=Boolean(a&&b&&normalize(a)===normalize(b));
 const sharedSources=overlap(candidate.sourceIds||[],prior.sourceIds||[]);
 const sameSourcePair=JSON.stringify((candidate.sourceIds||[]).slice().sort())===JSON.stringify((prior.sourceIds||[]).slice().sort());
 const sameSemanticFamily=Boolean(prior.semantic && candidate.scenarioRuleId?.includes(prior.semantic));
 // No source-derived explicit goal/output fields in the stored V32 candidate contract.
 // An inferred noun phrase is not proof of a different goal or output.
 const goalEvidence='NOT_RECORDED', outputEvidence='NOT_RECORDED';
 const distinctGoalOutputProved=false;
 const decision=sameAction?'BLOCK_EXACT_ACTION':'HOLD_INSUFFICIENT_GOAL_OUTPUT_EVIDENCE';
 return {priorSection:prior.id,priorAction:prior.action,priorTrigger:prior.trigger,
   sharedSources,sameSourcePair,sameSemanticFamily,sameAction,goalEvidence,outputEvidence,
   distinctGoalOutputProved,decision};
}
const candidates=data.candidates.map(c=>({candidateId:c.id,scenarioRuleId:c.scenarioRuleId,sourceIds:c.sourceIds,action:c.action,
  originalDecision:c.assessment?.decision||null,
  comparisons:preceding.map(p=>classify(c,p))}));
const comparisons=candidates.flatMap(x=>x.comparisons);
const summary={version:'V33',sourceVersion:'V32 experimental candidates',mode:'read-only audit; no selection engine changes',
  candidateCount:candidates.length,priorSectionCount:preceding.length,pairCount:comparisons.length,
  exactActionPairs:comparisons.filter(x=>x.sameAction).length,
  sameSourcePairCount:comparisons.filter(x=>x.sameSourcePair).length,
  sharedSourceCount:comparisons.filter(x=>x.sharedSources.length).length,
  approvedCandidates:0,heldCandidates:candidates.length,
  finding:'V32 persisted records do not independently state candidate-level action goal and concrete output; lexical variation alone cannot prove novel strengths.',
  requires:['explicit chart-grounded goal','observable output or no-output marker','trigger context','provenance','per-prior comparison'],
  candidates};
assert.equal(candidates.length,9);assert.equal(preceding.length,8);assert.equal(comparisons.length,72);
assert(comparisons.every(x=>x.decision!=='APPROVE'));
assert(comparisons.every(x=>x.goalEvidence==='NOT_RECORDED'&&x.outputEvidence==='NOT_RECORDED'));
assert.equal(classify({action:'기준 점검',sourceIds:[]},{id:'x',action:'기준 점검',sourceIds:[]}).decision,'BLOCK_EXACT_ACTION');
assert.equal(classify({action:'기준 점검',sourceIds:[]},{id:'x',action:'책임 정리',sourceIds:[]}).decision,'HOLD_INSUFFICIENT_GOAL_OUTPUT_EVIDENCE');
const dir=path.join(root,'docs/v33_goal_output_audit');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'rc11_72_pair_audit.json'),JSON.stringify(summary,null,2)+'\n');
const lines=['candidateId,priorSection,sameAction,sameSourcePair,sharedSourceCount,decision'];
for(const c of candidates)for(const p of c.comparisons)lines.push([c.candidateId,p.priorSection,p.sameAction,p.sameSourcePair,p.sharedSources.length,p.decision].join(','));
fs.writeFileSync(path.join(dir,'rc11_72_pair_audit.csv'),'\ufeff'+lines.join('\n')+'\n');
fs.writeFileSync(path.join(dir,'V33_REPORT.md'),`# 사주빛 V33 — RC11 행동 목표·산출물 증거 감사\n\n- V32 실험 자료 기준 RC11 09번 구조화 후보 **${candidates.length}개**, 앞선 01~08 항목과 **${comparisons.length}쌍** 비교.\n- 동일 행동 문구 ${summary.exactActionPairs}쌍, 동일 근거 위치쌍 ${summary.sameSourcePairCount}쌍, 하나 이상 위치 공유 ${summary.sharedSourceCount}쌍.\n- 행동 목표 및 구체적 산출물은 V32 저장 계약에 별도 필드로 기재되지 않았다. 따라서 **9개 후보 자동 승인 0개**, 전부 증거 보완 보류.\n- 문장 형태나 트리거만으로 강점이 독립적이라고 승인하지 않는다. 선정 엔진·명식 계산·운영 서비스는 변경하지 않음.\n- 본 검사는 저장된 V32 실험 자료에 대한 읽기 전용 감사이며 새 명식 계산, 실제 AI API 품질 검증, 기존 전 회귀 스위트 통과를 의미하지 않는다.\n- V34 선행 조건: 후보 생성 단계부터 명시적 \`actionGoal\`, \`observableOutput\` (없으면 명시적으로 null), \`sourceProvenance\`를 생성·검증하고, 동일 목표·결과인 후보를 차단하는 계약 테스트가 필요하다.\n`);
console.log(JSON.stringify({candidateCount:summary.candidateCount,pairCount:summary.pairCount,exactActionPairs:summary.exactActionPairs,sameSourcePairCount:summary.sameSourcePairCount,sharedSourceCount:summary.sharedSourceCount,approvedCandidates:0,heldCandidates:9,tests:'PASS'},null,2));
