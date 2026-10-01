import type {Element} from "@/types/saju-analysis";

export const CUSTOMER_TERMINOLOGY_V1={
  version:"customer-terminology-v1",
  terms:{
    일간:"나를 대표하는 기운",신강:"내가 힘을 쓰는 방식",신약:"내가 힘을 쓰는 방식",격국:"타고난 삶의 구조",
    용신:"나에게 가장 필요한 기운",희신:"나를 도와주는 기운",기신:"과하면 부담이 되는 기운",
    십성:"내 안의 10가지 성향",지장간:"겉으로 드러나지 않는 속기운",대운:"10년마다 바뀌는 큰 흐름",
    세운:"해마다 달라지는 흐름",월운:"달마다 달라지는 흐름",합:"서로 끌어당기고 이어지는 힘",
    충:"강하게 부딪혀 변화를 만드는 힘",형:"반복해서 긴장과 압박을 만드는 힘",파:"익숙한 흐름을 흔드는 힘",
    해:"겉보다 안에서 신경 쓰이게 하는 힘",원진:"가까울수록 예민하게 꼬이기 쉬운 관계",
    삼합:"여러 기운이 모여 한 방향으로 커지는 흐름",방합:"여러 기운이 모여 한 방향으로 커지는 흐름",
    공망:"힘이 바로 드러나지 않는 자리",신살:"특별하게 나타나는 성향 표시"
  },
  elements:{
    wood:{customer:"나무",professional:"목(木)"},fire:{customer:"불",professional:"화(火)"},
    earth:{customer:"흙",professional:"토(土)"},metal:{customer:"쇠",professional:"금(金)"},
    water:{customer:"물",professional:"수(水)"}
  } satisfies Record<Element,{customer:string;professional:string}>
} as const;

export const CUSTOMER_TECHNICAL_LITERAL_TERMS=[
  "일간","신강","신약","격국","용신","희신","기신","조후","오행","천간","년주","월주","일주","시주",
  "지장간","십성","식신","십이운성","자녀궁","원국","대운","월운","득령","득지","득세","투간"
] as const;

const CUSTOMER_TECHNICAL_CONTEXT_PATTERNS=[
  {label:"지지",pattern:/천간(?:과|와|·|\s)*지지|지지(?:가|는|은|의|를|을|에|에서|끼리)?\s*(?:합|충|형|파|해|오행|관계|기운|강|약)/},
  {label:"상관",pattern:/식신(?:과|와|·|\s)*상관|상관(?:이|가|은|는|의|을|를)?\s*(?:격|성|운|기운|십성|강|약|많|적|드러|작용)/},
  {label:"세운",pattern:/(?:대운|연운|월운)(?:과|와|·|\s)*세운|세운(?:이|가|은|는|의|을|를|에|에서)?\s*(?:흐름|작용|기운|시기|간지|좋|나쁘|강|약)/},
  {label:"통관",pattern:/통관(?:용신|법|론|기운|작용)/},
  {label:"병약",pattern:/병약(?:용신|법|론|기운|작용)/}
] as const;

const TECHNICAL_SUFFIX="(?:입니다|이에요|예요|이다|이라는|이라고|으로|에서|부터|까지|마다|별|이|가|은|는|을|를|의|에|로|와|과|도|만)?";
function hasStandaloneTechnicalTerm(value:string,term:string){
  const escaped=term.replace(/[.*+?^$()|[\]\\]/g,"\\export function customerTechnicalTermHits(value:string){
  const hits:string[]=[];
  for(const term of CUSTOMER_TECHNICAL_LITERAL_TERMS)if(value.includes(term))hits.push(term);
  for(const row of CUSTOMER_TECHNICAL_CONTEXT_PATTERNS)if(row.pattern.test(value))hits.push(row.label);
  return Array.from(new Set(hits));
}");
  return new RegExp("(^|[^가-힣A-Za-z0-9])"+escaped+TECHNICAL_SUFFIX+"(?=$|[^가-힣A-Za-z0-9])").test(value);
}

export function customerTechnicalTermHits(value:string){
  const hits:string[]=[];
  for(const term of CUSTOMER_TECHNICAL_LITERAL_TERMS)if(hasStandaloneTechnicalTerm(value,term))hits.push(term);
  for(const row of CUSTOMER_TECHNICAL_CONTEXT_PATTERNS)if(row.pattern.test(value))hits.push(row.label);
  return Array.from(new Set(hits));
}

export function customerTerm(term:keyof typeof CUSTOMER_TERMINOLOGY_V1.terms){return CUSTOMER_TERMINOLOGY_V1.terms[term];}
export function customerElement(element:Element,professional=false){const row=CUSTOMER_TERMINOLOGY_V1.elements[element];return professional?row.professional:row.customer;}
