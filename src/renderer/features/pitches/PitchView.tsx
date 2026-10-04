import { useEffect, useMemo, useState } from "react";
import { WeatherCode } from "@common/types";
import { OverrideEntry } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useImageDimensions } from "@/shared/hooks/useImageDimensions";
import { useActivePackGuard } from "@/shared/hooks/useActivePackGuard";
import { ImageZoomButton } from "@/shared/components/ImageZoomModal";
import { CropEditor, type CropTarget } from "@/shared/components/CropEditor";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import {
  SPECIAL_PITCH_OPTIONS,
  SYSTEM_PITCH_OPTIONS,
  rosterPitchOptions,
  buildPitchWeatherUrl,
} from "./pitches";
import { BB2025_ROSTER_IDS, fetchAllRosters } from "@/shared/lib/rosters";

// Pitch weather slots the FFB client actually reads from the zip's pitch.ini.
// "intro" is excluded: the client never resolves it through the custom pitch
// URL, it always draws a hardcoded client-side image (see IconCache.getPitch).
const OVERRIDABLE_WEATHERS: WeatherCode[] = ["heat", "sunny", "nice", "rain", "blizzard"];

// Confirmed empirically against real pitch zips (see cache map.json entries).
const PITCH_WIDTH = 782;
const PITCH_HEIGHT = 452;

export function PitchView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const [rosterNames, setRosterNames] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  useEffect(() => {
    fetchAllRosters().then((rosters) => {
      const bb2025Names = rosters.filter((r) => BB2025_ROSTER_IDS.has(r.id)).map((r) => r.name);
      setRosterNames(bb2025Names);
    });
  }, []);

  const rosterOptions = useMemo(() => rosterPitchOptions(rosterNames), [rosterNames]);
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
              onOpenCrop={(imageSrc, url, onSaved) =>
                setCropTarget({ imageSrc, url, targetWidth: PITCH_WIDTH, targetHeight: PITCH_HEIGHT, onSaved })
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
// crisp while fitting two side by side in the panel.
const THUMB_WIDTH = 391;
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
  onOpenCrop: (imageSrc: string, url: string, onSaved: () => void) => void;
}) {
  const { t } = useTranslation();
  const guardAgainstActivePack = useActivePackGuard();
  const [defaultDataUrl, setDefaultDataUrl] = useState<string | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);
  const [override, setOverride] = useState<OverrideEntry | null>(null);
  const [overrideDataUrl, setOverrideDataUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const refreshOverride = async () => {
    const entry = await window.fumbblApi.getOverride(url);
    setOverride(entry);
    if (entry) {
      const dataUrl = await window.fumbblApi.readOverrideImage(url);
      setOverrideDataUrl(dataUrl);
    } else {
      setOverrideDataUrl(null);
    }
  };

  useEffect(() => {
    setDefaultDataUrl(null);
    setDefaultError(null);
    window.fumbblApi
      .fetchAssetImage(cacheFolder, url)
      .then((dataUrl) => {
        if (!dataUrl) {
          setDefaultError(t("assetPanel.downloadError"));
          return;
        }
        setDefaultDataUrl(dataUrl);
      })
      .catch((e) => setDefaultError(e.message));
    refreshOverride();
  }, [url, cacheFolder]);

  const defaultActive = !override || !override.active;
  const customActive = !!override?.active;
  const activeDataUrl = defaultActive ? defaultDataUrl : overrideDataUrl;
  const activeDims = useImageDimensions(activeDataUrl);

  const setActive = async (active: boolean) => {
    if (!(await guardAgainstActivePack())) return;
    await window.fumbblApi.setOverrideActive(cacheFolder, url, active);
    await window.fumbblApi.clearActivePack();
    await refreshOverride();
  };

  const handleDrop = (file: File) => {
    // CropEditor guards + clears the active pack itself at actual save time.
    onOpenCrop(URL.createObjectURL(file), url, refreshOverride);
  };

  const deleteOverride = async () => {
    if (!(await guardAgainstActivePack())) return;
    await window.fumbblApi.deleteOverride(cacheFolder, url);
    await window.fumbblApi.clearActivePack();
    await refreshOverride();
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-strong p-3">
      <div className="flex min-w-[140px] flex-col gap-1">
        <div className="text-sm font-medium text-foreground">{t(`weather.${weather}`)}</div>
        <div className="truncate text-xs text-faint-foreground" title={url}>
          {url.split("/").pop()}
        </div>
        {activeDims && (
          <div className="text-xs tabular-nums text-faint-foreground">
            {activeDims.width}×{activeDims.height} px
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => override && setActive(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") override && setActive(false);
          }}
          className={cn(
            "relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-border-strong bg-surface p-2 hover:border-faint-foreground",
            defaultActive && "border-primary bg-surface-raised"
          )}
          style={{ width: THUMB_WIDTH + 16 }}
        >
          {defaultActive && (
            <div className="absolute left-2 top-2 z-10 h-2.5 w-2.5 rounded-full bg-live shadow-[0_0_0_2px_var(--color-surface)]" />
          )}
          {activeDataUrlOrDefault(defaultDataUrl, defaultError)}
          <div className="text-xs text-faint-foreground">{t("assetPanel.slot.default")}</div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => override && !override.active && setActive(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") override && !override.active && setActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleDrop(file);
          }}
          className={cn(
            "relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-border-strong bg-surface p-2",
            (dragOver || customActive) && "border-primary bg-surface-raised"
          )}
          style={{ width: THUMB_WIDTH + 16 }}
        >
          {customActive && (
            <div className="absolute left-2 top-2 z-10 h-2.5 w-2.5 rounded-full bg-live shadow-[0_0_0_2px_var(--color-surface)]" />
          )}
          {override && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteOverride();
              }}
              className="absolute right-1 top-1 z-10 rounded bg-danger px-1.5 py-0.5 text-xs text-danger-foreground hover:bg-danger-hover"
            >
              ✕
            </button>
          )}
          {overrideDataUrl ? (
            <div className="relative">
              <img
                src={overrideDataUrl}
                className="rounded bg-well object-contain"
                style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT, imageRendering: "pixelated" }}
              />
              <ImageZoomButton imageSrc={overrideDataUrl} reveal={{ kind: "override", ref: url }} />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded bg-well text-center text-xs text-faint-foreground"
              style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
            >
              {t("assetPanel.dropPlaceholder")}
            </div>
          )}
          <div className="text-xs text-faint-foreground">{t("assetPanel.slot.custom")}</div>
          {overrideDataUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCrop(overrideDataUrl, url, refreshOverride);
              }}
              className="rounded border border-border-strong px-2 py-0.5 text-xs text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            >
              {t("assetPanel.recropButton")}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function activeDataUrlOrDefault(dataUrl: string | null, error: string | null) {
    if (dataUrl) {
      return (
        <div className="relative">
          <img
            src={dataUrl}
            className="rounded bg-well object-contain"
            style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT, imageRendering: "pixelated" }}
          />
          <ImageZoomButton imageSrc={dataUrl} />
        </div>
      );
    }
    return (
      <div
        className="flex items-center justify-center rounded bg-well text-center text-xs text-faint-foreground"
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
      >
        {error ?? "..."}
      </div>
    );
  }
}
