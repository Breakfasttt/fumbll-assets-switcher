import { app } from "electron";
import { promises as fs } from "fs";
import * as path from "path";
import { computeHash, putImageInCache, removeImageFromCache } from "./cacheWriter";
import { OverrideEntry } from "../../shared/types";

const OVERRIDES_INDEX_FILE = "overrides.json";

interface OverridesIndex {
  [url: string]: OverrideEntry;
}

function overridesDir(): string {
  return path.join(app.getPath("userData"), "overrides");
}

function indexPath(): string {
  return path.join(overridesDir(), OVERRIDES_INDEX_FILE);
}

async function readIndex(): Promise<OverridesIndex> {
  try {
    const raw = await fs.readFile(indexPath(), "utf8");
    return JSON.parse(raw) as OverridesIndex;
  } catch {
    return {};
  }
}

async function writeIndex(index: OverridesIndex): Promise<void> {
  await fs.mkdir(overridesDir(), { recursive: true });
  await fs.writeFile(indexPath(), JSON.stringify(index, null, 2), "utf8");
}

export async function listOverrides(): Promise<OverridesIndex> {
  return readIndex();
}

export async function getOverride(url: string): Promise<OverrideEntry | null> {
  const index = await readIndex();
  return index[url] ?? null;
}

/**
 * Stores a custom image for `url` in the tool's own overrides folder (never
 * inside the FFB cache folder itself, to avoid the real client overwriting or
 * conflicting with it), and immediately activates it in the real FFB cache.
 */
export async function saveOverrideFile(
  cacheFolder: string,
  url: string,
  imageBuffer: Buffer,
  format: string
): Promise<OverrideEntry> {
  const hash = computeHash(url);
  const fileName = `${hash}.${format}`;
  await fs.mkdir(overridesDir(), { recursive: true });
  await fs.writeFile(path.join(overridesDir(), fileName), imageBuffer);

  const index = await readIndex();
  const entry: OverrideEntry = { url, fileName, active: true };
  index[url] = entry;
  await writeIndex(index);

  await putImageInCache(cacheFolder, url, imageBuffer, format);

  return entry;
}

export function overrideFilePath(fileName: string): string {
  return path.join(overridesDir(), fileName);
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/** Reads an override's stored file and returns it as a data URL for display. */
export async function readOverrideImageDataUrl(url: string): Promise<string | null> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return null;
  try {
    const buffer = await fs.readFile(overrideFilePath(entry.fileName));
    const ext = entry.fileName.split(".").pop()?.toLowerCase() || "png";
    const mime = MIME_BY_EXT[ext] || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function deleteOverride(cacheFolder: string, url: string): Promise<void> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return;

  if (entry.active) {
    await removeImageFromCache(cacheFolder, url);
  }

  delete index[url];
  await writeIndex(index);
  try {
    await fs.unlink(overrideFilePath(entry.fileName));
  } catch {
    // already gone
  }
}

/**
 * Turns a saved override on/off in the real FFB cache: activating copies the
 * override file into the cache folder under its official MD5(url) hash name
 * and adds the map.json entry; deactivating removes both, so the client falls
 * back to downloading the original asset again. The override file itself,
 * stored separately under the tool's own folder, is never touched.
 */
export async function setOverrideActive(
  cacheFolder: string,
  url: string,
  active: boolean
): Promise<void> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return;

  if (active) {
    const format = entry.fileName.split(".").pop() || "png";
    const buffer = await fs.readFile(overrideFilePath(entry.fileName));
    await putImageInCache(cacheFolder, url, buffer, format);
  } else {
    await removeImageFromCache(cacheFolder, url);
  }

  entry.active = active;
  index[url] = entry;
  await writeIndex(index);
}
