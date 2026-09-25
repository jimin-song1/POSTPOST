export type InterpretationReportType="COMPREHENSIVE"|"WEALTH"|"BUSINESS"|"CAREER"|"RELATIONSHIP"|"STUDY"|"YEARLY";
export type InterpretationErrorCode="ANALYSIS_NOT_COMPLETED"|"MISSING_REQUIRED_EVIDENCE"|"PROVIDER_ERROR"|
  "PROVIDER_TIMEOUT"|"SCHEMA_VALIDATION_FAILED"|"GROUNDING_VALIDATION_FAILED";
export interface InterpretationEvidence {id:string;kind:"NATAL"|"USEFUL_GOD"|"FORTUNE"|"CATEGORY"|"CONTEXT";value:unknown;}
export interface InterpretationTimelineInput {id:string;period:{startInstant:string;endInstant:string};evidenceIds:string[];}
export interface InterpretationInput {version:"interpretation-input-v1";reportType:InterpretationReportType;
  evidence:InterpretationEvidence[];timeline:InterpretationTimelineInput[];minimalContext:{gender?:"male"|"female";requestedYear?:number};}
export interface InterpretationSection {id:string;title:string;body:string;evidenceIds:string[];}
export interface InterpretationTimelineEntry {periodId:string;title:string;body:string;evidenceIds:string[];}
export interface StructuredInterpretation {status:"completed";reportType:InterpretationReportType;headline:string;summary:string;
  sections:InterpretationSection[];highlights:string[];cautions:string[];timeline:InterpretationTimelineEntry[];disclaimer:string;}
export interface InterpretationProviderRequest {systemPrompt:string;input:InterpretationInput;analysisHash:string;schema:Record<string,unknown>;
  repair?:{validationError:InterpretationErrorCode;previousOutput:unknown};}
export interface InterpretationProviderResponse {output:unknown;provider:string;model:string;tokenUsage?:{input:number;output:number};}
export interface InterpretationProvider {generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>;}
export interface InterpretationSuccess {status:"completed";ruleVersion:"ai-interpretation-v1";promptVersion:"interpretation-prompt-v1";
  groundingVersion:"interpretation-grounding-v1";analysisHash:string;cacheKey:string;report:StructuredInterpretation;
  metadata:{provider:string;model:string;repaired:boolean;tokenUsage?:{input:number;output:number}};}
export interface InterpretationFailure {status:"failed";ruleVersion:"ai-interpretation-v1";error:{code:InterpretationErrorCode;message:string};}
export type InterpretationResult=InterpretationSuccess|InterpretationFailure;
export interface InterpretationBuildOptions {reportType:InterpretationReportType;referenceInstant?:string;year?:number;}
