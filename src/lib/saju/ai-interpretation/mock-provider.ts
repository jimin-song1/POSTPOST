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
  return {planVersion:"interpretation-plan-v1",coreIdentity:pick("CORE"),outerVsInner:pick("OUTER"),decisionPattern:pick("DECISION"),strengths:pick("STRENGTH"),strengthTradeoffs:pick("SHADOW"),
    workPattern:pick("WORK"),moneyPattern:pick("WEALTH"),relationshipPattern:pick("RELATIONSHIP"),wellnessPattern:pick("WELLNESS"),familyChildrenPattern:pick("CHILDREN"),lifeFlowTheme:pick("FLOW"),
    chapterClaims:rows.map((row,index)=>({sectionId:row.id,claims:[claim(`PAGE-${row.pageNumber??index+1}`,row,index)]}))};
}
function report(input:InterpretationInput):StructuredInterpretation{
  const rows=input.reportPlan??[];
  const sections=rows.map((row,index)=>{const ids=evidenceFor(row),scene=`이번 ${row.pageNumber??index+1}번째 페이지에서는 머릿속으로만 성향을 말하지 않습니다. 선택을 앞두고 확인하는 순간과, 마음을 정한 뒤 직접 움직이는 순간을 나눠 봅니다.`;
    const close="잘 쓰이면 기준이 선명해집니다. 다만 모든 몫을 혼자 들고 가면 같은 힘이 부담으로 바뀝니다. 오늘은 결정 기준을 짧게 적고, 맡길 몫 하나를 구분해 보세요.";
    return {id:row.id,chapterNumber:row.chapterNumber,title:row.title,headline:"이번 이야기에서 확인할 생활 모습",lead:"서로 맞물리는 계산 근거를 함께 살폈습니다.",body:`${scene}\n\n${close}`,paragraphs:[scene,`${close} 이 페이지에서는 ${row.id}의 분야 결과만 다룹니다.`],keyPoints:["장점과 부담은 같은 성향의 다른 쓰임입니다."],evidenceIds:ids,
      claimsUsed:[`PAGE-${row.pageNumber??index+1}`],scenesUsed:[`SCENE-${row.pageNumber??index+1}`],priorSectionSummary:index?"앞 페이지와 다른 분야의 결과를 설명합니다.":"",domainConsequence:`${row.evidenceGroup??"CORE"} 분야에서 나타나는 행동을 다룹니다.`,
      ...(row.chapterNumber==="154"?{professionalDetails:{summary:"계산 근거는 전문 분석실에서만 확인할 수 있습니다.",evidenceIds:ids}}:{})};});
  return {status:"completed",reportType:input.reportType,headline:"계산은 그대로 두고, 삶의 장면으로 풀었습니다",summary:"한 가지 표지만으로 단정하지 않고 서로 관련된 근거를 함께 읽었습니다.",sections,
    highlights:["같은 성향도 분야에 따라 다른 행동으로 드러납니다."],cautions:["움직임이 크다는 말과 유리하다는 말은 같지 않습니다."],timeline:[],disclaimer:"전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다."};
}
export class MockInterpretationProvider implements InterpretationProvider{
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{
    const wantsPlan="planVersion" in ((request.schema.properties??{}) as Record<string,unknown>);
    return {output:wantsPlan?plan(request.input):report(request.input),provider:"mock",model:"deterministic-fixture-v3",tokenUsage:{input:0,output:0}};
  }
}
