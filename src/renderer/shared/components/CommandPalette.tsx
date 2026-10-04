import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, FolderOpen, Keyboard, Languages, LayoutGrid, User, Users } from "lucide-react";
import type { RosterInfo } from "@common/types";
import { LANGUAGES } from "@common/types";
import { useConfig, useRosterList, useRosterUsageIndex } from "@/shared/api/queries";
import { useUiMemory } from "@/shared/hooks/useUiMemory";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { LANGUAGE_NAMES } from "@/shared/i18n/translations";
import { BB2025_ROSTER_IDS } from "@/shared/lib/rosters";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";

/** Where a command leads; the app shell applies it (tab switch + remembered selection). */
export interface NavigationTarget {
  tab: string;
  rosterId?: number;
  positionName?: string;
}

interface Entry {
  id: string;
  label: string;
  group: "navigation" | "rosters" | "positions" | "language" | "actions";
  icon: React.ReactNode;
  keywords?: string[];
  run: () => void;
}

const MAX_RECENTS = 5;

/**
 * Ctrl+K palette (docs/ux-research.md §3.1): jump to a tab, a roster or a
 * "Roster › Position" in a few keystrokes. Positions come from rosters already
 * fetched by the "used by" index, so the palette never fires network requests itself.
 */
export function CommandPalette({
  open,
  onOpenChange,
  tabs,
  onNavigate,
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: { id: string; label: string }[];
  onNavigate: (target: NavigationTarget) => void;
  onShowShortcuts: () => void;
}) {
  const { t, setLanguage } = useTranslation();
  const client = useQueryClient();
  const { ui, remember } = useUiMemory();
  const cacheFolder = useConfig().data?.cacheFolder ?? null;
  const rosterList = useRosterList().data ?? [];
  // Ensures every roster is fetched once (background), which feeds the positions group.
  useRosterUsageIndex();

  const entries = useMemo<Entry[]>(() => {
    if (!open) return [];
    const list: Entry[] = tabs.map((tab) => ({
      id: `tab:${tab.id}`,
      label: tab.label,
      group: "navigation",
      icon: <LayoutGrid />,
      run: () => onNavigate({ tab: tab.id }),
    }));
    const rosters = [...rosterList].sort((a, b) => a.name.localeCompare(b.name));
    for (const roster of rosters) {
      list.push({
        id: `roster:${roster.id}`,
        label: roster.name,
        group: "rosters",
        icon: <Users />,
        keywords: BB2025_ROSTER_IDS.has(roster.id) ? ["bb2025"] : [t("palette.specialKeyword")],
        run: () => onNavigate({ tab: "rosters", rosterId: roster.id }),
      });
    }
    const loaded = client.getQueriesData<RosterInfo>({ queryKey: ["rosters", "detail"] });
    for (const [, roster] of loaded) {
      if (!roster) continue;
      for (const position of roster.positions) {
        list.push({
          id: `position:${roster.id}:${position.name}`,
          label: `${roster.name} › ${position.name}`,
          group: "positions",
          icon: <User />,
          keywords: [position.type],
          run: () => onNavigate({ tab: "rosters", rosterId: roster.id, positionName: position.name }),
        });
      }
    }
    for (const lang of LANGUAGES) {
      list.push({
        id: `lang:${lang}`,
        label: t("palette.languageItem", { language: LANGUAGE_NAMES[lang] }),
        group: "language",
        icon: <Languages />,
        run: () => setLanguage(lang),
      });
    }
    if (cacheFolder) {
      list.push({
        id: "action:openCache",
        label: t("app.openFolderButton"),
        group: "actions",
        icon: <FolderOpen />,
        run: () => window.fumbblApi.openCacheFolder(cacheFolder),
      });
    }
    list.push({ id: "action:shortcuts", label: t("shortcuts.title"), group: "actions", icon: <Keyboard />, run: onShowShortcuts });
    return list;
  }, [open, tabs, rosterList, client, cacheFolder, t, setLanguage, onNavigate, onShowShortcuts]);

  const recents = (ui.recentCommands ?? []).map((id) => entries.find((e) => e.id === id)).filter((e): e is Entry => !!e);

  const run = (entry: Entry) => {
    onOpenChange(false);
    remember({ recentCommands: [entry.id, ...(ui.recentCommands ?? []).filter((id) => id !== entry.id)].slice(0, MAX_RECENTS) });
    entry.run();
  };

  const groups: { key: Entry["group"]; heading: string }[] = [
    { key: "navigation", heading: t("palette.group.navigation") },
    { key: "rosters", heading: t("palette.group.rosters") },
    { key: "positions", heading: t("palette.group.positions") },
    { key: "language", heading: t("palette.group.language") },
    { key: "actions", heading: t("palette.group.actions") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0" aria-label={t("palette.title")}>
        <Command loop>
          <CommandInput placeholder={t("palette.placeholder")} autoFocus />
          <CommandList>
            <CommandEmpty>{t("palette.empty")}</CommandEmpty>
            {recents.length > 0 && (
              <CommandGroup heading={t("palette.group.recent")}>
                {recents.map((entry) => (
                  <CommandItem key={`recent:${entry.id}`} value={`recent ${entry.label}`} onSelect={() => run(entry)}>
                    <Clock />
                    {entry.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {groups.map((group) => {
              const items = entries.filter((e) => e.group === group.key);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={group.key} heading={group.heading}>
                  {items.map((entry) => (
                    <CommandItem key={entry.id} value={entry.id + " " + entry.label} keywords={entry.keywords} onSelect={() => run(entry)}>
                      {entry.icon}
                      {entry.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
