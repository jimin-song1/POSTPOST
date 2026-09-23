import type { BirthPlaceResolution } from "@/types/saju-input";

export const SEOUL_FALLBACK_NOTICE = "출생지를 입력하지 않아 서울 기준으로 계산되었습니다.";

/** Both the API and direct engine callers use this validation boundary. */
export function normalizeBirthPlace(input: {
  birthCountry?: unknown;
  birthCityKnown?: unknown;
  birthCity?: unknown;
}) {
  const legacy = input.birthCountry === undefined && input.birthCityKnown === undefined;
  const country = legacy ? "KR" : input.birthCountry;
  const known = legacy ? true : input.birthCityKnown;
  if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country)) {
    throw new Error("출생국가는 두 자리 대문자 국가코드로 입력해주세요.");
  }
  if (typeof known !== "boolean") throw new Error("출생지역을 아는지 선택해주세요.");
  if (input.birthCity != null && typeof input.birthCity !== "string") {
    throw new Error("출생도시는 문자열로 입력해주세요.");
  }
  // Preserve a provided city verbatim; whitespace-only values normalize to null.
  const city = typeof input.birthCity === "string" && input.birthCity.trim() ? input.birthCity : null;
  const estimated = country === "KR" && !known;
  if (!estimated && !city) throw new Error("출생도시를 입력해주세요.");
  const inputCity = estimated ? null : city;
  const birthPlace: BirthPlaceResolution = {
    inputCity,
    resolvedCity: estimated ? "서울특별시" : city!,
    country,
    isEstimated: estimated,
    fallbackReason: estimated ? "birth_place_unknown" : null,
    fallbackRule: estimated ? "SEOUL_DEFAULT" : null
  };
  return {
    birthCountry: country,
    birthCityKnown: country === "KR" ? known : true,
    birthCity: inputCity,
    birthPlace
  };
}
