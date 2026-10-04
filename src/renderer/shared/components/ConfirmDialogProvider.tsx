import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n/LanguageContext";

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Renderer-native `window.confirm()` is a blocking, OS-level modal. In some
 * Electron builds it can wedge the renderer's event loop badly enough that
 * an in-flight IPC promise awaited right after it never resolves in the UI
 * (this is what caused the "activate custom slot" toggle to silently no-op
 * after confirming). This provider replaces it with an ordinary React/Radix
 * dialog that resolves a Promise like `confirm()` would, but never blocks
 * the event loop.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((msg) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setMessage(msg);
    });
  }, []);

  const settle = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setMessage(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={message !== null} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent className="max-w-md">
          <div className="mb-4 text-sm text-white">{message}</div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => settle(false)}>
              {t("confirm.cancelButton")}
            </Button>
            <Button size="sm" onClick={() => settle(true)}>
              {t("confirm.okButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return ctx;
}
