"use client";
import { useCallback, useState } from "react";
import { SajuInputForm, type LifetimeFormResult } from "@/components/SajuInputForm";
import { LifetimeReport } from "@/components/LifetimeReport";
import { LIFETIME_BOOK_V1 } from "@/rules/lifetime-report.v3";
import type { CustomerResultPayload, InterpretationUiState } from "@/types/customer-result";
import type { InterpretationSuccess, RelationshipStatus } from "@/types/ai-interpretation";

const BATCH_SIZE=3;

async function requestLifetimePart(payload:CustomerResultPayload,relationship:RelationshipStatus,year:number,partNumber:string):Promise<InterpretationSuccess>{
  const response=await fetch("/api/saju/interpret",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({input:payload.analysis.birthInput,reportType:"LIFETIME_GENERAL",relationshipStatus:relationship,year,lifetimePartNumber:partNumber})});
  const raw=await response.text();
  let parsed:unknown;try{parsed=raw?JSON.parse(raw):null;}catch{parsed=null;}
  if(!response.ok){
    const message=parsed&&typeof parsed==="object"&&"error" in parsed
      ?typeof (parsed as {error?:unknown}).error==="string"?(parsed as {error:string}).error
        :(parsed as {error?:{message?:string}}).error?.message
      :null;
    throw new Error(message||raw.slice(0,180)||`해설 파트 ${partNumber} 생성 요청이 실패했습니다. (${response.status})`);
  }
  if(!parsed||typeof parsed!=="object"||!("status" in parsed))throw new Error(`해설 파트 ${partNumber} 응답 형식이 올바르지 않습니다.`);
  if((parsed as {status?:string}).status!=="completed"){
    const failed=parsed as {error?:{message?:string}};
    throw new Error(failed.error?.message||`해설 파트 ${partNumber} 생성에 실패했습니다.`);
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
    analysisHash:`lifetime-book-v3:${first.analysisHash}`,
    cacheKey:`lifetime-book-v3:${first.cacheKey}`,
    report:{...first.report,sections,timeline,highlights,cautions},
    metadata:{...first.metadata,repaired:parts.some(row=>row.metadata.repaired),tokenUsage:{input:inputTokens,output:outputTokens}},
  };
}

export default function Home() {
  const [result,setResult]=useState<CustomerResultPayload|null>(null),[relationshipStatus,setRelationshipStatus]=useState<RelationshipStatus>("SINGLE");
  const [interpretation,setInterpretation]=useState<InterpretationUiState>({status:"not_requested"});
  const requestInterpretation=useCallback(async(payload:CustomerResultPayload,relationship:RelationshipStatus)=>{
    const parts=LIFETIME_BOOK_V1.parts,year=new Date().getFullYear();
    setInterpretation({status:"pending",completedParts:0,totalParts:parts.length});
    try{
      const completed:InterpretationSuccess[]=[];
      for(let i=0;i<parts.length;i+=BATCH_SIZE){
        const batch=parts.slice(i,i+BATCH_SIZE);
        const generated=await Promise.all(batch.map(part=>requestLifetimePart(payload,relationship,year,part.partNumber)));
        completed.push(...generated);
        setInterpretation({status:"pending",completedParts:completed.length,totalParts:parts.length});
      }
      const merged=mergeLifetimeParts(completed);
      if(merged.report.sections.length!==LIFETIME_BOOK_V1.pageCount)throw new Error(`154페이지 중 ${merged.report.sections.length}페이지만 생성됐습니다.`);
      setInterpretation(merged);
    }catch(error){
      setInterpretation({status:"failed",ruleVersion:"ai-interpretation-v1",error:{code:"PART_GENERATION_FAILED",message:error instanceof Error?error.message:"해설 생성 중 오류가 발생했습니다."}});
    }
  },[]);
  function accept(value:LifetimeFormResult){setResult(value.payload);setRelationshipStatus(value.relationshipStatus);void requestInterpretation(value.payload,value.relationshipStatus);}
  if(result)return <LifetimeReport analysis={result.analysis} current={result.current} relationshipStatus={relationshipStatus} interpretation={interpretation}
    onRetry={()=>void requestInterpretation(result,relationshipStatus)} onRestart={()=>{setResult(null);setInterpretation({status:"not_requested"});}}/>;
  return <main className="lifetimeInputPage"><SajuInputForm onResult={accept}/><p className="inputDisclaimer">전통 명리 이론을 바탕으로 한 참고 콘텐츠이며 중요한 결정을 대신하지 않습니다.</p></main>;
}
