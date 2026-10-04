import { useEffect, useMemo, useState } from "react";
import { RosterInfo } from "@common/types";
import { Card, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { BB2025_ROSTER_IDS, fetchAllRosters, indexRosterUsage } from "@/shared/lib/rosters";
import { useTranslation } from "@/shared/i18n/LanguageContext";
import { PlayerEditor } from "./PlayerEditor";

interface RosterSummary {
  id: number;
  name: string;
}

export function RosterView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const [allRosters, setAllRosters] = useState<RosterSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showSpecial, setShowSpecial] = useState(false);
  const [selectedRosterId, setSelectedRosterId] = useState<string>("");
  const [roster, setRoster] = useState<RosterInfo | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllRosters()
      .then((rosters) => {
        setAllRosters(rosters);
        indexRosterUsage(rosters.map((r) => r.id));
      })
      .finally(() => setLoadingList(false));
  }, []);

  const visibleRosters = useMemo(() => {
    const list = showSpecial ? allRosters : allRosters.filter((r) => BB2025_ROSTER_IDS.has(r.id));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [allRosters, showSpecial]);

  useEffect(() => {
    const id = Number(selectedRosterId);
    if (!id) {
      setRoster(null);
      return;
    }
    let cancelled = false;
    setLoadingRoster(true);
    setError(null);
    setRoster(null);
    window.fumbblApi
      .fetchRoster(id)
      .then((data) => {
        if (!cancelled) setRoster(data);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRosterId]);

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
          <label className="flex items-center gap-2 text-sm text-muted">
            <Checkbox checked={showSpecial} onCheckedChange={(v) => setShowSpecial(v === true)} />
            {t("roster.specialCheckbox")}
          </label>
        </div>
        {loadingRoster && <div className="mt-2 text-sm text-muted">{t("roster.loading")}</div>}
        {error && <div className="mt-2 text-sm text-danger">{t("roster.errorPrefix", { error })}</div>}
        {roster && (
          <div className="mt-2 text-sm text-muted">
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
