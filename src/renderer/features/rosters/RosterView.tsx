import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { BB2025_ROSTER_IDS } from "@/shared/lib/rosters";
import { useRoster, useRosterList, useRosterUsageIndex } from "@/shared/api/queries";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { PlayerEditor } from "./PlayerEditor";

export function RosterView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const [showSpecial, setShowSpecial] = useState(false);
  const [selectedRosterId, setSelectedRosterId] = useState<string>("");
  const rosterList = useRosterList();
  const rosterQuery = useRoster(Number(selectedRosterId) || null);
  // Starts building the "used by" index in the background.
  useRosterUsageIndex();

  const loadingList = rosterList.isPending;
  const roster = rosterQuery.data ?? null;
  const loadingRoster = rosterQuery.isLoading;
  const error = rosterQuery.error?.message ?? null;

  const visibleRosters = useMemo(() => {
    const allRosters = rosterList.data ?? [];
    const list = showSpecial ? allRosters : allRosters.filter((r) => BB2025_ROSTER_IDS.has(r.id));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [rosterList.data, showSpecial]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t("roster.title")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedRosterId} onValueChange={setSelectedRosterId}>
            <SelectTrigger className="w-56">
              <SelectValue
                placeholder={loadingList ? t("roster.selectPlaceholder.loading") : t("roster.selectPlaceholder.choose")}
              />
            </SelectTrigger>
            <SelectContent>
              {visibleRosters.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={showSpecial} onCheckedChange={(v) => setShowSpecial(v === true)} />
            {t("roster.specialCheckbox")}
          </label>
        </div>
        {loadingRoster && <div className="mt-2 text-sm text-muted-foreground">{t("roster.loading")}</div>}
        {error && <div className="mt-2 text-sm text-danger">{t("roster.errorPrefix", { error })}</div>}
        {roster && (
          <div className="mt-2 text-sm text-muted-foreground">
            {t("roster.summaryLine", {
              name: roster.name,
              baseIconPath: roster.baseIconPath,
              count: roster.positions.length,
            })}
          </div>
        )}
      </Card>

      {roster && <PlayerEditor roster={roster} cacheFolder={cacheFolder} />}
    </div>
  );
}
