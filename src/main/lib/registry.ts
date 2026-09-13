import { execFile } from "child_process";
import { promisify } from "util";
import { DetectedCoach } from "../../shared/types";

const execFileAsync = promisify(execFile);

const PREFS_ROOT = "HKCU\\Software\\JavaSoft\\Prefs";

/**
 * Java Preferences (Windows backing store) encodes node/key names and string
 * values so that every uppercase letter is prefixed with "/", e.g.
 * "localIconCacheOn" -> "local/Icon/Cache/On". This reverses that encoding.
 */
function decodeJavaPrefsName(encoded: string): string {
  return encoded.replace(/\//g, "");
}

function encodeJavaPrefsName(plain: string): string {
  return plain.replace(/[A-Z]/g, (c) => "/" + c);
}

interface RegValue {
  name: string;
  data: string;
}

async function regQueryValues(keyPath: string): Promise<RegValue[]> {
  try {
    const { stdout } = await execFileAsync("reg", ["query", keyPath], {
      windowsHide: true,
    });
    const values: RegValue[] = [];
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^\s{4}(\S.*?)\s+REG_SZ\s+(.*)$/);
      if (match) {
        values.push({ name: match[1], data: match[2] });
      }
    }
    return values;
  } catch {
    return [];
  }
}

async function regListSubkeys(keyPath: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("reg", ["query", keyPath], {
      windowsHide: true,
    });
    // `reg query` always echoes full paths with the expanded hive name
    // (HKEY_CURRENT_USER), regardless of whether HKCU or the full name was queried.
    const expandedPrefix = keyPath.replace(/^HKCU\\/i, "HKEY_CURRENT_USER\\");
    return stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.toUpperCase().startsWith(expandedPrefix.toUpperCase() + "\\"))
      .map((l) => l.substring(expandedPrefix.length + 1));
  } catch {
    return [];
  }
}

// The whole "/Ffb/User/Settings_<coach>" segment is a single flat key name directly
// under Prefs (Java Preferences node paths are encoded into one key name, not real
// nested subkeys) - e.g. "HKCU\...\Prefs\/Ffb/User/Settings_breakyt".
const COACH_NODE_PREFIX = "/Ffb/User/Settings_";

/** Lists every FFB coach settings node found under the Java Preferences registry root. */
export async function listFfbCoachNodes(): Promise<string[]> {
  const subkeys = await regListSubkeys(PREFS_ROOT);
  return subkeys
    .filter((k) => k.startsWith(COACH_NODE_PREFIX))
    .map((k) => k.substring(COACH_NODE_PREFIX.length));
}

/** Reads the Local Icon Cache setting for a given FUMBBL coach name from the Windows registry. */
export async function readCoachIconCacheSetting(coachName: string): Promise<DetectedCoach> {
  const keyPath = `${PREFS_ROOT}\\${COACH_NODE_PREFIX}${coachName}`;
  const values = await regQueryValues(keyPath);

  const find = (plainKey: string): string | null => {
    const encoded = encodeJavaPrefsName(plainKey);
    const entry = values.find((v) => v.name === encoded);
    return entry ? entry.data : null;
  };

  const rawPath = find("setting.localIconCache.path");
  const status = find("setting.localIconCache");

  // Java stores forward-slash-doubled Windows paths like "/D://blood bowl//cache-fumble"
  const cachePath = rawPath
    ? rawPath.replace(/^\//, "").replace(/\/\//g, "\\").replace(/\//g, "\\")
    : null;

  return {
    coachName,
    cachePath,
    localIconCacheOn: decodeJavaPrefsName(status ?? "") === "localIconCacheOn",
  };
}

/** Auto-detects all FFB coaches with a configured Local Icon Cache on this machine. */
export async function detectAllCoaches(): Promise<DetectedCoach[]> {
  const coaches = await listFfbCoachNodes();
  const results: DetectedCoach[] = [];
  for (const coach of coaches) {
    results.push(await readCoachIconCacheSetting(coach));
  }
  return results;
}
