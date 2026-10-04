import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useCacheFolder } from "@/shared/hooks/useCacheFolder";
import { LanguageProvider, useTranslation } from "@/shared/i18n/LanguageContext";
import { ConfirmDialogProvider } from "@/shared/components/ConfirmDialogProvider";
import { ConfigView } from "@/features/config";
import { RosterView } from "@/features/rosters";
import { PitchView } from "@/features/pitches";
import { PacksView } from "@/features/packs";
import { OrphansView } from "@/features/orphans";

type Tab = "config" | "rosters" | "pitches" | "packs" | "orphans";

export function App() {
  return (
    <LanguageProvider>
      <ConfirmDialogProvider>
        <AppShell />
      </ConfirmDialogProvider>
    </LanguageProvider>
  );
}

function AppShell() {
  const { t } = useTranslation();
  const { cacheFolder, setCacheFolder } = useCacheFolder();
  const [activeTab, setActiveTab] = useState<Tab>("config");

  const TABS: { id: Tab; label: string }[] = [
    { id: "config", label: t("app.tab.config") },
    { id: "rosters", label: t("app.tab.rosters") },
    { id: "pitches", label: t("app.tab.pitches") },
    { id: "packs", label: t("app.tab.packs") },
    { id: "orphans", label: t("app.tab.orphans") },
  ];

  const effectiveTab: Tab = !cacheFolder ? "config" : activeTab;

  return (
    <div className="grid h-screen grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-4 border-r border-border bg-sidebar p-3">
        <div className="px-2 text-sm font-semibold">{t("app.title")}</div>
        <nav className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveTab(tab.id);
              }}
              className={cn(
                "cursor-pointer rounded px-3 py-2 text-sm font-medium text-muted-foreground border border-transparent hover:bg-surface hover:text-foreground",
                effectiveTab === tab.id && "bg-surface-raised border-border-strong text-foreground"
              )}
            >
              {tab.label}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-2">
          <div className="text-xs leading-relaxed text-faint-foreground">
            {cacheFolder ? t("app.cacheStatus", { folder: cacheFolder }) : t("app.cacheNotConfigured")}
          </div>
          {cacheFolder && (
            <button
              onClick={() => window.fumbblApi.openCacheFolder(cacheFolder)}
              className="rounded border border-border-strong px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              {t("app.openFolderButton")}
            </button>
          )}
        </div>
      </aside>

      <main className="overflow-y-auto p-6">
        {effectiveTab === "config" && (
          <ConfigView
            cacheFolder={cacheFolder}
            onConfigured={(folder) => {
              setCacheFolder(folder);
              setActiveTab("rosters");
            }}
          />
        )}
        {effectiveTab === "rosters" && cacheFolder && <RosterView cacheFolder={cacheFolder} />}
        {effectiveTab === "pitches" && cacheFolder && <PitchView cacheFolder={cacheFolder} />}
        {effectiveTab === "packs" && cacheFolder && <PacksView cacheFolder={cacheFolder} />}
        {effectiveTab === "orphans" && cacheFolder && <OrphansView cacheFolder={cacheFolder} />}
      </main>
    </div>
  );
}
