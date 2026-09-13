import { useEffect, useMemo, useState } from "react";
import { RosterInfo } from "../../shared/types";
import { Card, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { BB2025_ROSTER_IDS, fetchAllRosters, indexRosterUsage } from "../lib/rosters";
import { PlayerEditor } from "./PlayerEditor";

interface RosterSummary {
  id: number;
  name: string;
}

export function RosterView({ cacheFolder }: { cacheFolder: string }) {
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

  const loadRoster = async () => {
    const id = Number(selectedRosterId);
    if (!id) return;
    setLoadingRoster(true);
    setError(null);
    setRoster(null);
    try {
      const data = await window.fumbblApi.fetchRoster(id);
      setRoster(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingRoster(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Rosters</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedRosterId} onValueChange={setSelectedRosterId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={loadingList ? "Chargement..." : "Choisir un roster"} />
            </SelectTrigger>
            <SelectContent>
              {visibleRosters.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadRoster} disabled={!selectedRosterId}>
            Charger le roster
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted">
            <Checkbox checked={showSpecial} onCheckedChange={(v) => setShowSpecial(v === true)} />
            Rosters spéciaux (hors BB2025)
          </label>
        </div>
        {loadingRoster && <div className="mt-2 text-sm text-muted">Chargement...</div>}
        {error && <div className="mt-2 text-sm text-[#f43f5e]">Erreur : {error}</div>}
        {roster && (
          <div className="mt-2 text-sm text-muted">
            {roster.name} (base: {roster.baseIconPath}) — {roster.positions.length} positions
          </div>
        )}
      </Card>

      {roster && <PlayerEditor roster={roster} cacheFolder={cacheFolder} />}
    </div>
  );
}
