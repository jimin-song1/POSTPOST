import {NARRATIVE_EDITORIAL_QA_V1 as EDITORIAL_RULE} from "@/rules/narrative-editorial-qa.v1";
import type {StructuredInterpretation} from "@/types/ai-interpretation";

const replacements:ReadonlyArray<readonly [RegExp,string]>=[
  [/\s+([,.!?])/g,"$1"],[/[ \t]{2,}/g," "],[/\n{3,}/g,"\n\n"],
  [/(?:종합적으로 보면|전체적으로 보면)[,.]?\s*/g,""],[/이를 통해\s*/g,"그래서 "],[/따라서[,.]?\s*/g,"그래서 "],
  [/([가-힣]+)(?:\s+\1){1,}/g,"$1"]
];

function sentenceChunks(line:string){
  const chunks:string[]=[];let start=0;
  const isDigit=(character:string|undefined)=>Boolean(character&&/[0-9]/.test(character));
  for(let index=0;index<line.length;index+=1){
    const character=line[index],decimalPoint=character==="."&&isDigit(line[index-1])&&isDigit(line[index+1]);
    if((character==="."&&!decimalPoint)||character==="!"||character==="?"){
      const chunk=line.slice(start,index+1).trim();if(chunk)chunks.push(chunk);start=index+1;
    }
  }
  const tail=line.slice(start).trim();if(tail)chunks.push(tail);
  return chunks;
}

function splitLongSentence(sentence:string){
  const max=EDITORIAL_RULE.maxSentenceLength;
  if(sentence.trim().length<=max)return sentence.trim();
  const terminal=/[.!?]$/.test(sentence.trim())?sentence.trim().slice(-1):".";
  let remaining=sentence.trim().replace(/[.!?]$/,"").trim();
  const parts:string[]=[];
  while(remaining.length>max){
    const minimum=Math.max(48,Math.floor(max*0.45)),window=remaining.slice(0,max+1);
    let splitIndex=-1,rightOffset=0;
    for(const marker of [", ","; ",": "]){
      const index=window.lastIndexOf(marker);
      if(index>=minimum&&index>splitIndex){splitIndex=index;rightOffset=marker.length;}
    }
    if(splitIndex<minimum)for(const word of ["하지만","다만","그리고","그래서","반면","대신","특히","이때","또한"]){
      const marker=" "+word+" ",index=window.lastIndexOf(marker);
      if(index>=minimum&&index>splitIndex){splitIndex=index;rightOffset=1;}
    }
    if(splitIndex<minimum){
      const whitespace=window.lastIndexOf(" ");
      splitIndex=whitespace>=minimum?whitespace:max;
      rightOffset=whitespace>=minimum?1:0;
    }
    const left=remaining.slice(0,splitIndex).replace(/[\s,:;]+$/,"").trim();
    const right=remaining.slice(splitIndex+rightOffset).trim();
    if(!left||!right)break;
    parts.push(/[.!?]$/.test(left)?left:left+".");
    remaining=right;
  }
  if(remaining)parts.push(remaining+terminal);
  return parts.join(" ");
}

function splitLongKoreanSentences(value:string){
  return value.split("\n").map(line=>sentenceChunks(line).map(splitLongSentence).join(" ")).join("\n");
}

export function copyEditKoreanText(value:string){
  const normalized=replacements.reduce((text,[pattern,next])=>text.replace(pattern,next),value).trim();
  return splitLongKoreanSentences(normalized).trim();
}
const facts=(value:string)=>({numbers:Array.from(value.matchAll(/-?\d+(?:\.\d+)?/g),match=>match[0]),pillars:Array.from(value.matchAll(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g),match=>match[0])});
export function assertCopyEditPreservesFacts(before:string,after:string){const left=facts(before),right=facts(after);
  if(JSON.stringify(left)!==JSON.stringify(right))throw new Error("copy edit는 숫자·시기·간지 근거를 바꿀 수 없습니다.");}
export function validateKoreanEditorial(value:string){
  if(/([가-힣]{2,})(?:\s+\1){1,}/.test(value))throw new Error("중복 단어가 남아 있습니다.");
  if(/[。]/.test(value))throw new Error("한글 본문에 어색한 문장부호가 남아 있습니다.");
  for(const sentence of value.split(/[.!?]\s*/))if(sentence.trim().length>EDITORIAL_RULE.maxSentenceLength)throw new Error("고객 문장이 너무 깁니다.");
  for(const phrase of EDITORIAL_RULE.aiTonePatterns)if(value.includes(phrase))throw new Error(`AI식 연결어나 보고서 문체가 남아 있습니다: ${phrase}`);
  return true;
}
export function copyEditInterpretation(report:StructuredInterpretation):StructuredInterpretation{
  const edit=copyEditKoreanText;
  const edited={...report,headline:edit(report.headline),summary:edit(report.summary),disclaimer:edit(report.disclaimer),
    highlights:report.highlights.map(edit),cautions:report.cautions.map(edit),
    sections:report.sections.map(row=>({...row,body:edit(row.body),headline:row.headline&&edit(row.headline),lead:row.lead&&edit(row.lead),
      paragraphs:row.paragraphs?.map(edit),keyPoints:row.keyPoints?.map(edit),mascotComment:row.mascotComment&&edit(row.mascotComment),
      professionalDetails:row.professionalDetails&&{...row.professionalDetails,summary:edit(row.professionalDetails.summary)}})),
    timeline:report.timeline.map(row=>({...row,body:edit(row.body)}))};
  assertCopyEditPreservesFacts(JSON.stringify(report),JSON.stringify(edited));
  return edited;
}
