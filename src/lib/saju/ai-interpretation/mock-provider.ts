import type {InterpretationInput,InterpretationProvider,InterpretationProviderRequest,InterpretationProviderResponse,StructuredInterpretation} from "@/types/ai-interpretation";

function evidenceFor(row:{evidenceIds:string[]}){return row.evidenceIds.slice(0,Math.min(4,Math.max(2,row.evidenceIds.length)));}
function claim(id:string,row:{id:string;evidenceIds:string[]},index:number){
  const ids=evidenceFor(row);
  return {claimId:id,plainMeaning:"여러 계산 근거를 함께 읽어 생활에서 반복되는 방식을 설명합니다.",evidenceIds:ids,sourceFields:ids.map(item=>`${item}.value`),confidence:"HIGH",
    allowedChapters:[row.id],avoidRepeatingIn:[],pageQuestion:"이 페이지에서 실제로 확인할 생활 모습은 무엇인가요?",personPattern:"확인한 뒤 움직이고, 정한 일은 끝까지 챙기는 방식입니다.",
    lifeScene:`${index+1}번째 장면에서는 선택하기 전과 선택한 뒤의 속도가 달라집니다.`,upside:"기준이 분명해 실수를 줄입니다.",shadow:"혼자 오래 붙들면 부담이 커집니다.",
    domainManifestation:"이 페이지의 분야에서는 확인과 실행의 순서로 드러납니다.",timing:"시기 근거가 있을 때만 도움과 변화를 나눠 읽습니다.",actionClose:"결정 기준을 한 줄로 적어 두세요.",
    claimsUsed:[id],scenesUsed:[`SCENE-${index+1}`],priorSectionSummary:index?"앞 장의 결론을 그대로 되풀이하지 않습니다.":"",domainConsequence:`${row.id}에서만 생기는 결과를 설명합니다.`};
}
function plan(input:InterpretationInput){
  const rows=input.reportPlan??[],first=rows[0];
  if(!first)throw new Error("mock 해설에 reportPlan이 필요합니다.");
  const pick=(name:string)=>[claim(name,first,0)];
  return {planVersion:"interpretation-plan-v1",characterCore:{corePatterns:["확인한 뒤 움직이고 정한 일은 끝까지 챙깁니다."],contradictions:["신중하게 시작하지만 결정 뒤에는 속도가 빨라집니다."],dominantStrengths:["기준을 세우고 마무리하는 힘"],shadowPatterns:["혼자 다시 확인하느라 부담을 떠안을 수 있습니다."],relationshipPattern:"가까워지기 전에는 오래 보고, 가까워진 뒤에는 행동으로 챙깁니다.",workPattern:"책임 범위가 분명할 때 기준을 세워 결과를 냅니다.",decisionPattern:"정보를 확인한 뒤 기준이 서면 빠르게 움직입니다."},coreIdentity:pick("CORE"),outerVsInner:pick("OUTER"),decisionPattern:pick("DECISION"),strengths:pick("STRENGTH"),strengthTradeoffs:pick("SHADOW"),
    workPattern:pick("WORK"),moneyPattern:pick("WEALTH"),relationshipPattern:pick("RELATIONSHIP"),wellnessPattern:pick("WELLNESS"),familyChildrenPattern:pick("CHILDREN"),lifeFlowTheme:pick("FLOW"),
    chapterClaims:rows.map((row,index)=>({sectionId:row.id,claims:[claim(`PAGE-${row.pageNumber??index+1}`,row,index)]}))};
}
function report(input:InterpretationInput):StructuredInterpretation{
  const rows=input.reportPlan??[];
  const sections=rows.map((row,index)=>{const ids=evidenceFor(row),target=["IDENTITY","ELEMENTS","STRENGTH"].includes(row.evidenceGroup??"")?1250:row.density==="TIMING_CORE"?1020:row.density==="CORE"?920:row.density==="GENERAL"?570:270;
    const seeds=[
      `이번 ${row.chapterNumber??index+1}번째 이야기는 선택을 앞두고 확인하는 순간과 마음을 정한 뒤 움직이는 순간을 나눠 봅니다.`,
      `${row.chapterNumber??index+1}번째 기준이 잘 쓰이면 주변 사람도 다음 행동을 예상하기 쉬워집니다. 다만 모든 몫을 혼자 들고 가면 같은 힘이 부담으로 바뀝니다.`,
      `${row.chapterNumber??index+1}번째 생활 장면에서는 일이 몰렸을 때 먼저 순서를 세우고 직접 확인합니다. 이때 맡길 몫을 구분하면 장점은 남고 피로는 줄어듭니다.`,
      `이 글은 ${row.id}에 허용된 계산 근거만 사용합니다. 도움받기 쉬운 정도와 변화가 큰 정도도 한 문장으로 섞지 않습니다.`];
    const paragraphs=seeds.map((seed,paragraphIndex)=>{let value=seed;const additions=[" 무엇을 먼저 할지 정하면 망설임이 짧아집니다."," 가까운 사람에게는 이유를 먼저 말해 주는 편이 좋습니다."," 속도를 내기 전 확인할 범위를 정하면 혼자 병목이 되지 않습니다."," 선택 뒤에는 결과를 기록해 다음 판단의 기준으로 남겨 보세요."];
      while(value.length<target/4)value+=additions[(index+paragraphIndex+value.length)%additions.length];return value;});
    return {id:row.id,chapterNumber:row.chapterNumber,title:row.title,headline:"이번 이야기에서 확인할 생활 모습",lead:"서로 맞물리는 계산 근거를 함께 살폈습니다.",body:paragraphs.join("\n\n"),paragraphs,keyPoints:["장점과 부담은 같은 성향의 다른 쓰임입니다."],evidenceIds:ids,
      partNumber:row.partNumber,partTitle:row.partTitle,evidenceGroup:row.evidenceGroup,contentKind:row.contentKind,noveltyElements:["NEW_CLAIM","NEW_SCENE","NEW_ACTION"],
      claimsUsed:[`PAGE-${row.pageNumber??index+1}`],scenesUsed:[`SCENE-${row.pageNumber??index+1}`],priorSectionSummary:index?"앞 section과 다른 분야의 결과를 설명합니다.":"",domainConsequence:`고유표식${row.id.replace(/\d/g,d=>"영일이삼사오육칠팔구"[Number(d)]).replace(/-/g,"")}에서만 확인하는 선택과 행동의 결과입니다.`,
      ...(row.contentKind==="PROFESSIONAL"?{professionalDetails:{summary:"계산 근거는 전문 분석실에서만 확인할 수 있습니다.",evidenceIds:ids}}:{})};});
  return {status:"completed",reportType:input.reportType,headline:"계산은 그대로 두고, 삶의 장면으로 풀었습니다",summary:"한 가지 표지만으로 단정하지 않고 서로 관련된 근거를 함께 읽었습니다.",sections,
    highlights:["같은 성향도 분야에 따라 다른 행동으로 드러납니다."],cautions:["움직임이 크다는 말과 유리하다는 말은 같지 않습니다."],timeline:[],disclaimer:"전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다."};
}
export class MockInterpretationProvider implements InterpretationProvider{
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{
    const fixedCore={corePatterns:["확인한 뒤 움직이고 정한 일은 끝까지 챙깁니다."],contradictions:["신중하게 시작하지만 결정 뒤에는 속도가 빨라집니다."],dominantStrengths:["기준을 세우고 마무리하는 힘"],shadowPatterns:["혼자 다시 확인하느라 부담을 떠안을 수 있습니다."],relationshipPattern:"가까워지기 전에는 오래 보고, 가까워진 뒤에는 행동으로 챙깁니다.",workPattern:"책임 범위가 분명할 때 기준을 세워 결과를 냅니다.",decisionPattern:"정보를 확인한 뒤 기준이 서면 빠르게 움직입니다."};
    if("corePatterns" in ((request.schema.properties??{}) as Record<string,unknown>))return {output:fixedCore,provider:"mock",model:"deterministic-fixture-v3",tokenUsage:{input:0,output:0}};
    const wantsPlan="planVersion" in ((request.schema.properties??{}) as Record<string,unknown>);
    return {output:wantsPlan?plan(request.input):report(request.input),provider:"mock",model:"deterministic-fixture-v3",tokenUsage:{input:0,output:0}};
  }
}
