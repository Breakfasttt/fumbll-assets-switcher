import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { useTranslation } from "@/shared/i18n/LanguageContext";

export function PromptPopover({ buildPrompt }: { buildPrompt: () => string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setPrompt(buildPrompt());
      setCopied(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          {t("assetPanel.generatePromptButton")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="mb-2 text-xs text-muted-foreground">{t("assetPanel.promptHint")}</div>
        <textarea
          readOnly
          value={prompt}
          rows={8}
          className="w-full resize-none rounded border border-border-strong bg-field p-2 text-xs text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={copy}>
            {copied ? t("assetPanel.promptCopied") : t("assetPanel.promptCopyButton")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
