"use client";
import { useEffect, useId, useRef, useState } from "react";
import { datePickerParts, normalizeDateInput, updateDatePickerPart, type DatePickerParts } from "@/lib/saju/presentation/customer-input";

const years = Array.from({ length: 200 }, (_, index) => String(1900 + index));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

export function HybridDateField({ value, onChange, error, onError }: { value: string; onChange: (value: string) => void; error?: string; onError: (message?: string) => void }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [above, setAbove] = useState(false);
  const parts = datePickerParts(value), lastDay = new Date(Date.UTC(Number(parts.year), Number(parts.month), 0)).getUTCDate();
  const days = Array.from({ length: lastDay }, (_, index) => String(index + 1).padStart(2, "0"));
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  function show() { const rect = trigger.current?.getBoundingClientRect(); setAbove(Boolean(rect && innerHeight - rect.bottom < 250 && rect.top > 250)); setOpen(true); }
  function type(next: string) { const normalized = normalizeDateInput(next); onChange(normalized ?? next); if (next.replace(/\D/g, "").length >= 8 || next.length >= 10) onError(normalized ? undefined : "생년월일을 확인해 주세요."); else onError(); }
  function commit() { const normalized = normalizeDateInput(value); if (normalized) { onChange(normalized); onError(); } else if (value) onError("생년월일을 확인해 주세요."); }
  function choose(part: keyof DatePickerParts, next: string) { onChange(updateDatePickerPart(value, part, next)); onError(); }
  function keyDown(event: React.KeyboardEvent) { if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }
  return <div className={`field hybridPicker ${above ? "opensAbove" : ""}`} ref={root} onKeyDown={keyDown}>
    <label id={`${id}-label`} htmlFor={`${id}-input`}>생년월일</label>
    <div className="hybridInputShell">
      <input id={`${id}-input`} data-testid="birth-date-input" inputMode="numeric" autoComplete="bday" value={value} onChange={(event) => type(event.target.value)} onBlur={commit} placeholder="19950930 또는 1995-09-30" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      <button ref={trigger} type="button" className="pickerTrigger" aria-label="생년월일 선택 열기" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-picker`} onMouseDown={(event) => event.preventDefault()} onClick={() => open ? setOpen(false) : show()}><span aria-hidden="true">▾</span></button>
    </div>
    {open && <div id={`${id}-picker`} className="pickerMenu" role="group" aria-labelledby={`${id}-picker-title`}>
      <p id={`${id}-picker-title`} className="pickerContext">생년월일 선택</p>
      <div className="datePickerGrid">
        <label>연<select aria-label="출생 연" value={parts.year} onChange={(event) => choose("year", event.target.value)}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label>월<select aria-label="출생 월" value={parts.month} onChange={(event) => choose("month", event.target.value)}>{months.map((month) => <option key={month}>{month}</option>)}</select></label>
        <label>일<select aria-label="출생 일" value={parts.day} onChange={(event) => choose("day", event.target.value)}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
      </div>
      <button type="button" className="pickerDone" onClick={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }}>선택 완료</button>
    </div>}
    {error && <p id={`${id}-error`} className="fieldError" role="alert">{error}</p>}
  </div>;
}
