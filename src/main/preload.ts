import { contextBridge, ipcRenderer } from "electron";
import { AppConfig, RosterInfo, DivisionRosterSummary, DetectedCoach, OverrideEntry } from "../shared/types";

const api = {
  loadConfig: (): Promise<AppConfig> => ipcRenderer.invoke("config:load"),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke("config:save", config),

  detectCoaches: (): Promise<DetectedCoach[]> => ipcRenderer.invoke("registry:detectCoaches"),

  selectFolder: (): Promise<string | null> => ipcRenderer.invoke("dialog:selectFolder"),

  validateCacheFolder: (folder: string): Promise<boolean> =>
    ipcRenderer.invoke("cache:validateFolder", folder),
  listCacheEntries: (folder: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke("cache:listEntries", folder),
  openCacheFolder: (folder: string): Promise<string> => ipcRenderer.invoke("cache:openFolder", folder),

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

  fetchRoster: (rosterId: number): Promise<RosterInfo> => ipcRenderer.invoke("fumbbl:fetchRoster", rosterId),
  fetchDivisionRosters: (divisionId: number): Promise<DivisionRosterSummary[]> =>
    ipcRenderer.invoke("fumbbl:fetchDivisionRosters", divisionId),
  fetchAssetImage: (folder: string | null, url: string): Promise<string | null> =>
    ipcRenderer.invoke("fumbbl:fetchAssetImage", folder, url),
  weatherCodes: (): Promise<string[]> => ipcRenderer.invoke("fumbbl:weatherCodes"),
};

export type FumbblApi = typeof api;

contextBridge.exposeInMainWorld("fumbblApi", api);
