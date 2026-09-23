import type { Pillar } from "@/types/saju-analysis";
import type { SajuInput } from "@/types/saju-input";

export const TEST_001_INPUT = {
  name: "테스트 사용자",
  gender: "female",
  calendarType: "solar",
  birthDate: "2024-04-01",
  birthTime: "12:34",
  birthTimeKnown: true,
  birthCity: "가상도시"
} satisfies SajuInput;

export const TEST_001_PILLARS: Record<Pillar["position"], Pillar> = {
  year: { position: "year", stem: "乙", branch: "亥", hanja: "乙亥", korean: "을해" },
  month: { position: "month", stem: "乙", branch: "酉", hanja: "乙酉", korean: "을유" },
  day: { position: "day", stem: "甲", branch: "子", hanja: "甲子", korean: "갑자" },
  hour: { position: "hour", stem: "戊", branch: "辰", hanja: "戊辰", korean: "무진" }
};

export function isTest001(input: SajuInput) {
  return input.gender === "female" && input.calendarType === "solar" && input.birthDate === "2024-04-01" && input.birthTime === "12:34" && input.birthTimeKnown && input.birthCity.includes("가상도시");
}
