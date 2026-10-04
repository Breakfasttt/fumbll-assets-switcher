import { toast } from "sonner";

/**
 * Single feedback channel of the app (docs/ux-research.md §2.9): never alert().
 * Messages and labels are passed in already translated (no i18n here).
 * - success / error / warning: outcome of an action.
 * - promise: long operation (import/export/activation), loading -> result.
 * - undoable: reversible mutation, with an "Undo" action instead of a confirmation.
 */
type Message = string;

const UNDOABLE_DURATION_MS = 6000;

// Last undoable toast still on screen: Ctrl+Z (app/App.tsx) runs it like its "Undo" button.
let lastUndo: { run: () => unknown; toastId: string | number; expiresAt: number } | null = null;

/** Runs the undo of the most recent undoable toast if it is still displayed; returns whether one ran. */
export function runLastUndo(): boolean {
  if (!lastUndo || Date.now() > lastUndo.expiresAt) return false;
  const { run, toastId } = lastUndo;
  lastUndo = null;
  toast.dismiss(toastId);
  void run();
  return true;
}

export const notify = {
  success(message: Message, description?: Message) {
    return toast.success(message, { description });
  },

  error(message: Message, description?: Message) {
    return toast.error(message, { description, duration: 8000 });
  },

  warning(message: Message, description?: Message) {
    return toast.warning(message, { description });
  },

  promise<T>(promise: Promise<T>, messages: { loading: Message; success: Message | ((value: T) => Message); error: Message | ((error: unknown) => Message) }) {
    toast.promise(promise, messages);
    return promise;
  },

  undoable(message: Message, undo: { label: Message; run: () => unknown }, description?: Message) {
    const run = () => {
      lastUndo = null;
      return undo.run();
    };
    const toastId = toast.success(message, {
      description,
      duration: UNDOABLE_DURATION_MS,
      action: { label: undo.label, onClick: () => void run() },
    });
    lastUndo = { run, toastId, expiresAt: Date.now() + UNDOABLE_DURATION_MS };
    return toastId;
  },
};
