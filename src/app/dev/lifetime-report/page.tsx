import { LifetimePreviewClient } from "@/components/LifetimePreviewClient";
import { calculateSaju } from "@/lib/saju/engine";
import { selectCurrentPeriods } from "@/lib/saju/presentation/current-period";
import { LIFETIME_REPORT_V2 } from "@/rules/lifetime-report.v2";
import type { InterpretationUiState } from "@/types/customer-result";

const analysis = calculateSaju({ name:"가상인물", gender:"female", calendarType:"solar", birthDate:"1995-09-30", birthTime:"08:29", birthTimeKnown:true, birthCountry:"KR", birthCityKnown:true, birthCity:"서울특별시" });
const longParagraphs = [
  "이 장은 공개 합성 입력에서 계산된 근거만 사용합니다. 타고난 성향은 한 가지 단어로 단정하기보다 반복해서 드러나는 선택과 리듬을 중심으로 읽는 편이 좋습니다.",
  "도움이 되는 흐름과 변화가 커지는 흐름은 서로 다른 의미입니다. 주변 환경을 활용할 때와 스스로 방향을 정할 때의 차이를 살피면 긴 시간의 변화도 더 편안하게 이해할 수 있습니다.",
  "결과는 확정된 사건을 예언하지 않습니다. 지금까지 익숙하게 사용한 힘과 앞으로 의식적으로 보완할 부분을 함께 살펴보는 참고 자료입니다.",
];
const interpretation: InterpretationUiState = { status:"completed", ruleVersion:"ai-interpretation-v1", promptVersion:"interpretation-prompt-v1", groundingVersion:"interpretation-grounding-v1", analysisHash:"synthetic-preview", cacheKey:"synthetic-preview", metadata:{provider:"synthetic",model:"layout-preview",repaired:false}, report:{ status:"completed",reportType:"LIFETIME_GENERAL",headline:"기준을 세우고 긴 호흡으로 나만의 결과를 만드는 사람",summary:"서두르기보다 충분히 살피고, 한번 정한 방향은 꾸준히 이어가는 힘이 돋보입니다.",sections:LIFETIME_REPORT_V2.sections.map(section=>({id:section.id,chapterNumber:section.chapterNumber,title:section.title,headline:`${section.title}, 쉬운 말로 풀어봅니다`,lead:"계산된 근거를 바꾸지 않고 생활 속 언어로 연결합니다.",body:longParagraphs.join("\n\n"),paragraphs:longParagraphs,keyPoints:["도움 흐름과 변화 움직임을 나누어 봅니다."],evidenceIds:["SYNTHETIC:EVIDENCE"],mascotComment:"내 속도와 리듬을 기억하세요."})),highlights:["기준을 세우고 꾸준히 이어가는 힘이 있습니다."],cautions:["강한 책임감이 부담으로 쌓이지 않도록 회복 시간을 챙기세요."],timeline:[],disclaimer:"전통 명리의 경향 해석이며 확정적 사건 예측이 아닙니다." } };

export default function LifetimePreview() { return <LifetimePreviewClient analysis={analysis} current={selectCurrentPeriods(analysis)} interpretation={interpretation} />; }
