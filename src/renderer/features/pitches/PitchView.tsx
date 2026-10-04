import { useMemo, useState } from "react";
import { WeatherCode } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/shared/ui/select";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useAssetSlot } from "@/shared/hooks/useAssetSlot";
import { useRosterList } from "@/shared/api/queries";
import { AssetSlotPair } from "@/shared/components/AssetSlotPair";
import { CropEditor, type CropTarget } from "@/shared/components/CropEditor";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import {
  SPECIAL_PITCH_OPTIONS,
  SYSTEM_PITCH_OPTIONS,
  rosterPitchOptions,
  buildPitchWeatherUrl,
} from "./pitches";
import { BB2025_ROSTER_IDS } from "@/shared/lib/rosters";

// Pitch weather slots the FFB client actually reads from the zip's pitch.ini.
// "intro" is excluded: the client never resolves it through the custom pitch
// URL, it always draws a hardcoded client-side image (see IconCache.getPitch).
const OVERRIDABLE_WEATHERS: WeatherCode[] = ["heat", "sunny", "nice", "rain", "blizzard"];

// Confirmed empirically against real pitch zips (see cache map.json entries).
const PITCH_WIDTH = 782;
const PITCH_HEIGHT = 452;

export function PitchView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const rosters = useRosterList().data;
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  const rosterOptions = useMemo(
    () => rosterPitchOptions((rosters ?? []).filter((r) => BB2025_ROSTER_IDS.has(r.id)).map((r) => r.name)),
    [rosters]
  );
  const allOptions = useMemo(
    () => [...rosterOptions, ...SPECIAL_PITCH_OPTIONS, ...SYSTEM_PITCH_OPTIONS],
    [rosterOptions]
  );
  const selected = allOptions.find((o) => o.key === selectedKey) ?? null;

  return (
    <Card>
      <CardTitle>{t("pitch.title")}</CardTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t("pitch.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("pitch.group.roster")}</SelectLabel>
              {rosterOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>{t("pitch.group.special")}</SelectLabel>
              {SPECIAL_PITCH_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>{t("pitch.group.system")}</SelectLabel>
              {SYSTEM_PITCH_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {selected ? (
        <div className="flex flex-col gap-3">
          {OVERRIDABLE_WEATHERS.map((weather) => (
            <PitchWeatherSlot
              key={weather}
              weather={weather}
              url={buildPitchWeatherUrl(selected.slug, weather)}
              cacheFolder={cacheFolder}
              onOpenCrop={(imageSrc, url) =>
                setCropTarget({ imageSrc, url, targetWidth: PITCH_WIDTH, targetHeight: PITCH_HEIGHT })
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{t("pitch.noSelection")}</div>
      )}

      <Dialog open={cropTarget !== null} onOpenChange={(open) => !open && setCropTarget(null)}>
        <DialogContent className="w-auto">
          {cropTarget && (
            <CropEditor target={cropTarget} cacheFolder={cacheFolder} onDone={() => setCropTarget(null)} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Real pitch images are 782x452 px. Half that size still leaves the slots
// readable while fitting two side by side in the panel.
const THUMB_HEIGHT = 226;

function PitchWeatherSlot({
  weather,
  url,
  cacheFolder,
  onOpenCrop,
}: {
  weather: WeatherCode;
  url: string;
  cacheFolder: string;
  onOpenCrop: (imageSrc: string, url: string) => void;
}) {
  const { t } = useTranslation();
  const slot = useAssetSlot(cacheFolder, url);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-strong p-3" data-weather={weather}>
      <div className="flex items-baseline gap-2">
        <h3 className="m-0 text-sm font-semibold text-foreground">{t(`weather.${weather}`)}</h3>
        <span className="truncate font-mono text-xs text-faint-foreground" title={url}>
          {url.split("/").pop()}
        </span>
      </div>
      <AssetSlotPair
        slot={slot}
        aspectRatio={PITCH_WIDTH / PITCH_HEIGHT}
        thumbHeight={THUMB_HEIGHT}
        // Always cropped: CropEditor guards + clears the active pack itself at save time.
        onFile={(file) => onOpenCrop(URL.createObjectURL(file), url)}
        onRecrop={(imageSrc) => onOpenCrop(imageSrc, url)}
      />
    </section>
  );
}
