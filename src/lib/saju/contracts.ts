import type { EvidenceResult, SajuAnalysis } from "@/types/saju-analysis";
import type { SajuInput } from "@/types/saju-input";

export interface CalendarEngine { calculate(input: SajuInput): Pick<SajuAnalysis, "birthNormalized" | "solarTerms" | "pillars" | "dayMaster">; }
export interface MyeongriEngine { analyze(calendar: ReturnType<CalendarEngine["calculate"]>): Omit<SajuAnalysis, "schemaVersion" | "rulesetVersion" | "person" | "birthInput" | "birthNormalized" | "solarTerms" | "pillars" | "dayMaster" | "daeun" | "warnings" | "engineMetadata">; }
export interface InterpretationEngine { explain(analysis: SajuAnalysis, product: string): Promise<string>; }

export const notImplemented = <T = unknown>(todo: string): EvidenceResult<T> => ({ status: "not_implemented", value: null, evidence: [], todo });
