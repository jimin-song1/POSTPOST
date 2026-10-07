"use client";
import { useCallback, useEffect, useState } from "react";
import { SajuInputForm, type LifetimeFormResult } from "@/components/SajuInputForm";
import { LifetimeReport } from "@/components/LifetimeReport";
import {buildDynamicLifetimeBook} from "@/rules/lifetime-report.v4";
import {validateLifetimeContentContract} from "@/lib/saju/ai-interpretation/lifetime-content-contract";
import type { CustomerResultPayload, InterpretationUiState } from "@/types/customer-result";
import type {CharacterCore, InterpretationSuccess, RelationshipStatus } from "@/types/ai-interpretation";

type LifetimeGenerationErrorCode="GLOBAL_PLAN_FAILED"|"PART_GENERATION_FAILED";
class LifetimeGenerationError extends Error{constructor(readonly code:LifetimeGenerationErrorCode,message:string){super(message);this.name="LifetimeGenerationError";}}

async function requestGlobalCharacterCore(payload:CustomerResultPayload,relationship:RelationshipStatus,year:number):Promise<CharacterCore>{
  const response=await fetch("/api/saju/interpret/global-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:payload.analysis.birthInput,relationshipStatus:relationship,year})});
  const raw=await response.text();let parsed:{characterCore?:CharacterCore;error?:string}|null=null;
  try{parsed=raw?JSON.parse(raw) as {characterCore?:CharacterCore;error?:string}:null;}catch{}
  if(!response.ok||!parsed?.characterCore)throw new LifetimeGenerationError("GLOBAL_PLAN_FAILED",parsed?.error||raw.slice(0,180)||"전체 인물상 설계에 실패했습니다.");return parsed.characterCore;
}
async function requestLifetimePart(payload:CustomerResultPayload,relationship:RelationshipStatus,year:number,partNumber:string,characterCore:CharacterCore):Promise<InterpretationSuccess>{
  const response=await fetch("/api/saju/interpret",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({input:payload.analysis.birthInput,reportType:"LIFETIME_GENERAL",relationshipStatus:relationship,year,lifetimePartNumber:partNumber,characterCore})});
  const raw=await response.text();
  let parsed:unknown;try{parsed=raw?JSON.parse(raw):null;}catch{parsed=null;}
  if(!response.ok){
    const message=parsed&&typeof parsed==="object"&&"error" in parsed
      ?typeof (parsed as {error?:unknown}).error==="string"?(parsed as {error:string}).error
        :(parsed as {error?:{message?:string}}).error?.message
      :null;
    throw new LifetimeGenerationError("PART_GENERATION_FAILED",message||raw.slice(0,180)||`해설 파트 ${partNumber} 생성 요청이 실패했습니다. (${response.status})`);
  }
  if(!parsed||typeof parsed!=="object"||!("status" in parsed))throw new LifetimeGenerationError("PART_GENERATION_FAILED",`해설 파트 ${partNumber} 응답 형식이 올바르지 않습니다.`);
  if((parsed as {status?:string}).status!=="completed"){
    const failed=parsed as {error?:{message?:string}};
    throw new LifetimeGenerationError("PART_GENERATION_FAILED",failed.error?.message||`해설 파트 ${partNumber} 생성에 실패했습니다.`);
  }
  return parsed as InterpretationSuccess;
}
function mergeLifetimeParts(parts:InterpretationSuccess[]):InterpretationSuccess{
  const first=parts[0];
  const sections=parts.flatMap(row=>row.report.sections).sort((a,b)=>Number(a.chapterNumber??0)-Number(b.chapterNumber??0));
  const timeline=Array.from(new Map(parts.flatMap(row=>row.report.timeline).map(row=>[row.periodId,row])).values());
  const highlights=Array.from(new Set(parts.flatMap(row=>row.report.highlights)));
  const cautions=Array.from(new Set(parts.flatMap(row=>row.report.cautions)));
  const inputTokens=parts.reduce((sum,row)=>sum+(row.metadata.tokenUsage?.input??0),0);
  const outputTokens=parts.reduce((sum,row)=>sum+(row.metadata.tokenUsage?.output??0),0);
  return{
    ...first,
    analysisHash:`dynamic-lifetime-book-v4:${first.analysisHash}`,
    cacheKey:`dynamic-lifetime-book-v4:${first.cacheKey}`,
    report:{...first.report,sections,timeline,highlights,cautions},
    metadata:{...first.metadata,repaired:parts.some(row=>row.metadata.repaired),tokenUsage:{input:inputTokens,output:outputTokens}},
  };
}

