'use strict';
/** Off-line style checks for separately authored manuscript demos; not an API generation test. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
let ts; try { ts=require('typescript'); } catch (_) {ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');}
const root=path.resolve(__dirname,'..');const old=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return old.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(m,f){m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f)};
const {lintCustomerKoreanWriting}=require(root+'/src/lib/saju/ai-interpretation/korean-writing-style.v1.ts');
const input=JSON.parse(fs.readFileSync(path.join(root,'docs/v14_real_chart_audit/customer_copy_samples.json'),'utf8'));
let n=0,fail=[];
for(const [caseId,sections]of Object.entries(input))for(const [sectionId,sentences]of Object.entries(sections)){
 const text=sentences.join('\n');const errors=lintCustomerKoreanWriting(text);
 const endings=(text.match(/수\s*있습니다/g)||[]).length;
 if(endings>2)errors.push('REPETITIVE_HEDGE_REVIEW');
 if(errors.length)fail.push({caseId,sectionId,errors});n++;
}
console.log(JSON.stringify({reviewedSections:n,styleViolations:fail.length,findings:fail},null,2));
if(fail.length)process.exitCode=1;
