"use client";
import { useEffect } from "react";
import { LifetimeReport } from "./LifetimeReport";
import type { SajuAnalysis } from "@/types/saju-analysis";
import type { CurrentPeriodSelection, InterpretationUiState } from "@/types/customer-result";
export function LifetimePreviewClient({analysis,current,interpretation}:{analysis:SajuAnalysis;current:CurrentPeriodSelection;interpretation:InterpretationUiState}) {
  useEffect(() => {
    const chapter = new URLSearchParams(window.location.search).get("chapter");
    if (chapter && /^(?:prologue|personality|career-study|workplace|business|wealth|love-marriage|family|benefactor|health|deep-reading|special|yearly|daeun|epilogue)$/.test(chapter)) window.setTimeout(() => {
      document.querySelector<HTMLElement>(".lifetimeCover")?.setAttribute("hidden", "");
      document.querySelector<HTMLElement>(".chapterNav")?.setAttribute("hidden", "");
      document.querySelectorAll<HTMLElement>(".lifetimeChapter").forEach((section) => { section.hidden = section.id !== `chapter-${chapter}`; });
      if (chapter === "deep-reading") document.querySelector<HTMLDetailsElement>("#chapter-deep-reading > details")?.setAttribute("open", "");
      window.scrollTo(0, 0);
    }, 1_000);
  }, []);
  return <LifetimeReport analysis={analysis} current={current} relationshipStatus="SINGLE" childStatus="NOT_APPLICABLE" interpretation={interpretation} onRetry={()=>{}} onRestart={()=>{}} />;
}
