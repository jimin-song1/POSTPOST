"use strict";
/** Offline semantic audit only: flags possible duplicated narrative; never declares psychological validity. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'docs/v17_cross_chart_audit/twelve_date_charts.json'),'utf8'));
const dimensions={
  action: row=>row.action,
  decision: row=>row.basis,
  situation: row=>row.trigger,
};
const normalize=s=>String(s||'').replace(/[\s\p{P}]/gu,'').toLowerCase();
function overlap(a,b){
  const x=normalize(a),y=normalize(b);
  if(!x||!y)return {comparable:false,exact:false,jaccard:0};
  const grams=s=>new Set(Array.from({length:Math.max(0,s.length-3)},(_,i)=>s.slice(i,i+4)));
  const p=grams(x),q=grams(y);const common=[...p].filter(k=>q.has(k)).length;
  return {comparable:true,exact:x===y,jaccard:common/Math.max(1,p.size+q.size-common)};
}
const results=[];
for(const chart of data.charts){
  const strength=chart.sections.find(r=>r.id==='P01-09');
  for(const other of chart.sections.filter(r=>r.id!=='P01-09')){
    const metrics=Object.fromEntries(Object.entries(dimensions).map(([name,fn])=>[name,overlap(fn(strength),fn(other))]));
    const valid=Object.values(metrics).every(x=>x.comparable);
    const matching=Object.values(metrics).filter(x=>x.exact||x.jaccard>=0.72).length;
    results.push({caseId:chart.id,pair:['P01-09',other.id],strengthCandidateId:strength.candidateId,
      otherCandidateId:other.candidateId,metrics,verdict:!valid?'NOT_COMPARABLE':matching>=2?'HIGH_SIMILARITY_REVIEW':matching===1?'SINGLE_AXIS_REVIEW':'DISTINCT_OR_UNDETERMINED',
      sharedSymbolFamily:Boolean(strength.semantic&&strength.semantic===other.semantic)});
  }
}
const blocked=data.charts.flatMap(c=>c.sections.filter(s=>s.status!=='READY_FOR_REVIEW'||s.type==='empty').map(s=>({caseId:c.id,sectionId:s.id,reason:s.id==='P01-10'&&!c.sections.find(r=>r.id==='P01-09')?.action?'STRENGTH_WITHOUT_STRUCTURED_BEHAVIOR':'REVIEW_REQUIRED',status:s.status,type:s.type})));
const summary={version:'V18',basis:'V17 12 birth-time fictional charts, 120 slots; no live API / no psychological validation',
  comparisonPrinciple:'behavior, decision basis and trigger are distinct axes; symbolic-family match by itself never proves content duplication',
  caseCount:data.charts.length,selected:data.selected,unselected:data.empty,blocked,
  verdictCounts:Object.fromEntries([...new Set(results.map(r=>r.verdict))].map(v=>[v,results.filter(r=>r.verdict===v).length])),results};
assert.equal(data.charts.length,12);assert.equal(results.length,108);
assert(blocked.some(x=>x.caseId==='RC11'&&x.sectionId==='P01-10'&&x.reason==='STRENGTH_WITHOUT_STRUCTURED_BEHAVIOR'));
assert(results.filter(x=>x.verdict==='HIGH_SIMILARITY_REVIEW').every(x=>Object.values(x.metrics).filter(v=>v.exact||v.jaccard>=0.72).length>=2));
const folder=path.join(root,'docs/v18_cross_chart_audit');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'strength_overlap_three_axis.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({cases:summary.caseCount,selected:summary.selected,unselected:summary.unselected,blocked:blocked.length,verdictCounts:summary.verdictCounts},null,2));
