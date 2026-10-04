import { queryOptions, useQuery } from "@tanstack/react-query";
import type { OverrideEntry, PackSummary } from "@common/types";
import { buildRosterUsageIndex, fetchAllRosters } from "@/shared/lib/rosters";
import { queryKeys } from "./queryClient";

const HOUR = 60 * 60 * 1000;

// --- Query options (shared by the hooks and by imperative fetchQuery calls)

export const configQuery = queryOptions({
  queryKey: queryKeys.config,
  queryFn: () => window.fumbblApi.loadConfig(),
  staleTime: Infinity,
});

export const rosterListQuery = queryOptions({
  queryKey: queryKeys.rosterList,
  queryFn: fetchAllRosters,
  staleTime: Infinity,
});

export const rosterQuery = (id: number) =>
  queryOptions({
    queryKey: queryKeys.roster(id),
    queryFn: () => window.fumbblApi.fetchRoster(id),
    staleTime: HOUR,
  });

export const packsQuery = queryOptions({
  queryKey: queryKeys.packs,
  queryFn: () => window.fumbblApi.listPacks(),
  // Pack state only changes through mutations, which invalidate it.
  staleTime: Infinity,
});

export interface OverrideData {
  entry: OverrideEntry | null;
  /** Data URL of the override image, null when there is no override. */
  image: string | null;
}

export const overrideQuery = (url: string) =>
  queryOptions({
    queryKey: queryKeys.override(url),
    queryFn: async (): Promise<OverrideData> => {
      const entry = await window.fumbblApi.getOverride(url);
      const image = entry ? await window.fumbblApi.readOverrideImage(url) : null;
      return { entry, image };
    },
  });

// --- Hooks

export function useConfig() {
  return useQuery(configQuery);
}

export function useRosterList() {
  return useQuery(rosterListQuery);
}

export function useRoster(id: number | null) {
  return useQuery({ ...rosterQuery(id ?? 0), enabled: !!id });
}

/**
 * asset URL -> sorted roster names using it. Built in the background from every
 * known roster (each one lands in the useRoster cache too); failed rosters are skipped.
 */
export function useRosterUsageIndex() {
  return useQuery({
    queryKey: queryKeys.rosterUsageIndex,
    queryFn: async ({ client }) => {
      const list = await client.fetchQuery(rosterListQuery);
      const rosters = await Promise.all(list.map((r) => client.fetchQuery(rosterQuery(r.id)).catch(() => null)));
      return buildRosterUsageIndex(rosters);
    },
    staleTime: Infinity,
  });
}

/** Original FUMBBL image (FFB cache first, then CDN). Resolves to null when the download failed. */
export function useDefaultAsset(cacheFolder: string | null, url: string | null) {
  return useQuery({
    queryKey: queryKeys.defaultAsset(cacheFolder, url ?? ""),
    queryFn: () => window.fumbblApi.fetchAssetImage(cacheFolder, url!),
    enabled: !!url,
    staleTime: Infinity,
  });
}

export function useOverride(url: string | null) {
  return useQuery({ ...overrideQuery(url ?? ""), enabled: !!url });
}

/** Every override of the index, keyed by URL. */
export function useOverrides() {
  return useQuery({ queryKey: queryKeys.overrides, queryFn: () => window.fumbblApi.listOverrides() });
}

export function useInactiveOverrides() {
  return useQuery({ queryKey: queryKeys.inactiveOverrides, queryFn: () => window.fumbblApi.listInactiveOverrides() });
}

export function useOrphanFiles(cacheFolder: string) {
  return useQuery({
    queryKey: queryKeys.orphanFiles(cacheFolder),
    queryFn: () => window.fumbblApi.listOrphanCacheFiles(cacheFolder),
    // The game writes to its cache behind our back: re-list on every visit (cached list shown meanwhile).
    staleTime: 0,
  });
}

export function useOrphanImage(cacheFolder: string, fileName: string) {
  return useQuery({
    queryKey: queryKeys.orphanImage(cacheFolder, fileName),
    queryFn: () => window.fumbblApi.readOrphanCacheFile(cacheFolder, fileName),
  });
}

export function usePacks() {
  return useQuery(packsQuery);
}

export function useActivePack() {
  return useQuery({ ...packsQuery, select: (packs: PackSummary[]) => packs.find((p) => p.active) ?? null });
}
