import { useState } from "react";
import { RosterInfo } from "@common/types";
import { cn } from "@/shared/lib/utils";
import { PlayerDetail } from "./PlayerDetail";

type Position = RosterInfo["positions"][number];

export function PlayerEditor({ roster, cacheFolder }: { roster: RosterInfo; cacheFolder: string }) {
  const [selected, setSelected] = useState<Position | null>(roster.positions[0] ?? null);

  return (
    <div className="grid grid-cols-[220px_1fr] items-start gap-4">
      <div className="flex max-h-[calc(100vh-220px)] flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-card p-2">
        {roster.positions.map((position) => (
          <div
            key={position.name}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(position)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected(position);
            }}
            className={cn(
              "flex cursor-pointer flex-col rounded px-3 py-2 border border-transparent hover:bg-card-raised focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
              selected?.name === position.name && "bg-card-raised border-accent"
            )}
          >
            <div className="text-sm font-medium">{position.name}</div>
            <div className="text-xs text-muted">{position.type}</div>
          </div>
        ))}
      </div>

      {selected && (
        <PlayerDetail key={selected.name} position={selected} rosterName={roster.name} cacheFolder={cacheFolder} />
      )}
    </div>
  );
}
