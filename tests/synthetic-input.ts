import type { SajuInput } from "@/types/saju-input";

export const SYNTHETIC_INPUT: SajuInput = {
  name: "가상인물",
  gender: "female",
  calendarType: "solar",
  birthDate: "2024-04-01",
  birthTime: "12:34",
  birthTimeKnown: true,
  birthCountry: "KR",
  birthCityKnown: true,
  birthCity: "가상도시"
};

export const SYNTHETIC_CASE = { caseId: "SYNTHETIC_CORE_001", isSynthetic: true, input: SYNTHETIC_INPUT } as const;
