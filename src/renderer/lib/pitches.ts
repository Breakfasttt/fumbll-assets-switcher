const PITCH_CDN_BASE = "https://cdn.fumbbl.com/FUMBBL/Images/Pitches/";

// Slugs confirmed empirically (HEAD-probed against the real CDN) - not a
// simple PascalCase-of-the-name transform, several are truncated or use a
// different casing than the roster's display name.
export const PITCH_ROSTER_SLUGS: Record<string, string> = {
  Amazon: "Amazon",
  "Chaos Chosen": "Chaos",
  "Dark Elf": "Darkelf",
  Goblin: "Goblin",
  "High Elf": "Highelf",
  Lizardmen: "Lizardmen",
  "Necromantic Horror": "Necromantic",
  Khorne: "Khorne",
  Norse: "Norse",
  Nurgle: "Nurgle",
  "Tomb Kings": "TombKings",
  Skaven: "Skaven",
  Vampire: "Vampire",
};

export interface PitchOption {
  key: string;
  label: string;
  slug: string;
}

export const SPECIAL_PITCH_OPTIONS: PitchOption[] = [
  { key: "special:Blackbox", label: "Blackbox", slug: "Blackbox" },
  { key: "special:FumbblCup", label: "FUMBBL Cup", slug: "FumbblCup" },
  { key: "special:NAF", label: "NAF", slug: "NAF" },
];

export const SYSTEM_PITCH_OPTIONS: PitchOption[] = [
  { key: "system:Default", label: "Default", slug: "Default" },
  { key: "system:Basic", label: "Basic", slug: "Basic" },
];

export function rosterPitchOptions(rosterNames: string[]): PitchOption[] {
  return rosterNames
    .filter((name) => name in PITCH_ROSTER_SLUGS)
    .map((name) => ({ key: `roster:${name}`, label: name, slug: PITCH_ROSTER_SLUGS[name] }));
}

export function buildPitchZipUrl(slug: string): string {
  return `${PITCH_CDN_BASE}${slug}.zip`;
}

export function buildPitchWeatherUrl(slug: string, weather: string): string {
  return `${buildPitchZipUrl(slug)}?pitch=${weather}`;
}
