export const RELATIONSHIP_OPTIONS = [
  { value: "SINGLE", label: "솔로" }, { value: "DATING", label: "연애 중" }, { value: "MARRIED", label: "기혼" },
] as const;

export const COUNTRY_OPTIONS = [
  { value: "KR", label: "대한민국" }, { value: "JP", label: "일본" }, { value: "US", label: "미국" },
  { value: "CN", label: "중국" }, { value: "CA", label: "캐나다" }, { value: "AU", label: "호주" },
  { value: "GB", label: "영국" }, { value: "DE", label: "독일" }, { value: "FR", label: "프랑스" },
] as const;

export const KR_CITY_OPTIONS = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
  "경기도 수원시", "경기도 성남시", "경기도 고양시", "경기도 용인시", "경기도 부천시", "경기도 안산시", "경기도 안양시",
  "경기도 남양주시", "경기도 화성시", "경기도 평택시", "경기도 의정부시", "경기도 시흥시", "경기도 파주시", "경기도 김포시",
  "강원특별자치도 춘천시", "강원특별자치도 원주시", "충청북도 청주시", "충청남도 천안시", "전북특별자치도 전주시",
  "전라남도 목포시", "경상북도 포항시", "경상남도 창원시", "제주특별자치도 제주시", "출생도시를 모름",
] as const;

export function normalizeDateInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split("-").map(Number), utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day && normalized >= "1900-01-07" && normalized <= "2099-12-31" ? normalized : null;
}

export function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, ""), normalized = digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : value;
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : null;
}

export interface DatePickerParts { year: string; month: string; day: string }
export interface TimePickerParts { hour: string; minute: string }

export function datePickerParts(value: string): DatePickerParts {
  const normalized = normalizeDateInput(value) ?? "1995-09-30";
  const [year, month, day] = normalized.split("-");
  return { year, month, day };
}

export function updateDatePickerPart(value: string, part: keyof DatePickerParts, next: string) {
  const current = { ...datePickerParts(value), [part]: next };
  const lastDay = new Date(Date.UTC(Number(current.year), Number(current.month), 0)).getUTCDate();
  current.day = String(Math.min(Number(current.day), lastDay)).padStart(2, "0");
  return `${current.year}-${current.month}-${current.day}`;
}

export function timePickerParts(value: string): TimePickerParts {
  const normalized = normalizeTimeInput(value) ?? "00:00";
  const [hour, minute] = normalized.split(":");
  return { hour, minute };
}

export function updateTimePickerPart(value: string, part: keyof TimePickerParts, next: string) {
  const current = { ...timePickerParts(value), [part]: next };
  return `${current.hour}:${current.minute}`;
}
