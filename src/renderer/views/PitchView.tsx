import { useState } from "react";
import { WEATHER_CODES, WeatherCode } from "../../shared/types";
import { Card, CardTitle } from "../components/ui/card";
import { cn } from "../lib/utils";
import { useTranslation } from "../i18n/LanguageContext";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function PitchView({ cacheFolder }: { cacheFolder: string }) {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState("");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [dragOverCode, setDragOverCode] = useState<WeatherCode | null>(null);

  const handleDrop = async (code: WeatherCode, file: File) => {
    if (!baseUrl.trim()) {
      alert(t("pitch.alert.missingUrl"));
      return;
    }
    const fullUrl = `${baseUrl.trim()}?pitch=${code}`;
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const format = (file.name.split(".").pop() || "png").toLowerCase();
    await window.fumbblApi.saveOverride(cacheFolder, fullUrl, base64, format);
    setThumbs((prev) => ({ ...prev, [code]: URL.createObjectURL(file) }));
  };

  return (
    <Card>
      <CardTitle>{t("pitch.title")}</CardTitle>
      <input
        type="text"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        placeholder={t("pitch.urlPlaceholder")}
        className="mb-3 w-full max-w-xl rounded border border-border-strong bg-input px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="flex flex-wrap gap-2">
        {WEATHER_CODES.map((code) => (
          <div
            key={code}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCode(code);
            }}
            onDragLeave={() => setDragOverCode(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCode(null);
              const file = e.dataTransfer.files?.[0];
              if (file) handleDrop(code, file);
            }}
            className={cn(
              "flex min-w-[90px] flex-col items-center gap-1 rounded border-2 border-dashed border-border-strong p-2 text-xs text-muted",
              dragOverCode === code && "border-accent text-white"
            )}
          >
            {thumbs[code] ? (
              <img src={thumbs[code]} className="h-14 w-14 object-contain" style={{ imageRendering: "pixelated" }} />
            ) : null}
            {code}
          </div>
        ))}
      </div>
    </Card>
  );
}
