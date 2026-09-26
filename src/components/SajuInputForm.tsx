"use client";
import { FormEvent, useState } from "react";
import { SearchSelect } from "@/components/SearchSelect";
import { COUNTRY_OPTIONS, KR_CITY_OPTIONS, RELATIONSHIP_OPTIONS, normalizeDateInput, normalizeTimeInput } from "@/lib/saju/presentation/customer-input";
import type { SajuInput } from "@/types/saju-input";
import type { CustomerResultPayload } from "@/types/customer-result";
import type { RelationshipStatus } from "@/types/ai-interpretation";

export const TEST_INPUT: SajuInput = { name: "", gender: "female", calendarType: "solar", birthDate: "", birthTime: "", birthTimeKnown: true, birthCountry: "KR", birthCityKnown: true, birthCity: "" };
export interface LifetimeFormResult { payload: CustomerResultPayload; relationshipStatus: RelationshipStatus }
const cityOptions = KR_CITY_OPTIONS.map((label) => ({ value: label === "출생도시를 모름" ? "UNKNOWN" : label, label }));
const hours = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, "0")), minutes = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, "0"));

export function SajuInputForm({ onResult }: { onResult: (value: LifetimeFormResult) => void }) {
  const [form, setForm] = useState(TEST_INPUT), [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>("SINGLE");
  const [dateText, setDateText] = useState(""), [timeText, setTimeText] = useState(""), [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = <K extends keyof SajuInput>(key: K, value: SajuInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const time = form.birthTime ?? "", hour = time.slice(0, 2) || "00", minute = time.slice(3, 5) || "00";
  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "이름을 입력해 주세요.";
    if (form.calendarType === "lunar") next.calendar = "음력 계산은 준비 중입니다. 양력을 선택해 주세요.";
    if (form.birthCountry !== "KR") next.country = "현재 해외 출생 계산은 지원되지 않습니다.";
    if (form.birthCityKnown && !form.birthCity) next.city = "출생 도시를 선택해 주세요.";
    if (!normalizeDateInput(form.birthDate)) next.date = "출생 날짜를 확인해 주세요.";
    if (!form.birthTimeKnown) next.time = "출생시간을 모르면 현재 평생총운을 계산할 수 없습니다.";
    else if (!normalizeTimeInput(form.birthTime ?? "")) next.time = "출생 시간을 확인해 주세요.";
    setErrors(next); return Object.keys(next).length === 0;
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!validate()) return; setLoading(true); setErrors({});
    try { const response = await fetch("/api/saju/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? body.message ?? "요청에 실패했습니다."); onResult({ payload: body, relationshipStatus }); }
    catch (reason) { setErrors({ submit: reason instanceof Error ? reason.message : "알 수 없는 오류" }); } finally { setLoading(false); }
  }
  function applyDate(value: string) { setDateText(value); const normalized = normalizeDateInput(value); update("birthDate", normalized ?? value); setErrors((current) => ({ ...current, date: normalized ? "" : "출생 날짜를 확인해 주세요." })); }
  function applyTime(value: string) { setTimeText(value); const normalized = normalizeTimeInput(value); update("birthTime", normalized ?? value); setErrors((current) => ({ ...current, time: normalized ? "" : "출생 시간을 확인해 주세요." })); }
  return <section className="inputBook"><header><span>POSTPOST · 평생사주</span><h1>나의 시간을<br />한 권의 이야기로</h1><p>정확한 계산을 위해 태어난 정보를 차례로 입력해 주세요.</p></header><form onSubmit={submit} noValidate>
    <div className="field"><label htmlFor="customer-name">이름</label><input id="customer-name" value={form.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} placeholder="이름을 입력해 주세요" />{errors.name && <p className="fieldError">{errors.name}</p>}</div>
    <div className="formGrid"><label className="field">성별<select value={form.gender} onChange={(event) => update("gender", event.target.value as SajuInput["gender"])}><option value="female">여성</option><option value="male">남성</option></select></label><label className="field">현재 관계<select value={relationshipStatus} onChange={(event) => setRelationshipStatus(event.target.value as RelationshipStatus)}>{RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
    <label className="field">달력<select value={form.calendarType} onChange={(event) => { const value = event.target.value as SajuInput["calendarType"]; setForm((current) => value === "lunar" ? { ...current, calendarType: value, lunarLeapMonth: "normal" } : (({ lunarLeapMonth: _omit, ...rest }) => ({ ...rest, calendarType: value }))(current)); }}><option value="solar">양력</option><option value="lunar">음력</option></select>{form.calendarType === "lunar" && <p className="fieldNotice">음력 계산은 준비 중입니다. 현재는 양력만 정확하게 계산합니다.</p>}{errors.calendar && <p className="fieldError">{errors.calendar}</p>}</label>
    <SearchSelect label="출생 국가" options={COUNTRY_OPTIONS} value={form.birthCountry} searchable onChange={(value) => { update("birthCountry", value); setErrors((current) => ({ ...current, country: value === "KR" ? "" : "현재 해외 출생 계산은 지원되지 않습니다." })); }} error={errors.country} />
    <SearchSelect label="출생 도시" options={cityOptions} value={form.birthCityKnown ? form.birthCity ?? "" : "UNKNOWN"} searchable disabled={form.birthCountry !== "KR"} onChange={(value) => setForm((current) => ({ ...current, birthCityKnown: value !== "UNKNOWN", birthCity: value === "UNKNOWN" ? null : value }))} error={errors.city} />
    {!form.birthCityKnown && <p className="fieldNotice" role="status">출생지를 모르셔서 서울 기준으로 계산합니다.</p>}
    <div className="field"><label htmlFor="birth-date-text">출생 날짜</label><div className="dateControls"><input id="birth-date-text" inputMode="numeric" value={dateText} onChange={(event) => applyDate(event.target.value)} placeholder="19950930 또는 1995-09-30" aria-invalid={Boolean(errors.date)} /><input type="date" aria-label="달력에서 출생 날짜 선택" value={normalizeDateInput(form.birthDate) ?? ""} min="1900-01-07" max="2099-12-31" onChange={(event) => { setDateText(event.target.value); update("birthDate", event.target.value); setErrors((current) => ({ ...current, date: "" })); }} /></div>{errors.date && <p className="fieldError">{errors.date}</p>}</div>
    <div className="field"><label htmlFor="birth-time-text">출생 시간</label><div className="timeControls"><select aria-label="출생 시" value={hour} onChange={(event) => { const value = `${event.target.value}:${minute}`; update("birthTime", value); setTimeText(value); }}>{hours.map((value) => <option key={value}>{value}</option>)}</select><span>시</span><select aria-label="출생 분" value={minute} onChange={(event) => { const value = `${hour}:${event.target.value}`; update("birthTime", value); setTimeText(value); }}>{minutes.map((value) => <option key={value}>{value}</option>)}</select><span>분</span><input id="birth-time-text" inputMode="numeric" value={timeText} onChange={(event) => applyTime(event.target.value)} placeholder="0829 또는 08:29" /></div><label className="unknownTime"><input type="checkbox" checked={!form.birthTimeKnown} onChange={(event) => setForm((current) => ({ ...current, birthTimeKnown: !event.target.checked, birthTime: event.target.checked ? null : "00:00" }))} />출생시간을 모릅니다</label>{!form.birthTimeKnown && <p className="fieldNotice">출생시간을 모르면 현재 평생총운을 계산할 수 없습니다. 임의 시간으로 계산하지 않습니다.</p>}{errors.time && <p className="fieldError">{errors.time}</p>}</div>
    <button className="submitStory" disabled={loading}>{loading ? "나의 사주를 펼치는 중…" : "평생사주 보기"}</button>{errors.submit && <p className="fieldError">{errors.submit}</p>}
  </form></section>;
}
