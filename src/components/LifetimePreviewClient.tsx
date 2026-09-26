"use client";
import { useEffect } from "react";
import { LifetimeReport } from "./LifetimeReport";
import type { SajuAnalysis } from "@/types/saju-analysis";
import type { CurrentPeriodSelection, InterpretationUiState } from "@/types/customer-result";
export function LifetimePreviewClient({analysis,current,interpretation}:{analysis:SajuAnalysis;current:CurrentPeriodSelection;interpretation:InterpretationUiState}) {
  useEffect(() => {
    const chapter = new URLSearchParams(window.location.search).get("chapter");
    if (chapter && /^\d{2}$/.test(chapter)) window.setTimeout(() => {
      document.querySelector<HTMLElement>(".lifetimeCover")?.setAttribute("hidden", "");
      document.querySelector<HTMLElement>(".chapterNav")?.setAttribute("hidden", "");
      document.querySelectorAll<HTMLElement>(".lifetimeChapter, .professionalRoom").forEach((section) => { section.hidden = section.id !== `chapter-${chapter}`; });
      if (chapter === "18") document.querySelector<HTMLDetailsElement>("#chapter-18 > details")?.setAttribute("open", "");
      window.scrollTo(0, 0);
    }, 1_000);
  }, []);
  return <LifetimeReport analysis={analysis} current={current} relationshipStatus="SINGLE" interpretation={interpretation} onRetry={()=>{}} onRestart={()=>{}} />;
}
