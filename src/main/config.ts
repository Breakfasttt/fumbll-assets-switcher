import { app } from "electron";
import { promises as fs } from "fs";
import * as path from "path";
import { AppConfig } from "../shared/types";

function configPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

const DEFAULT_CONFIG: AppConfig = { cacheFolder: null, coachName: null, language: "en" };

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(configPath(), "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await fs.mkdir(path.dirname(configPath()), { recursive: true });
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), "utf8");
}
