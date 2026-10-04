import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { extractAssetId, getRostersUsingAsset, getRosterUsageIndexReady } from "@/shared/lib/rosters";
import { useImageDimensions } from "@/shared/hooks/useImageDimensions";
import { useActivePackGuard } from "@/shared/hooks/useActivePackGuard";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { OverrideEntry } from "@common/types";
import { AtlasBreakdown } from "@/features/iconset";
import { PromptPopover } from "./PromptPopover";
import { ImageZoomButton } from "@/shared/components/ImageZoomModal";
import { buildPortraitPrompt, buildIconsetPrompt, type PromptContext } from "./imagePrompt";
import type { AtlasInfo } from "@/features/iconset";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fileToBase64(file: File): Promise<{ base64: string; format: string }> {
  const buffer = await file.arrayBuffer();
  return {
    base64: arrayBufferToBase64(buffer),
    format: (file.name.split(".").pop() || "png").toLowerCase(),
  };
}

interface Props {
  label: string;
  url: string | null;
  cacheFolder: string;
  showAtlasBreakdown?: boolean;
  onOpenEditor?: (atlasInfo: AtlasInfo, url: string, row: number, col: number, onSaved: () => void) => void;
  onOpenCrop?: (file: File, url: string, onSaved: () => void) => void;
  onRecropExisting?: (imageSrc: string, url: string, onSaved: () => void) => void;
  /** Width/height ratio for the slot thumbnails, e.g. 95/147 for portraits. Defaults to a 1:1 square (iconsets). */
  slotAspectRatio?: number;
  promptContext?: PromptContext;
}

export function AssetPanel({
  label,
  url,
  cacheFolder,
  showAtlasBreakdown,
  onOpenEditor,
  onOpenCrop,
  onRecropExisting,
  slotAspectRatio = 1,
  promptContext,
}: Props) {
  const { t } = useTranslation();
  const guardAgainstActivePack = useActivePackGuard();
  const [defaultDataUrl, setDefaultDataUrl] = useState<string | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);
  const [override, setOverride] = useState<OverrideEntry | null>(null);
  const [overrideDataUrl, setOverrideDataUrl] = useState<string | null>(null);
  const [usedBy, setUsedBy] = useState<Set<string> | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);

  const refreshOverride = async (targetUrl: string) => {
    const entry = await window.fumbblApi.getOverride(targetUrl);
    setOverride(entry);
    if (entry) {
      const dataUrl = await window.fumbblApi.readOverrideImage(targetUrl);
      setOverrideDataUrl(dataUrl);
    } else {
      setOverrideDataUrl(null);
    }
  };

  useEffect(() => {
    if (!url) return;
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

    refreshOverride(url);

    const ready = getRosterUsageIndexReady();
    ready?.then(() => setUsedBy(getRostersUsingAsset(url)));
  }, [url, cacheFolder]);

  // Must run on every render (Rules of Hooks) even when `url` is null, so
  // this is computed before the early return below.
  const defaultActive = !override || !override.active;
  const activeDataUrl = defaultActive ? defaultDataUrl : overrideDataUrl;
  const activeDims = useImageDimensions(activeDataUrl);

  if (!url) {
    return (
      <Card>
        <CardTitle>{label}</CardTitle>
        <div className="text-sm text-muted">{t("assetPanel.unavailable")}</div>
      </Card>
    );
  }

  const assetId = extractAssetId(url);
  const customActive = !!override?.active;

  const setActive = async (active: boolean) => {
    if (!(await guardAgainstActivePack())) return;
    await window.fumbblApi.setOverrideActive(cacheFolder, url, active);
    await window.fumbblApi.clearActivePack();
    await refreshOverride(url);
  };

  const handleDrop = async (file: File) => {
    if (onOpenCrop) {
      // CropEditor guards + clears the active pack itself at actual save time.
      onOpenCrop(file, url, () => refreshOverride(url));
      return;
    }
    if (!(await guardAgainstActivePack())) return;
    const { base64, format } = await fileToBase64(file);
    await window.fumbblApi.saveOverride(cacheFolder, url, base64, format);
    await window.fumbblApi.clearActivePack();
    await refreshOverride(url);
  };

  const deleteOverride = async () => {
    if (!(await guardAgainstActivePack())) return;
    await window.fumbblApi.deleteOverride(cacheFolder, url);
    await window.fumbblApi.clearActivePack();
    await refreshOverride(url);
  };

  const buildPrompt = () => {
    if (!promptContext) return "";
    if (showAtlasBreakdown) {
      const cellSize = activeDims ? Math.round(activeDims.width / 4) : 30;
      const rows = activeDims && cellSize > 0 ? Math.round(activeDims.height / cellSize) : 1;
      return buildIconsetPrompt(promptContext, cellSize, rows);
    }
    const width = activeDims?.width ?? 95;
    const height = activeDims?.height ?? 147;
    return buildPortraitPrompt(promptContext, width, height);
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="mb-0">{label}</CardTitle>
        {promptContext && <PromptPopover buildPrompt={buildPrompt} />}
      </div>
      <div className="mb-3 text-sm text-muted">
        {usedBy && usedBy.size > 0
          ? t("assetPanel.usedByPrefix", { list: [...usedBy].sort().join(", ") })
          : usedBy === undefined
            ? t("assetPanel.usedByLoading")
            : ""}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex gap-2">
          <AssetSlot
            title={t("assetPanel.slot.default")}
            subtitle={`#${assetId}`}
            imageSrc={defaultDataUrl}
            error={defaultError}
            active={defaultActive}
            aspectRatio={slotAspectRatio}
            onClick={() => override && setActive(false)}
          />
          <DropSlot
            title={t("assetPanel.slot.custom")}
            imageSrc={overrideDataUrl}
            url={url}
            active={customActive}
            aspectRatio={slotAspectRatio}
            dragOver={dragOver}
            onDragOver={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={(file) => {
              setDragOver(false);
              handleDrop(file);
            }}
            onClick={() => override && !override.active && setActive(true)}
            onDelete={override ? deleteOverride : undefined}
            onRecrop={
              onRecropExisting && overrideDataUrl
                ? () => onRecropExisting(overrideDataUrl, url, () => refreshOverride(url))
                : undefined
            }
          />
        </div>

        {showAtlasBreakdown && activeDataUrl && (
          <AtlasBreakdown
            imgSrc={activeDataUrl}
            imageSource={customActive ? "custom" : "default"}
            url={url}
            cacheFolder={cacheFolder}
            onSaved={() => refreshOverride(url)}
            onOpenEditor={onOpenEditor}
          />
        )}
      </div>
    </Card>
  );
}

