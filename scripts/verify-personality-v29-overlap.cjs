'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..');const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...rest)};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {behavioralOverlap}=require(root+'/src/lib/saju/ai-interpretation/personality-claim-guard.v1.ts');
const C=(action,motifs,basis='기준 A')=>({behaviorHypothesis:{observableBehavior:action,semanticMotifs:motifs,semanticFamilyPairKey:'peer|wealth',decisionBasis:basis,trigger:'상황이 바뀔 때'}});
const scenarios=[
 ['same-action-different-motifs',C('결정 기준을 비교하여 처리 순서를 정하는 모습',['x']),C('결정 기준을 비교하여 처리 순서를 정하는 모습',['y']),true],
 ['same-action-punctuation',C('결정 기준을 비교하여 처리 순서를 정하는 모습.',['x']),C('결정 기준을 비교하여 처리 순서를 정하는 모습',['y']),true],
 ['motif-overlap-different-action',C('결정 기준을 비교하여 처리 순서를 정하는 모습',['a','b','c']),C('담당자와 협의하여 책임 범위를 정하는 모습',['a','b','c']),true],
 ['distinct-action-distinct-motifs',C('선택지별 비용을 정리하는 모습',['a']),C('의견을 말하기 전 사실관계를 설명하는 모습',['b']),false],
];
const results=scenarios.map(([name,a,b,expected])=>{const actual=behavioralOverlap(a,b).nearDuplicate;assert.equal(actual,expected,name);return{name,actual,expected}});
const out={version:'V29',mode:'UNIT_CONTRACT_ONLY',results};const d=root+'/docs/v29_overlap_verification';fs.mkdirSync(d,{recursive:true});fs.writeFileSync(d+'/unit_results.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
