import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/shared/api/queryClient";
import { useCacheFolder } from "@/shared/hooks/useCacheFolder";
import { useHotkey } from "@/shared/hooks/useHotkey";
import { LanguageProvider } from "@/shared/i18n/LanguageContext";
import { runLastUndo } from "@/shared/lib/notify";
import { ConfirmDialogProvider } from "@/shared/components/ConfirmDialogProvider";
import { ShortcutsDialog } from "@/shared/components/ShortcutsDialog";
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
  const { cacheFolder } = useCacheFolder();
  const [activeTab, setActiveTab] = useState<Tab>("config");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const effectiveTab: Tab = !cacheFolder ? "config" : activeTab;

  useHotkey(
    TAB_ORDER.map((_, i) => `ctrl+${i + 1}`),
    (e) => {
      const tab = TAB_ORDER[Number(e.key) - 1];
      if (tab && (cacheFolder || tab === "config")) setActiveTab(tab);
    }
  );
  useHotkey("ctrl+z", () => runLastUndo());
  useHotkey("?", () => setShortcutsOpen(true));

  return (
    <div className="grid h-screen grid-cols-[200px_1fr] grid-rows-[1fr_auto]">
      <Sidebar activeTab={effectiveTab} onSelect={setActiveTab} cacheFolder={cacheFolder} />

      <main className="min-h-0 overflow-y-auto p-6">
        {effectiveTab === "config" && <ConfigView cacheFolder={cacheFolder} onConfigured={() => setActiveTab("rosters")} />}
        {effectiveTab === "rosters" && cacheFolder && <RosterView cacheFolder={cacheFolder} />}
        {effectiveTab === "pitches" && cacheFolder && <PitchView cacheFolder={cacheFolder} />}
        {effectiveTab === "packs" && cacheFolder && <PacksView cacheFolder={cacheFolder} />}
        {effectiveTab === "orphans" && cacheFolder && <OrphansView cacheFolder={cacheFolder} />}
      </main>

      <StatusBar cacheFolder={cacheFolder} onShowShortcuts={() => setShortcutsOpen(true)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
