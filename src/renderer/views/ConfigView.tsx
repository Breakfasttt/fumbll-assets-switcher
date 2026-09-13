import { Card, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export function ConfigView({
  cacheFolder,
  onConfigured,
}: {
  cacheFolder: string | null;
  onConfigured: (folder: string) => void;
}) {
  const detect = async () => {
    const coaches = await window.fumbblApi.detectCoaches();
    const valid = coaches.filter((c) => c.cachePath);
    if (valid.length === 0) {
      alert("Aucun coach FUMBBL avec cache local détecté dans le registre.");
      return;
    }
    const chosen = valid[0];
    if (valid.length > 1) {
      alert(
        "Plusieurs coachs détectés, utilisation du premier :\n" +
          valid.map((c) => `${c.coachName} -> ${c.cachePath}`).join("\n")
      );
    }
    if (!chosen?.cachePath) return;
    await window.fumbblApi.saveConfig({ cacheFolder: chosen.cachePath, coachName: chosen.coachName });
    onConfigured(chosen.cachePath);
  };

  const selectManually = async () => {
    const folder = await window.fumbblApi.selectFolder();
    if (!folder) return;
    const ok = await window.fumbblApi.validateCacheFolder(folder);
    if (!ok) {
      alert("Dossier invalide ou non inscriptible.");
      return;
    }
    await window.fumbblApi.saveConfig({ cacheFolder: folder, coachName: null });
    onConfigured(folder);
  };

  return (
    <Card>
      <CardTitle>Dossier Local Icon Cache</CardTitle>
      <div className={cacheFolder ? "text-[#4ade80]" : "text-[#f43f5e]"}>
        {cacheFolder ? `Dossier actuel : ${cacheFolder}` : "Aucun dossier configuré"}
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={detect}>Auto-détecter (registre Windows)</Button>
        <Button variant="outline" onClick={selectManually}>
          Choisir un dossier manuellement
        </Button>
      </div>
    </Card>
  );
}