const SLOT_THUMB_HEIGHT = 96;

function AssetSlot({
  title,
  subtitle,
  imageSrc,
  error,
  active,
  aspectRatio,
  onClick,
}: {
  title: string;
  subtitle: string;
  imageSrc: string | null;
  error: string | null;
  active: boolean;
  aspectRatio: number;
  onClick: () => void;
}) {
  const dims = useImageDimensions(imageSrc);
  const thumbWidth = SLOT_THUMB_HEIGHT * aspectRatio;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "relative flex min-h-[160px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-border-strong bg-card p-3 hover:border-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active && "border-accent bg-card-raised"
      )}
      style={{ width: thumbWidth + 24 }}
    >
      {active && (
        <div className="absolute left-2 top-2 z-10 h-2.5 w-2.5 rounded-full bg-accent-active shadow-[0_0_0_2px_theme(colors.card)]" />
      )}
      {imageSrc ? (
        <div className="relative">
          <img
            src={imageSrc}
            className="rounded bg-well object-contain"
            style={{ width: thumbWidth, height: SLOT_THUMB_HEIGHT, imageRendering: "pixelated" }}
          />
          <ImageZoomButton imageSrc={imageSrc} />
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded bg-well text-center text-xs text-faint"
          style={{ width: thumbWidth, height: SLOT_THUMB_HEIGHT }}
        >
          {error ?? "..."}
        </div>
      )}
      <div className="text-xs text-muted">{title}</div>
      <div className="text-xs text-faint">{subtitle}</div>
      {dims && (
        <div className="text-xs text-faint">
          {dims.width}×{dims.height} px
        </div>
      )}
    </div>
  );
}

function DropSlot({
  title,
  imageSrc,
  url,
  active,
  aspectRatio,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onDelete,
  onRecrop,
}: {
  title: string;
  imageSrc: string | null;
  url: string;
  active: boolean;
  aspectRatio: number;
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onClick: () => void;
  onDelete?: () => void;
  onRecrop?: () => void;
}) {
  const { t } = useTranslation();
  const dims = useImageDimensions(imageSrc);
  const thumbWidth = SLOT_THUMB_HEIGHT * aspectRatio;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onDrop(file);
      }}
      className={cn(
        "relative flex min-h-[160px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-border-strong bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        (dragOver || active) && "border-accent bg-card-raised",
        !imageSrc && "border-dashed"
      )}
      style={{ width: thumbWidth + 24 }}
    >
      {active && (
        <div className="absolute left-2 top-2 z-10 h-2.5 w-2.5 rounded-full bg-accent-active shadow-[0_0_0_2px_theme(colors.card)]" />
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1 z-10 rounded bg-danger px-1.5 py-0.5 text-xs hover:bg-danger-hover"
        >
          ✕
        </button>
      )}
      {imageSrc ? (
        <div className="relative">
          <img
            src={imageSrc}
            className="rounded bg-well object-contain"
            style={{ width: thumbWidth, height: SLOT_THUMB_HEIGHT, imageRendering: "pixelated" }}
          />
          <ImageZoomButton imageSrc={imageSrc} reveal={{ kind: "override", ref: url }} />
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded bg-well text-center text-xs text-faint"
          style={{ width: thumbWidth, height: SLOT_THUMB_HEIGHT }}
        >
          {t("assetPanel.dropPlaceholder")}
        </div>
      )}
      <div className="text-xs text-muted">{title}</div>
      {dims && (
        <div className="text-xs text-faint">
          {dims.width}×{dims.height} px
        </div>
      )}
      {onRecrop && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRecrop();
          }}
          className="rounded border border-border-strong px-2 py-0.5 text-xs text-muted hover:bg-card-raised hover:text-white"
        >
          {t("assetPanel.recropButton")}
        </button>
      )}
    </div>
  );
}
