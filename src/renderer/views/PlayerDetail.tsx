import { useState } from "react";
import { RosterInfo } from "../../shared/types";
import { useTranslation } from "../i18n/LanguageContext";
import { AssetPanel } from "./AssetPanel";
import { PixelEditor, type AtlasInfo, type EditorTarget } from "./PixelEditor";
import { CropEditor, type CropTarget } from "./CropEditor";

type Position = RosterInfo["positions"][number];

// Portrait dimensions are fixed across the FUMBBL asset set (confirmed
// empirically across many rosters via the per-slot size display).
const PORTRAIT_WIDTH = 95;
const PORTRAIT_HEIGHT = 147;

type SidePanel = { kind: "pixel"; target: EditorTarget } | { kind: "crop"; target: CropTarget } | null;

export function PlayerDetail({ position, cacheFolder }: { position: Position; cacheFolder: string }) {
  const { t } = useTranslation();
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);

  const openEditor = (atlasInfo: AtlasInfo, url: string, row: number, col: number, onSaved: () => void) => {
    setSidePanel({ kind: "pixel", target: { atlasInfo, url, row, col, onSaved } });
  };

  const openCrop = (file: File, url: string, onSaved: () => void) => {
    setSidePanel({
      kind: "crop",
      target: { file, url, targetWidth: PORTRAIT_WIDTH, targetHeight: PORTRAIT_HEIGHT, onSaved },
    });
  };

  return (
    <div>
      <h2 className="mb-3 text-[17px] font-semibold">{position.name}</h2>
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="flex flex-col gap-4">
          <AssetPanel
            label={t("playerDetail.portraitLabel")}
            url={position.urlPortrait}
            cacheFolder={cacheFolder}
            onOpenCrop={openCrop}
          />
          <AssetPanel
            label={t("playerDetail.iconsetLabel")}
            url={position.urlIconSet}
            cacheFolder={cacheFolder}
            showAtlasBreakdown
            onOpenEditor={openEditor}
          />
        </div>

        <div className="sticky top-0">
          {sidePanel?.kind === "pixel" && (
            <PixelEditor target={sidePanel.target} cacheFolder={cacheFolder} onDone={() => setSidePanel(null)} />
          )}
          {sidePanel?.kind === "crop" && (
            <CropEditor target={sidePanel.target} cacheFolder={cacheFolder} onDone={() => setSidePanel(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
