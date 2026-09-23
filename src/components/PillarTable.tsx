import type { SajuAnalysis } from "@/types/saju-analysis";

export function PillarTable({ pillars }: Pick<SajuAnalysis, "pillars">) {
  const labels = { year: "년주", month: "월주", day: "일주", hour: "시주" };
  return <div className="pillars">{Object.entries(pillars).map(([key, pillar]) => <div key={key}><span>{labels[key as keyof typeof labels]}</span><strong>{pillar.korean ?? "미계산"}</strong><small>{pillar.hanja}</small></div>)}</div>;
}
