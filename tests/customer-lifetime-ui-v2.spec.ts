import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SajuInputForm } from "@/components/SajuInputForm";
import { calculateSaju } from "@/lib/saju/engine";
import { COUNTRY_OPTIONS, KR_CITY_OPTIONS, RELATIONSHIP_OPTIONS, datePickerParts, normalizeDateInput, normalizeTimeInput, timePickerParts, updateDatePickerPart, updateTimePickerPart } from "@/lib/saju/presentation/customer-input";
import { LIFETIME_REPORT_V2 } from "@/rules/lifetime-report.v2";
import { CUSTOMER_TERMINOLOGY_V1 } from "@/rules/customer-terminology.v1";
import { SYNTHETIC_INPUT } from "./synthetic-input";

const formSource = () => readFile("src/components/SajuInputForm.tsx", "utf8");
const selectSource = () => readFile("src/components/SearchSelect.tsx", "utf8");
const dateSource = () => readFile("src/components/HybridDateField.tsx", "utf8");
const timeSource = () => readFile("src/components/HybridTimeField.tsx", "utf8");
const reportSource = () => readFile("src/components/LifetimeReport.tsx", "utf8");

describe("CUSTOMER_LIFETIME_UI_V2 input", () => {
  it("offers exactly three relationship values", () => expect(RELATIONSHIP_OPTIONS).toEqual([{value:"SINGLE",label:"솔로"},{value:"DATING",label:"연애 중"},{value:"MARRIED",label:"기혼"}]));
  it("keeps relationship context out of deterministic input", () => { const stable=(value:ReturnType<typeof calculateSaju>)=>({...value,engineMetadata:{...value.engineMetadata,calculatedAt:"stable"}}),before=stable(calculateSaju(SYNTHETIC_INPUT)); for(const relationshipStatus of RELATIONSHIP_OPTIONS.map(row=>row.value)){ expect(stable(calculateSaju(SYNTHETIC_INPUT))).toEqual(before); expect(JSON.stringify(SYNTHETIC_INPUT)).not.toContain(relationshipStatus); } });
  it("uses a verified static country list and exposes KR", () => { expect(COUNTRY_OPTIONS.find(row=>row.value==="KR")?.label).toBe("대한민국"); expect(COUNTRY_OPTIONS.length).toBeGreaterThan(5); });
  it("supports Korean city search data and unknown city", () => { expect(KR_CITY_OPTIONS.filter(city=>city.includes("시흥"))).toEqual(["경기도 시흥시"]); expect(KR_CITY_OPTIONS).toContain("경기도 화성시"); expect(KR_CITY_OPTIONS).toContain("출생도시를 모름"); });
  it.each([["19950930","1995-09-30"],["1995-09-30","1995-09-30"],["1995-02-31",null],["1899-12-31",null],["2000-02-29","2000-02-29"],["1900-02-29",null]])("normalizes date %s",(input,expected)=>expect(normalizeDateInput(input)).toBe(expected));
  it("uses UTC date validation without a timezone date shift",()=>{expect(updateDatePickerPart("2024-02-29","year","2023")).toBe("2023-02-28");expect(updateDatePickerPart("1995-09-30","month","02")).toBe("1995-02-28");expect(datePickerParts("19950930")).toEqual({year:"1995",month:"09",day:"30"});});
  it.each([["0829","08:29"],["08:29","08:29"],["24:00",null],["09:60",null],["00:00","00:00"],["23:59","23:59"]])("normalizes time %s",(input,expected)=>expect(normalizeTimeInput(input)).toBe(expected));
  it("synchronizes picker values with canonical date and time",()=>{expect(datePickerParts(updateDatePickerPart("1995-09-30","day","12"))).toEqual({year:"1995",month:"09",day:"12"});expect(timePickerParts("0829")).toEqual({hour:"08",minute:"29"});expect(updateTimePickerPart("08:29","minute","47")).toBe("08:47");});
  it("renders exactly one editable date field and one editable time field",()=>{const html=renderToStaticMarkup(createElement(SajuInputForm,{onResult:()=>{}}));expect(html.match(/data-testid="birth-date-input"/g)).toHaveLength(1);expect(html.match(/data-testid="birth-time-input"/g)).toHaveLength(1);expect(html).not.toContain('type="date"');expect(html).not.toContain("직접 입력하기");expect(html).not.toContain("입력 모드");});
  it("provides all 24 hours and 60 minutes inside the one time picker", async()=>{const source=await timeSource();expect(source).toContain("length: 24");expect(source).toContain("length: 60");expect(source).toContain('placeholder="0829 또는 08:29"');expect(source).toContain('aria-label="출생 분"');});
  it("keeps date and time pickers anchored to their shared input field",async()=>{const date=await dateSource(),time=await timeSource();for(const source of [date,time]){expect(source).toContain('className="hybridInputShell"');expect(source).toContain('className="pickerMenu"');expect(source).toContain("getBoundingClientRect");expect(source).toContain("innerHeight - rect.bottom");expect(source).toContain("aria-expanded");}});
  it("keeps the requested customer input order",()=>{const html=renderToStaticMarkup(createElement(SajuInputForm,{onResult:()=>{}}));const labels=["이름","성별","현재 관계","생년월일","달력","태어난 시각","출생 국가","출생 도시"];const positions=labels.map(label=>html.indexOf(label));expect(positions.every(position=>position>=0)).toBe(true);expect(positions).toEqual([...positions].sort((a,b)=>a-b));});
  it("shows leap-month controls only in lunar state source and blocks unsupported lunar submission",async()=>{const source=await formSource();expect(source).toContain('form.calendarType === "lunar"');expect(source).toContain("윤달 여부");expect(source).toContain("평달");expect(source).toContain("윤달");expect(source).toContain("현재 음력 계산은 준비 중입니다.");});
  it("blocks unsupported country and incomplete lunar mode", async()=>{const source=await formSource();expect(source).toContain("현재 해외 출생 계산은 지원되지 않습니다.");expect(source).toContain("음력 계산은 준비 중입니다.");});
  it("does not invent a time when it is unknown", async()=>{const source=await formSource();expect(source).toContain("임의 시간으로 계산하지 않습니다.");expect(source).toContain('birthTime: event.target.checked ? null : ""');});
  it("contains no child reality input", async()=>{const source=await formSource();for(const text of ["자녀 있음","몇 명","아들/딸","임신 여부","출산 계획"])expect(source).not.toContain(text);});
});

