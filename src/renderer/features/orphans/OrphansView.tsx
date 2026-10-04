import { useEffect, useState } from "react";
import { OverrideEntry, OrphanCacheFile } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { fetchAllRosters, indexRosterUsage, getRosterUsageIndexReady, getRostersUsingAsset } from "@/shared/lib/rosters";
import { ImageZoomButton } from "@/shared/components/ImageZoomModal";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function OrphansView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const [inactive, setInactive] = useState<OverrideEntry[]>([]);
  const [orphanFiles, setOrphanFiles] = useState<OrphanCacheFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [inactiveList, orphanList] = await Promise.all([
      window.fumbblApi.listInactiveOverrides(),
      window.fumbblApi.listOrphanCacheFiles(cacheFolder),
    ]);
    setInactive(inactiveList);
    setOrphanFiles(orphanList);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // Make sure the roster usage index gets built even if the user never
    // visited the Rosters tab this session, so we can show which roster an
    // inactive override belongs to.
    if (!getRosterUsageIndexReady()) {
      fetchAllRosters().then((rosters) => indexRosterUsage(rosters.map((r) => r.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheFolder]);

  const deleteInactive = async (url: string) => {
    await window.fumbblApi.deleteOverride(cacheFolder, url);
    refresh();
  };

  const deleteOrphanFile = async (fileName: string) => {
    await window.fumbblApi.deleteOrphanCacheFile(cacheFolder, fileName);
    refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t("orphans.inactiveTitle")}</CardTitle>
        <div className="mb-3 text-sm text-muted">{t("orphans.inactiveHint")}</div>
        {loading ? (
          <div className="text-sm text-muted">{t("roster.loading")}</div>
        ) : inactive.length === 0 ? (
          <div className="text-sm text-muted">{t("orphans.none")}</div>
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
        <div className="mb-3 text-sm text-muted">{t("orphans.filesHint")}</div>
        {loading ? (
          <div className="text-sm text-muted">{t("roster.loading")}</div>
        ) : orphanFiles.length === 0 ? (
          <div className="text-sm text-muted">{t("orphans.none")}</div>
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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Set<string> | undefined>(undefined);

  useEffect(() => {
    window.fumbblApi.readOverrideImage(entry.url).then(setImageSrc);
    const ready = getRosterUsageIndexReady();
    ready?.then(() => setRosters(getRostersUsingAsset(entry.url)));
  }, [entry.url]);

  return (
    <div className="flex w-56 min-w-0 flex-col gap-2 rounded-lg border border-border-strong bg-card-raised p-3">
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
      <div className="truncate text-xs text-muted" title={entry.url}>
        {entry.url}
      </div>
      <div className="truncate text-xs text-faint">
        {rosters && rosters.size > 0
          ? t("orphans.rosterLabel", { rosters: [...rosters].sort().join(", ") })
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
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    window.fumbblApi.readOrphanCacheFile(cacheFolder, file.fileName).then(setImageSrc);
  }, [cacheFolder, file.fileName]);

  return (
    <div className="flex w-56 min-w-0 flex-col gap-2 rounded-lg border border-border-strong bg-card-raised p-3">
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
      <div className="truncate text-xs text-muted" title={file.fileName}>
        {file.fileName}
      </div>
      <div className="text-xs text-faint">{formatSize(file.sizeBytes)}</div>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        {t("orphans.deleteButton")}
      </Button>
    </div>
  );
}
