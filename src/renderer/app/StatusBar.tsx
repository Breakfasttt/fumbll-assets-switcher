import { FolderOpen, Keyboard } from "lucide-react";
import { useCacheValid, useConfig, useOverrides } from "@/shared/api/queries";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { cn } from "@/shared/lib/utils";
import { truncateMiddle } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

/** Bottom bar: FFB cache health, path, coach, active custom count, quick actions. */
export function StatusBar({ cacheFolder, onShowShortcuts }: { cacheFolder: string | null; onShowShortcuts: () => void }) {
  const { t } = useTranslation();
  const coachName = useConfig().data?.coachName;
  const valid = useCacheValid(cacheFolder).data;
  const activeCount = Object.values(useOverrides().data ?? {}).filter((o) => o.active).length;

  return (
    <footer className="col-span-2 flex h-7 items-center gap-3 border-t border-border bg-sidebar px-3 text-xs text-muted-foreground">
      {cacheFolder ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn("size-2 shrink-0 rounded-full", valid === false ? "bg-danger" : valid ? "bg-live" : "bg-faint-foreground")}
                />
                <span className="truncate">{t("app.cacheStatus", { folder: truncateMiddle(cacheFolder, 60) })}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {valid === false ? t("app.cacheInvalid") : t("app.cacheValid")} — {cacheFolder}
            </TooltipContent>
          </Tooltip>
          {coachName && <span className="shrink-0">{t("app.coachLabel", { coach: coachName })}</span>}
          <span className="shrink-0 tabular-nums">{t("app.activeCustomCount", { count: activeCount })}</span>
          <Button size="sm" variant="ghost" className="ml-auto h-5 px-1.5 text-xs" onClick={() => window.fumbblApi.openCacheFolder(cacheFolder)}>
            <FolderOpen className="size-3.5" strokeWidth={1.75} />
            {t("app.openFolderButton")}
          </Button>
        </>
      ) : (
        <span className="text-danger">{t("app.cacheNotConfigured")}</span>
      )}
      <Button size="sm" variant="ghost" className={cn("h-5 px-1.5 text-xs", !cacheFolder && "ml-auto")} onClick={onShowShortcuts}>
        <Keyboard className="size-3.5" strokeWidth={1.75} />
        {t("app.shortcutsButton")}
      </Button>
    </footer>
  );
}
