import { Card, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { LANGUAGES } from "@common/types";
import { LANGUAGE_NAMES } from "@/shared/i18n/translations";

export function ConfigView({
  cacheFolder,
  onConfigured,
}: {
  cacheFolder: string | null;
  onConfigured: (folder: string) => void;
}) {
  const { t, language, setLanguage } = useTranslation();

  const detect = async () => {
    const coaches = await window.fumbblApi.detectCoaches();
    const valid = coaches.filter((c) => c.cachePath);
    if (valid.length === 0) {
      alert(t("config.alert.noCoachDetected"));
      return;
    }
    const chosen = valid[0];
    if (valid.length > 1) {
      alert(
        t("config.alert.multipleCoaches", {
          list: valid.map((c) => `${c.coachName} -> ${c.cachePath}`).join("\n"),
        })
      );
    }
    if (!chosen?.cachePath) return;
    const current = await window.fumbblApi.loadConfig();
    await window.fumbblApi.saveConfig({ ...current, cacheFolder: chosen.cachePath, coachName: chosen.coachName });
    onConfigured(chosen.cachePath);
  };

  const selectManually = async () => {
    const folder = await window.fumbblApi.selectFolder();
    if (!folder) return;
    const ok = await window.fumbblApi.validateCacheFolder(folder);
    if (!ok) {
      alert(t("config.alert.invalidFolder"));
      return;
    }
    const current = await window.fumbblApi.loadConfig();
    await window.fumbblApi.saveConfig({ ...current, cacheFolder: folder, coachName: null });
    onConfigured(folder);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t("config.languageLabel")}</CardTitle>
        <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_NAMES[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <CardTitle>{t("config.title")}</CardTitle>
        <div className={cacheFolder ? "text-success" : "text-danger"}>
          {cacheFolder ? t("config.currentFolder", { folder: cacheFolder }) : t("config.noFolder")}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={detect}>{t("config.detectButton")}</Button>
          <Button variant="outline" onClick={selectManually}>
            {t("config.selectManualButton")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("config.setupTitle")}</CardTitle>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>{t("config.setupStep1")}</li>
          <li>{t("config.setupStep2")}</li>
          <li>{t("config.setupStep3")}</li>
          <li>{t("config.setupStep4")}</li>
        </ol>
      </Card>
    </div>
  );
}
