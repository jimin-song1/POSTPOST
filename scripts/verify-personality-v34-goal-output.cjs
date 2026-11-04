'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const root=path.resolve(__dirname,'..');
const rel='src/lib/saju/ai-interpretation/personality-behavior.v2.ts';
const code=fs.readFileSync(path.join(root,rel),'utf8');
const parsed=ts.createSourceFile(rel,code,ts.ScriptTarget.Latest,true);
const decl=parsed.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text==='extractGoalOutputV34');
assert(decl,'missing V34 extractor');
const source=decl.getText(parsed).replace(/^export\s+/,'');
const compiled=ts.transpileModule(source+'\nmodule.exports=extractGoalOutputV34;', {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
assert(!(compiled.diagnostics||[]).some(x=>x.category===ts.DiagnosticCategory.Error),'transpile errors');
const sandbox={module:{exports:null}};vm.runInNewContext(compiled.outputText,sandbox,{timeout:1000});
const extract=sandbox.module.exports;
const examples=[
 ['정해진 기준을 살피고 작업의 결과를 마무리하는 두 방향을 함께 검토하는 모습','공동의 절차 안에서 결과물을 완성해야 할 때',true],
 ['누가 지출을 맡을지 합의하는 모습','여럿이 비용을 나눌 때',true],
 ['시급한 요청의 우선 책임을 정리한 다음 익숙한 설명의 근거를 확인하는 두 과정을 연결할 가능성을 살피는 모습','문제가 생길 때',false],
 ['기회비용을 고려하고 낯선 방식을 검토하는 모습','여러 선택지가 있을 때',false],
 ['', '시험', false],
 ['대안별 기회비용과 활용 가능성을 검토한 다음 합의된 기준과 절차를 확인하는 모습','여러 거래 조건 중 공식 기준에 맞는 선택지를 골라야 할 때',false] // V35: V34 false positive (기회비용…합의)
];
for(const [a,t,expected] of examples){const o=extract(a,t);assert.equal(o.goalOutputEvidence==='EXPLICIT_SCENE',expected);assert.equal(Boolean(o.actionGoal),expected);assert.equal(Boolean(o.observableOutput),expected)}
// V35: the generator now calls goalOutputForScene(), which uses the rule table and falls back to extractGoalOutputV34.
assert(code.includes('...goalOutputForScene(')&&/const v34=extractGoalOutputV34\(action,trigger\)/.test(code),'generator does not populate fields');
assert(code.includes('actionGoal: string | null')&&code.includes('observableOutput: string | null'));
const report={version:'V34',newTests:examples.length+2,passed:true,mode:'extraction unit + source contract; not 12-chart run',selectionEngineChanges:false,rc11Approved:0};
fs.mkdirSync(path.join(root,'docs/v34_goal_output'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/v34_goal_output/test_results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
