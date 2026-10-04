import { useRef, useState } from "react";
import { Copy, Crop, Ellipsis, FolderOpen, Trash2, TriangleAlert, Upload } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/notify";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/ui/icon-button";
import { Skeleton } from "@/shared/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { ImageZoomButton, type RevealTarget } from "@/shared/components/ImageZoomModal";
import { useImageDimensions } from "@/shared/hooks/useImageDimensions";
import type { AssetSlotState } from "@/shared/hooks/useAssetSlot";
import { useTranslation } from "@/shared/i18n/LanguageContext";

// The custom column also hosts the action bar: never narrower than its 4 icon buttons (4 x 28 px).
const MIN_FIGURE_WIDTH = 112;

interface Props {
  /** From `useAssetSlot(cacheFolder, url)` (the caller often needs it too: active image, atlas...). */
  slot: AssetSlotState;
  /** Width / height of the asset, e.g. 95/147 (portrait), 1 (iconset), 782/452 (pitch). */
  aspectRatio: number;
  /** Thumbnail height in px; width follows `aspectRatio`. */
  thumbHeight: number;
  /** Secondary caption under the Default thumbnail (e.g. "#12345"). */
  defaultCaption?: string;
  /** Dropped or picked file. Defaults to saving it as is (`slot.saveFile`); pass a crop opener instead. */
  onFile?: (file: File) => void;
  /** Re-crop the existing custom image (button hidden when absent). */
  onRecrop?: (imageSrc: string) => void;
  /** Rosters using this asset. `null` = still loading, `undefined` = not applicable (pitches). */
  sharedBy?: string[] | null;
  /** Roster being edited: left out of the "also changes" warning. */
  owner?: string;
}

/**
 * Default / Custom pair of one asset: which image the game uses is an explicit
 * ToggleGroup choice (thumbnails are not clickable), the Custom side is a
 * dropzone with a file picker, and its actions live in an icon bar + "⋯" menu.
 * Shared by asset-editor (portrait, iconset) and pitches (one per weather).
 */
