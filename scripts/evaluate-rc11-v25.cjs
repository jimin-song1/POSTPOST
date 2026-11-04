'use strict';
/** V25: evidence-preserving shadow audit, never promotes unverified candidates. */
const fs=require('node:fs'), path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const original=JSON.parse(fs.readFileSync(root+'/docs/v21_diagnostics/rc11_strength_candidates.json','utf8'));
const pairwise=JSON.parse(fs.readFileSync(root+'/docs/v23_overlap_audit/rc11_production_guard_audit.json','utf8'));
const norm=s=>String(s||'').replace(/[\s.,!?~:;(){}\[\]"'“”‘’·—–\\|<>#*_-]/g,'').toLowerCase();
const prior=pairwise.rc11.rows;
assert.equal(original.candidates.length,9);assert.equal(prior.length,9);
const records=original.candidates.map(c=>{
 const p=prior.find(p=>p.id===c.id);assert(p);
 const exact=p.closestByAction.filter(x=>x.actionSimilarity===1);
 const flags=c.assessment.flags;
 // The snapshot does not preserve full candidate and prior structured decisionBasis/trigger fields.
 // Never convert missing evidence to an ALLOW; any existing block remains a block until full live data are audited.
 return {candidateId:c.id,scenarioRuleId:c.scenarioRuleId,sourceIds:c.sourceIds,action:c.action,oldDecision:c.assessment.decision,overlapFlag:flags.includes('SEMANTIC_OVERLAP'),editorReportedMatch:p.editorReportedMatch,closestByAction:p.closestByAction,exactActionMatches:exact.map(x=>x.section),decisionBasisEvidence:'NOT_SAVED',triggerEvidence:'NOT_SAVED',shadowDecision:'REVIEW_INCOMPLETE',canPromote:false};
});
assert(records.every(x=>x.oldDecision==='REJECTED'&&x.overlapFlag&&x.shadowDecision==='REVIEW_INCOMPLETE'&&!x.canPromote));
const outDir=root+'/docs/v25_rc11_shadow';fs.mkdirSync(outDir,{recursive:true});
const output={version:'V25',status:'DIAGNOSTIC_ONLY_BLOCK_DEPLOYMENT',sourceVersion:'V24',comparisonCount:records.length,automaticallyPromoted:0,requiresLiveRecomputation:records.length,limitations:['Saved V21 snapshots lack complete decisionBasis and trigger on both sides of each candidate pair.','A prior editorial rejection is not overturned by lower lexical similarity.','Existing source, ten-god evidence, and production selection rules are unchanged.'],rows:records};
fs.writeFileSync(outDir+'/rc11_shadow.json',JSON.stringify(output,null,2)+'\n');
const csv=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
fs.writeFileSync(outDir+'/rc11_shadow.csv',[['candidateId','scenarioRuleId','editorReportedMatch','decisionBasisEvidence','triggerEvidence','shadowDecision','canPromote'].join(','),...records.map(r=>[r.candidateId,r.scenarioRuleId,r.editorReportedMatch,r.decisionBasisEvidence,r.triggerEvidence,r.shadowDecision,r.canPromote].map(csv).join(','))].join('\n')+'\n');
fs.writeFileSync(outDir+'/report.md',`# 사주빛 V25 — RC11 실제 후보 그림자 판정\n\n- V24 전체 소스 기준으로 RC11 09번 후보 ${records.length}개를 판정 보류로 분류함.\n- 9개 모두 V21 원본에서 SEMANTIC_OVERLAP 탈락이며 자동 승인 ${output.automaticallyPromoted}개.\n- 후보·선행 장의 판단기준 및 상황 전문이 저장되어 있지 않아 자동 승인 금지.\n- docs/v25_rc11_shadow/rc11_shadow.json 및 CSV에 후보별 원문 출처, 이전 충돌 대상, 근접 행동 비교를 기록.\n- 고객용 09·10번 복구 미완료. 생산 편집기 및 중복 차단 로직 변경 없음.\n- 재계산 없이 저장된 과거 RC11 스냅샷을 평가했으므로 12명식 재선정 또는 품질 향상을 주장할 수 없음.\n\n## V26에 필요한 것\n- 라이브 후보/선행 항목에서 observableBehavior, decisionBasis, trigger, semanticMotifs, sourceIds를 전부 수집하고, 세 축 비교 후 실제 에디터 선정·회귀 재계산.\n- 과거 검사 기대치 변경 없이 원인별 해결.\n\n**배포 금지**: RC11 미복구, 과거 4개 회귀 실패 및 고객 원고 미검증.\n`);
console.log(JSON.stringify({candidates:records.length,promoted:0,review:records.length,reason:'Missing basis/trigger in persisted candidate-pair snapshot'}));
