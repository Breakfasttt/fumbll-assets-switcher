import { useEffect, useState } from "react";

export function useCacheFolder() {
  const [cacheFolder, setCacheFolder] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.fumbblApi.loadConfig().then((config) => {
      setCacheFolder(config.cacheFolder);
      setLoaded(true);
    });
  }, []);

  return { cacheFolder, setCacheFolder, loaded };
}
