import { useEffect, useState } from "react";
import { PackSummary } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { useConfirm } from "@/shared/components/ConfirmDialogProvider";

export function PacksView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportName, setExportName] = useState("");

  const refresh = async () => {
    setLoading(true);
    setPacks(await window.fumbblApi.listPacks());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheFolder]);

  const handleExport = async () => {
    const name = exportName.trim();
    if (!name) return;
    const destPath = await window.fumbblApi.selectSaveFile(`${name}.zip`);
    if (!destPath) return;
    try {
      await window.fumbblApi.exportPack(name, undefined, destPath);
      setExportName("");
    } catch (e: any) {
      alert(e?.message?.includes("No active") ? t("packs.exportEmpty") : t("packs.exportError"));
    }
  };

  const handleImport = async () => {
    const zipPath = await window.fumbblApi.selectZipFile();
    if (!zipPath) return;
    try {
      await window.fumbblApi.importPack(zipPath);
      await refresh();
    } catch {
      alert(t("packs.importError"));
    }
  };

  const handleActivate = async (pack: PackSummary) => {
    if (!(await confirm(t("packs.activateConfirm")))) return;
    await window.fumbblApi.activatePack(cacheFolder, pack.id);
    await refresh();
  };

  const handleDelete = async (pack: PackSummary) => {
    if (!(await confirm(t("packs.deleteConfirm")))) return;
    await window.fumbblApi.deletePack(cacheFolder, pack.id);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t("packs.title")}</CardTitle>
        <div className="mb-3 text-sm text-muted">{t("packs.hint")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder={t("packs.nameInputPlaceholder")}
            className="w-56 rounded border border-border-strong bg-input px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <Button size="sm" onClick={handleExport} disabled={!exportName.trim()}>
            {t("packs.exportButton")}
          </Button>
          <Button size="sm" variant="outline" onClick={handleImport}>
            {t("packs.importButton")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("packs.listTitle")}</CardTitle>
        {loading ? (
          <div className="text-sm text-muted">{t("roster.loading")}</div>
        ) : packs.length === 0 ? (
          <div className="text-sm text-muted">{t("packs.none")}</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onActivate={() => handleActivate(pack)}
                onDelete={() => handleDelete(pack)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PackCard({
  pack,
  onActivate,
  onDelete,
}: {
  pack: PackSummary;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex w-56 min-w-0 flex-col gap-2 rounded-lg border border-border-strong bg-card-raised p-3">
      <div className="truncate text-sm font-medium text-white" title={pack.name}>
        {pack.name}
      </div>
      <div className="text-xs text-faint">{t("packs.entryCount", { count: pack.entryCount })}</div>
      <div className="text-xs text-faint">
        {t("packs.importedAt", { date: new Date(pack.importedAt).toLocaleDateString() })}
      </div>
      {pack.active && <div className="text-xs font-medium text-accent">{t("packs.activeLabel")}</div>}
      <div className="mt-1 flex gap-2">
        {!pack.active && (
          <Button size="sm" onClick={onActivate}>
            {t("packs.activateButton")}
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={onDelete}>
          {t("packs.deleteButton")}
        </Button>
      </div>
    </div>
  );
}