export function AssetSlotPair({ slot, aspectRatio, thumbHeight, defaultCaption, onFile, onRecrop, sharedBy, owner }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const thumbWidth = Math.round(thumbHeight * aspectRatio);
  const { url, override, customImage, customActive } = slot;
  const handleFile = onFile ?? slot.saveFile;

  if (!url) return null;

  const openPicker = () => inputRef.current?.click();
  const copyUrl = () =>
    navigator.clipboard.writeText(url).then(
      () => notify.success(t("assetSlot.urlCopiedToast")),
      () => notify.error(t("assetSlot.copyFailedToast"))
    );

  const customToggle = (
    <ToggleGroupItem value="custom" size="sm" disabled={!override} data-testid="slot-toggle-custom">
      {t("assetPanel.slot.custom")}
    </ToggleGroupItem>
  );

  return (
    <div data-testid="asset-slot-pair" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <SlotFigure
          kind="default"
          label={t("assetPanel.slot.default")}
          caption={defaultCaption}
          image={slot.defaultImage}
          loading={slot.defaultLoading}
          emptyText={slot.defaultError ?? ""}
          inGame={!customActive}
          thumbWidth={thumbWidth}
          thumbHeight={thumbHeight}
        />

        <SlotFigure
          kind="custom"
          label={t("assetPanel.slot.custom")}
          image={customImage}
          loading={slot.customLoading}
          emptyText={t("assetPanel.dropPlaceholder")}
          emptyAction={
            <Button
              size="sm"
              variant="outline"
              className="h-auto whitespace-normal py-1 leading-tight"
              onClick={openPicker}
              data-testid="slot-choose-file"
            >
              {t("assetSlot.chooseFile")}
            </Button>
          }
          inGame={customActive}
          thumbWidth={thumbWidth}
          thumbHeight={thumbHeight}
          reveal={override ? { kind: "override", ref: url } : undefined}
          dragOver={dragOver}
          dropHandlers={{
            onDragOver: (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDragOver(true);
            },
            onDragLeave: (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
            },
            onDrop: (e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            },
          }}
        >
          {override && (
            <div className="flex items-center">
              <IconButton
                data-testid="slot-replace"
                label={t("assetSlot.replace")}
                icon={<Upload className="size-3.5" />}
                onClick={openPicker}
              />
              {onRecrop && customImage && (
                <IconButton
                  data-testid="slot-recrop"
                  label={t("assetPanel.recropButton")}
                  icon={<Crop className="size-3.5" />}
                  onClick={() => onRecrop(customImage)}
                />
              )}
              <IconButton
                data-testid="slot-delete"
                label={t("assetSlot.delete")}
                icon={<Trash2 className="size-3.5" />}
                className="hover:text-danger"
                onClick={() => void slot.remove()}
              />
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            data-testid="slot-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset so picking the same file again still fires onChange.
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </SlotFigure>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("assetSlot.inGameLabel")}</span>
        <ToggleGroup
          type="single"
          aria-label={t("assetSlot.inGameLabel")}
          value={customActive ? "custom" : "default"}
          onValueChange={(value) => {
            // Radix sends "" when the pressed item is clicked again: keep the current choice.
            if (value) void slot.setActive(value === "custom");
          }}
        >
          <ToggleGroupItem value="default" size="sm" data-testid="slot-toggle-default">
            {t("assetPanel.slot.default")}
          </ToggleGroupItem>
          {override ? (
            customToggle
          ) : (
            // A disabled button gets no pointer events: the tooltip hangs on a wrapper.
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{customToggle}</span>
              </TooltipTrigger>
              <TooltipContent>{t("assetSlot.customDisabledHint")}</TooltipContent>
            </Tooltip>
          )}
        </ToggleGroup>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton data-testid="slot-menu" label={t("assetSlot.moreActions")} icon={<Ellipsis className="size-3.5" />} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                disabled={!override}
                onSelect={() => void window.fumbblApi.showOverrideInFolder(url)}
              >
                <FolderOpen />
                {t("zoom.revealButton")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyUrl()}>
                <Copy />
                {t("assetSlot.copyUrl")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {sharedBy !== undefined && <SharedBy names={sharedBy} owner={owner} />}
    </div>
  );
}

function SlotFigure({
  kind,
  label,
  caption,
  image,
  loading,
  emptyText,
  emptyAction,
  inGame,
  thumbWidth,
  thumbHeight,
  reveal,
  dragOver = false,
  dropHandlers,
  children,
}: {
  kind: "default" | "custom";
  label: string;
  caption?: string;
  image: string | null;
  loading: boolean;
  emptyText: string;
  /** Shown under `emptyText` when there is no image (custom side: file picker). */
  emptyAction?: React.ReactNode;
  inGame: boolean;
  thumbWidth: number;
  thumbHeight: number;
  reveal?: RevealTarget;
  dragOver?: boolean;
  dropHandlers?: Pick<React.HTMLAttributes<HTMLDivElement>, "onDragOver" | "onDragLeave" | "onDrop">;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const dims = useImageDimensions(image);
  // Upscaled pixel art stays crisp; downscaled images (pitches) need smoothing.
  const upscaled = !!dims && Math.min(thumbWidth / dims.width, thumbHeight / dims.height) > 1;

  return (
    <figure className="m-0 flex flex-col gap-1.5" style={{ width: Math.max(thumbWidth, MIN_FIGURE_WIDTH) }}>
      <div
        data-slot={kind}
        data-in-game={inGame || undefined}
        {...dropHandlers}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded border-2 bg-well transition-colors",
          inGame ? "border-live" : "border-border",
          !image && !loading && kind === "custom" && "border-dashed border-border-strong",
          dragOver && "border-dashed border-primary"
        )}
        style={{ width: thumbWidth + 4, height: thumbHeight + 4 }}
      >
        {loading ? (
          <Skeleton className="rounded-none" style={{ width: thumbWidth, height: thumbHeight }} />
        ) : image ? (
          <>
            <img
              src={image}
              alt={label}
              className="object-contain"
              style={{ width: thumbWidth, height: thumbHeight, imageRendering: upscaled ? "pixelated" : "auto" }}
            />
            <ImageZoomButton imageSrc={image} reveal={reveal} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-2 text-center text-xs text-faint-foreground">
            {/* Small thumbnails (iconset) only fit the text and the button. */}
            {kind === "custom" && thumbHeight >= 120 && <Upload className="size-4" />}
            {emptyText}
            {emptyAction}
          </div>
        )}
        {inGame && (
          <Badge variant="live" className="absolute left-1 top-1" data-testid="in-game-badge">
            {t("assetSlot.inGameBadge")}
          </Badge>
        )}
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-overlay px-2 text-center text-xs font-medium text-foreground">
            {t("assetSlot.dropToReplace")}
          </div>
        )}
      </div>
      <figcaption className="flex flex-col text-xs leading-4">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex min-h-4 flex-wrap gap-x-1.5 tabular-nums text-faint-foreground">
          {caption && <span>{caption}</span>}
          {dims && (
            <span>
              {dims.width}×{dims.height} px
            </span>
          )}
        </span>
      </figcaption>
      {children}
    </figure>
  );
}

function SharedBy({ names, owner }: { names: string[] | null; owner?: string }) {
  const { t } = useTranslation();
  if (names === null) return <Skeleton className="h-4 w-48" />;
  if (names.length === 0) return null;
  const list = names.join(", ");
  const others = names.filter((n) => n !== owner);

  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs" data-testid="shared-by">
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="m-0 truncate text-muted-foreground" tabIndex={0}>
            {t("assetSlot.sharedBy", { list })}
          </p>
        </TooltipTrigger>
        <TooltipContent>{list}</TooltipContent>
      </Tooltip>
      {names.length > 1 && others.length > 0 && (
        <p className="m-0 flex items-start gap-1 text-warning" data-testid="shared-warning">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {t("assetSlot.sharedWarning", { list: others.join(", ") })}
        </p>
      )}
    </div>
  );
}
