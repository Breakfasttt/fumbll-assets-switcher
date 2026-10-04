import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppConfig } from "@common/types";
import { configQuery } from "./queries";
import { queryKeys } from "./queryClient";

// One URL's override changed: its slots, the lists, and the pack state (callers
// clear the active pack after any ad-hoc override change).
function invalidateOverride(client: QueryClient, url: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.override(url) }),
    client.invalidateQueries({ queryKey: queryKeys.overrides }),
    client.invalidateQueries({ queryKey: queryKeys.inactiveOverrides }),
    client.invalidateQueries({ queryKey: queryKeys.packs }),
  ]);
}

// Pack activation/deletion rewrites many overrides at once.
function invalidateAllOverrides(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.overrideAll }),
    client.invalidateQueries({ queryKey: queryKeys.overrides }),
    client.invalidateQueries({ queryKey: queryKeys.inactiveOverrides }),
    client.invalidateQueries({ queryKey: queryKeys.packs }),
  ]);
}

// --- Overrides

export function useSaveOverride() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; url: string; base64: string; format: string }) =>
      window.fumbblApi.saveOverride(v.cacheFolder, v.url, v.base64, v.format),
    onSettled: (_data, _error, v) => invalidateOverride(client, v.url),
  });
}

export function useSetOverrideActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; url: string; active: boolean }) =>
      window.fumbblApi.setOverrideActive(v.cacheFolder, v.url, v.active),
    onSettled: (_data, _error, v) => invalidateOverride(client, v.url),
  });
}

/** Resolves to the archived version id to pass to useRestoreOverride (undo), or null. */
export function useDeleteOverride() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; url: string }) => window.fumbblApi.deleteOverride(v.cacheFolder, v.url),
    onSettled: (_data, _error, v) => invalidateOverride(client, v.url),
  });
}

export function useRestoreOverride() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; url: string; versionId: string }) =>
      window.fumbblApi.restoreOverride(v.cacheFolder, v.url, v.versionId),
    onSettled: (_data, _error, v) => invalidateOverride(client, v.url),
  });
}

// --- Packs

export function useActivatePack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; packId: string }) => window.fumbblApi.activatePack(v.cacheFolder, v.packId),
    onSettled: () => invalidateAllOverrides(client),
  });
}

export function useDeletePack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; packId: string }) => window.fumbblApi.deletePack(v.cacheFolder, v.packId),
    onSettled: () => invalidateAllOverrides(client),
  });
}

export function useClearActivePack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => window.fumbblApi.clearActivePack(),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.packs }),
  });
}

export function useImportPack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (zipPath: string) => window.fumbblApi.importPack(zipPath),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.packs }),
  });
}

/** Writes a zip of the active overrides: nothing cached changes. */
export function useExportPack() {
  return useMutation({
    mutationFn: (v: { name: string; description?: string; destPath: string }) =>
      window.fumbblApi.exportPack(v.name, v.description, v.destPath),
  });
}

// --- FFB cache

export function useDeleteOrphanFile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { cacheFolder: string; fileName: string }) => window.fumbblApi.deleteOrphanCacheFile(v.cacheFolder, v.fileName),
    onSettled: (_data, _error, v) => {
      client.removeQueries({ queryKey: queryKeys.orphanImage(v.cacheFolder, v.fileName) });
      return client.invalidateQueries({ queryKey: queryKeys.orphanFiles(v.cacheFolder) });
    },
  });
}

// --- Config

/**
 * Merges `patch` into the current config and saves the whole file. The cache is
 * updated before the IPC call so the UI (language, cache folder) follows at once.
 */
export function useSaveConfig() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AppConfig>) => {
      // Read the cache synchronously when loaded: two saves fired back to back
      // (e.g. navigation + palette recents) must compose, not overwrite each other.
      const current = client.getQueryData<AppConfig>(queryKeys.config) ?? (await client.fetchQuery(configQuery));
      // `ui` is merged one level deep: each view remembers its own fields.
      const next: AppConfig = { ...current, ...patch, ui: patch.ui ? { ...current.ui, ...patch.ui } : current.ui };
      client.setQueryData(queryKeys.config, next);
      await window.fumbblApi.saveConfig(next);
      return next;
    },
    onError: () => client.invalidateQueries({ queryKey: queryKeys.config }),
  });
}
