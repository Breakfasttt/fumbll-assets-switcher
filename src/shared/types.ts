export const LANGUAGES = ["en", "fr", "es", "de"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface AppConfig {
  cacheFolder: string | null;
  coachName: string | null;
  language: Language;
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
  /** Set when this override was activated from an imported pack rather than an ad-hoc drag & drop. */
  packId?: string;
}

export interface PackManifestEntry {
  url: string;
  fileName: string;
}

export interface PackManifest {
  formatVersion: 1;
  name: string;
  description?: string;
  createdAt: string;
  entries: PackManifestEntry[];
}

export interface PackSummary {
  id: string;
  name: string;
  description?: string;
  importedAt: string;
  entryCount: number;
  active: boolean;
}

export interface OrphanCacheFile {
  fileName: string;
  sizeBytes: number;
}
