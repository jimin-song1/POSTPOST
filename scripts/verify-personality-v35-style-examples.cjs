'use strict';
/**
 * V35: does the example text follow the korean-writing-style skill?
 * - Layer A: engine behavior hypotheses (internal brief material, NOT customer copy)
 * - Layer B: reference customer-tone drafts in docs/v35_goal_output_overlap/V35_예시문장.md §3
 * Uses exactly the runtime checks: lintCustomerKoreanWriting (blocking), reviewCustomerKoreanWriting
 * (non-blocking skill rules) and auditPersonalityManuscript. Heuristics need human review; passing is not proof of style.
 */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..');
const oR=Module._resolveFilename;Module._resolveFilename=function(n,p,...r){return oR.call(this,n.startsWith('@/')?path.join(root,'src',n.slice(2)):n,p,...r)};
require.extensions['.ts']=function(m,f){m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f)};
const {lintCustomerKoreanWriting,reviewCustomerKoreanWriting}=require(root+'/src/lib/saju/ai-interpretation/korean-writing-style.v1.ts');
const {auditPersonalityManuscript}=require(root+'/src/lib/saju/ai-interpretation/personality-manuscript-audit.v1.ts');

const softCheck=t=>reviewCustomerKoreanWriting(t);

// Layer A: engine hypotheses (12 charts, all chapters)
const twelve=JSON.parse(fs.readFileSync(path.join(root,'docs/v17_cross_chart_audit/twelve_date_charts.json'),'utf8'));
const engineRows=twelve.charts.flatMap(c=>c.sections.filter(s=>s.type==='structured').map(s=>{const text=s.trigger+', '+s.action;return{chart:c.id,section:s.id,hard:lintCustomerKoreanWriting(text),soft:softCheck(text)}}));
const tally=rows=>rows.reduce((o,r)=>{for(const c of [...r.hard,...r.soft])o[c]=(o[c]||0)+1;return o},{});

// Layer B: reference drafts (blockquotes under §3 headings)
const md=fs.readFileSync(path.join(root,'docs/v35_goal_output_overlap/V35_예시문장.md'),'utf8');
const sec3=md.slice(md.indexOf('## 3.'));
const grab=title=>{const i=sec3.indexOf('**'+title+'**');if(i<0)return '';return sec3.slice(i).split('\n').filter(l=>l.startsWith('> ')).slice(0,1).map(l=>l.slice(2)).join(' ')};
const drafts={'P01-09':grab('가장 큰 장점'),'P01-10':grab('나를 힘들게 하는 성격')};
const draftRows=Object.entries(drafts).map(([id,text])=>({section:id,text,hard:lintCustomerKoreanWriting(text),soft:softCheck(text),hedges:(text.match(/수(?:도)? 있습니다/g)||[]).length}));
const audit=auditPersonalityManuscript(Object.entries(drafts).map(([id,text])=>({id,headline:'',lead:'',paragraphs:[text]})));

const report={version:'V35 style check',note:'Runtime lint + manuscript audit + heuristic skill rules. Human review still required.',
  engineHypotheses:{rows:engineRows.length,withHardViolations:engineRows.filter(r=>r.hard.length).length,codeCounts:tally(engineRows)},
  referenceDrafts:{rows:draftRows,manuscriptAudit:audit}};
fs.writeFileSync(path.join(root,'docs/v35_goal_output_overlap/style_check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({engine:report.engineHypotheses,drafts:draftRows.map(r=>({section:r.section,hard:r.hard,soft:r.soft,hedges:r.hedges})),audit},null,2));
