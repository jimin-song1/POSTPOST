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
  birthCountry: string;
  birthCityKnown: boolean;
  birthCity: string | null;
  lunarLeapMonth?: LunarLeapMonth;
}

/** Compatibility for clients that previously sent only birthCity. */
export type LegacySajuInput = Omit<SajuInput, "birthCountry" | "birthCityKnown" | "birthCity"> & {
  birthCity: string;
  birthCountry?: never;
  birthCityKnown?: never;
};

export interface BirthPlaceResolution {
  inputCity: string | null;
  resolvedCity: string;
  country: string;
  isEstimated: boolean;
  fallbackReason: "birth_place_unknown" | null;
  fallbackRule: "SEOUL_DEFAULT" | null;
}
