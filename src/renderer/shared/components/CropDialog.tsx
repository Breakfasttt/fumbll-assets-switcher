import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useActivePackGuard } from "@/shared/hooks/useActivePackGuard";
import { useHotkey } from "@/shared/hooks/useHotkey";
import { useOverrideUndo } from "@/shared/hooks/useOverrideUndo";
import { useClearActivePack, useSaveOverride } from "@/shared/api/mutations";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Kbd } from "@/shared/ui/kbd";
import { Slider } from "@/shared/ui/slider";

export interface CropTarget {
  /** Object URL or data URL of the image to crop. */
  imageSrc: string;
  url: string;
  targetWidth: number;
  targetHeight: number;
}

const MAX_ZOOM = 6;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

/** Draws the cropped area of `src` at the exact target size. */
async function renderCrop(src: string, area: Area, width: number, height: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);
  return canvas;
}

/**
 * Single crop experience for portraits and pitches (docs/ux-research.md §4.3):
 * react-easy-crop (pointer-centered wheel zoom, keyboard, no empty borders) in a
 * dialog, with real-size previews. `target === null` = closed.
 */
export function CropDialog({ target, cacheFolder, onClose }: { target: CropTarget | null; cacheFolder: string; onClose: () => void }) {
  const { t } = useTranslation();
  const guardAgainstActivePack = useActivePackGuard();
  const saveOverride = useSaveOverride();
  const clearActivePack = useClearActivePack();
  const notifyOverrideUndo = useOverrideUndo();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setPreview(null);
  }, [target?.imageSrc]);

  // Real-size preview, throttled while dragging.
  useEffect(() => {
    if (!target || !area) return;
    window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(async () => {
      const canvas = await renderCrop(target.imageSrc, area, target.targetWidth, target.targetHeight);
      setPreview(canvas.toDataURL("image/png"));
    }, 120);
    return () => window.clearTimeout(previewTimer.current);
  }, [target, area]);

  const save = async () => {
    if (!target || !area || saveOverride.isPending) return;
    if (!(await guardAgainstActivePack())) return;
    const canvas = await renderCrop(target.imageSrc, area, target.targetWidth, target.targetHeight);
    const dataUrl = canvas.toDataURL("image/png");
    const result = await saveOverride.mutateAsync({ cacheFolder, url: target.url, base64: dataUrl.slice(dataUrl.indexOf(",") + 1), format: "png" });
    await clearActivePack.mutateAsync();
    notifyOverrideUndo(t("assetPanel.replacedToast"), { cacheFolder, url: target.url, versionId: result.undoVersionId });
    onClose();
  };
  useHotkey("ctrl+enter", save, { enabled: !!target, allowInInput: true });

  const aspect = target ? target.targetWidth / target.targetHeight : 1;
  // Small targets (portraits) get a 2x preview too; pitches are already large.
  const previews = target && target.targetWidth < 200 ? [1, 2] : [0.5];

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(90vw,1100px)]" aria-label={t("cropEditor.title")}>
        {target && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[15px] font-semibold">{t("cropEditor.title")}</div>
              <div className="text-xs text-muted-foreground">{t("cropEditor.sizeHint", { w: target.targetWidth, h: target.targetHeight })}</div>
            </div>
            <div className="flex gap-4">
              <div className="relative h-[60vh] min-w-0 flex-1 overflow-hidden rounded border border-border-strong bg-well">
                <Cropper
                  image={target.imageSrc}
                  crop={crop}
                  zoom={zoom}
                  maxZoom={MAX_ZOOM}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setArea(pixels)}
                  objectFit="cover"
                  showGrid={false}
                />
              </div>
              <div className="flex w-56 shrink-0 flex-col gap-2">
                <div className="text-xs font-medium text-muted-foreground">{t("cropEditor.previewLabel")}</div>
                {previews.map((scale) => (
                  <div key={scale} className="flex flex-col gap-1">
                    <div className="flex items-center justify-center overflow-hidden rounded border border-border bg-well p-1">
                      {preview ? (
                        <img
                          src={preview}
                          alt={t("cropEditor.previewLabel")}
                          style={{ width: target.targetWidth * scale, height: target.targetHeight * scale, imageRendering: scale > 1 ? "pixelated" : "auto" }}
                        />
                      ) : (
                        <div style={{ width: target.targetWidth * scale, height: target.targetHeight * scale }} />
                      )}
                    </div>
                    <div className="text-center text-xs tabular-nums text-faint-foreground">×{scale}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{t("cropEditor.zoomLabel")}</span>
              <Slider className="max-w-xs" min={1} max={MAX_ZOOM} step={0.01} value={[zoom]} onValueChange={([z]) => setZoom(z)} aria-label={t("cropEditor.zoomLabel")} />
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("cropEditor.cancelButton")}
                </Button>
                <Button onClick={save} disabled={!area || saveOverride.isPending}>
                  {t("cropEditor.saveButton")}
                  <Kbd className="border-primary-foreground/40 bg-transparent text-primary-foreground">{t("cropEditor.saveShortcut")}</Kbd>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
