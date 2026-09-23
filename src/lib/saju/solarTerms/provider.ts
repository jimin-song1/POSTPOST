export type JeolName = "소한" | "입춘" | "경칩" | "청명" | "입하" | "망종" | "소서" | "입추" | "백로" | "한로" | "입동" | "대설";

export interface SolarTermPoint {
  term: JeolName;
  instant: Date;
  instantIso: string;
  source: string;
}

export interface SolarTermProvider {
  readonly supportedRange: readonly [number, number];
  getSolarTerm(year: number, term: JeolName): SolarTermPoint;
  getPreviousJeol(datetime: Date): SolarTermPoint;
  getNextJeol(datetime: Date): SolarTermPoint;
}
