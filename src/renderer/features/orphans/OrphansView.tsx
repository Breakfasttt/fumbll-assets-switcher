import { OverrideEntry, OrphanCacheFile } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useInactiveOverrides, useOrphanFiles, useOrphanImage, useOverride, useRosterUsageIndex } from "@/shared/api/queries";
import { useDeleteOrphanFile, useDeleteOverride } from "@/shared/api/mutations";
import { ImageZoomButton } from "@/shared/components/ImageZoomModal";
import { useConfirm } from "@/shared/components/ConfirmDialogProvider";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function OrphansView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const inactiveQuery = useInactiveOverrides();
  const orphanFilesQuery = useOrphanFiles(cacheFolder);
  const removeOverride = useDeleteOverride();
  const removeOrphanFile = useDeleteOrphanFile();
  // Built here too (not only from Rosters) to show which roster an inactive override belongs to.
  useRosterUsageIndex();

  const inactive = inactiveQuery.data ?? [];
  const orphanFiles = orphanFilesQuery.data ?? [];
  const loading = inactiveQuery.isPending || orphanFilesQuery.isPending;

  // Both deletions are irreversible, hence the confirmation. No active-pack
  // guard: neither touches what the game currently loads (inactive overrides
  // are not in the cache, orphan files are not referenced by map.json).
  const deleteInactive = async (url: string) => {
    if (!(await confirm(t("orphans.deleteInactiveConfirm")))) return;
    await removeOverride.mutateAsync({ cacheFolder, url });
  };

  const deleteOrphanFile = async (fileName: string) => {
    if (!(await confirm(t("orphans.deleteFileConfirm", { file: fileName })))) return;
    await removeOrphanFile.mutateAsync({ cacheFolder, fileName });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t("orphans.inactiveTitle")}</CardTitle>
        <div className="mb-3 text-sm text-muted-foreground">{t("orphans.inactiveHint")}</div>
        {loading ? (
          <div className="text-sm text-muted-foreground">{t("roster.loading")}</div>
        ) : inactive.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("orphans.none")}</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {inactive.map((entry) => (
              <InactiveOverrideCard key={entry.url} entry={entry} onDelete={() => deleteInactive(entry.url)} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>{t("orphans.filesTitle")}</CardTitle>
        <div className="mb-3 text-sm text-muted-foreground">{t("orphans.filesHint")}</div>
        {loading ? (
          <div className="text-sm text-muted-foreground">{t("roster.loading")}</div>
        ) : orphanFiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("orphans.none")}</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {orphanFiles.map((file) => (
              <OrphanFileCard
                key={file.fileName}
                file={file}
                cacheFolder={cacheFolder}
                onDelete={() => deleteOrphanFile(file.fileName)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function InactiveOverrideCard({ entry, onDelete }: { entry: OverrideEntry; onDelete: () => void }) {
  const { t } = useTranslation();
  const imageSrc = useOverride(entry.url).data?.image ?? null;
  const usageIndex = useRosterUsageIndex().data;
  const rosters = usageIndex ? (usageIndex.get(entry.url) ?? []) : undefined;

  return (
    <div className="flex w-56 min-w-0 flex-col gap-2 rounded-lg border border-border-strong bg-surface-raised p-3">
      <div className="relative">
        {imageSrc && (
          <img
            src={imageSrc}
            className="h-24 w-full rounded bg-well object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        {imageSrc && <ImageZoomButton imageSrc={imageSrc} reveal={{ kind: "override", ref: entry.url }} />}
      </div>
      <div className="truncate text-xs text-muted-foreground" title={entry.url}>
        {entry.url}
      </div>
      <div className="truncate text-xs text-faint-foreground">
        {rosters && rosters.length > 0
          ? t("orphans.rosterLabel", { rosters: rosters.join(", ") })
          : rosters !== undefined
            ? t("orphans.rosterUnknown")
            : ""}
      </div>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        {t("orphans.deleteButton")}
      </Button>
    </div>
  );
}

function OrphanFileCard({
  file,
  cacheFolder,
  onDelete,
}: {
  file: OrphanCacheFile;
  cacheFolder: string;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const imageSrc = useOrphanImage(cacheFolder, file.fileName).data ?? null;

  return (
    <div className="flex w-56 min-w-0 flex-col gap-2 rounded-lg border border-border-strong bg-surface-raised p-3">
      <div className="relative">
        {imageSrc && (
          <img
            src={imageSrc}
            className="h-24 w-full rounded bg-well object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        {imageSrc && (
          <ImageZoomButton imageSrc={imageSrc} reveal={{ kind: "cacheFile", cacheFolder, ref: file.fileName }} />
        )}
      </div>
      <div className="truncate text-xs text-muted-foreground" title={file.fileName}>
        {file.fileName}
      </div>
      <div className="text-xs tabular-nums text-faint-foreground">{formatSize(file.sizeBytes)}</div>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        {t("orphans.deleteButton")}
      </Button>
    </div>
  );
}
