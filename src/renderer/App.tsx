import { useState } from "react";
import { cn } from "./lib/utils";
import { useCacheFolder } from "./hooks/useCacheFolder";
import { ConfigView } from "./views/ConfigView";
import { RosterView } from "./views/RosterView";
import { PitchView } from "./views/PitchView";

type Tab = "config" | "rosters" | "pitches";

const TABS: { id: Tab; label: string }[] = [
  { id: "config", label: "Configuration" },
  { id: "rosters", label: "Rosters" },
  { id: "pitches", label: "Pitches" },
];

export function App() {
  const { cacheFolder, setCacheFolder, loaded } = useCacheFolder();
  const [activeTab, setActiveTab] = useState<Tab>("config");

  if (loaded && cacheFolder && activeTab === "config") {
    // Only auto-jump once, right after initial load; afterwards the user can
    // freely revisit Configuration without being bounced back to Rosters.
  }

  const effectiveTab: Tab = !cacheFolder ? "config" : activeTab;

  return (
    <div className="grid h-screen grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-4 border-r border-border bg-sidebar p-3">
        <div className="px-2 text-sm font-semibold">FUMBBL Assets Switcher</div>
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
                "cursor-pointer rounded px-3 py-2 text-sm font-medium text-muted border border-transparent hover:bg-card hover:text-white",
                effectiveTab === tab.id && "bg-card-raised border-border-strong text-white"
              )}
            >
              {tab.label}
            </div>
          ))}
        </nav>
        <div className="mt-auto px-2 text-xs leading-relaxed text-faint">
          {cacheFolder ? `Cache : ${cacheFolder}` : "Cache non configuré"}
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
      </main>
    </div>
  );
}
