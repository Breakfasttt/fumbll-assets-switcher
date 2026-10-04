import { useConfig } from "@/shared/api/queries";

export function useCacheFolder() {
  const { data, isSuccess } = useConfig();
  return { cacheFolder: data?.cacheFolder ?? null, loaded: isSuccess };
}
