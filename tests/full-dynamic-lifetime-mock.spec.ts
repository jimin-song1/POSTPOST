import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import {buildInterpretationInput} from "@/lib/saju/ai-interpretation/input-builder";
import {generateGlobalCharacterCore} from "@/lib/saju/ai-interpretation/global-character-core";
import {validateLifetimeContentContract,semanticDuplicateSimilarity} from "@/lib/saju/ai-interpretation/lifetime-content-contract";
import {auditLifetimeEditorialQuality} from "@/lib/saju/ai-interpretation/editorial-audit";
import {MockInterpretationProvider} from "@/lib/saju/ai-interpretation/mock-provider";
import {interpretSajuAnalysis} from "@/lib/saju/ai-interpretation/service";
import {buildDynamicLifetimeBook,LIFETIME_CONTENT_CONTRACT_V1} from "@/rules/lifetime-report.v4";
import type {InterpretationProvider,InterpretationProviderRequest,InterpretationProviderResponse,StructuredInterpretation} from "@/types/ai-interpretation";
import type {SajuInput} from "@/types/saju-input";
import type {FortuneResult} from "@/types/fortune";

const FULL_SAMPLE_INPUT:SajuInput={name:"테스트사용자",gender:"female",calendarType:"solar",birthDate:"1992-04-17",birthTime:"14:20",birthTimeKnown:true,birthCountry:"KR",birthCityKnown:true,birthCity:"서울특별시"};
const YEAR=2026;
class TrackingMockProvider implements InterpretationProvider{
  readonly requests:InterpretationProviderRequest[]=[];private readonly delegate=new MockInterpretationProvider();
  async generate(request:InterpretationProviderRequest):Promise<InterpretationProviderResponse>{this.requests.push(request);return this.delegate.generate(request);}
}
const text=(section:StructuredInterpretation["sections"][number])=>[section.headline,section.lead,...(section.paragraphs??[section.body]),...(section.keyPoints??[])].filter(Boolean).join("\n");
const aggregate=(report:StructuredInterpretation,groups:string[])=>{const rows=report.sections.filter(row=>row.contentKind==="CONTENT"&&groups.includes(row.evidenceGroup??""));return{sections:rows.length,characters:rows.reduce((sum,row)=>sum+text(row).length,0)};};

