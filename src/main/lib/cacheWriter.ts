import { app } from "electron";
import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { OrphanCacheFile } from "../../shared/types";

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

// Several assets (e.g. a pitch's 5 weather variants) can be written concurrently
// on app startup or view mount. Without serializing, two concurrent read-modify-write
// cycles on map.json would race and the second writer would clobber the first
// writer's entry. One queue per cache folder keeps them from stepping on each other.
const mapJsonQueues = new Map<string, Promise<unknown>>();

async function withMapJson<T>(cacheFolder: string, fn: (map: Record<string, string>) => Promise<T>): Promise<T> {
  const previous = mapJsonQueues.get(cacheFolder) ?? Promise.resolve();
  const task = previous.then(async () => {
    const map = await readMapJson(cacheFolder);
    const result = await fn(map);
    await writeMapJson(cacheFolder, map);
    return result;
  });
  // Swallow errors in the chain so one failed write doesn't wedge the queue for
  // everyone after it; the caller of this specific call still sees its own error.
  mapJsonQueues.set(cacheFolder, task.catch(() => undefined));
  return task;
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

  await withMapJson(cacheFolder, async (map) => {
    map[url] = fileName;
  });

  return { hash, fileName };
}

export async function removeImageFromCache(cacheFolder: string, url: string): Promise<void> {
  const fileName = await withMapJson(cacheFolder, async (map) => {
    const existing = map[url];
    delete map[url];
    return existing;
  });
  if (!fileName) return;

  try {
    await fs.unlink(path.join(cacheFolder, fileName));
  } catch {
    // file may already be gone; map.json is the source of truth for the client
  }
}

/**
 * Lists files physically present in the FFB cache folder that map.json no
 * longer references - neither the real client nor our own tool would ever
 * load these; safe residue to clean up (e.g. left behind after a manual edit
 * of map.json, or a crash between writing the file and updating the index).
 */
export async function listOrphanCacheFiles(cacheFolder: string): Promise<OrphanCacheFile[]> {
  const map = await readMapJson(cacheFolder);
  const referenced = new Set(Object.values(map));

  let entries: string[];
  try {
    entries = await fs.readdir(cacheFolder);
  } catch {
    return [];
  }

  const orphans: OrphanCacheFile[] = [];
  for (const fileName of entries) {
    if (fileName === MAP_FILE_NAME) continue;
    if (referenced.has(fileName)) continue;
    try {
      const stat = await fs.stat(path.join(cacheFolder, fileName));
      if (!stat.isFile()) continue;
      orphans.push({ fileName, sizeBytes: stat.size });
    } catch {
      // file disappeared between readdir and stat; skip
    }
  }
  return orphans;
}

export async function readCacheFileDataUrl(cacheFolder: string, fileName: string): Promise<string | null> {
  try {
    const buffer = await fs.readFile(path.join(cacheFolder, fileName));
    const ext = fileName.split(".").pop()?.toLowerCase() || "png";
    const mime = MIME_BY_EXT[ext] || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// Orphan files "deleted" from the cache are moved to a short-lived trash so the
// deletion can be undone: `userData/trash/cache/<trashId>/{meta.json, <fileName>}`.
// Items older than TRASH_MAX_AGE_MS are purged on app startup (purgeCacheTrash).
const TRASH_META_FILE = "meta.json";
const TRASH_ID_RE = /^\d+-[0-9a-f]{8}$/;
const TRASH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface TrashMeta {
  cacheFolder: string;
  fileName: string;
  trashedAt: string;
}

function cacheTrashDir(): string {
  return path.join(app.getPath("userData"), "trash", "cache");
}

/** rename() fails across drives (cache folder and userData often are); fall back to copy + unlink. */
async function moveFile(from: string, to: string): Promise<void> {
  try {
    await fs.rename(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") throw err;
    await fs.copyFile(from, to);
    await fs.unlink(from);
  }
}

/** Moves an orphan cache file to the trash and returns its trash id (see restoreOrphanCacheFile). */
export async function deleteOrphanCacheFile(cacheFolder: string, fileName: string): Promise<string> {
  const trashId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const dir = path.join(cacheTrashDir(), trashId);
  await fs.mkdir(dir, { recursive: true });
  const fileBaseName = path.basename(fileName);
  await moveFile(path.join(cacheFolder, fileName), path.join(dir, fileBaseName));
  const meta: TrashMeta = { cacheFolder, fileName, trashedAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, TRASH_META_FILE), JSON.stringify(meta, null, 2), "utf8");
  return trashId;
}

/**
 * Puts a trashed orphan file back in its original cache folder. Returns false
 * (and drops the trash item) if a file with the same name has appeared there
 * since, e.g. re-downloaded by the client - never overwrite a live cache file.
 */
export async function restoreOrphanCacheFile(trashId: string): Promise<boolean> {
  if (!TRASH_ID_RE.test(trashId)) {
    throw new Error(`Invalid trash id: ${trashId}`);
  }
  const dir = path.join(cacheTrashDir(), trashId);
  const meta = JSON.parse(await fs.readFile(path.join(dir, TRASH_META_FILE), "utf8")) as TrashMeta;
  const dest = path.join(meta.cacheFolder, meta.fileName);

  let restored = false;
  try {
    await fs.access(dest);
  } catch {
    await moveFile(path.join(dir, path.basename(meta.fileName)), dest);
    restored = true;
  }
  await fs.rm(dir, { recursive: true, force: true });
  return restored;
}

/** Permanently deletes trashed cache files older than `maxAgeMs` (called once at startup). */
export async function purgeCacheTrash(maxAgeMs: number = TRASH_MAX_AGE_MS): Promise<void> {
  let ids: string[];
  try {
    ids = await fs.readdir(cacheTrashDir());
  } catch {
    return;
  }
  const now = Date.now();
  for (const trashId of ids) {
    const dir = path.join(cacheTrashDir(), trashId);
    let trashedAt: number;
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir, TRASH_META_FILE), "utf8")) as TrashMeta;
      trashedAt = Date.parse(meta.trashedAt);
    } catch {
      // no readable metadata (interrupted move): age it from the folder itself
      try {
        trashedAt = (await fs.stat(dir)).mtimeMs;
      } catch {
        continue;
      }
    }
    if (Number.isNaN(trashedAt) || now - trashedAt > maxAgeMs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
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
