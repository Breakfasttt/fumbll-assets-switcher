import { XMLParser } from "fast-xml-parser";
import { RosterInfo, RosterPosition, DivisionRosterSummary } from "../../shared/types";

const ROSTER_URL = "https://fumbbl.com/xml:roster?id=$1";
const DIVISION_URL = "https://fumbbl.com/xml:roster?division=$1";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "fumbbl-assets-switcher" } });
  if (!response.ok) {
    throw new Error(`FUMBBL API request failed (${response.status}): ${url}`);
  }
  return response.text();
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Builds the absolute URL FFB's IconCache would use as the cache key for a roster asset. */
export function resolveAssetUrl(baseIconPath: string, relativePath: string): string {
  return baseIconPath + relativePath;
}

export async function fetchRoster(rosterId: number): Promise<RosterInfo> {
  const xml = await fetchText(ROSTER_URL.replace("$1", String(rosterId)));
  const parsed = parser.parse(xml);
  const roster = parsed.roster;
  if (!roster) {
    throw new Error(`Unexpected roster XML for id ${rosterId}`);
  }

  const baseIconPath: string = roster.baseIconPath ?? "";
  const positionsRaw = toArray(roster.position);

  const positions: RosterPosition[] = positionsRaw.map((pos: any) => {
    const rawPortrait: string | undefined = pos.portrait;
    const rawIconSet = pos.iconSet;
    const iconSetValue: string | undefined =
      typeof rawIconSet === "object" && rawIconSet !== null ? rawIconSet["#text"] : rawIconSet;

    return {
      name: String(pos.name ?? ""),
      type: String(pos.type ?? "Regular"),
      urlPortrait: rawPortrait ? resolveAssetUrl(baseIconPath, rawPortrait) : null,
      urlIconSet: iconSetValue ? resolveAssetUrl(baseIconPath, iconSetValue) : null,
    };
  });

  return {
    id: rosterId,
    name: String(roster.name ?? ""),
    baseIconPath,
    positions,
  };
}

/** Fetches a remote FUMBBL asset (portrait/iconset) and returns it as a data URL for display. */
export async function fetchAssetImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "fumbbl-assets-switcher" } });
    if (!response.ok) {
      console.error(`fetchAssetImageDataUrl: HTTP ${response.status} for ${url}`);
      return null;
    }
    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (e) {
    console.error(`fetchAssetImageDataUrl: failed for ${url}`, e);
    return null;
  }
}

export async function fetchDivisionRosters(divisionId: number): Promise<DivisionRosterSummary[]> {
  // Real shape: <races division="X"><race id="N">Name</race>...</races>
  const xml = await fetchText(DIVISION_URL.replace("$1", String(divisionId)));
  const parsed = parser.parse(xml);
  const container = parsed.races;
  if (!container) {
    return [];
  }
  const races = toArray(container.race);
  return races.map((r: any) => ({
    id: Number(r["@_id"]),
    name: String(r["#text"] ?? ""),
  }));
}
