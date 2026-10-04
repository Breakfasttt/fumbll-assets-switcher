import { useMemo, useState } from "react";
import { BB2025_ROSTER_IDS } from "@/shared/lib/rosters";
import { cn } from "@/shared/lib/utils";
import { useOverrides, useRoster, useRosterList, useRosterUsageIndex } from "@/shared/api/queries";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useUiMemory } from "@/shared/hooks/useUiMemory";
import { Badge } from "@/shared/ui/badge";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { PlayerEditor } from "./PlayerEditor";

/** Active custom images per roster name, from the "used by" index (an asset can belong to several rosters). */
function useActiveCountByRoster() {
  const overrides = useOverrides().data;
  const index = useRosterUsageIndex().data;
  return useMemo(() => {
    const counts = new Map<string, number>();
    if (!overrides || !index) return counts;
    for (const entry of Object.values(overrides)) {
      if (!entry.active) continue;
      for (const name of index.get(entry.url) ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [overrides, index]);
}

/** Master-detail: filterable roster list | positions | asset editors (docs/ux-research.md §4.2). */
export function RosterView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const { ui, remember } = useUiMemory();
  const [showSpecial, setShowSpecialState] = useState(ui.showSpecialRosters ?? false);
  const [selectedRosterId, setSelectedRosterIdState] = useState<number | null>(ui.lastRosterId ?? null);
  const setShowSpecial = (value: boolean) => {
    setShowSpecialState(value);
    remember({ showSpecialRosters: value });
  };
  const selectRoster = (id: number) => {
    setSelectedRosterIdState(id);
    remember({ lastRosterId: id });
  };

  const rosterList = useRosterList();
  const rosterQuery = useRoster(selectedRosterId);
  const activeCounts = useActiveCountByRoster();
  const roster = rosterQuery.data ?? null;

  const visibleRosters = useMemo(() => {
    const all = rosterList.data ?? [];
    const list = showSpecial ? all : all.filter((r) => BB2025_ROSTER_IDS.has(r.id));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [rosterList.data, showSpecial]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_200px_minmax(0,1fr)] gap-4">
      <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-border bg-surface p-2" data-testid="roster-list">
        <ToggleGroup
          type="single"
          value={showSpecial ? "all" : "bb2025"}
          onValueChange={(v) => {
            if (v) setShowSpecial(v === "all");
          }}
          aria-label={t("roster.scopeLabel")}
          className="w-full"
        >
          <ToggleGroupItem value="bb2025" size="sm" className="flex-1">
            BB2025
          </ToggleGroupItem>
          <ToggleGroupItem value="all" size="sm" className="flex-1">
            {t("roster.scopeAll")}
          </ToggleGroupItem>
        </ToggleGroup>
        <Command className="min-h-0 flex-1" loop>
          <CommandInput placeholder={t("roster.filterPlaceholder")} />
          <CommandList className="max-h-none flex-1">
            {rosterList.isPending ? (
              <div className="flex flex-col gap-1.5 p-1">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-7" />
                ))}
              </div>
            ) : (
              <CommandEmpty>{t("roster.noMatch")}</CommandEmpty>
            )}
            {visibleRosters.map((r) => {
              const count = activeCounts.get(r.name) ?? 0;
              const chosen = r.id === selectedRosterId;
              return (
                <CommandItem
                  key={r.id}
                  value={`${r.name} ${r.id}`}
                  onSelect={() => selectRoster(r.id)}
                  data-active={chosen || undefined}
                  className={cn(chosen && "bg-surface-raised font-medium text-foreground ring-1 ring-primary")}
                >
                  <span className="flex-1 truncate">{r.name}</span>
                  {count > 0 && <Badge variant="live">{count}</Badge>}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </div>

      {roster ? (
        // key: switching to a cached roster must reset the selected position.
        <PlayerEditor key={roster.id} roster={roster} cacheFolder={cacheFolder} />
      ) : (
        <div className="col-span-2 flex items-center justify-center rounded-lg border border-dashed border-border">
          {rosterQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">{t("roster.loading")}</div>
          ) : rosterQuery.error ? (
            <div className="text-sm text-danger">{t("roster.errorPrefix", { error: rosterQuery.error.message })}</div>
          ) : (
            <EmptyState title={t("roster.noSelectionTitle")} description={t("roster.noSelectionHint")} />
          )}
        </div>
      )}
    </div>
  );
}