export default function Home() {
  const [result,setResult]=useState<CustomerResultPayload|null>(null),[relationshipStatus,setRelationshipStatus]=useState<RelationshipStatus>("SINGLE");
  const [interpretation,setInterpretation]=useState<InterpretationUiState>({status:"not_requested"});
  const [refreshNotice,setRefreshNotice]=useState(false);
  useEffect(()=>{if(sessionStorage.getItem("postpost-lifetime-result-active")==="true")setRefreshNotice(true);},[]);
  const requestInterpretation=useCallback(async(payload:CustomerResultPayload,relationship:RelationshipStatus)=>{
    const year=new Date().getFullYear(),fortune=payload.analysis.fortune,includeSamjae=fortune.status==="partial"&&"samjae" in fortune&&fortune.samjae.status==="implemented";
    const parts=buildDynamicLifetimeBook({includeSamjae,year}).parts;
    setInterpretation({status:"pending",stage:"CHARACTER_CORE",completedParts:0,totalParts:parts.length});
    try{
      const completed:InterpretationSuccess[]=[],characterCore=await requestGlobalCharacterCore(payload,relationship,year);
      setInterpretation({status:"pending",stage:"PARTS",completedParts:0,totalParts:parts.length});
      for(const part of parts){
        completed.push(await requestLifetimePart(payload,relationship,year,part.partNumber,characterCore));
        setInterpretation({status:"pending",stage:"PARTS",completedParts:completed.length,totalParts:parts.length});
      }
      setInterpretation({status:"pending",stage:"MERGE",completedParts:completed.length,totalParts:parts.length});
      const merged=mergeLifetimeParts(completed);
      try{
        validateLifetimeContentContract(merged.report);
      }catch(error){
        console.warn("lifetime_content_contract_warning",{
          message:error instanceof Error?error.message:"평생사주 콘텐츠 계약 검증 경고",
          reportVersion:"dynamic-lifetime-book-v4"
        });
      }
      setInterpretation(merged);
    }catch(error){
      const code=error instanceof TypeError?"NETWORK_ERROR":error instanceof LifetimeGenerationError?error.code:"PART_GENERATION_FAILED";
      setInterpretation({status:"failed",ruleVersion:"ai-interpretation-v1",error:{code: code, message:error instanceof Error?error.message:"해설 생성 중 오류가 발생했습니다."}});
    }
  },[]);
  function accept(value:LifetimeFormResult){sessionStorage.setItem("postpost-lifetime-result-active","true");setRefreshNotice(false);setResult(value.payload);setRelationshipStatus(value.relationshipStatus);void requestInterpretation(value.payload,value.relationshipStatus);}
  if(result)return <LifetimeReport analysis={result.analysis} current={result.current} relationshipStatus={relationshipStatus} interpretation={interpretation}
    onRetry={()=>void requestInterpretation(result,relationshipStatus)} onRestart={()=>{sessionStorage.removeItem("postpost-lifetime-result-active");setRefreshNotice(false);setResult(null);setInterpretation({status:"not_requested"});}}/>;
  return <main className="lifetimeInputPage">{refreshNotice&&<div className="refreshRecoveryNotice" role="status"><b>새로고침되어 이전 결과를 다시 불러올 수 없어요.</b><span>같은 정보를 입력하면 Mock 사주책을 다시 만들 수 있습니다.</span><button onClick={()=>{sessionStorage.removeItem("postpost-lifetime-result-active");setRefreshNotice(false);}}>확인</button></div>}<SajuInputForm onResult={accept}/><p className="inputDisclaimer">전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다.</p></main>;
}
