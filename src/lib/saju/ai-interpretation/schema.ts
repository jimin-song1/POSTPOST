import { z } from "zod";
import type { InterpretationReportType } from "@/types/ai-interpretation";

const evidenceIds=z.array(z.string().min(1)).min(1);
const metric=z.object({id:z.string().min(1),label:z.string().min(1),value:z.number(),unit:z.enum(["PERCENT","SCORE"]),evidenceId:z.string().min(1)}).strict();
const section=z.object({id:z.string().min(1),title:z.string().min(1),body:z.string().min(1),evidenceIds,chapterNumber:z.string().optional(),headline:z.string().optional(),lead:z.string().optional(),paragraphs:z.array(z.string().min(1)).optional(),keyPoints:z.array(z.string().min(1)).optional(),metrics:z.array(metric).optional(),mascotComment:z.string().optional(),professionalDetails:z.object({summary:z.string().min(1),evidenceIds}).strict().optional()}).strict();
const timeline=z.object({periodId:z.string().min(1),title:z.string().min(1),body:z.string().min(1),evidenceIds}).strict();
export const structuredInterpretationSchema=z.object({status:z.literal("completed"),reportType:z.enum([
  "COMPREHENSIVE","LIFETIME_GENERAL","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"]),headline:z.string().min(1),summary:z.string().min(1),
  sections:z.array(section).min(1),highlights:z.array(z.string()),cautions:z.array(z.string()),timeline:z.array(timeline),disclaimer:z.string().min(1)}).strict();

const stringArray={type:"array",items:{type:"string"}} as const;
const evidenceIdArray={...stringArray,minItems:1} as const;
export const INTERPRETATION_JSON_SCHEMA={type:"object",additionalProperties:false,required:["status","reportType","headline","summary","sections","highlights","cautions","timeline","disclaimer"],
  properties:{status:{type:"string",const:"completed"},reportType:{type:"string",enum:["COMPREHENSIVE","LIFETIME_GENERAL","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"] satisfies InterpretationReportType[]},
    headline:{type:"string"},summary:{type:"string"},sections:{type:"array",items:{type:"object",additionalProperties:false,required:["id","title","body","evidenceIds"],
      properties:{id:{type:"string"},title:{type:"string"},body:{type:"string"},evidenceIds:evidenceIdArray,chapterNumber:{type:"string"},headline:{type:"string"},lead:{type:"string"},paragraphs:stringArray,keyPoints:stringArray,metrics:{type:"array",items:{type:"object",additionalProperties:false,required:["id","label","value","unit","evidenceId"],properties:{id:{type:"string"},label:{type:"string"},value:{type:"number"},unit:{type:"string",enum:["PERCENT","SCORE"]},evidenceId:{type:"string"}}}},mascotComment:{type:"string"},professionalDetails:{type:"object",additionalProperties:false,required:["summary","evidenceIds"],properties:{summary:{type:"string"},evidenceIds:evidenceIdArray}}}}},highlights:stringArray,cautions:stringArray,
    timeline:{type:"array",items:{type:"object",additionalProperties:false,required:["periodId","title","body","evidenceIds"],
      properties:{periodId:{type:"string"},title:{type:"string"},body:{type:"string"},evidenceIds:evidenceIdArray}}},disclaimer:{type:"string"}}} as const;
