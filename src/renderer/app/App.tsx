import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/shared/api/queryClient";
import { useCacheValid, useConfig } from "@/shared/api/queries";
import { useUiMemory } from "@/shared/hooks/useUiMemory";
import { useSaveConfig } from "@/shared/api/mutations";
import { useHotkey } from "@/shared/hooks/useHotkey";
import { LanguageProvider } from "@/shared/i18n/LanguageContext";
import { runLastUndo } from "@/shared/lib/notify";
import { ConfirmDialogProvider } from "@/shared/components/ConfirmDialogProvider";
import { ShortcutsDialog } from "@/shared/components/ShortcutsDialog";
import { CommandPalette, type NavigationTarget } from "@/shared/components/CommandPalette";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toaster";
import { ConfigView } from "@/features/config";
import { RosterView } from "@/features/rosters";
import { PitchView } from "@/features/pitches";
import { PacksView } from "@/features/packs";
import { OrphansView } from "@/features/orphans";
import { Sidebar, TAB_ORDER, type Tab } from "./Sidebar";
import { StatusBar } from "./StatusBar";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <ConfirmDialogProvider>
            <AppShell />
            <Toaster />
          </ConfirmDialogProvider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const config = useConfig();
  const cacheFolder = config.data?.cacheFolder ?? null;
  const cacheValid = useCacheValid(cacheFolder);
  const { t } = useTranslation();
  const { ui, remember } = useUiMemory();
  const saveConfig = useSaveConfig();
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Bumped by palette navigation: remounts the view so it re-reads the remembered selection.
  const [viewKey, setViewKey] = useState(0);

  // Wait for the config (and the cache check) before rendering a view: no flash of the Config screen.
  const ready = config.isSuccess && (!cacheFolder || !cacheValid.isPending);
  // Onboarding until a valid cache folder is set; otherwise reopen where the user left.
  const configured = !!cacheFolder && cacheValid.data === true;
  const lastTab = TAB_ORDER.find((tab) => tab === ui.lastTab) ?? "rosters";
  const effectiveTab: Tab = !configured ? "config" : (chosenTab ?? lastTab);

  const setActiveTab = (tab: Tab) => {
    setChosenTab(tab);
    remember({ lastTab: tab });
  };

  useHotkey(
    TAB_ORDER.map((_, i) => `ctrl+${i + 1}`),
    (e) => {
      const tab = TAB_ORDER[Number(e.key) - 1];
      if (tab && (configured || tab === "config")) setActiveTab(tab);
    }
  );
  useHotkey("ctrl+z", () => runLastUndo());
  useHotkey("ctrl+k", () => configured && setPaletteOpen(true), { allowInInput: true });

  const navigate = async (target: NavigationTarget) => {
    const tab = TAB_ORDER.find((x) => x === target.tab) ?? "rosters";
    await saveConfig.mutateAsync({
      ui: { lastTab: tab, ...(target.rosterId ? { lastRosterId: target.rosterId, lastPositionName: target.positionName } : {}) },
    });
    setChosenTab(tab);
    setViewKey((k) => k + 1);
  };
  useHotkey("?", () => setShortcutsOpen(true));

  return (
    <div className="grid h-screen grid-cols-[200px_1fr] grid-rows-[1fr_auto]">
      <Sidebar
        activeTab={effectiveTab}
        onSelect={setActiveTab}
        cacheFolder={cacheFolder}
        locked={!configured}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main key={viewKey} className="min-h-0 overflow-y-auto p-6">
        {!ready ? null : effectiveTab === "config" ? (
          <ConfigView cacheFolder={cacheFolder} cacheValid={cacheValid.data ?? null} onConfigured={() => setActiveTab("rosters")} />
        ) : null}
        {ready && configured && cacheFolder && (
          <>
            {effectiveTab === "rosters" && <RosterView cacheFolder={cacheFolder} />}
            {effectiveTab === "pitches" && <PitchView cacheFolder={cacheFolder} />}
            {effectiveTab === "packs" && <PacksView cacheFolder={cacheFolder} />}
            {effectiveTab === "orphans" && <OrphansView cacheFolder={cacheFolder} />}
          </>
        )}
      </main>

      <StatusBar cacheFolder={cacheFolder} onShowShortcuts={() => setShortcutsOpen(true)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      {configured && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          tabs={TAB_ORDER.map((id) => ({ id, label: t(`app.tab.${id}`) }))}
          onNavigate={navigate}
          onShowShortcuts={() => setShortcutsOpen(true)}
        />
      )}
    </div>
  );
}
