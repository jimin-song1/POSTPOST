"use client";

import { FormEvent, useState } from "react";
import type { SajuInput } from "@/types/saju-input";
import type { CustomerResultPayload } from "@/types/customer-result";

export const TEST_INPUT: SajuInput = { name: "", gender: "female", calendarType: "solar", birthDate: "", birthTime: "", birthTimeKnown: true, birthCountry: "KR", birthCityKnown: true, birthCity: "" };

const COUNTRIES = [["KR", "대한민국"], ["US", "미국"], ["JP", "일본"], ["CN", "중국"], ["CA", "캐나다"], ["AU", "호주"], ["GB", "영국"], ["DE", "독일"], ["FR", "프랑스"]];

export function SajuInputForm({ onResult }: { onResult: (value: CustomerResultPayload) => void }) {
  const [form, setForm] = useState(TEST_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otherCountry, setOtherCountry] = useState(false);
  const unknownCity = form.birthCountry === "KR" && !form.birthCityKnown;
  const update = <K extends keyof SajuInput>(key: K, value: SajuInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/saju/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "요청에 실패했습니다.");
      onResult(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "알 수 없는 오류"); }
    finally { setLoading(false); }
  }

  return <section className="card formCard"><form onSubmit={submit}>
    <label>이름<input required value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
    <fieldset><legend>성별</legend><div className="segmented">
      <label><input type="radio" checked={form.gender === "female"} onChange={() => update("gender", "female")} />여성</label>
      <label><input type="radio" checked={form.gender === "male"} onChange={() => update("gender", "male")} />남성</label>
    </div></fieldset>
    <fieldset><legend>달력</legend><div className="segmented">
      <label><input type="radio" checked={form.calendarType === "solar"} onChange={() => setForm(({ lunarLeapMonth: _leap, ...current }) => ({ ...current, calendarType: "solar" }))} />양력</label>
      <label><input type="radio" checked={form.calendarType === "lunar"} onChange={() => setForm((current) => ({ ...current, calendarType: "lunar", lunarLeapMonth: "normal" }))} />음력</label>
    </div></fieldset>
    {form.calendarType === "lunar" && <label>윤달 여부<select value={form.lunarLeapMonth ?? "normal"} onChange={(e) => update("lunarLeapMonth", e.target.value as "normal" | "leap")}><option value="normal">평달</option><option value="leap">윤달</option></select></label>}
    <div className="twoCol"><label>생년월일<input required type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} /></label><label>출생시간<input required={form.birthTimeKnown} disabled={!form.birthTimeKnown} type="time" value={form.birthTime ?? ""} onChange={(e) => update("birthTime", e.target.value)} /></label></div>
    <label className="check"><input type="checkbox" checked={!form.birthTimeKnown} onChange={(e) => setForm((current) => ({ ...current, birthTimeKnown: !e.target.checked, birthTime: e.target.checked ? null : "" }))} /><span>출생시간을 모릅니다</span></label>
    <label>출생국가<select value={otherCountry ? "other" : form.birthCountry} onChange={(e) => {
      const other = e.target.value === "other";
      setOtherCountry(other);
      setForm((current) => ({ ...current, birthCountry: other ? "" : e.target.value, birthCityKnown: true }));
    }}>{COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}<option value="other">기타 국가</option></select></label>
    {otherCountry && <label>출생국가 코드<input required pattern="[A-Z]{2}" maxLength={2} placeholder="예: SG" value={form.birthCountry} onChange={(e) => update("birthCountry", e.target.value.toUpperCase())} /></label>}
    {form.birthCountry === "KR" && <label className="check"><input type="checkbox" checked={!form.birthCityKnown} onChange={(e) => setForm((current) => ({ ...current, birthCityKnown: !e.target.checked, birthCity: e.target.checked ? null : current.birthCity }))} /><span>태어난 지역을 모릅니다</span></label>}
    <label>출생도시<input required={!unknownCity} disabled={unknownCity} aria-describedby={unknownCity ? "birth-place-notice" : undefined} value={form.birthCity ?? ""} onChange={(e) => update("birthCity", e.target.value)} /></label>
    {unknownCity && <p id="birth-place-notice" role="status">출생지를 모르는 경우 서울 기준으로 계산합니다.</p>}
    <button disabled={loading}>{loading ? "계산 중…" : "사주 확인하기"}</button>{error && <p className="error">{error}</p>}
  </form></section>;
}
