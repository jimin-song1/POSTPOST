"use client";
import { useEffect, useId, useRef, useState } from "react";

export interface SearchOption { value: string; label: string }
export function SearchSelect({ label, options, value, onChange, disabled, error, searchable = false }: { label: string; options: readonly SearchOption[]; value: string; onChange: (value: string) => void; disabled?: boolean; error?: string; searchable?: boolean }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0), [above, setAbove] = useState(false);
  const selected = options.find((option) => option.value === value), filtered = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  function show() { if (disabled) return; const rect = trigger.current?.getBoundingClientRect(); setAbove(Boolean(rect && innerHeight - rect.bottom < 340 && rect.top > 340)); setOpen(true); setQuery(""); setActive(Math.max(0, options.findIndex((option) => option.value === value))); }
  function choose(option: SearchOption) { onChange(option.value); setOpen(false); setQuery(""); requestAnimationFrame(() => trigger.current?.focus()); }
  function keyDown(event: React.KeyboardEvent) {
    if (!open && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); show(); return; }
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(filtered.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(Math.max(0, filtered.length - 1)); }
    else if (event.key === "Enter" && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
  }
  return <div className={`searchSelect ${above ? "opensAbove" : ""}`} ref={root}><label id={`${id}-label`}>{label}</label><button ref={trigger} type="button" className="selectTrigger" aria-labelledby={`${id}-label`} aria-expanded={open} aria-controls={`${id}-list`} onClick={() => open ? setOpen(false) : show()} onKeyDown={keyDown} disabled={disabled}>{selected?.label ?? "선택해 주세요"}<span aria-hidden="true">⌄</span></button>{open && <div className="selectMenu">{searchable && <input autoFocus className="selectSearch" aria-label={`${label} 검색`} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={keyDown} placeholder="검색어 입력" />}<div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}>{filtered.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} className={index === active ? "active" : ""} key={option.value} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>{option.label}</button>)}{!filtered.length && <p>검색 결과가 없습니다.</p>}</div></div>}{error && <p className="fieldError" role="alert">{error}</p>}</div>;
}
