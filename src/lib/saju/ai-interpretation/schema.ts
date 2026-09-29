import { z } from "zod";
import type { InterpretationReportType } from "@/types/ai-interpretation";

const evidenceIds=z.array(z.string().min(1)).min(1);
const metric=z.object({id:z.string().min(1),label:z.string().min(1),value:z.number(),unit:z.enum(["PERCENT","SCORE"]),evidenceId:z.string().min(1)}).strict();
const section=z.object({id:z.string().min(1),title:z.string().min(1),body:z.string().min(1),evidenceIds,chapterNumber:z.string().optional(),headline:z.string().optional(),lead:z.string().optional(),paragraphs:z.array(z.string().min(1)).optional(),keyPoints:z.array(z.string().min(1)).optional(),metrics:z.array(metric).optional(),mascotComment:z.string().optional(),professionalDetails:z.object({summary:z.string().min(1),evidenceIds}).strict().optional()}).strict();
const timeline=z.object({periodId:z.string().min(1),title:z.string().min(1),body:z.string().min(1),evidenceIds}).strict();
export const structuredInterpretationSchema=z.object({status:z.literal("completed"),reportType:z.enum([
  "COMPREHENSIVE","LIFETIME_GENERAL","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"]),headline:z.string().min(1),summary:z.string().min(1),
  sections:z.array(section).min(1),highlights:z.array(z.string()),cautions:z.array(z.string()),timeline:z.array(timeline),disclaimer:z.string().min(1)}).strict();

export const interpretationPlanClaimSchema=z.object({
  claimId:z.string().min(1),
  plainMeaning:z.string().min(1),
  evidenceIds:z.array(z.string().min(1)).min(1),
  sourceFields:z.array(z.string().min(1)).min(1),
  confidence:z.enum(["HIGH","MEDIUM","LOW"]),
  allowedChapters:z.array(z.string().min(1)).min(1),
  avoidRepeatingIn:z.array(z.string().min(1)),
}).strict();
const planClaims=z.array(interpretationPlanClaimSchema);
export const lifetimeInterpretationPlanSchema=z.object({
  planVersion:z.literal("interpretation-plan-v1"),
  coreIdentity:planClaims,
  outerVsInner:planClaims,
  decisionPattern:planClaims,
  strengths:planClaims,
  strengthTradeoffs:planClaims,
  workPattern:planClaims,
  moneyPattern:planClaims,
  relationshipPattern:planClaims,
  wellnessPattern:planClaims,
  familyChildrenPattern:planClaims,
  lifeFlowTheme:planClaims,
  chapterClaims:z.array(z.object({
    sectionId:z.string().min(1),
    claims:planClaims,
  }).strict()).min(1),
}).strict();
export type LifetimeInterpretationPlan=z.infer<typeof lifetimeInterpretationPlanSchema>;

const stringArray={type:"array",items:{type:"string"}} as const;
const nonEmptyStringArray={...stringArray,minItems:1} as const;
const evidenceIdArray={...stringArray,minItems:1} as const;
const PLAN_CLAIM_JSON_SCHEMA={type:"object",additionalProperties:false,
  required:["claimId","plainMeaning","evidenceIds","sourceFields","confidence","allowedChapters","avoidRepeatingIn"],
  properties:{
    claimId:{type:"string"},
    plainMeaning:{type:"string"},
    evidenceIds:evidenceIdArray,
    sourceFields:nonEmptyStringArray,
    confidence:{type:"string",enum:["HIGH","MEDIUM","LOW"]},
    allowedChapters:nonEmptyStringArray,
    avoidRepeatingIn:stringArray,
  }} as const;
export const LIFETIME_INTERPRETATION_PLAN_JSON_SCHEMA={type:"object",additionalProperties:false,
  required:["planVersion","coreIdentity","outerVsInner","decisionPattern","strengths","strengthTradeoffs","workPattern","moneyPattern","relationshipPattern","wellnessPattern","familyChildrenPattern","lifeFlowTheme","chapterClaims"],
  properties:{
    planVersion:{type:"string",const:"interpretation-plan-v1"},
    coreIdentity:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    outerVsInner:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    decisionPattern:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    strengths:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    strengthTradeoffs:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    workPattern:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    moneyPattern:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    relationshipPattern:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    wellnessPattern:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    familyChildrenPattern:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    lifeFlowTheme:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA},
    chapterClaims:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["sectionId","claims"],
      properties:{sectionId:{type:"string"},claims:{type:"array",items:PLAN_CLAIM_JSON_SCHEMA}}}},
  }} as const;

export const INTERPRETATION_JSON_SCHEMA={type:"object",additionalProperties:false,required:["status","reportType","headline","summary","sections","highlights","cautions","timeline","disclaimer"],
  properties:{status:{type:"string",const:"completed"},reportType:{type:"string",enum:["COMPREHENSIVE","LIFETIME_GENERAL","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"] satisfies InterpretationReportType[]},
    headline:{type:"string"},summary:{type:"string"},sections:{type:"array",items:{type:"object",additionalProperties:false,required:["id","title","body","evidenceIds"],
      properties:{id:{type:"string"},title:{type:"string"},body:{type:"string"},evidenceIds:evidenceIdArray,chapterNumber:{type:"string"},headline:{type:"string"},lead:{type:"string"},paragraphs:stringArray,keyPoints:stringArray,metrics:{type:"array",items:{type:"object",additionalProperties:false,required:["id","label","value","unit","evidenceId"],properties:{id:{type:"string"},label:{type:"string"},value:{type:"number"},unit:{type:"string",enum:["PERCENT","SCORE"]},evidenceId:{type:"string"}}}},mascotComment:{type:"string"},professionalDetails:{type:"object",additionalProperties:false,required:["summary","evidenceIds"],properties:{summary:{type:"string"},evidenceIds:evidenceIdArray}}}}},highlights:stringArray,cautions:stringArray,
    timeline:{type:"array",items:{type:"object",additionalProperties:false,required:["periodId","title","body","evidenceIds"],
      properties:{periodId:{type:"string"},title:{type:"string"},body:{type:"string"},evidenceIds:evidenceIdArray}}},disclaimer:{type:"string"}}} as const;
