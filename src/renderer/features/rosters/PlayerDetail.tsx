import { useState } from "react";
import { RosterInfo } from "@common/types";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { AssetPanel } from "@/features/asset-editor";
import { PixelEditor, type AtlasInfo, type EditorTarget } from "@/features/iconset";
import { CropEditor, type CropTarget } from "@/shared/components/CropEditor";

type Position = RosterInfo["positions"][number];

// Portrait dimensions are fixed across the FUMBBL asset set (confirmed
// empirically across many rosters via the per-slot size display).
const PORTRAIT_WIDTH = 95;
const PORTRAIT_HEIGHT = 147;

type SidePanel = { kind: "pixel"; target: EditorTarget } | { kind: "crop"; target: CropTarget } | null;

export function PlayerDetail({
  position,
  rosterName,
  cacheFolder,
}: {
  position: Position;
  rosterName: string;
  cacheFolder: string;
}) {
  const { t } = useTranslation();
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);

  const promptContext = { rosterName, positionName: position.name, positionType: position.type };

  const openEditor = (atlasInfo: AtlasInfo, url: string, row: number, col: number) => {
    setSidePanel({ kind: "pixel", target: { atlasInfo, url, row, col } });
  };

  const openCrop = (file: File, url: string) => {
    setSidePanel({
      kind: "crop",
      target: {
        imageSrc: URL.createObjectURL(file),
        url,
        targetWidth: PORTRAIT_WIDTH,
        targetHeight: PORTRAIT_HEIGHT,
      },
    });
  };

  const openCropFromExisting = (imageSrc: string, url: string) => {
    setSidePanel({
      kind: "crop",
      target: { imageSrc, url, targetWidth: PORTRAIT_WIDTH, targetHeight: PORTRAIT_HEIGHT },
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
            onRecropExisting={openCropFromExisting}
            slotAspectRatio={PORTRAIT_WIDTH / PORTRAIT_HEIGHT}
            promptContext={promptContext}
          />
          <AssetPanel
            label={t("playerDetail.iconsetLabel")}
            url={position.urlIconSet}
            cacheFolder={cacheFolder}
            showAtlasBreakdown
            onOpenEditor={openEditor}
            promptContext={promptContext}
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
