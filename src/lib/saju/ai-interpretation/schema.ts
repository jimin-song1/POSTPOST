import { z } from "zod";
import type { InterpretationReportType } from "@/types/ai-interpretation";

const evidenceIds=z.array(z.string().min(1));
const section=z.object({id:z.string().min(1),title:z.string().min(1),body:z.string().min(1),evidenceIds}).strict();
const timeline=z.object({periodId:z.string().min(1),title:z.string().min(1),body:z.string().min(1),evidenceIds}).strict();
export const structuredInterpretationSchema=z.object({status:z.literal("completed"),reportType:z.enum([
  "COMPREHENSIVE","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"]),headline:z.string().min(1),summary:z.string().min(1),
  sections:z.array(section).min(1),highlights:z.array(z.string()),cautions:z.array(z.string()),timeline:z.array(timeline),disclaimer:z.string().min(1)}).strict();

const stringArray={type:"array",items:{type:"string"}} as const;
export const INTERPRETATION_JSON_SCHEMA={type:"object",additionalProperties:false,required:["status","reportType","headline","summary","sections","highlights","cautions","timeline","disclaimer"],
  properties:{status:{type:"string",const:"completed"},reportType:{type:"string",enum:["COMPREHENSIVE","WEALTH","BUSINESS","CAREER","RELATIONSHIP","STUDY","YEARLY"] satisfies InterpretationReportType[]},
    headline:{type:"string"},summary:{type:"string"},sections:{type:"array",items:{type:"object",additionalProperties:false,required:["id","title","body","evidenceIds"],
      properties:{id:{type:"string"},title:{type:"string"},body:{type:"string"},evidenceIds:stringArray}}},highlights:stringArray,cautions:stringArray,
    timeline:{type:"array",items:{type:"object",additionalProperties:false,required:["periodId","title","body","evidenceIds"],
      properties:{periodId:{type:"string"},title:{type:"string"},body:{type:"string"},evidenceIds:stringArray}}},disclaimer:{type:"string"}}} as const;
