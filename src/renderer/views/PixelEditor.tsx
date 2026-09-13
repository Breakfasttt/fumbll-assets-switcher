import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { cn } from "../lib/utils";
import { useTranslation } from "../i18n/LanguageContext";
import { useActivePackGuard } from "../hooks/useActivePackGuard";
import { ATLAS_COLUMN_LABELS, canvasToPngBase64 } from "./AtlasBreakdown";

export interface AtlasInfo {
  canvas: HTMLCanvasElement;
  cellSize: number;
  rows: number;
}

export interface EditorTarget {
  atlasInfo: AtlasInfo;
  url: string;
  row: number;
  col: number;
  onSaved: () => void;
}

const PALETTE = [
  "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
  "#ff8800", "#8844ff", "#00ffff", "#ff00ff", "#804000", "#808080",
];

const ZOOM = 16;

export function PixelEditor({
  target,
  cacheFolder,
  onDone,
}: {
  target: EditorTarget;
  cacheFolder: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const guardAgainstActivePack = useActivePackGuard();
  const { atlasInfo, url, onSaved } = target;
  const { canvas: sourceCanvas, cellSize, rows } = atlasInfo;

  const [row, setRow] = useState(String(target.row));
  const [col, setCol] = useState(String(target.col));
  const [color, setColor] = useState(PALETTE[0]);

  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintingRef = useRef(false);

  if (!workingCanvasRef.current) {
    const working = document.createElement("canvas");
    working.width = sourceCanvas.width;
    working.height = sourceCanvas.height;
    working.getContext("2d")!.drawImage(sourceCanvas, 0, 0);
    workingCanvasRef.current = working;
  }

  const loadCellIntoEditor = () => {
    const editCanvas = editCanvasRef.current;
    const working = workingCanvasRef.current;
    if (!editCanvas || !working) return;
    const ctx = editCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, editCanvas.width, editCanvas.height);
    ctx.drawImage(
      working,
      Number(col) * cellSize, Number(row) * cellSize, cellSize, cellSize,
      0, 0, cellSize * ZOOM, cellSize * ZOOM
    );
  };

  useEffect(() => {
    loadCellIntoEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, col]);

  const paintAt = (clientX: number, clientY: number) => {
    const editCanvas = editCanvasRef.current;
    if (!editCanvas) return;
    const rect = editCanvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / ZOOM);
    const y = Math.floor((clientY - rect.top) / ZOOM);
    if (x < 0 || y < 0 || x >= cellSize || y >= cellSize) return;
    const ctx = editCanvas.getContext("2d")!;
    if (color === "transparent") {
      ctx.clearRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
    }
  };

  useEffect(() => {
    const onUp = () => {
      paintingRef.current = false;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const save = async () => {
    const editCanvas = editCanvasRef.current;
    const working = workingCanvasRef.current;
    if (!editCanvas || !working) return;
    if (!(await guardAgainstActivePack())) return;
    const workingCtx = working.getContext("2d")!;
    const r = Number(row);
    const c = Number(col);
    workingCtx.clearRect(c * cellSize, r * cellSize, cellSize, cellSize);
    workingCtx.drawImage(editCanvas, 0, 0, cellSize * ZOOM, cellSize * ZOOM, c * cellSize, r * cellSize, cellSize, cellSize);
    const base64 = canvasToPngBase64(working);
    await window.fumbblApi.saveOverride(cacheFolder, url, base64, "png");
    await window.fumbblApi.clearActivePack();
    onSaved();
    onDone();
  };

  return (
    <Card>
      <CardTitle>{t("pixelEditor.title")}</CardTitle>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-muted">{t("pixelEditor.cellLabel")}</span>
        <Select value={row} onValueChange={setRow}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: rows }, (_, r) => (
              <SelectItem key={r} value={String(r)}>
                {t("atlas.rowLabel", { n: r + 1 })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={col} onValueChange={setCol}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATLAS_COLUMN_LABELS.map((label, i) => (
              <SelectItem key={i} value={String(i)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <canvas
        ref={editCanvasRef}
        width={cellSize * ZOOM}
        height={cellSize * ZOOM}
        className="mb-3 cursor-crosshair rounded border border-border-strong"
        style={{ imageRendering: "pixelated" }}
        onMouseDown={(e) => {
          paintingRef.current = true;
          paintAt(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (paintingRef.current) paintAt(e.clientX, e.clientY);
        }}
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {PALETTE.map((swatch) => (
          <button
            key={swatch}
            onClick={() => setColor(swatch)}
            className={cn(
              "h-6 w-6 rounded border-2 border-border-strong",
              color === swatch && "border-accent"
            )}
            style={{ background: swatch }}
          />
        ))}
        <Button size="sm" variant="outline" onClick={() => setColor("transparent")}>
          {t("pixelEditor.eraserButton")}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>{t("pixelEditor.saveButton")}</Button>
        <Button variant="outline" onClick={onDone}>
          {t("pixelEditor.cancelButton")}
        </Button>
      </div>
    </Card>
  );
}
