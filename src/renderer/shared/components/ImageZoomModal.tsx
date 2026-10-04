import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n/LanguageContext";

export interface RevealTarget {
  /** Absolute-resolvable target: either a cache-folder-relative file name, or an override URL. */
  kind: "cacheFile" | "override";
  /** For kind "cacheFile": the cache folder. For kind "override": unused. */
  cacheFolder?: string;
  /** For kind "cacheFile": the file name inside cacheFolder. For kind "override": the asset URL. */
  ref: string;
}

async function reveal(target: RevealTarget) {
  if (target.kind === "cacheFile" && target.cacheFolder) {
    await window.fumbblApi.showFileInFolder(target.cacheFolder, target.ref);
  } else if (target.kind === "override") {
    await window.fumbblApi.showOverrideInFolder(target.ref);
  }
}

/**
 * Small magnifier button that opens a zoomable/pannable preview of `imageSrc`.
 * Always anchors itself to the bottom-right corner of its nearest positioned
 * ancestor - wrap it in a `relative` container, don't pass a custom position.
 */
export function ImageZoomButton({
  imageSrc,
  reveal: revealTarget,
}: {
  imageSrc: string;
  reveal?: RevealTarget;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = draggingRef.current;
    if (!drag) return;
    setOffset({
      x: drag.startOffset.x + (e.clientX - drag.startX),
      y: drag.startOffset.y + (e.clientY - drag.startY),
    });
  };
  const onPointerUp = () => {
    draggingRef.current = null;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetView();
      }}
    >
      <DialogTrigger asChild>
        <button
          className="absolute bottom-1 right-1 z-10 rounded border border-border-strong bg-card/80 p-1 text-muted hover:bg-card hover:text-white"
          title={t("zoom.openButton")}
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <div
          className="relative mb-3 h-[60vh] w-full cursor-move overflow-hidden rounded border border-border-strong bg-well"
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 8));
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <img
            src={imageSrc}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              imageRendering: "pixelated",
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{t("zoom.zoomLabel")}</span>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={resetView}>
            {t("zoom.resetButton")}
          </Button>
          {revealTarget && (
            <Button size="sm" variant="outline" onClick={() => reveal(revealTarget)}>
              {t("zoom.revealButton")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
