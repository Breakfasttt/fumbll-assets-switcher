import { useState } from "react";
import { Check, FolderOpen, Loader2, Radar } from "lucide-react";
import type { DetectedCoach } from "@common/types";
import { LANGUAGES } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { LANGUAGE_NAMES } from "@/shared/i18n/translations";
import { notify } from "@/shared/lib/notify";
import { cn } from "@/shared/lib/utils";
import { useSaveConfig } from "@/shared/api/mutations";
import { useConfig } from "@/shared/api/queries";
import { useConfirm } from "@/shared/components/ConfirmDialogProvider";

type StepState = "done" | "current" | "todo";

function Step({ index, state, title, children }: { index: number; state: StepState; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          state === "done" && "border-live bg-live text-live-foreground",
          state === "current" && "border-primary text-primary",
          state === "todo" && "border-border-strong text-faint-foreground"
        )}
      >
        {state === "done" ? <Check className="size-3.5" strokeWidth={2.5} /> : index}
      </span>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2 pb-4", state === "todo" && "opacity-60")}>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {children}
      </div>
    </li>
  );
}

export function ConfigView({
  cacheFolder,
  cacheValid,
  onConfigured,
}: {
  cacheFolder: string | null;
  /** null while unknown (no folder or check pending). */
  cacheValid: boolean | null;
  onConfigured: () => void;
}) {
  const { t, language, setLanguage } = useTranslation();
  const confirm = useConfirm();
  const saveConfig = useSaveConfig();
  const coachName = useConfig().data?.coachName ?? null;
  const configured = !!cacheFolder && cacheValid === true;

  // null = detection not run yet; [] = run, nothing found.
  const [coaches, setCoaches] = useState<DetectedCoach[] | null>(null);
  const [choice, setChoice] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const detect = async () => {
    setDetecting(true);
    setManualError(null);
    try {
      const valid = (await window.fumbblApi.detectCoaches()).filter((c) => c.cachePath);
      setCoaches(valid);
      setChoice(valid.find((c) => c.cachePath === cacheFolder)?.cachePath ?? valid[0]?.cachePath ?? "");
    } finally {
      setDetecting(false);
    }
  };

  // Nothing is saved before an explicit choice; replacing a working folder is confirmed.
  const applyFolder = async (folder: string, coach: string | null) => {
    if (configured && folder !== cacheFolder) {
      const ok = await confirm({
        title: t("config.changeConfirmTitle"),
        description: t("config.changeConfirmBody", { folder }),
        confirmLabel: t("config.changeConfirmButton"),
      });
      if (!ok) return;
    }
    await saveConfig.mutateAsync({ cacheFolder: folder, coachName: coach });
    notify.success(t("config.notify.cacheConfigured", { folder }));
    setCoaches(null);
    onConfigured();
  };

  const selectManually = async () => {
    const folder = await window.fumbblApi.selectFolder();
    if (!folder) return;
    if (!(await window.fumbblApi.validateCacheFolder(folder))) {
      setManualError(t("config.invalidFolderInline", { folder }));
      return;
    }
    setManualError(null);
    await applyFolder(folder, null);
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button onClick={detect} disabled={detecting}>
        {detecting ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" strokeWidth={1.75} />}
        {configured ? t("config.redetectButton") : t("config.detectButton")}
      </Button>
      <Button variant="outline" onClick={selectManually}>
        <FolderOpen className="size-4" strokeWidth={1.75} />
        {configured ? t("config.changeFolderButton") : t("config.selectManualButton")}
      </Button>
    </div>
  );

  const detection =
    coaches === null ? null : coaches.length === 0 ? (
      <EmptyState className="items-start px-0 py-2 text-left" title={t("config.notify.noCoachDetected")} description={t("config.noCoachHint")} />
    ) : (
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">{t("config.detectedTitle")}</div>
        <div role="radiogroup" aria-label={t("config.detectedTitle")} className="flex flex-col gap-1.5">
          {coaches.map((coach) => (
            <button
              key={coach.cachePath}
              type="button"
              role="radio"
              aria-checked={choice === coach.cachePath}
              onClick={() => setChoice(coach.cachePath!)}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border-strong bg-field px-3 py-2 text-left transition-colors hover:bg-surface-raised",
                choice === coach.cachePath && "border-primary bg-surface-raised"
              )}
            >
              <span
                aria-hidden
                className={cn("size-3.5 shrink-0 rounded-full border-2 border-border-strong", choice === coach.cachePath && "border-primary bg-primary")}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{coach.coachName}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground" title={coach.cachePath!}>
                  {coach.cachePath}
                </span>
              </span>
              {coach.cachePath === cacheFolder && <span className="text-xs text-live">{t("config.currentBadge")}</span>}
            </button>
          ))}
        </div>
        <div>
          <Button
            size="sm"
            disabled={!choice || choice === cacheFolder}
            onClick={() => applyFolder(choice, coaches.find((c) => c.cachePath === choice)?.coachName ?? null)}
          >
            {t("config.useFolderButton")}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {configured ? (
        <Card>
          <CardTitle>{t("config.title")}</CardTitle>
          <div className="mb-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-live">
              <span aria-hidden className="size-2 rounded-full bg-live" />
              {t("config.statusOk")}
            </div>
            <div className="break-all font-mono text-xs text-muted-foreground">{cacheFolder}</div>
            <div className="text-xs text-muted-foreground">
              {coachName ? t("config.coachLabel", { coach: coachName }) : t("config.manualCoach")}
            </div>
          </div>
          {actions}
          {manualError && <div className="mt-2 text-sm text-danger">{manualError}</div>}
          {detection && <div className="mt-3">{detection}</div>}
        </Card>
      ) : (
        <Card>
          <CardTitle>{t("config.welcomeTitle")}</CardTitle>
          {cacheFolder && cacheValid === false && (
            <div className="mb-3 rounded border border-danger px-3 py-2 text-sm text-danger">{t("config.folderMissing", { folder: cacheFolder })}</div>
          )}
          <ol className="flex flex-col">
            <Step index={1} state={coaches !== null ? "done" : "current"} title={t("config.step1Title")}>
              <p className="text-sm text-muted-foreground">
                {t("config.setupStep1")} {t("config.setupStep2")}
              </p>
            </Step>
            <Step index={2} state={coaches !== null ? "current" : "todo"} title={t("config.step2Title")}>
              {actions}
              {manualError && <div className="text-sm text-danger">{manualError}</div>}
              {detection}
            </Step>
            <Step index={3} state="todo" title={t("config.step3Title")}>
              <p className="text-sm text-muted-foreground">{t("config.setupStep4")}</p>
            </Step>
          </ol>
        </Card>
      )}

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
    </div>
  );
}
