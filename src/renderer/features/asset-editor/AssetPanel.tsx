import { Card, CardTitle } from "@/shared/ui/card";
import { extractAssetId } from "@/shared/lib/rosters";
import { useImageDimensions } from "@/shared/hooks/useImageDimensions";
import { useAssetSlot } from "@/shared/hooks/useAssetSlot";
import { useRosterUsageIndex } from "@/shared/api/queries";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { AssetSlotPair } from "@/shared/components/AssetSlotPair";
import { AtlasBreakdown } from "@/features/iconset";
import { PromptPopover } from "./PromptPopover";
import { buildPortraitPrompt, buildIconsetPrompt, type PromptContext } from "./imagePrompt";
import type { AtlasInfo } from "@/features/iconset";

interface Props {
  label: string;
  url: string | null;
  cacheFolder: string;
  showAtlasBreakdown?: boolean;
  onOpenEditor?: (atlasInfo: AtlasInfo, url: string, row: number, col: number) => void;
  onOpenCrop?: (file: File, url: string) => void;
  onRecropExisting?: (imageSrc: string, url: string) => void;
  /** Width/height ratio for the slot thumbnails, e.g. 95/147 for portraits. Defaults to a 1:1 square (iconsets). */
  slotAspectRatio?: number;
  promptContext?: PromptContext;
}

// Portraits (95x147) show at their real size; iconsets stay compact so the pair fits a narrow column.
const THUMB_HEIGHT = 147;
const ICONSET_THUMB_HEIGHT = 96;

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
  const slot = useAssetSlot(cacheFolder, url);
  const usageIndex = useRosterUsageIndex().data;
  // Must run on every render (Rules of Hooks) even when `url` is null.
  const activeDims = useImageDimensions(slot.activeImage);

  if (!url) {
    return (
      <Card>
        <CardTitle>{label}</CardTitle>
        <div className="text-sm text-muted-foreground">{t("assetPanel.unavailable")}</div>
      </Card>
    );
  }

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
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardTitle className="mb-0">{label}</CardTitle>
        {promptContext && <PromptPopover buildPrompt={buildPrompt} />}
      </div>

      <AssetSlotPair
        slot={slot}
        aspectRatio={slotAspectRatio}
        thumbHeight={showAtlasBreakdown ? ICONSET_THUMB_HEIGHT : THUMB_HEIGHT}
        defaultCaption={`#${extractAssetId(url)}`}
        // Portrait: the crop editor guards + clears the active pack itself at save time.
        onFile={onOpenCrop ? (file) => onOpenCrop(file, url) : undefined}
        onRecrop={onRecropExisting ? (imageSrc) => onRecropExisting(imageSrc, url) : undefined}
        sharedBy={usageIndex ? (usageIndex.get(url) ?? []) : null}
        owner={promptContext?.rosterName}
      />

      {showAtlasBreakdown && slot.activeImage && (
        <div className="mt-4">
          <AtlasBreakdown
            imgSrc={slot.activeImage}
            imageSource={slot.customActive ? "custom" : "default"}
            url={url}
            cacheFolder={cacheFolder}
            onOpenEditor={onOpenEditor}
          />
        </div>
      )}
    </Card>
  );
}
