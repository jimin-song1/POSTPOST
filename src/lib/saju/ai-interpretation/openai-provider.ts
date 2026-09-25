import { randomUUID } from "node:crypto";
import { AI_INTERPRETATION_V1 } from "@/rules/ai-interpretation.v1";
import type { InterpretationProvider,InterpretationProviderRequest,InterpretationProviderResponse } from "@/types/ai-interpretation";
import { buildRepairInstruction } from "./prompt";
import { InterpretationProviderError,InterpretationProviderTimeoutError } from "./provider";

export interface OpenAIInterpretationProviderConfig {apiKey:string;model:string;timeoutMs?:number;baseUrl?:string;
  fetchImpl?:typeof fetch;logger?:(metadata:Record<string,unknown>)=>void;}
export class OpenAIInterpretationProvider implements InterpretationProvider {
  private readonly timeoutMs:number;private readonly fetchImpl:typeof fetch;
  constructor(private readonly config:OpenAIInterpretationProviderConfig){this.timeoutMs=config.timeoutMs??30000;this.fetchImpl=config.fetchImpl??fetch;}
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{
    const requestId=randomUUID(),started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const instructions=request.repair?`${request.systemPrompt}\n\n${buildRepairInstruction(request.repair.validationError)}`:request.systemPrompt;
      const response=await this.fetchImpl(`${this.config.baseUrl??"https://api.openai.com/v1"}/responses`,{method:"POST",signal:controller.signal,
        headers:{Authorization:`Bearer ${this.config.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:this.config.model,instructions,
          input:JSON.stringify({input:request.input,...(request.repair?{previousOutput:request.repair.previousOutput}: {})}),store:false,
          text:{format:{type:"json_schema",name:"saju_interpretation",strict:true,schema:request.schema}}})});
      if(!response.ok)throw new InterpretationProviderError(`OpenAI Responses API error: ${response.status}`);
      const payload=await response.json() as Record<string,unknown>;
      const outputText=typeof payload.output_text==="string"?payload.output_text:extractOutputText(payload.output);
      if(!outputText)throw new InterpretationProviderError("OpenAI response에 output_text가 없습니다.");
      let output:unknown;try{output=JSON.parse(outputText);}catch{output=outputText;}
      const usage=payload.usage as {input_tokens?:number;output_tokens?:number}|undefined,tokenUsage=usage?{input:usage.input_tokens??0,output:usage.output_tokens??0}:undefined;
      this.config.logger?.({requestId,analysisHash:request.analysisHash,reportType:request.input.reportType,promptVersion:AI_INTERPRETATION_V1.promptVersion,
        modelConfigVersion:AI_INTERPRETATION_V1.modelConfigVersion,provider:"openai",model:this.config.model,latencyMs:Date.now()-started,tokenUsage});
      return{output,provider:"openai",model:this.config.model,tokenUsage};
    }catch(error){if(error instanceof InterpretationProviderError)throw error;
      if(error instanceof Error&&error.name==="AbortError")throw new InterpretationProviderTimeoutError("OpenAI interpretation timeout");
      throw new InterpretationProviderError(error instanceof Error?error.message:"OpenAI interpretation failed");
    }finally{clearTimeout(timer);}
  }
}
function extractOutputText(output:unknown){if(!Array.isArray(output))return null;for(const item of output){if(!item||typeof item!=="object")continue;
  const content=(item as {content?:unknown}).content;if(!Array.isArray(content))continue;for(const part of content)if(part&&typeof part==="object"&&
    typeof (part as {text?:unknown}).text==="string")return (part as {text:string}).text;}return null;}
