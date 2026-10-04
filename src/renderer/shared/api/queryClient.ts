import { QueryClient } from "@tanstack/react-query";

// Every query reads local IPC data that only this app mutates (and invalidates
// precisely), so window focus is not a reason to refetch.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Single source of query keys. Override keys are split on purpose
 * (`override` per URL vs `overrides` list vs `inactiveOverrides`) so a mutation
 * on one URL only refetches that URL's slots; `queryKeys.overrideAll` targets
 * every per-URL entry at once (pack activation/deletion).
 */
export const queryKeys = {
  config: ["config"] as const,
  rosterList: ["rosters", "list"] as const,
  roster: (id: number) => ["rosters", "detail", id] as const,
  rosterUsageIndex: ["rosters", "usageIndex"] as const,
  defaultAsset: (cacheFolder: string | null, url: string) => ["defaultAsset", cacheFolder, url] as const,
  overrideAll: ["override"] as const,
  override: (url: string) => ["override", url] as const,
  overrides: ["overrides"] as const,
  inactiveOverrides: ["inactiveOverrides"] as const,
  orphanFiles: (cacheFolder: string) => ["orphanFiles", cacheFolder] as const,
  orphanImage: (cacheFolder: string, fileName: string) => ["orphanImage", cacheFolder, fileName] as const,
  packs: ["packs"] as const,
};
