import {LifetimePreviewClient} from "@/components/LifetimePreviewClient";
import {calculateSaju} from "@/lib/saju/engine";
import {selectCurrentPeriods} from "@/lib/saju/presentation/current-period";
import {interpretSajuAnalysis} from "@/lib/saju/ai-interpretation/service";
import {MockInterpretationProvider} from "@/lib/saju/ai-interpretation/mock-provider";
import {lifetimeDisplayAnalysis} from "@/lib/saju/presentation/lifetime-display";
export default async function LifetimePreview(){
  const analysis=calculateSaju({name:"테스트사용자",gender:"female",calendarType:"solar",birthDate:"1992-04-17",birthTime:"14:20",birthTimeKnown:true,birthCountry:"KR",birthCityKnown:true,birthCity:"서울특별시"});
  const interpretation=await interpretSajuAnalysis(analysis,new MockInterpretationProvider(),{reportType:"LIFETIME_GENERAL",relationshipStatus:"SINGLE",year:new Date().getFullYear()});
  const displayAnalysis=lifetimeDisplayAnalysis(analysis);
  return <LifetimePreviewClient analysis={displayAnalysis} current={selectCurrentPeriods(analysis)} interpretation={interpretation}/>;
}
