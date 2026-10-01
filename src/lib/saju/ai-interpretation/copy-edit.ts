import type {StructuredInterpretation} from "@/types/ai-interpretation";

const replacements:ReadonlyArray<readonly [RegExp,string]>=[
  [/\s+([,.!?])/g,"$1"],[/[ \t]{2,}/g," "],[/\n{3,}/g,"\n\n"],
  [/종합적으로 보면[,.]?\s*/g,""],[/이를 통해\s*/g,"그래서 "],[/따라서[,.]?\s*/g,"그래서 "],
  [/([가-힣]+)(?:\s+\1){1,}/g,"$1"]
];
export function copyEditKoreanText(value:string){
  return replacements.reduce((text,[pattern,next])=>text.replace(pattern,next),value).trim();
}
export function copyEditInterpretation(report:StructuredInterpretation):StructuredInterpretation{
  const edit=copyEditKoreanText;
  return {...report,headline:edit(report.headline),summary:edit(report.summary),disclaimer:edit(report.disclaimer),
    highlights:report.highlights.map(edit),cautions:report.cautions.map(edit),
    sections:report.sections.map(row=>({...row,body:edit(row.body),headline:row.headline&&edit(row.headline),lead:row.lead&&edit(row.lead),
      paragraphs:row.paragraphs?.map(edit),keyPoints:row.keyPoints?.map(edit),mascotComment:row.mascotComment&&edit(row.mascotComment),
      professionalDetails:row.professionalDetails&&{...row.professionalDetails,summary:edit(row.professionalDetails.summary)}})),
    timeline:report.timeline.map(row=>({...row,body:edit(row.body)}))};
}
