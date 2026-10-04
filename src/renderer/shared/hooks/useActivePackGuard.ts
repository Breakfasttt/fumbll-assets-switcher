import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useConfirm } from "@/shared/components/ConfirmDialogProvider";

/**
 * Any ad-hoc override change (drag & drop, delete, toggle) while a pack is
 * active would silently drift the real cache away from "only this pack is
 * active" without the user noticing (see packs.ts's activatePack/deletePack -
 * neither tracks per-URL provenance beyond the optional OverrideEntry.packId,
 * so an ad-hoc edit left unflagged would make the "active pack" badge lie).
 * Call this right before any mutating override call; it warns the user and,
 * if they confirm, tells the caller to also clear the active pack afterwards.
 */
export function useActivePackGuard() {
  const { t } = useTranslation();
  const confirm = useConfirm();

  /** Returns true if the caller should proceed (and clear the active pack if packWasActive), false to abort. */
  return async function guardAgainstActivePack(): Promise<boolean> {
    const packs = await window.fumbblApi.listPacks();
    const active = packs.find((p) => p.active);
    if (!active) return true;
    return confirm(t("packs.editWhilePackActiveConfirm", { name: active.name }));
  };
}
