'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require(process.env.TYPESCRIPT_MODULE||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const root=path.resolve(__dirname,'..');
const helper=path.join(root,'src/lib/saju/ai-interpretation/personality-manuscript-audit.v1.ts');
const compiled=ts.transpileModule(fs.readFileSync(helper,'utf8'),{fileName:helper,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal(compiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length??0,0);
const mod={exports:{}};new Function('module','exports','require',compiled.outputText)(mod,mod.exports,require);
const {auditPersonalityManuscript,PERSONALITY_SECTION_BOUNDARIES}=mod.exports;
const original=fs.readFileSync(path.join(root,'docs/v9-personality-manuscript-preview.md'),'utf8');
const revised=fs.readFileSync(path.join(root,'docs/v10-personality-manuscript-revised.md'),'utf8');
function parseMarkdown(md){
 const re=/^## (\d{2})\. ([^\n]+)$/gm;const headers=[...md.matchAll(re)];
 return headers.filter(m=>m[1]!=='11').map((m,i)=>{
 const start=m.index+m[0].length, end=i+1<headers.length?headers[i+1].index:md.search(/\n---\n\n### 편집자/);
 const sectionText=md.slice(start,end>start?end:undefined).replace(/\*\*([^*]+)\*\*/g,'$1').trim();
 const paragraphs=sectionText.split(/\n\s*\n/).filter(Boolean);
 return {id:'P01-'+m[1],headline:m[2],lead:paragraphs[0]||'',paragraphs:paragraphs.slice(1)};
 });
}
const current=parseMarkdown(original), improved=parseMarkdown(revised);
const a=auditPersonalityManuscript(current), b=auditPersonalityManuscript(improved);
const rows=[];function check(name, fn){try{fn();rows.push({name,result:'PASS'});}catch(e){rows.push({name,result:'FAIL',message:String(e)})}}
check('10 complete sections in original and revised',()=>{assert.equal(current.length,10);assert.equal(improved.length,10)});
check('all section scope descriptions defined',()=>{assert.equal(Object.keys(PERSONALITY_SECTION_BOUNDARIES).length,10)});
check('02 is always a reader-validation finding',()=>{assert(a.findings.some(f=>f.code==='FIRST_IMPRESSION_NEEDS_READER_VALIDATION'));assert(b.findings.some(f=>f.code==='FIRST_IMPRESSION_NEEDS_READER_VALIDATION'))});
check('03 is always a personal-history validation finding',()=>{assert(b.findings.some(f=>f.code==='PRIVATE_HABIT_UNOBSERVED'))});
check('original and revised contain no structural hard blockers',()=>{assert(!a.findings.some(f=>f.level==='BLOCK'));assert(!b.findings.some(f=>f.level==='BLOCK'))});
check('reject missing contrast in 02',()=>{const fail=auditPersonalityManuscript([{id:'P01-02',headline:'성격',lead:'낯선 자리에서 집중합니다.',paragraphs:['작업을 정리합니다.']}]);assert(fail.findings.some(f=>f.code==='MISSING_PUBLIC_PRIVATE_CONTRAST'&&f.level==='BLOCK'))});
check('reject first impression presented as observed certainty',()=>{const fail=auditPersonalityManuscript([{id:'P01-02',headline:'첫인상',lead:'처음 만나는 사람은 반드시 신뢰감을 느낍니다.',paragraphs:['가까운 관계에서는 다릅니다.']}]);assert(fail.findings.some(f=>f.code==='ASSERTED_EXTERNAL_OBSERVATION'&&f.level==='BLOCK'))});
check('reject private chapter without a private context',()=>{const fail=auditPersonalityManuscript([{id:'P01-03',headline:'나',lead:'출근해서 일을 완성합니다.',paragraphs:[]}]);assert(fail.findings.some(f=>f.code==='NO_PRIVATE_CONTEXT'&&f.level==='BLOCK'))});
check('warn when chapter 09 is only decision making',()=>{const fail=auditPersonalityManuscript([{id:'P01-09',headline:'강점',lead:'선택지를 비교합니다. 제안을 정하고 기회비용을 살핍니다.',paragraphs:[]}]);assert(fail.findings.some(f=>f.code==='STRENGTH_REPEATS_DECISION'))});
check('warn when chapter 10 repeats group roles',()=>{const fail=auditPersonalityManuscript([{id:'P01-10',headline:'단점',lead:'함께 맡는 역할을 합의합니다. 공동의 역할과 분담이 중요합니다.',paragraphs:[]}]);assert(fail.findings.some(f=>f.code==='WEAKNESS_REPEATS_TEAMWORK'))});
check('warn on hedging formulas',()=>{const fail=auditPersonalityManuscript([{id:'P01-06',headline:'선택',lead:'이 해석은 설명입니다. 이 해석은 예시입니다.',paragraphs:['모습으로 풀이할 수 있습니다.']}]);assert(fail.findings.some(f=>f.code==='FORMULAIC_HEDGING'))});
check('original and revised leave 02 and 03 requiring user validation',()=>{for(const report of [a,b])assert(report.status==='review_required')});
check('revised manuscript excludes forbidden punctuation',()=>{assert(!/[—–·]/.test(revised))});
check('generation validator receives manuscript audit',()=>{const code=fs.readFileSync(path.join(root,'src/lib/saju/ai-interpretation/personality-generation.v1.ts'),'utf8');assert(code.includes('auditPersonalityManuscript(draft.sections)'));assert(code.includes('reviewWarnings:auditPersonalityManuscript'))});
check('TypeScript syntax of generation changes',()=>{const f=path.join(root,'src/lib/saju/ai-interpretation/personality-generation.v1.ts');const result=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0)});
const out={testType:'Node + isolated TypeScript transpilation, not npm Vitest or actual AI API',checks:rows,tests:rows.length,passed:rows.filter(x=>x.result==='PASS').length,failed:rows.filter(x=>x.result==='FAIL').length,original:a,revised:b};
fs.writeFileSync(path.join(root,'docs/v10_manuscript_audit.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({tests:out.tests,passed:out.passed,failed:out.failed,original:a.findings.map(f=>f.code),revised:b.findings.map(f=>f.code)},null,2));if(out.failed)process.exitCode=1;
