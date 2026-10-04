import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useActivePackGuard } from "@/shared/hooks/useActivePackGuard";
import { useOverrideUndo } from "@/shared/hooks/useOverrideUndo";
import { useDefaultAsset, useOverride } from "@/shared/api/queries";
import { useClearActivePack, useDeleteOverride, useSaveOverride, useSetOverrideActive } from "@/shared/api/mutations";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fileToBase64(file: File): Promise<{ base64: string; format: string }> {
  const buffer = await file.arrayBuffer();
  return {
    base64: arrayBufferToBase64(buffer),
    format: (file.name.split(".").pop() || "png").toLowerCase(),
  };
}

export type AssetSlotState = ReturnType<typeof useAssetSlot>;

/**
 * Everything a Default/Custom slot pair needs for one asset URL: default image
 * (FFB cache or CDN), custom override, which one the game uses, and the
 * override mutations (all guarded by the active pack rule, with undo toasts).
 * `url` may be null so callers can call it unconditionally (Rules of Hooks).
 */
export function useAssetSlot(cacheFolder: string, url: string | null) {
  const { t } = useTranslation();
  const guardAgainstActivePack = useActivePackGuard();
  const notifyOverrideUndo = useOverrideUndo();
  const saveOverride = useSaveOverride();
  const setOverrideActive = useSetOverrideActive();
  const removeOverride = useDeleteOverride();
  const clearActivePack = useClearActivePack();
  const defaultAsset = useDefaultAsset(cacheFolder, url);
  const overrideQuery = useOverride(url);

  const defaultImage = defaultAsset.data ?? null;
  const defaultError = defaultAsset.error
    ? defaultAsset.error.message
    : defaultAsset.data === null
      ? t("assetPanel.downloadError")
      : null;
  const override = overrideQuery.data?.entry ?? null;
  const customImage = overrideQuery.data?.image ?? null;
  const customActive = !!override?.active;

  /** Picks the image the game loads (false = FUMBBL default). */
  const setActive = async (active: boolean) => {
    if (!url || !override || active === customActive) return;
    if (!(await guardAgainstActivePack())) return;
    await setOverrideActive.mutateAsync({ cacheFolder, url, active });
    await clearActivePack.mutateAsync();
  };

  /** Saves `file` as the custom image as is (no crop), undo toast if it replaced one. */
  const saveFile = async (file: File) => {
    if (!url) return;
    if (!(await guardAgainstActivePack())) return;
    const { base64, format } = await fileToBase64(file);
    const result = await saveOverride.mutateAsync({ cacheFolder, url, base64, format });
    await clearActivePack.mutateAsync();
    notifyOverrideUndo(t("assetPanel.replacedToast"), { cacheFolder, url, versionId: result.undoVersionId });
  };

  /** Deletes the custom image: no confirmation, undo toast instead. */
  const remove = async () => {
    if (!url) return;
    if (!(await guardAgainstActivePack())) return;
    const versionId = await removeOverride.mutateAsync({ cacheFolder, url });
    await clearActivePack.mutateAsync();
    notifyOverrideUndo(t("assetPanel.deletedToast"), { cacheFolder, url, versionId });
  };

  return {
    url,
    defaultImage,
    defaultError,
    defaultLoading: defaultAsset.isPending && !!url,
    override,
    customImage,
    customLoading: overrideQuery.isPending && !!url,
    customActive,
    /** Image the FFB client actually loads. */
    activeImage: customActive ? customImage : defaultImage,
    setActive,
    saveFile,
    remove,
  };
}
