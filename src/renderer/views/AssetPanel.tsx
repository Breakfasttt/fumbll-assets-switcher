import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { extractAssetId, getRostersUsingAsset, getRosterUsageIndexReady } from "../lib/rosters";
import { OverrideEntry } from "../../shared/types";
import { AtlasBreakdown } from "./AtlasBreakdown";
import type { AtlasInfo } from "./PixelEditor";

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
}

export function AssetPanel({ label, url, cacheFolder, showAtlasBreakdown, onOpenEditor }: Props) {
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
          setDefaultError("Échec du téléchargement");
          return;
        }
        setDefaultDataUrl(dataUrl);
      })
      .catch((e) => setDefaultError(e.message));

    refreshOverride(url);

    const ready = getRosterUsageIndexReady();
    ready?.then(() => setUsedBy(getRostersUsingAsset(url)));
  }, [url, cacheFolder]);

  if (!url) {
    return (
      <Card>
        <CardTitle>{label}</CardTitle>
        <div className="text-sm text-muted">Non disponible pour ce joueur.</div>
      </Card>
    );
  }

  const assetId = extractAssetId(url);
  const defaultActive = !override || !override.active;
  const customActive = !!override?.active;

  const setActive = async (active: boolean) => {
    await window.fumbblApi.setOverrideActive(cacheFolder, url, active);
    await refreshOverride(url);
  };

  const handleDrop = async (file: File) => {
    const { base64, format } = await fileToBase64(file);
    await window.fumbblApi.saveOverride(cacheFolder, url, base64, format);
    await refreshOverride(url);
  };

  const deleteOverride = async () => {
    await window.fumbblApi.deleteOverride(cacheFolder, url);
    await refreshOverride(url);
  };

  const activeDataUrl = defaultActive ? defaultDataUrl : overrideDataUrl;

  return (
    <Card>
      <CardTitle>{label}</CardTitle>
      <div className="mb-3 text-sm text-muted">
        {usedBy && usedBy.size > 0 ? `Utilisé par : ${[...usedBy].sort().join(", ")}` : usedBy === undefined ? "Utilisé par : ..." : ""}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex gap-2">
          <AssetSlot
            title="Par défaut"
            subtitle={`#${assetId}`}
            imageSrc={defaultDataUrl}
            error={defaultError}
            active={defaultActive}
            onClick={() => override && setActive(false)}
          />
          <DropSlot
            title="Custom"
            imageSrc={overrideDataUrl}
            active={customActive}
            dragOver={dragOver}
            onDragOver={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={(file) => {
              setDragOver(false);
              handleDrop(file);
            }}
            onClick={() => override && !override.active && setActive(true)}
            onDelete={override ? deleteOverride : undefined}
          />
        </div>

        {showAtlasBreakdown && activeDataUrl && (
          <AtlasBreakdown
            imgSrc={activeDataUrl}
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

function AssetSlot({
  title,
  subtitle,
  imageSrc,
  error,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  imageSrc: string | null;
  error: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "relative flex w-40 min-h-[160px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-border-strong bg-card p-3 hover:border-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active && "border-accent bg-card-raised"
      )}
    >
      {active && (
        <div className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-accent-active shadow-[0_0_0_2px_theme(colors.card)]" />
      )}
      {imageSrc ? (
        <img src={imageSrc} className="h-24 w-24 rounded bg-well object-contain" style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded bg-well text-center text-xs text-faint">
          {error ?? "..."}
        </div>
      )}
      <div className="text-xs text-muted">{title}</div>
      <div className="text-xs text-faint">{subtitle}</div>
    </div>
  );
}

function DropSlot({
  title,
  imageSrc,
  active,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onDelete,
}: {
  title: string;
  imageSrc: string | null;
  active: boolean;
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onClick: () => void;
  onDelete?: () => void;
}) {
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
        "relative flex w-40 min-h-[160px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-border-strong bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        (dragOver || active) && "border-accent bg-card-raised",
        !imageSrc && "border-dashed"
      )}
    >
      {active && (
        <div className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-accent-active shadow-[0_0_0_2px_theme(colors.card)]" />
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1 rounded bg-danger px-1.5 py-0.5 text-xs hover:bg-danger-hover"
        >
          ✕
        </button>
      )}
      {imageSrc ? (
        <img src={imageSrc} className="h-24 w-24 rounded bg-well object-contain" style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded bg-well text-center text-xs text-faint">
          Glisser une image ici
        </div>
      )}
      <div className="text-xs text-muted">{title}</div>
    </div>
  );
}
