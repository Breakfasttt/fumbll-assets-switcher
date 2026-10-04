import { useState } from "react";
import { RosterInfo } from "@common/types";
import { cn } from "@/shared/lib/utils";
import { useOverrides } from "@/shared/api/queries";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useUiMemory } from "@/shared/hooks/useUiMemory";
import { Command, CommandItem, CommandList } from "@/shared/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { PlayerDetail } from "./PlayerDetail";

type Position = RosterInfo["positions"][number];

/** "P" / "I" dot: this position's portrait / iconset currently shows a custom image in game. */
function CustomDot({ letter, label }: { letter: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span aria-label={label} className="flex size-4 items-center justify-center rounded-sm bg-live text-[10px] font-bold text-live-foreground">
          {letter}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Positions column + detail of the selected position (asset editors). */
export function PlayerEditor({ roster, cacheFolder }: { roster: RosterInfo; cacheFolder: string }) {
  const { t } = useTranslation();
  const { ui, remember } = useUiMemory();
  const overrides = useOverrides().data ?? {};
  const [selected, setSelectedState] = useState<Position | null>(
    roster.positions.find((p) => p.name === ui.lastPositionName) ?? roster.positions[0] ?? null
  );
  const setSelected = (position: Position) => {
    setSelectedState(position);
    remember({ lastPositionName: position.name });
  };
  const isCustom = (url: string | null) => !!url && !!overrides[url]?.active;

  return (
    <>
      <Command className="min-h-0 rounded-lg border border-border bg-surface" loop data-testid="position-list" value={selected?.name}>
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-faint-foreground">{roster.name}</div>
        <CommandList className="max-h-none flex-1">
          {roster.positions.map((position) => (
            <CommandItem
              key={position.name}
              value={position.name}
              onSelect={() => setSelected(position)}
              data-active={selected?.name === position.name || undefined}
              className={cn("flex-col items-stretch gap-0", selected?.name === position.name && "bg-surface-raised ring-1 ring-primary")}
            >
              <span className="flex items-center gap-1.5">
                <span className="flex-1 truncate font-medium text-foreground">{position.name}</span>
                {isCustom(position.urlPortrait) && <CustomDot letter="P" label={t("roster.customPortraitDot")} />}
                {isCustom(position.urlIconSet) && <CustomDot letter="I" label={t("roster.customIconsetDot")} />}
              </span>
              <span className="text-xs text-muted-foreground">{position.type}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>

      <div className="min-h-0 overflow-y-auto pr-1">
        {selected && <PlayerDetail key={selected.name} position={selected} rosterName={roster.name} cacheFolder={cacheFolder} />}
      </div>
    </>
  );
}