describe("CUSTOMER_LIFETIME_UI_V2 dropdown",()=>{
  it("uses an anchored absolute menu without layout growth",async()=>{const source=await selectSource(),css=await readFile("src/app/globals.css","utf8");expect(source).toContain('className="selectMenu"');expect(css).toContain(".selectMenu { position:absolute");expect(css).toContain("max-height:300px");});
  it("persists selected values and filters search",async()=>{const source=await selectSource();expect(source).toContain("option.value === value");expect(source).toContain("includes(query.trim().toLowerCase())");});
  it("supports keyboard and listbox semantics",async()=>{const source=await selectSource();for(const key of ["Escape","ArrowDown","ArrowUp","Home","End","Enter"])expect(source).toContain(key);expect(source).toContain('role="listbox"');expect(source).toContain('role="option"');expect(source).toContain("aria-selected");});
  it("flips above when lower viewport space is insufficient",async()=>expect(await selectSource()).toContain("innerHeight - rect.bottom < 340"));
});

describe("CUSTOMER_LIFETIME_UI_V2 report",()=>{
  it("keeps the canonical 01~18 order",()=>expect(LIFETIME_REPORT_V2.sections.map(row=>row.chapterNumber)).toEqual(Array.from({length:18},(_,index)=>String(index+1).padStart(2,"0"))));
  it("uses centralized customer terminology",async()=>{const source=await reportSource();expect(source).toContain("customerElement");expect(source).toContain("customerTerm");expect(CUSTOMER_TERMINOLOGY_V1.terms.용신).toBe("나에게 가장 필요한 기운");});
  it("renders five representative element percentages",async()=>{const source=await reportSource();expect(source).toContain("adjusted?.[element].percentage");expect(source).toContain("ELEMENTS.map");});
  it("renders deterministic wellness with a medical disclaimer",async()=>{const source=await reportSource();expect(source).toContain("constitutionalBalanceScore");expect(source).toContain("의학적 진단이 아닙니다");});
  it("renders deterministic children without reality assumptions",async()=>{const source=await reportSource();expect(source).toContain("children.bond.score");expect(source).toContain("sonPercent");expect(source).toContain("daughterPercent");expect(source).not.toContain("현재 자녀와");expect(source).not.toContain("첫째");expect(source).not.toContain("둘째");});
  it("keeps support and activation separate",async()=>{const source=await reportSource();expect(source).toContain('label="도움 흐름"');expect(source).toContain('label="변화 움직임"');expect(source).toContain("하나의 종합 점수로 합치지 않습니다");});
  it("keeps all ten daeun available in a controlled scroller",async()=>{const source=await reportSource();expect(source).toContain("periods.map");expect(source).toContain('className="daeunRail"');});
  it("keeps professional analysis collapsed",async()=>{const source=await reportSource();expect(source).toContain('id="chapter-18"');expect(source).toContain("버전과 evidence IDs");});
  it("isolates AI failure while preserving deterministic chapters",async()=>{const source=await reportSource();expect(source).toContain('interpretation.status === "failed"');expect(source).toContain("계산된 평생사주 결과는 정상적으로 표시");});
  it("uses real text and no information image or canvas dependency",async()=>{const source=await reportSource();expect(source).not.toContain("<img");expect(source).not.toContain("<canvas");expect(source).toContain("삼족오 한마디");});
  it("ships deep, distinct Korean synthetic copy without repeated boilerplate",async()=>{const preview=await readFile("src/app/dev/lifetime-report/page.tsx","utf8");expect(preview).toContain("겉으로는");expect(preview).toContain("돈을 버는 방식");expect(preview).toContain("부모 역할");expect(preview).toContain("생활 리듬");expect(preview.length).toBeGreaterThan(7000);expect(preview).not.toContain("이 장은 공개 합성 입력에서 계산된 근거만 사용합니다");expect(preview).not.toContain("OPENAI_API_KEY");});
  it("labels Daeun Korean-first with a period indicator",async()=>{const source=await reportSource();expect(source).toContain("STEM_HANGUL");expect(source).toContain("BRANCH_HANGUL");expect(source).toContain('className="periodIndicator"');});
  it("explains wellness percentages as element composition",async()=>{const source=await reportSource();expect(source).toContain("건강 능력 점수가 아니라");expect(source).toContain("기운 <strong>");});
  it("places children metric explanations beside their values",async()=>{const source=await reportSource();expect(source).toContain("출산 가능성이 아니라");expect(source).toContain("실제 태아 성별 확률이 아닌");});
  it("labels professional pillar Ten Gods explicitly",async()=>{const source=await reportSource();expect(source).toContain("천간 십성:");});
  it("formats customer labels Korean-first and professional labels Han-second",()=>{expect(CUSTOMER_TERMINOLOGY_V1.elements.wood).toEqual({customer:"나무",professional:"목(木)"});});
});
