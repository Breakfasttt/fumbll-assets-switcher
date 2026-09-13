import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";
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

function extensionMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

function mimeExtension(mime: string): string {
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("gif")) return "gif";
  return "png";
}

/**
 * Pitch asset URLs point at a zip archive (e.g. ".../Pitches/Amazon.zip?pitch=heat"),
 * not a plain image: the FFB client downloads the zip, reads pitch.ini to map the
 * weather code to a file name, and extracts that file. We replicate that here since
 * these URLs never resolve as a direct image fetch.
 */
function parsePitchZipUrl(url: string): { zipUrl: string; weather: string } | null {
  const match = url.match(/^(.*\.zip)\?pitch=([a-z]+)$/i);
  if (!match) return null;
  return { zipUrl: match[1], weather: match[2] };
}

interface FetchedImage {
  buffer: Buffer;
  format: string;
}

// The 5 weather variants of a pitch all come from the same zip archive. The UI
// mounts one slot per weather and they all fetch on mount, so without this
// cache we'd otherwise download the same multi-MB zip 5 times in parallel.
const zipFetchCache = new Map<string, Promise<Buffer | null>>();

async function fetchZipBuffer(zipUrl: string): Promise<Buffer | null> {
  let pending = zipFetchCache.get(zipUrl);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(zipUrl, { headers: { "User-Agent": "fumbbl-assets-switcher" } });
      if (!response.ok) {
        console.error(`fetchZipBuffer: HTTP ${response.status} for ${zipUrl}`);
        return null;
      }
      return Buffer.from(await response.arrayBuffer());
    })();
    zipFetchCache.set(zipUrl, pending);
    // Don't keep a failed fetch cached - let the next call retry it.
    pending.then((result) => {
      if (!result) zipFetchCache.delete(zipUrl);
    });
  }
  return pending;
}

async function fetchPitchImage(zipUrl: string, weather: string): Promise<FetchedImage | null> {
  const zipBuffer = await fetchZipBuffer(zipUrl);
  if (!zipBuffer) return null;
  const zip = new AdmZip(zipBuffer);
  const iniEntry = zip.getEntry("pitch.ini");
  if (!iniEntry) {
    console.error(`fetchPitchImage: no pitch.ini in ${zipUrl}`);
    return null;
  }
  const ini = zip.readAsText(iniEntry);
  const line = ini.split(/\r?\n/).find((l) => l.trim().startsWith(`${weather}=`));
  const fileName = line?.split("=")[1]?.trim();
  if (!fileName) {
    console.error(`fetchPitchImage: no "${weather}" entry in pitch.ini of ${zipUrl}`);
    return null;
  }
  const imageEntry = zip.getEntry(fileName);
  if (!imageEntry) {
    console.error(`fetchPitchImage: file "${fileName}" missing from ${zipUrl}`);
    return null;
  }
  return { buffer: imageEntry.getData(), format: fileName.split(".").pop()?.toLowerCase() || "png" };
}

/** Fetches a remote FUMBBL asset (portrait/iconset/pitch) as a raw buffer + file format. */
export async function fetchAssetImageBuffer(url: string): Promise<FetchedImage | null> {
  try {
    const pitchRef = parsePitchZipUrl(url);
    if (pitchRef) {
      return await fetchPitchImage(pitchRef.zipUrl, pitchRef.weather);
    }
    const response = await fetch(url, { headers: { "User-Agent": "fumbbl-assets-switcher" } });
    if (!response.ok) {
      console.error(`fetchAssetImageBuffer: HTTP ${response.status} for ${url}`);
      return null;
    }
    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, format: mimeExtension(contentType) };
  } catch (e) {
    console.error(`fetchAssetImageBuffer: failed for ${url}`, e);
    return null;
  }
}

/** Fetches a remote FUMBBL asset (portrait/iconset/pitch) and returns it as a data URL for display. */
export async function fetchAssetImageDataUrl(url: string): Promise<string | null> {
  const image = await fetchAssetImageBuffer(url);
  if (!image) return null;
  return `data:${extensionMimeType(`f.${image.format}`)};base64,${image.buffer.toString("base64")}`;
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
