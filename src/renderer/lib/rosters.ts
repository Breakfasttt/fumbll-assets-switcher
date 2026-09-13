// Ordered so that when a race name exists in multiple divisions with the same
// underlying roster id, the first (most common) one wins during dedup.
export const DIVISION_IDS = [1, 2, 3, 5, 10, 200];

// Fixed set of the 31 current BB2025 official roster ids, resolved by hand
// against the live FUMBBL API (no division cleanly maps to this exact set —
// e.g. division 1/Ranked is missing Bretonnian, Khorne, Black Orc, Gnome,
// Imperial Nobility, which only exist under Competitive/League).
export const BB2025_ROSTER_IDS = new Set([
  41, // Amazon
  4789, // Old World Alliance
  66, // Underworld Denizens
  1721, // Bretonnian
  42, // Chaos Chosen
  44, // Dark Elf
  61, // Wood Elf
  7544, // Gnome
  47, // Goblin
  48, // Halfling
  49, // High Elf
  52, // Lizardmen
  53, // Necromantic Horror
  50, // Human
  5916, // Khorne
  59, // Shambling Undead
  45, // Dwarf
  43, // Chaos Dwarf
  4965, // Imperial Nobility
  54, // Norse
  55, // Nurgle
  56, // Ogre
  57, // Orc
  4956, // Black Orc
  64, // Chaos Renegade
  51, // Tomb Kings
  58, // Skaven
  4991, // Snotling
  46, // Elven Union
  60, // Vampire
  65, // Slann
]);

export function extractAssetId(url: string): string {
  const match = url.match(/i\/(\d+)/);
  return match ? match[1] : url;
}

export async function fetchAllRosters(): Promise<{ id: number; name: string }[]> {
  const allLists = await Promise.all(
    DIVISION_IDS.map((id) => window.fumbblApi.fetchDivisionRosters(id).catch(() => []))
  );
  // Dedup by name: most divisions share the same roster id per race,
  // only Stunty Leeg (3) and Test (200) have genuinely distinct races.
  const byName = new Map<string, { id: number; name: string }>();
  for (const list of allLists) {
    for (const roster of list) {
      if (!byName.has(roster.name)) {
        byName.set(roster.name, roster);
      }
    }
  }
  return [...byName.values()];
}

// Maps an asset URL to every known roster name that uses it, built lazily in
// the background so we can tell the user "this asset is also used by X, Y, Z".
const rostersByAssetUrl = new Map<string, Set<string>>();
let rosterUsageIndexReady: Promise<void> | null = null;

export function indexRosterUsage(rosterIds: number[]): Promise<void> {
  if (rosterUsageIndexReady) return rosterUsageIndexReady;
  rosterUsageIndexReady = (async () => {
    const rosters = await Promise.all(
      rosterIds.map((id) => window.fumbblApi.fetchRoster(id).catch(() => null))
    );
    for (const roster of rosters) {
      if (!roster) continue;
      for (const position of roster.positions) {
        for (const url of [position.urlPortrait, position.urlIconSet]) {
          if (!url) continue;
          if (!rostersByAssetUrl.has(url)) {
            rostersByAssetUrl.set(url, new Set());
          }
          rostersByAssetUrl.get(url)!.add(roster.name);
        }
      }
    }
  })();
  return rosterUsageIndexReady;
}

export function getRosterUsageIndexReady(): Promise<void> | null {
  return rosterUsageIndexReady;
}

export function getRostersUsingAsset(url: string): Set<string> | undefined {
  return rostersByAssetUrl.get(url);
}
