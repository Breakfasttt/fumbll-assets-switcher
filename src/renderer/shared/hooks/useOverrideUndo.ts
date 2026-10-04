import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useRestoreOverride } from "@/shared/api/mutations";
import { notify } from "@/shared/lib/notify";

/**
 * Toast with "Undo" after an override mutation that archived the previous
 * version (delete, replacement). No version id = nothing was replaced: no toast.
 */
export function useOverrideUndo() {
  const { t } = useTranslation();
  const restore = useRestoreOverride();

  return function notifyOverrideUndo(
    message: string,
    target: { cacheFolder: string; url: string; versionId: string | null | undefined }
  ) {
    const { cacheFolder, url, versionId } = target;
    if (!versionId) return;
    notify.undoable(message, {
      label: t("common.undo"),
      run: () =>
        restore.mutateAsync({ cacheFolder, url, versionId }).then(
          () => notify.success(t("common.restoredToast")),
          () => notify.error(t("common.undoFailedToast"))
        ),
    });
  };
}
