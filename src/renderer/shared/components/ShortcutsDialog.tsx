import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Kbd } from "@/shared/ui/kbd";
import { useTranslation } from "@/shared/i18n/LanguageContext";

/**
 * Help listing every global shortcut (opened with "?" or from the status bar).
 * Keep in sync with the useHotkey calls of app/App.tsx (and feature editors).
 */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    ["Ctrl+1 … Ctrl+5", t("shortcuts.tabs")],
    ["Ctrl+Z", t("shortcuts.undo")],
    ["?", t("shortcuts.help")],
    [t("shortcuts.escapeKey"), t("shortcuts.escape")],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="mb-3 text-[15px] font-semibold">{t("shortcuts.title")}</div>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
          {rows.map(([keys, label]) => (
            <div key={keys} className="contents">
              <dt>
                <Kbd>{keys}</Kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
