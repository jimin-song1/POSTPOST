"use client";

import { FormEvent, useState } from "react";
import type { SajuInput } from "@/types/saju-input";

export const TEST_INPUT: SajuInput = { name: "테스트 사용자", gender: "female", calendarType: "solar", birthDate: "2024-04-01", birthTime: "12:34", birthTimeKnown: true, birthCity: "가상도시" };

export function SajuInputForm({ onResult }: { onResult: (value: unknown) => void }) {
  const [form, setForm] = useState(TEST_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = <K extends keyof SajuInput>(key: K, value: SajuInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/saju/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
      <label><input type="radio" checked={form.calendarType === "solar"} onChange={() => update("calendarType", "solar")} />양력</label>
      <label><input type="radio" checked={form.calendarType === "lunar"} onChange={() => update("calendarType", "lunar")} />음력</label>
    </div></fieldset>
    {form.calendarType === "lunar" && <label>윤달 여부<select value={form.lunarLeapMonth ?? "normal"} onChange={(e) => update("lunarLeapMonth", e.target.value as "normal" | "leap")}><option value="normal">평달</option><option value="leap">윤달</option></select></label>}
    <div className="twoCol"><label>생년월일<input required type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} /></label><label>출생시간<input required={form.birthTimeKnown} disabled={!form.birthTimeKnown} type="time" value={form.birthTime ?? ""} onChange={(e) => update("birthTime", e.target.value)} /></label></div>
    <label className="check"><input type="checkbox" checked={!form.birthTimeKnown} onChange={(e) => update("birthTimeKnown", !e.target.checked)} /><span>출생시간을 모릅니다</span></label>
    <label>출생도시<input required value={form.birthCity} onChange={(e) => update("birthCity", e.target.value)} /></label>
    <button disabled={loading}>{loading ? "계산 중…" : "사주 확인하기"}</button>{error && <p className="error">{error}</p>}
  </form></section>;
}
