import { TIME_RULES_V1 } from "@/rules/time-rules.v1";
import type { SajuInput } from "@/types/saju-input";

const pad = (value: number) => String(value).padStart(2, "0");

export interface NormalizedBirthTime {
  legalDateTime: string | null;
  adjustedDateTime: string | null;
  adjustedInstant: Date | null;
  absoluteBirthInstant: Date | null;
  adjustedFields: { year: number; month: number; day: number; hour: number; minute: number } | null;
}

export function normalizeBirthTime(input: SajuInput): NormalizedBirthTime {
  if (!input.birthTimeKnown || !input.birthTime) {
    return { legalDateTime: null, adjustedDateTime: null, adjustedInstant: null, absoluteBirthInstant: null, adjustedFields: null };
  }

  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);
  const adjusted = new Date(Date.UTC(year, month - 1, day, hour, minute + TIME_RULES_V1.modernKoreaOffsetMinutes));
  const localIso = `${adjusted.getUTCFullYear()}-${pad(adjusted.getUTCMonth() + 1)}-${pad(adjusted.getUTCDate())}T${pad(adjusted.getUTCHours())}:${pad(adjusted.getUTCMinutes())}:00+09:00`;
  const adjustedFields = {
    year: adjusted.getUTCFullYear(), month: adjusted.getUTCMonth() + 1, day: adjusted.getUTCDate(),
    hour: adjusted.getUTCHours(), minute: adjusted.getUTCMinutes()
  };

  return {
    legalDateTime: `${input.birthDate}T${input.birthTime}:00+09:00`,
    adjustedDateTime: localIso,
    adjustedInstant: new Date(localIso),
    absoluteBirthInstant: new Date(`${input.birthDate}T${input.birthTime}:00+09:00`),
    adjustedFields
  };
}
