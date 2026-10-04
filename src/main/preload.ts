import { contextBridge, ipcRenderer } from "electron";
import {
  AppConfig,
  RosterInfo,
  DivisionRosterSummary,
  DetectedCoach,
  OverrideEntry,
  OrphanCacheFile,
  PackSummary,
} from "../shared/types";

const api = {
  loadConfig: (): Promise<AppConfig> => ipcRenderer.invoke("config:load"),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke("config:save", config),

  detectCoaches: (): Promise<DetectedCoach[]> => ipcRenderer.invoke("registry:detectCoaches"),

  selectFolder: (): Promise<string | null> => ipcRenderer.invoke("dialog:selectFolder"),
  selectSaveFile: (defaultFileName: string): Promise<string | null> =>
    ipcRenderer.invoke("dialog:selectSaveFile", defaultFileName),
  selectZipFile: (): Promise<string | null> => ipcRenderer.invoke("dialog:selectZipFile"),

  validateCacheFolder: (folder: string): Promise<boolean> =>
    ipcRenderer.invoke("cache:validateFolder", folder),
  openCacheFolder: (folder: string): Promise<string> => ipcRenderer.invoke("cache:openFolder", folder),
  showFileInFolder: (folder: string, fileName: string): Promise<void> =>
    ipcRenderer.invoke("shell:showFileInFolder", folder, fileName),

  listOverrides: (): Promise<Record<string, OverrideEntry>> => ipcRenderer.invoke("overrides:list"),
  getOverride: (url: string): Promise<OverrideEntry | null> => ipcRenderer.invoke("overrides:get", url),
  saveOverride: (
    folder: string,
    url: string,
    base64Data: string,
    format: string
  ): Promise<OverrideEntry> => ipcRenderer.invoke("overrides:save", folder, url, base64Data, format),
  setOverrideActive: (folder: string, url: string, active: boolean): Promise<void> =>
    ipcRenderer.invoke("overrides:setActive", folder, url, active),
  deleteOverride: (folder: string, url: string): Promise<void> =>
    ipcRenderer.invoke("overrides:delete", folder, url),
  readOverrideImage: (url: string): Promise<string | null> =>
    ipcRenderer.invoke("overrides:readImage", url),
  listInactiveOverrides: (): Promise<OverrideEntry[]> => ipcRenderer.invoke("overrides:listInactive"),
  showOverrideInFolder: (url: string): Promise<void> => ipcRenderer.invoke("overrides:showInFolder", url),

  listOrphanCacheFiles: (folder: string): Promise<OrphanCacheFile[]> =>
    ipcRenderer.invoke("cache:listOrphanFiles", folder),
  readOrphanCacheFile: (folder: string, fileName: string): Promise<string | null> =>
    ipcRenderer.invoke("cache:readOrphanFile", folder, fileName),
  deleteOrphanCacheFile: (folder: string, fileName: string): Promise<void> =>
    ipcRenderer.invoke("cache:deleteOrphanFile", folder, fileName),

  listPacks: (): Promise<PackSummary[]> => ipcRenderer.invoke("packs:list"),
  exportPack: (name: string, description: string | undefined, destZipPath: string): Promise<void> =>
    ipcRenderer.invoke("packs:export", name, description, destZipPath),
  importPack: (zipPath: string): Promise<PackSummary> => ipcRenderer.invoke("packs:import", zipPath),
  activatePack: (folder: string, packId: string): Promise<void> =>
    ipcRenderer.invoke("packs:activate", folder, packId),
  deletePack: (folder: string, packId: string): Promise<void> => ipcRenderer.invoke("packs:delete", folder, packId),
  clearActivePack: (): Promise<void> => ipcRenderer.invoke("packs:clearActive"),

  fetchRoster: (rosterId: number): Promise<RosterInfo> => ipcRenderer.invoke("fumbbl:fetchRoster", rosterId),
  fetchDivisionRosters: (divisionId: number): Promise<DivisionRosterSummary[]> =>
    ipcRenderer.invoke("fumbbl:fetchDivisionRosters", divisionId),
  fetchAssetImage: (folder: string | null, url: string): Promise<string | null> =>
    ipcRenderer.invoke("fumbbl:fetchAssetImage", folder, url),
};

export type FumbblApi = typeof api;

contextBridge.exposeInMainWorld("fumbblApi", api);
