import { Ghost, LandPlot, Package, Settings, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { isPitchUrl } from "@/shared/lib/format";
import { useInactiveOverrides, useOrphanFiles, useOverrides } from "@/shared/api/queries";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { Badge } from "@/shared/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { Kbd } from "@/shared/ui/kbd";
import { ActivePackCard } from "./ActivePackCard";

export type Tab = "config" | "rosters" | "pitches" | "packs" | "orphans";
export const TAB_ORDER: Tab[] = ["config", "rosters", "pitches", "packs", "orphans"];

const ICONS: Record<Tab, LucideIcon> = { config: Settings, rosters: Users, pitches: LandPlot, packs: Package, orphans: Ghost };

/** Counters shown next to tabs: active customs per area, and cleanable items. */
function useTabBadges(cacheFolder: string | null) {
  const overrides = useOverrides().data;
  const inactive = useInactiveOverrides().data;
  const orphanFiles = useOrphanFiles(cacheFolder ?? "", { enabled: !!cacheFolder }).data;
  const active = Object.values(overrides ?? {}).filter((o) => o.active);
  return {
    rosters: active.filter((o) => !isPitchUrl(o.url)).length,
    pitches: active.filter((o) => isPitchUrl(o.url)).length,
    orphans: (inactive?.length ?? 0) + (orphanFiles?.length ?? 0),
  };
}

export function Sidebar({
  activeTab,
  onSelect,
  cacheFolder,
}: {
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  cacheFolder: string | null;
}) {
  const { t } = useTranslation();
  const badges = useTabBadges(cacheFolder);
  const locked = !cacheFolder;

  return (
    <aside className="flex min-h-0 flex-col gap-4 border-r border-border bg-sidebar p-3">
      <div className="px-2 pt-1 text-sm font-semibold">{t("app.title")}</div>
      <nav aria-label={t("app.navLabel")} className="flex flex-col gap-0.5">
        {TAB_ORDER.map((tab, i) => {
          const Icon = ICONS[tab];
          const disabled = locked && tab !== "config";
          const count = tab === "rosters" || tab === "pitches" || tab === "orphans" ? badges[tab] : 0;
          const button = (
            <button
              key={tab}
              type="button"
              disabled={disabled}
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => onSelect(tab)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded border border-transparent px-2.5 py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-surface hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
                activeTab === tab && "border-border-strong bg-surface-raised text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">{t(`app.tab.${tab}`)}</span>
              {count > 0 && <Badge variant={tab === "orphans" ? "warning" : "live"}>{count > 99 ? "99+" : count}</Badge>}
            </button>
          );
          return (
            <Tooltip key={tab}>
              <TooltipTrigger asChild>
                <span className="block">{button}</span>
              </TooltipTrigger>
              <TooltipContent side="right">
                {disabled ? t("app.tabLocked") : t(`app.tab.${tab}`)}
                {!disabled && <Kbd className="ml-2">Ctrl+{i + 1}</Kbd>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className="mt-auto">
        <ActivePackCard />
      </div>
    </aside>
  );
}
