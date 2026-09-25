export type { InterpretationProvider,InterpretationProviderRequest,InterpretationProviderResponse } from "@/types/ai-interpretation";

export class InterpretationProviderError extends Error {readonly code="PROVIDER_ERROR" as const;
  constructor(message:string){super(message);this.name="InterpretationProviderError";}}
export class InterpretationProviderTimeoutError extends Error {readonly code="PROVIDER_TIMEOUT" as const;
  constructor(message:string){super(message);this.name="InterpretationProviderTimeoutError";}}
