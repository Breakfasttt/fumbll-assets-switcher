import { createHash } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";

const MAP_FILE_NAME = "map.json";

interface MapJsonShape {
  map: Record<string, string>;
}

function computeHash(url: string): string {
  return createHash("md5").update(url, "utf8").digest("hex").toUpperCase();
}

async function readMapJson(cacheFolder: string): Promise<Record<string, string>> {
  const mapPath = path.join(cacheFolder, MAP_FILE_NAME);
  try {
    const raw = await fs.readFile(mapPath, "utf8");
    const parsed = JSON.parse(raw) as MapJsonShape;
    return parsed.map ?? {};
  } catch {
    return {};
  }
}

async function writeMapJson(cacheFolder: string, map: Record<string, string>): Promise<void> {
  const mapPath = path.join(cacheFolder, MAP_FILE_NAME);
  const payload: MapJsonShape = { map };
  await fs.writeFile(mapPath, JSON.stringify(payload), "utf8");
}

export async function validateCacheFolder(cacheFolder: string): Promise<boolean> {
  try {
    const stat = await fs.stat(cacheFolder);
    if (!stat.isDirectory()) return false;
    await fs.access(cacheFolder, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes a custom image into the FFB client's Local Icon Cache so the official,
 * unmodified client will load it instead of downloading the original for `url`.
 * Merges into the existing map.json rather than overwriting it, since the real
 * client also writes its own entries there.
 */
export async function putImageInCache(
  cacheFolder: string,
  url: string,
  imageBuffer: Buffer,
  format: string
): Promise<{ hash: string; fileName: string }> {
  const hash = computeHash(url);
  const fileName = `${hash}.${format}`;
  await fs.writeFile(path.join(cacheFolder, fileName), imageBuffer);

  const map = await readMapJson(cacheFolder);
  map[url] = fileName;
  await writeMapJson(cacheFolder, map);

  return { hash, fileName };
}

export async function removeImageFromCache(cacheFolder: string, url: string): Promise<void> {
  const map = await readMapJson(cacheFolder);
  const fileName = map[url];
  if (!fileName) return;

  delete map[url];
  await writeMapJson(cacheFolder, map);

  try {
    await fs.unlink(path.join(cacheFolder, fileName));
  } catch {
    // file may already be gone; map.json is the source of truth for the client
  }
}

export async function listCacheEntries(cacheFolder: string): Promise<Record<string, string>> {
  return readMapJson(cacheFolder);
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Reads an asset straight from the FFB client's own Local Icon Cache if the
 * real client has already downloaded it (present in map.json), so we avoid
 * hitting the FUMBBL CDN again for something already on disk.
 */
export async function readCachedImageDataUrl(cacheFolder: string, url: string): Promise<string | null> {
  const map = await readMapJson(cacheFolder);
  const fileName = map[url];
  if (!fileName) return null;
  try {
    const buffer = await fs.readFile(path.join(cacheFolder, fileName));
    const ext = fileName.split(".").pop()?.toLowerCase() || "png";
    const mime = MIME_BY_EXT[ext] || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export { computeHash };
