export interface AppConfig {
  cacheFolder: string | null;
  coachName: string | null;
}

export interface RosterPosition {
  name: string;
  type: string;
  urlPortrait: string | null;
  urlIconSet: string | null;
}

export interface RosterInfo {
  id: number;
  name: string;
  baseIconPath: string;
  positions: RosterPosition[];
}

export interface DivisionRosterSummary {
  id: number;
  name: string;
}

export const WEATHER_CODES = ["heat", "sunny", "nice", "rain", "blizzard", "intro"] as const;
export type WeatherCode = (typeof WEATHER_CODES)[number];

export interface CacheMapEntry {
  url: string;
  hash: string;
  managedByTool: boolean;
}

export interface DetectedCoach {
  coachName: string;
  cachePath: string | null;
  localIconCacheOn: boolean;
}

export interface OverrideEntry {
  url: string;
  fileName: string;
  active: boolean;
}
