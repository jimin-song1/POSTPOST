import {NARRATIVE_EDITORIAL_QA_V1 as EDITORIAL_RULE} from "@/rules/narrative-editorial-qa.v1";
import type {StructuredInterpretation} from "@/types/ai-interpretation";

const replacements:ReadonlyArray<readonly [RegExp,string]>=[
  [/\s+([,.!?])/g,"$1"],[/[ \t]{2,}/g," "],[/\n{3,}/g,"\n\n"],
  [/(?:종합적으로 보면|전체적으로 보면)[,.]?\s*/g,""],[/이를 통해\s*/g,"그래서 "],[/따라서[,.]?\s*/g,"그래서 "],
  [/([가-힣]+)(?:\s+\1){1,}/g,"$1"]
];
export function copyEditKoreanText(value:string){
  return replacements.reduce((text,[pattern,next])=>text.replace(pattern,next),value).trim();
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
