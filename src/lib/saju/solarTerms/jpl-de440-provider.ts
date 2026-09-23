import { FIRST_YEAR, Instant, LAST_YEAR, solarTermsOfYear } from "lunisolar-ephemeris";
import type { JeolName, SolarTermPoint, SolarTermProvider } from "./provider";

const JEOL_INDEX: Record<JeolName, number> = {
  소한: 0, 입춘: 2, 경칩: 4, 청명: 6, 입하: 8, 망종: 10,
  소서: 12, 입추: 14, 백로: 16, 한로: 18, 입동: 20, 대설: 22
};
const INDEX_JEOL = Object.fromEntries(Object.entries(JEOL_INDEX).map(([name, index]) => [index, name])) as Record<number, JeolName>;
const SOURCE = "lunisolar-ephemeris 0.4.1 / JPL DE440 / GB/T 33661-2017 apparent solar longitude";

function toPoint(year: number, term: JeolName): SolarTermPoint {
  const boundary = solarTermsOfYear(year)[JEOL_INDEX[term]];
  const instant = Instant.toDate(boundary.instant);
  return { term, instant, instantIso: instant.toISOString(), source: SOURCE };
}

function jeolAround(datetime: Date) {
  const centerYear = datetime.getUTCFullYear();
  const years = [centerYear - 1, centerYear, centerYear + 1].filter((year) => year >= FIRST_YEAR && year <= LAST_YEAR);
  return years.flatMap((year) => solarTermsOfYear(year)
    .filter((term) => term.isJie)
    .map((term) => {
      const instant = Instant.toDate(term.instant);
      return { term: INDEX_JEOL[term.index], instant, instantIso: instant.toISOString(), source: SOURCE } satisfies SolarTermPoint;
    }))
    .sort((a, b) => a.instant.getTime() - b.instant.getTime());
}

export const jplDe440SolarTermProvider: SolarTermProvider = {
  supportedRange: [FIRST_YEAR, LAST_YEAR],
  getSolarTerm(year, term) {
    if (year < FIRST_YEAR || year > LAST_YEAR) throw new RangeError(`절기 지원 연도는 ${FIRST_YEAR}~${LAST_YEAR}입니다.`);
    return toPoint(year, term);
  },
  getPreviousJeol(datetime) {
    const found = jeolAround(datetime).filter((point) => point.instant <= datetime).at(-1);
    if (!found) throw new RangeError(`이전 절기를 찾을 수 없습니다. 지원 범위는 ${FIRST_YEAR}~${LAST_YEAR}입니다.`);
    return found;
  },
  getNextJeol(datetime) {
    const found = jeolAround(datetime).find((point) => point.instant > datetime);
    if (!found) throw new RangeError(`다음 절기를 찾을 수 없습니다. 지원 범위는 ${FIRST_YEAR}~${LAST_YEAR}입니다.`);
    return found;
  }
};
