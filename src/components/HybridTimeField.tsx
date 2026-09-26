"use client";
import { useEffect, useId, useRef, useState } from "react";
import { normalizeTimeInput, timePickerParts, updateTimePickerPart, type TimePickerParts } from "@/lib/saju/presentation/customer-input";

const hours = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, "0"));

export function HybridTimeField({ value, onChange, error, onError }: { value: string; onChange: (value: string) => void; error?: string; onError: (message?: string) => void }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [above, setAbove] = useState(false);
  const parts = timePickerParts(value);
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  function show() { const rect = trigger.current?.getBoundingClientRect(); setAbove(Boolean(rect && innerHeight - rect.bottom < 250 && rect.top > 250)); setOpen(true); }
  function type(next: string) { const normalized = normalizeTimeInput(next); onChange(normalized ?? next); if (next.replace(/\D/g, "").length >= 4 || next.length >= 5) onError(normalized ? undefined : "태어난 시각을 확인해 주세요."); else onError(); }
  function commit() { const normalized = normalizeTimeInput(value); if (normalized) { onChange(normalized); onError(); } else if (value) onError("태어난 시각을 확인해 주세요."); }
  function choose(part: keyof TimePickerParts, next: string) { onChange(updateTimePickerPart(value, part, next)); onError(); }
  function keyDown(event: React.KeyboardEvent) { if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }
  return <div className={`field hybridPicker ${above ? "opensAbove" : ""}`} ref={root} onKeyDown={keyDown}>
    <label id={`${id}-label`} htmlFor={`${id}-input`}>태어난 시각</label>
    <div className="hybridInputShell">
      <input id={`${id}-input`} data-testid="birth-time-input" inputMode="numeric" autoComplete="bday-time" value={value} onChange={(event) => type(event.target.value)} onBlur={commit} placeholder="0829 또는 08:29" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      <button ref={trigger} type="button" className="pickerTrigger" aria-label="태어난 시각 선택 열기" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-picker`} onMouseDown={(event) => event.preventDefault()} onClick={() => open ? setOpen(false) : show()}><span aria-hidden="true">▾</span></button>
    </div>
    {open && <div id={`${id}-picker`} className="pickerMenu" role="group" aria-labelledby={`${id}-label`}>
      <div className="timePickerGrid">
        <label>시<select aria-label="출생 시" value={parts.hour} onChange={(event) => choose("hour", event.target.value)}>{hours.map((hour) => <option key={hour}>{hour}</option>)}</select></label>
        <label>분<select aria-label="출생 분" value={parts.minute} onChange={(event) => choose("minute", event.target.value)}>{minutes.map((minute) => <option key={minute}>{minute}</option>)}</select></label>
      </div>
      <button type="button" className="pickerDone" onClick={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }}>선택 완료</button>
    </div>}
    {error && <p id={`${id}-error`} className="fieldError" role="alert">{error}</p>}
  </div>;
}
