import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTranslation } from "../i18n/LanguageContext";

export interface CropTarget {
  file: File;
  url: string;
  targetWidth: number;
  targetHeight: number;
  onSaved: () => void;
}

function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.substring(dataUrl.indexOf(",") + 1);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

// Crop viewport rendered at a fixed on-screen size; the crop rectangle keeps
// the target's aspect ratio and can be moved/zoomed over the source image.
const VIEWPORT_HEIGHT = 360;

export function CropEditor({ target, cacheFolder, onDone }: { target: CropTarget; cacheFolder: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { file, url, targetWidth, targetHeight, onSaved } = target;
  const aspect = targetWidth / targetHeight;

  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  const viewportWidth = VIEWPORT_HEIGHT * aspect;

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    loadImage(objectUrl).then((img) => {
      setSourceImg(img);
      // Start zoomed so the crop box is fully covered by the source image.
      const coverScale = Math.max(viewportWidth / img.width, VIEWPORT_HEIGHT / img.height);
      setZoom(coverScale);
      setOffset({ x: 0, y: 0 });
    });
    return () => URL.revokeObjectURL(objectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImg) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawW = sourceImg.width * zoom;
    const drawH = sourceImg.height * zoom;
    const x = (viewportWidth - drawW) / 2 + offset.x;
    const y = (VIEWPORT_HEIGHT - drawH) / 2 + offset.y;
    ctx.drawImage(sourceImg, x, y, drawW, drawH);
  };

  useEffect(draw, [sourceImg, zoom, offset, viewportWidth]);

  const minZoom = sourceImg ? Math.max(viewportWidth / sourceImg.width, VIEWPORT_HEIGHT / sourceImg.height) : 1;

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

  const save = async () => {
    if (!sourceImg) return;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = targetWidth;
    outCanvas.height = targetHeight;
    const ctx = outCanvas.getContext("2d")!;
    const scaleToTarget = targetWidth / viewportWidth;
    const drawW = sourceImg.width * zoom * scaleToTarget;
    const drawH = sourceImg.height * zoom * scaleToTarget;
    const x = (targetWidth - drawW) / 2 + offset.x * scaleToTarget;
    const y = (targetHeight - drawH) / 2 + offset.y * scaleToTarget;
    ctx.drawImage(sourceImg, x, y, drawW, drawH);

    const base64 = canvasToPngBase64(outCanvas);
    await window.fumbblApi.saveOverride(cacheFolder, url, base64, "png");
    onSaved();
    onDone();
  };

  return (
    <Card>
      <CardTitle>{t("cropEditor.title")}</CardTitle>
      <div className="mb-2 text-xs text-muted">
        {t("cropEditor.sizeHint", { w: targetWidth, h: targetHeight })}
      </div>

      <div
        className="relative mb-3 overflow-hidden rounded border border-border-strong bg-well"
        style={{ width: viewportWidth, height: VIEWPORT_HEIGHT, touchAction: "none" }}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, minZoom), minZoom * 6));
        }}
      >
        <canvas
          ref={canvasRef}
          width={viewportWidth}
          height={VIEWPORT_HEIGHT}
          className="cursor-move"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-muted">{t("cropEditor.zoomLabel")}</span>
        <input
          type="range"
          min={minZoom}
          max={minZoom * 6}
          step={(minZoom * 6 - minZoom) / 200 || 0.001}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={!sourceImg}>
          {t("cropEditor.saveButton")}
        </Button>
        <Button variant="outline" onClick={onDone}>
          {t("cropEditor.cancelButton")}
        </Button>
      </div>
    </Card>
  );
}
