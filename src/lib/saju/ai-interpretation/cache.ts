import type { InterpretationSuccess } from "@/types/ai-interpretation";
import { AI_INTERPRETATION_V1 } from "@/rules/ai-interpretation.v1";
import { sha256,stableSerialize } from "./stable";

export interface InterpretationCache {get(key:string):Promise<InterpretationSuccess|undefined>;set(key:string,value:InterpretationSuccess):Promise<void>;}
export class MemoryInterpretationCache implements InterpretationCache {
  private readonly values=new Map<string,InterpretationSuccess>();
  async get(key:string){return this.values.get(key);}async set(key:string,value:InterpretationSuccess){this.values.set(key,value);}
}
export function interpretationHashes(input:unknown,reportType:string,modelConfigVersion:string=AI_INTERPRETATION_V1.modelConfigVersion,
  promptVersion:string=AI_INTERPRETATION_V1.promptVersion){
  const analysisHash=sha256(stableSerialize(input));
  return{analysisHash,cacheKey:sha256(stableSerialize({analysisHash,reportType,promptVersion,modelConfigVersion}))};
}
