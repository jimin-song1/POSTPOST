export type Gender = "male" | "female";
export type CalendarType = "solar" | "lunar";
export type LunarLeapMonth = "normal" | "leap";

export interface SajuInput {
  name: string;
  gender: Gender;
  calendarType: CalendarType;
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  birthCity: string;
  lunarLeapMonth?: LunarLeapMonth;
}
