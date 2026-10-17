import {describe,it,expect} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import {buildInterpretationInput} from "@/lib/saju/ai-interpretation/input-builder";
import {interpretSajuAnalysis} from "@/lib/saju/ai-interpretation/service";
import {MockInterpretationProvider} from "@/lib/saju/ai-interpretation/mock-provider";
import {validateLifetimeContentContract} from "@/lib/saju/ai-interpretation/lifetime-content-contract";
import {buildDynamicLifetimeBook} from "@/rules/lifetime-report.v5.6";
import {SYNTHETIC_INPUT} from "./synthetic-input";
const analysis=calculateSaju({...SYNTHETIC_INPUT,birthDate:"1992-04-17",birthCity:"서울특별시"});
describe('V5.6',()=>{
 it('keeps all agreed parts and the 148 page example with eight periods',()=>{
 const book=buildDynamicLifetimeBook({includeSamjae:true,year:2026,relationshipStatus:'MARRIED',hasChildren:true,daeunPeriods:Array.from({length:8},(_,i)=>({index:i+1,ageRange:`${i*10}~${i*10+9}세`,pillar:'갑자'}))});
 expect(book.parts.map(p=>p.partNumber)).toEqual(['00','01','02','03','04','05','06','07','08','09','10','SPECIAL','11','12','EPILOGUE']);
 expect(book.pageCount).toBe(148);
 expect(book.parts.find(p=>p.partNumber==='11')?.sections.map(s=>s.title)).toContain('2031년 운세');
 });
 it.each([{relationshipStatus:'SINGLE' as const},{relationshipStatus:'DATING' as const},{relationshipStatus:'MARRIED' as const,hasChildren:false},{relationshipStatus:'MARRIED' as const,hasChildren:true}])('generates and validates $relationshipStatus $hasChildren',async context=>{
 const input=buildInterpretationInput(analysis,{reportType:'LIFETIME_GENERAL',year:2026,...context});
 const family=input.reportPlan!.filter(p=>p.partNumber==='07');
 expect(family.length).toBe(context.relationshipStatus!=='MARRIED'?5:context.hasChildren?10:9);
 if(context.relationshipStatus!=='MARRIED'){expect(JSON.stringify(input.reportPlan)).not.toMatch(/자녀|임신|손주/);expect(input.evidence.some(e=>e.kind==='CHILD')).toBe(false);}
 const result=await interpretSajuAnalysis(analysis,new MockInterpretationProvider(),{reportType:'LIFETIME_GENERAL',year:2026,...context});
 expect(result.status,result.status==='failed'?result.error.message:'').toBe('completed');
 if(result.status==='completed')validateLifetimeContentContract(result.report,{year:2026,includeSamjae:true,...context});
 });
});

import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LifetimeReport} from '@/components/LifetimeReport';
import {selectCurrentPeriods} from '@/lib/saju/presentation/current-period';
import {validateGrounding} from '@/lib/saju/ai-interpretation/grounding';
import {interpretationHashes} from '@/lib/saju/ai-interpretation/cache';
it.each([{relationshipStatus:'SINGLE' as const},{relationshipStatus:'MARRIED' as const,hasChildren:false},{relationshipStatus:'MARRIED' as const,hasChildren:true}])('renders the agreed headings for $relationshipStatus $hasChildren',async context=>{
 const options={reportType:'LIFETIME_GENERAL' as const,year:2026,...context};
 const input=buildInterpretationInput(analysis,options);
 const result=await interpretSajuAnalysis(analysis,new MockInterpretationProvider(),options);
 expect(result.status).toBe('completed');if(result.status!=='completed')return;
 const html=renderToStaticMarkup(createElement(LifetimeReport,{analysis,current:selectCurrentPeriods(analysis),interpretation:result,...context,onRetry:()=>{},onRestart:()=>{}}));
 expect(html).toContain('소제목 전체 목차');expect(html).toContain('내가 타고난 성격');expect(html).toContain('2031년 운세');
 expect(html).not.toMatch(/임신과 출산을 앞두고|손주와의 인연/);
 if(context.relationshipStatus==='SINGLE')expect(html).not.toMatch(/자녀|아이(?!디어)|임신|출산|손주/);
 else expect(html).toContain(context.hasChildren?'부모로서 드러나는 나의 모습':'부모가 되었을 때의 나');
 // Catch leaks even outside PART 07, including summary, closing, and timelines.
 if(context.relationshipStatus==='SINGLE'){
   for(const field of ['summary','headline'] as const){const leaking=structuredClone(result.report);leaking[field]='자녀와의 관계';expect(()=>validateGrounding(leaking,input)).toThrow();}
   const leaking=structuredClone(result.report);leaking.sections.at(-1)!.body='자녀와의 인연';expect(()=>validateGrounding(leaking,input)).toThrow();
 }
});
it('requires explicit married child status and separates cache variants',()=>{
 expect(()=>buildInterpretationInput(analysis,{reportType:'LIFETIME_GENERAL',year:2026,relationshipStatus:'MARRIED'})).toThrow('자녀 유무');
 const variants=[false,true].map(hasChildren=>buildInterpretationInput(analysis,{reportType:'LIFETIME_GENERAL',year:2026,relationshipStatus:'MARRIED',hasChildren}));
 expect(interpretationHashes(variants[0],'LIFETIME_GENERAL').cacheKey).not.toBe(interpretationHashes(variants[1],'LIFETIME_GENERAL').cacheKey);
 const years=buildInterpretationInput(analysis,{reportType:'LIFETIME_GENERAL',year:2026,relationshipStatus:'SINGLE',lifetimePartNumber:'11'});
 for(let i=0;i<6;i++)expect(years.reportPlan!.find(s=>s.evidenceGroup===`YEAR_${i+1}`)?.evidenceIds.some(id=>id.includes(`SEUN-${2026+i}`))).toBe(true);
});
import {lifetimeDisplayAnalysis} from '@/lib/saju/presentation/lifetime-display';
it('keeps the display response below the platform payload limit without mutating calculation',()=>{
 const before=JSON.stringify(analysis),display=lifetimeDisplayAnalysis(analysis);
 expect(Buffer.byteLength(JSON.stringify(display))).toBeLessThan(1_000_000);
 expect(display.birthInput).toEqual(analysis.birthInput);expect(display.daeun).toEqual(analysis.daeun);
 expect(JSON.stringify(analysis)).toBe(before);
});
import {interpretationSchemaForPlan} from '@/lib/saju/ai-interpretation/schema';
it('constrains provider schema to the resolved family plan',()=>{
 const input=buildInterpretationInput(analysis,{reportType:'LIFETIME_GENERAL',year:2026,relationshipStatus:'SINGLE',lifetimePartNumber:'07'});
 const schema=interpretationSchemaForPlan(input.reportPlan) as {properties:{sections:{minItems:number;maxItems:number;items:{properties:{title:{enum:string[]}}}}}};
 expect(schema.properties.sections.minItems).toBe(5);expect(schema.properties.sections.maxItems).toBe(5);
 expect(schema.properties.sections.items.properties.title.enum).toEqual(input.reportPlan!.map(s=>s.title));
});
