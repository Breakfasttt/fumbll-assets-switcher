import { Layers, Unlink } from "lucide-react";
import { useActivePack } from "@/shared/api/queries";
import { useClearActivePack } from "@/shared/api/mutations";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/button";

/**
 * The active pack, visible from every tab (docs/ux-research.md §3.1): the user
 * always knows that the game currently shows a pack, and can detach it here.
 */
export function ActivePackCard() {
  const { t } = useTranslation();
  const activePack = useActivePack().data;
  const clearActivePack = useClearActivePack();
  if (!activePack) return null;

  const detach = async () => {
    await clearActivePack.mutateAsync();
    notify.success(t("app.activePack.detached", { name: activePack.name }));
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-strong bg-surface p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
        <Layers className="size-3.5" strokeWidth={1.75} />
        {t("app.activePack.title")}
      </div>
      <div className="truncate text-sm font-semibold text-foreground" title={activePack.name}>
        {activePack.name}
      </div>
      <div className="text-xs tabular-nums text-muted-foreground">{t("packs.entryCount", { count: activePack.entryCount })}</div>
      <Button size="sm" variant="outline" onClick={detach} disabled={clearActivePack.isPending}>
        <Unlink className="size-3.5" strokeWidth={1.75} />
        {t("app.activePack.detach")}
      </Button>
    </div>
  );
}
