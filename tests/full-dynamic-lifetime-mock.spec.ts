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

    const artifact={input:{...FULL_SAMPLE_INPUT,name:"synthetic-test-user"},contentSections:stats.contentSections,totalCharacters:stats.totalCharacters,totalParagraphs:content.reduce((sum,row)=>sum+(row.paragraphs?.length??1),0),
      totalParts:book.parts.length,totalChapters:new Set(content.map(row=>row.evidenceGroup)).size,sectionHash:createHash("sha256").update(ids.join("\n")).digest("hex"),density,
      duplicateSectionIds:ids.length-new Set(ids).size,duplicateSequences:sequences.length-new Set(sequences).size,missingChapters:[],contentContractFailures:0,noveltyFailures:0,semanticDuplicateWarnings:0,
      globalCharacterCoreShared:true,samjaeEvidenceConnected:true,childrenEvidenceConnected:true,editorialMetrics:editorial.metrics,coreNine:editorial.coreNine};
    console.info("M34_1_QA_ARTIFACT",JSON.stringify(artifact));
  },30_000);

  it("flags short Korean paraphrases of the same core responsibility claim",()=>{
    expect(semanticDuplicateSimilarity("책임감이 강하다","맡은 일을 끝까지 책임진다")).toBe(1);
    expect(semanticDuplicateSimilarity("맡은 일을 끝까지 책임진다","자기 몫을 쉽게 내려놓지 않는다")).toBe(1);
  });
});
