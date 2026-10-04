import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useTranslation } from "@/shared/i18n/LanguageContext";

export interface ConfirmOptions {
  /** Specific question, e.g. "Delete the pack « Retro dwarves » (42 images)?". */
  title: string;
  description?: string;
  /** Names the action ("Delete the pack"), defaults to a generic OK. */
  confirmLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Renderer-native `window.confirm()` is a blocking, OS-level modal. In some
 * Electron builds it can wedge the renderer's event loop badly enough that
 * an in-flight IPC promise awaited right after it never resolves in the UI
 * (this is what caused the "activate custom slot" toggle to silently no-op
 * after confirming). This provider replaces it with a Radix AlertDialog that
 * resolves a Promise like `confirm()` would, but never blocks the event loop.
 * Reserved for irreversible actions: reversible ones use notify.undoable.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(typeof opts === "string" ? { title: opts } : opts);
    });
  }, []);

  const settle = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>{t("confirm.cancelButton")}</AlertDialogCancel>
            <AlertDialogAction destructive={options?.destructive} onClick={() => settle(true)}>
              {options?.confirmLabel ?? t("confirm.okButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return ctx;
}
