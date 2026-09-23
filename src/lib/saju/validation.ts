import { z } from "zod";
import type { SajuInput } from "@/types/saju-input";
import { normalizeBirthPlace } from "./normalize-birth-place";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isActualDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return value >= "1900-01-07" && value <= "2099-12-31" && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const canonicalInputSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요."),
  gender: z.enum(["male", "female"], { error: "성별을 확인해주세요." }),
  calendarType: z.enum(["solar", "lunar"], { error: "달력 유형을 확인해주세요." }),
  birthDate: z.string().refine(isActualDate, "1900-01-07~2099-12-31 사이의 실제 날짜를 입력해주세요."),
  birthTime: z.union([z.string(), z.null()]),
  birthTimeKnown: z.boolean({ error: "출생시간을 아는지 선택해주세요." }),
  birthCountry: z.string().regex(/^[A-Z]{2}$/, "출생국가는 두 자리 대문자 국가코드로 입력해주세요."),
  birthCityKnown: z.boolean({ error: "출생지역을 아는지 선택해주세요." }),
  birthCity: z.union([z.string(), z.null()]),
  lunarLeapMonth: z.enum(["normal", "leap"]).optional()
}).strict().superRefine((input, context) => {
  const city = typeof input.birthCity === "string" && input.birthCity.trim() ? input.birthCity : null;
  if (input.birthTimeKnown && (typeof input.birthTime !== "string" || !TIME_PATTERN.test(input.birthTime))) {
    context.addIssue({ code: "custom", path: ["birthTime"], message: "출생시간을 HH:mm 형식으로 입력해주세요." });
  }
  if (!input.birthTimeKnown && input.birthTime !== null && input.birthTime !== "") {
    context.addIssue({ code: "custom", path: ["birthTime"], message: "출생시간 미상인 경우 시간은 비워주세요." });
  }
  if (input.calendarType === "lunar" && !input.lunarLeapMonth) {
    context.addIssue({ code: "custom", path: ["lunarLeapMonth"], message: "음력은 평달/윤달을 선택해주세요." });
  }
  if (input.calendarType === "solar" && input.lunarLeapMonth !== undefined) {
    context.addIssue({ code: "custom", path: ["lunarLeapMonth"], message: "양력 입력에는 평달/윤달을 보내지 마세요." });
  }
  if ((input.birthCountry !== "KR" || input.birthCityKnown) && !city) {
    context.addIssue({ code: "custom", path: ["birthCity"], message: "출생도시를 입력해주세요." });
  }
});

function canonicalizeLegacy(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const input = body as Record<string, unknown>;
  const isLegacy = input.birthCountry === undefined && input.birthCityKnown === undefined;
  return isLegacy ? { ...input, birthCountry: "KR", birthCityKnown: true } : input;
}

export function parseSajuInput(body: unknown): SajuInput {
  const parsed = canonicalInputSchema.parse(canonicalizeLegacy(body));
  const { birthPlace: _birthPlace, ...place } = normalizeBirthPlace(parsed);
  return {
    ...parsed,
    ...place,
    birthTime: parsed.birthTimeKnown ? parsed.birthTime : null,
    birthCity: place.birthCity
  } as SajuInput;
}

export function firstValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "입력값을 확인해주세요.";
}
