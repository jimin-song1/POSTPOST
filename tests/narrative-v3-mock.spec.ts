import {readFile} from "node:fs/promises";
import {describe,expect,it} from "vitest";
import {calculateSaju} from "@/lib/saju/engine";
import {interpretSajuAnalysis} from "@/lib/saju/ai-interpretation/service";
import {MockInterpretationProvider} from "@/lib/saju/ai-interpretation/mock-provider";
import {buildDynamicLifetimeBook,LIFETIME_CONTENT_CONTRACT_V1} from "@/rules/lifetime-report.v4";
import {INTERPRETATION_BRIDGE_V3} from "@/rules/interpretation-bridge.v3";
import {validateLifetimeContentContract} from "@/lib/saju/ai-interpretation/lifetime-content-contract";
import {SYNTHETIC_INPUT} from "./synthetic-input";

describe("POSTPOST Narrative Engine v3 mock mode",()=>{
  it("renders every canonical page from real deterministic calculation without an OpenAI call",async()=>{
    const analysis=calculateSaju(SYNTHETIC_INPUT),provider=new MockInterpretationProvider();
    const book=buildDynamicLifetimeBook({includeSamjae:true,year:2026});
    const results=await Promise.all(book.parts.map(part=>interpretSajuAnalysis(analysis,provider,{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year:2026,lifetimePartNumber:part.partNumber})));
    expect(results.every(result=>result.status==="completed")).toBe(true);
    const pages=results.flatMap(result=>result.status==="completed"?result.report.sections:[]);
    expect(pages.length).toBeGreaterThanOrEqual(LIFETIME_CONTENT_CONTRACT_V1.minimumContentSections);
    expect(new Set(pages.map(page=>page.id)).size).toBe(pages.length);
    expect(results.every(result=>result.status!=="completed"||result.metadata.provider==="mock")).toBe(true);
    const completed=results.filter(result=>result.status==="completed");
    const merged={...completed[0].report,sections:pages,timeline:completed.flatMap(result=>result.report.timeline)};
    const stats=validateLifetimeContentContract(merged);
    expect(stats.totalCharacters).toBeGreaterThanOrEqual(LIFETIME_CONTENT_CONTRACT_V1.totalCharacters.minimum);
  });

  it("locks the v3 contract and blocks mock activation in production",async()=>{
    expect(INTERPRETATION_BRIDGE_V3.evidence).toMatchObject({minimum:2,maximum:4,singleSignalStrongClaim:false});
    expect(INTERPRETATION_BRIDGE_V3.timing.mustStaySeparate).toBe(true);
    const route=await readFile("src/app/api/saju/interpret/route.ts","utf8");
    expect(route).toContain('process.env.DEV_MOCK_INTERPRETATION==="true"&&process.env.NODE_ENV!=="production"');
  });
});
