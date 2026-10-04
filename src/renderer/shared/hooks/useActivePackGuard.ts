import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useConfirm } from "@/shared/components/ConfirmDialogProvider";
import { packsQuery, useActivePack } from "@/shared/api/queries";

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
  const client = useQueryClient();
  // Keeps the packs query warm so the guard below reads the cache, not the IPC.
  useActivePack();

  /** Returns true if the caller should proceed (and clear the active pack if packWasActive), false to abort. */
  return async function guardAgainstActivePack(): Promise<boolean> {
    const packs = await client.fetchQuery(packsQuery);
    const active = packs.find((p) => p.active);
    if (!active) return true;
    return confirm(t("packs.editWhilePackActiveConfirm", { name: active.name }));
  };
}