describe("M34-1 full dynamic lifetime mock generation",()=>{
  it("runs the complete deterministic-to-book pipeline with one shared character core",async()=>{
    const analysis=calculateSaju(FULL_SAMPLE_INPUT),provider=new TrackingMockProvider();
    expect(analysis.fortune.status).toBe("partial");
    if(analysis.fortune.status!=="partial")return;const fortune=analysis.fortune as FortuneResult;
    expect(fortune.samjae.status).toBe("implemented");
    const characterCore=await generateGlobalCharacterCore(analysis,provider,{relationshipStatus:"SINGLE",year:YEAR});
    const book=buildDynamicLifetimeBook({includeSamjae:fortune.samjae.status==="implemented",year:YEAR}),completed=[];
    const customerParts=book.parts.filter(part=>part.sections.some(section=>section.contentKind==="CONTENT"));
    expect(customerParts.map(part=>part.title)).toEqual([
      "나는 어떤 존재인가","나를 이루는 기운","나에게 맞는 무대","돈과 풍요","사랑과 가족","몸과 마음의 신호","나를 돕는 인연",
      "내 사주의 특별한 이야기","삶의 에너지 흐름","내 안의 여러 모습","앞으로의 흐름","변화가 커지는 때","큰 운의 흐름","마치며"
    ]);
    expect(book.sections.filter(section=>section.evidenceGroup==="CHILDREN").every(section=>section.partNumber==="05")).toBe(true);
    expect(book.sections.filter(section=>section.evidenceGroup==="CHANGE"||section.evidenceGroup==="SAMJAE").every(section=>section.partNumber==="12S")).toBe(true);
    for(const part of book.parts){const result=await interpretSajuAnalysis(analysis,provider,{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year:YEAR,lifetimePartNumber:part.partNumber,characterCore});
      expect(result.status,part.partNumber).toBe("completed");if(result.status==="completed")completed.push(result);}
    const report:StructuredInterpretation={...completed[0].report,sections:completed.flatMap(row=>row.report.sections),timeline:completed.flatMap(row=>row.report.timeline),
      highlights:Array.from(new Set(completed.flatMap(row=>row.report.highlights))),cautions:Array.from(new Set(completed.flatMap(row=>row.report.cautions)))};
    const stats=validateLifetimeContentContract(report),content=report.sections.filter(row=>row.contentKind==="CONTENT"),ids=report.sections.map(row=>row.id),sequences=report.sections.map(row=>Number(row.chapterNumber));
    expect(stats.contentSections).toBeGreaterThanOrEqual(LIFETIME_CONTENT_CONTRACT_V1.minimumContentSections);
    expect(new Set(ids).size).toBe(ids.length);expect(new Set(sequences).size).toBe(sequences.length);
    expect(ids).toEqual(book.sections.map(row=>row.id));expect(sequences).toEqual(book.sections.map(row=>row.sequence));
    expect(new Set(report.sections.map(row=>row.partNumber)).size).toBe(book.parts.length);
    expect(content.every(row=>new Set(row.noveltyElements).size>=LIFETIME_CONTENT_CONTRACT_V1.novelty.minimumNewElements)).toBe(true);
    expect(content.every(row=>row.claimsUsed?.length&&row.scenesUsed?.length&&row.domainConsequence&&row.priorSectionSummary!==undefined)).toBe(true);

    const bookSectionById=new Map(book.sections.map(row=>[row.id,row]));
    const customerSections=report.sections.filter(row=>row.contentKind!=="PROFESSIONAL");
    expect(customerSections.every(section=>(section.paragraphs??[section.body]).every(paragraph=>typeof paragraph==="string"&&paragraph.length>0))).toBe(true);
    for(const id of ["legacy-book-007","legacy-book-008","legacy-book-009","legacy-book-010","legacy-book-011","legacy-book-012","legacy-book-013","legacy-book-014"])
      expect(report.sections.find(section=>section.id===id)?.lead,id).toBeUndefined();
    expect(report.sections.find(section=>section.id==="legacy-book-008")?.paragraphs).toEqual([
      "한마디로 말하면, 서두르기보다 한번 살펴본 뒤 마음이 정해지면 꾸준히 가는 사람이에요.",
      "생각이 너무 길어질 때만 조심하면 신중함이 오히려 큰 장점이 될 수 있어요."
    ]);
    for(const section of customerSections){
      const paragraphs=section.paragraphs?.length?section.paragraphs:[section.body];
      const topic=bookSectionById.get(section.id)?.topic;
      if(topic)expect(paragraphs.filter(paragraph=>paragraph.startsWith(topic)).length,section.id).toBe(0);
      const paragraphSet=new Set(paragraphs.map(paragraph=>paragraph.replace(/\s+/g," ").trim()));
      for(const point of section.keyPoints??[]){
        const normalizedPoint=point.replace(/\s+/g," ").trim();
        expect(paragraphSet.has(normalizedPoint),section.id).toBe(false);
        expect(normalizedPoint,section.id).not.toBe((section.lead??"").replace(/\s+/g," ").trim());
      }
    }
    const sectionFingerprints=customerSections.map(section=>[
      section.title,
      section.headline??"",
      section.lead??"",
      ...(section.paragraphs?.length?section.paragraphs:[section.body]),
      ...(section.keyPoints??[])
    ].join("\n").replace(/\s+/g," ").trim());
    expect(new Set(sectionFingerprints).size).toBe(sectionFingerprints.length);
    const customerCopy=customerSections.flatMap(section=>section.paragraphs??[section.body]).join("\n");
    for(const label of [
      "강점으로 쓰일 때는","반대로 부담이 커지면","실제 결과로 이어지는 모습은","실천 기준으로는",
      "다른 장면에서는","다른 선택과 비교할 때는","추가 관점으로는","조금 더 구체적으로 좁혀 보면",
      "중심으로 봅니다","살펴봅니다","실제 생활에서","이 부분은 어려운 말보다","중요합니다","필요합니다",
      "사람 사이 거리","끝을 확인하는 힘","행동의 순서","책임 범위를 분명하게 잡","변화 활성도","체감 난도","자기준",
      "이 힘이 한쪽으로 쏠리면"
    ]) expect(customerCopy).not.toContain(label);
    expect(customerCopy).not.toMatch(/[가-힣]+(?:습니다|니다)\./);
    expect(customerCopy).not.toMatch(/(?:^|\n)(?:에서도|에서는|에서|에선|에는)\s/);

    const coreRequests=provider.requests.filter(request=>"corePatterns" in ((request.schema.properties??{}) as Record<string,unknown>));
    expect(coreRequests).toHaveLength(1);
    const sharedMarker=characterCore.corePatterns[0];expect(provider.requests.slice(1).every(request=>request.systemPrompt.includes(sharedMarker))).toBe(true);

    const samjaeInput=buildInterpretationInput(analysis,{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year:YEAR,lifetimePartNumber:"12S"});
    expect(samjaeInput.evidence.some(row=>row.id==="FORTUNE:SAMJAE")).toBe(true);
    expect(samjaeInput.evidence.some(row=>row.id==="NATAL:RELATIONS")).toBe(true);
    const samjaeCitations=report.sections.filter(row=>row.evidenceGroup==="SAMJAE").flatMap(row=>row.evidenceIds);
    expect(samjaeCitations).toContain("FORTUNE:SAMJAE");expect(samjaeCitations).toContain("NATAL:RELATIONS");
    if(fortune.samjae.status==="implemented"){expect(fortune.samjae.samjaeCycles.length).toBeGreaterThan(0);expect(new Set(fortune.samjae.years.filter(row=>row.isSamjae).map(row=>row.phase))).toEqual(new Set(["DEUL","NUL","NAL"]));
      expect(fortune.samjae.years.some(row=>row.supportScore!==row.activationScore)).toBe(true);}

    const childRows=report.sections.filter(row=>row.evidenceGroup==="CHILDREN"),childCitations=new Set(childRows.flatMap(row=>row.evidenceIds));
    expect(childRows.length).toBeGreaterThan(2);
    for(const id of ["CHILD:TEN_GOD_SIGNALS","CHILD:HOUR_PILLAR","CHILD:HOUR_STAGE","CHILD:RELATION_CONTEXT","CHILD:LIFETIME_CONTEXT"])expect(childCitations.has(id),id).toBe(true);
    const yearlyCitations=report.sections.filter(row=>row.evidenceGroup?.startsWith("YEAR_")).flatMap(row=>row.evidenceIds);
    expect(yearlyCitations.some(id=>id.includes("FAVORABILITY"))).toBe(true);expect(yearlyCitations.some(id=>id.includes("ACTIVATION"))).toBe(true);expect(yearlyCitations.some(id=>id.includes("PERIOD_CONTEXT"))).toBe(true);
    expect(book.sections.filter(row=>row.evidenceGroup.startsWith("DAEUN_")&&row.topic.includes("전반부와 후반부"))).toHaveLength(10);

    const density={
      "기본설계":aggregate(report,["CORE","PILLARS","HIDDEN_STEMS","STRUCTURE_USEFUL"]),"성향":aggregate(report,["IDENTITY","ELEMENTS","STRENGTH"]),"직업":aggregate(report,["WORK"]),"재물":aggregate(report,["WEALTH"]),
      "연애/가족":aggregate(report,["RELATIONSHIP"]),"자녀":aggregate(report,["CHILDREN"]),"건강":aggregate(report,["WELLNESS"]),"귀인/신살":aggregate(report,["NOBLE","STARS_RELATIONS"]),
      "십성/십이운성":aggregate(report,["TEN_GODS","TWELVE_STAGES"]),"5년 연운":aggregate(report,["YEARLY_OVERVIEW","YEAR_1","YEAR_2","YEAR_3","YEAR_4","YEAR_5","MONTHLY"]),
      "삼재":aggregate(report,["SAMJAE"]),"대운":aggregate(report,["DAEUN_OVERVIEW","DAEUN_1","DAEUN_2","DAEUN_3","DAEUN_4","DAEUN_5","DAEUN_6","DAEUN_7","DAEUN_8","DAEUN_9","DAEUN_10"]),"최종 종합":aggregate(report,["SYNTHESIS"])
    };
    const editorial=auditLifetimeEditorialQuality(report);
    expect(editorial.metrics).toEqual({
      aiToneHits:0,reportToneHits:0,technicalLeakageHits:0,longSentenceWarnings:0,
      duplicateClaimWarnings:0,duplicateSceneWarnings:0,sectionsWithoutConcreteScene:0,
      sectionsWithoutUpsideShadowPair:0,repeatedEndingWarnings:0,characterConsistencyWarnings:0
    });
    expect(editorial.coreNine).toHaveLength(9);
    expect(editorial.coreNine.every(row=>row.pass)).toBe(true);
    const roleOverview=report.sections.find(row=>row.id==="legacy-book-015"),visibleRole=report.sections.find(row=>row.id==="legacy-book-105");
    expect(roleOverview?.paragraphs?.[0]).not.toBe(visibleRole?.paragraphs?.[0]);
    expect(roleOverview?.paragraphs?.[3]).not.toBe(visibleRole?.paragraphs?.[3]);
    expect(roleOverview?.paragraphs?.[4]).not.toBe(visibleRole?.paragraphs?.[4]);

    const artifact={input:{...FULL_SAMPLE_INPUT,name:"synthetic-test-user"},contentSections:stats.contentSections,totalCharacters:stats.totalCharacters,totalParagraphs:content.reduce((sum,row)=>sum+(row.paragraphs?.length??1),0),
      totalParts:book.parts.length,totalChapters:new Set(content.map(row=>row.evidenceGroup)).size,sectionHash:createHash("sha256").update(ids.join("\n")).digest("hex"),density,
      duplicateSectionIds:ids.length-new Set(ids).size,duplicateSequences:sequences.length-new Set(sequences).size,missingChapters:[],contentContractFailures:0,noveltyFailures:0,semanticDuplicateWarnings:0,
      globalCharacterCoreShared:true,samjaeEvidenceConnected:true,childrenEvidenceConnected:true,editorialMetrics:editorial.metrics,coreNine:editorial.coreNine,
      templateRepeatPairs:editorial.templateRepeatPairs.length,templateRepeatSamples:editorial.templateRepeatPairs.slice(0,20)};
    console.info("M34_1_QA_ARTIFACT",JSON.stringify(artifact));
  },30_000);

  it("flags short Korean paraphrases of the same core responsibility claim",()=>{
    expect(semanticDuplicateSimilarity("책임감이 강하다","맡은 일을 끝까지 책임진다")).toBe(1);
    expect(semanticDuplicateSimilarity("맡은 일을 끝까지 책임진다","자기 몫을 쉽게 내려놓지 않는다")).toBe(1);
  });
});
