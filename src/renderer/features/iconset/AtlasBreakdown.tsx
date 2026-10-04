import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useActivePackGuard } from "@/shared/hooks/useActivePackGuard";
import { useConfirm } from "@/shared/components/ConfirmDialogProvider";
import { useOverride } from "@/shared/api/queries";
import { useClearActivePack, useSaveOverride } from "@/shared/api/mutations";
import type { AtlasInfo } from "./PixelEditor";

export const ATLAS_COLUMN_LABELS = ["Home idle", "Home moving", "Away idle", "Away moving"];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

export async function canvasAtlasFromImage(imgSrc: string): Promise<AtlasInfo | null> {
  const sourceImg = await loadImage(imgSrc).catch(() => null);
  if (!sourceImg) return null;
  const cellSize = sourceImg.naturalWidth / 4;
  const rows = Math.round(sourceImg.naturalHeight / cellSize);
  if (!Number.isFinite(cellSize) || cellSize <= 0 || rows <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = sourceImg.naturalWidth;
  canvas.height = sourceImg.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceImg, 0, 0);
  return { canvas, cellSize, rows };
}

export function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.substring(dataUrl.indexOf(",") + 1);
}

// An iconset is a sprite sheet: 4 equal-width columns (home-idle, home-moving,
// away-idle, away-moving) times N rows (one per pose/index). Cell size = width / 4.
export function AtlasBreakdown({
  imgSrc,
  imageSource,
  url,
  cacheFolder,
  onOpenEditor,
}: {
  imgSrc: string;
  /** Which slot `imgSrc` comes from: the operations below start from it. */
  imageSource: "default" | "custom";
  url: string;
  cacheFolder: string;
  onOpenEditor?: (atlasInfo: AtlasInfo, url: string, row: number, col: number) => void;
}) {
  const { t } = useTranslation();
  const guardAgainstActivePack = useActivePackGuard();
  const confirm = useConfirm();
  const hasOverride = !!useOverride(url).data?.entry;
  const saveOverride = useSaveOverride();
  const clearActivePack = useClearActivePack();
  const [atlasInfo, setAtlasInfo] = useState<AtlasInfo | null>(null);
  const [cellThumbs, setCellThumbs] = useState<string[][]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [chosenRow, setChosenRow] = useState("0");

  useEffect(() => {
    let cancelled = false;
    canvasAtlasFromImage(imgSrc).then((info) => {
      if (cancelled || !info) return;
      setAtlasInfo(info);
      setChosenRow("0");

      const thumbs: string[][] = [];
      for (let row = 0; row < info.rows; row++) {
        const rowThumbs: string[] = [];
        for (let col = 0; col < 4; col++) {
          const cellCanvas = document.createElement("canvas");
          cellCanvas.width = info.cellSize;
          cellCanvas.height = info.cellSize;
          const ctx = cellCanvas.getContext("2d")!;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(info.canvas, col * info.cellSize, row * info.cellSize, info.cellSize, info.cellSize, 0, 0, info.cellSize, info.cellSize);
          rowThumbs.push(cellCanvas.toDataURL("image/png"));
        }
        thumbs.push(rowThumbs);
      }
      setCellThumbs(thumbs);
    });
    return () => {
      cancelled = true;
    };
  }, [imgSrc]);

  if (!atlasInfo) return null;

  const applyUniformRow = async () => {
    // Starting from the default image would silently replace an existing custom one.
    if (imageSource === "default" && hasOverride) {
      if (!(await confirm(t("atlas.overwriteCustomConfirm")))) return;
    }
    if (!(await guardAgainstActivePack())) return;
    const { canvas: sourceCanvas, cellSize, rows } = atlasInfo;
    const row = Number(chosenRow);

    // Repeat the chosen row `rows` times so the atlas keeps its original
    // dimensions - safe even for positions with quantity > 1, since the
    // client always finds a valid row whatever index it cycles to.
    const outCanvas = document.createElement("canvas");
    outCanvas.width = sourceCanvas.width;
    outCanvas.height = sourceCanvas.height;
    const outCtx = outCanvas.getContext("2d")!;
    outCtx.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
      outCtx.drawImage(sourceCanvas, 0, row * cellSize, sourceCanvas.width, cellSize, 0, r * cellSize, sourceCanvas.width, cellSize);
    }

    const base64 = canvasToPngBase64(outCanvas);
    await saveOverride.mutateAsync({ cacheFolder, url, base64, format: "png" });
    await clearActivePack.mutateAsync();
    setPopoverOpen(false);
  };

  return (
    <div>
      <div className="mb-2 text-xs text-muted-foreground">{t("atlas.cellsDetailLabel")}</div>

      <div className="mb-2 flex items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              disabled={atlasInfo.rows <= 1}
              onClick={() => setChosenRow("0")}
            >
              {t("atlas.repeatVariantButton")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="mb-2 text-xs text-muted-foreground">{t("atlas.repeatVariantHint")}</div>
            <div className="mb-2 text-xs text-faint-foreground">
              {imageSource === "custom" ? t("atlas.sourceCustom") : t("atlas.sourceDefault")}
            </div>
            <Select value={chosenRow} onValueChange={setChosenRow}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: atlasInfo.rows }, (_, r) => (
                  <SelectItem key={r} value={String(r)}>
                    {t("atlas.rowLabel", { n: r + 1 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={applyUniformRow}>
                {t("atlas.applyButton")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPopoverOpen(false)}>
                {t("atlas.cancelButton")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="text-xs text-muted-foreground mb-2">{t("atlas.clickCellHint")}</div>

      <div className="flex flex-col gap-2">
        {cellThumbs.map((rowThumbs, row) => (
          <div key={row} className="grid grid-cols-4 gap-2">
            {rowThumbs.map((thumb, col) => (
              <div key={col} className="flex flex-col items-center gap-0.5">
                <img
                  src={thumb}
                  title={t("atlas.cellTitle", { label: ATLAS_COLUMN_LABELS[col], n: row + 1 })}
                  onClick={() => onOpenEditor?.(atlasInfo, url, row, col)}
                  className="h-12 w-12 cursor-pointer rounded border border-border bg-well hover:border-primary"
                  style={{ imageRendering: "pixelated" }}
                />
                {row === 0 && <div className="w-12 text-center text-xs text-muted-foreground">{ATLAS_COLUMN_LABELS[col]}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
