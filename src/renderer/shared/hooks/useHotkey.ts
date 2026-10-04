import { useEffect, useRef } from "react";

interface HotkeyOptions {
  /** Listen only while true (e.g. while an editor is open). Default true. */
  enabled?: boolean;
  /** Also fire while typing in an input/textarea/select/contenteditable. Default false. */
  allowInInput?: boolean;
  /** Default true. */
  preventDefault?: boolean;
}

const MODIFIERS = ["ctrl", "alt", "shift", "meta"] as const;

interface ParsedCombo {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

// "ctrl+k", "ctrl+1", "escape", "?" — lower-case, "+"-separated, key last.
function parse(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split("+");
  const key = parts.pop() ?? "";
  const has = (m: (typeof MODIFIERS)[number]) => parts.includes(m);
  return { key, ctrl: has("ctrl"), alt: has("alt"), shift: has("shift"), meta: has("meta") };
}

function matches(event: KeyboardEvent, combo: ParsedCombo): boolean {
  if (event.key.toLowerCase() !== combo.key) return false;
  if (event.ctrlKey !== combo.ctrl || event.altKey !== combo.alt || event.metaKey !== combo.meta) return false;
  // Symbols like "?" already imply Shift on most layouts: only enforce Shift for letters, digits and named keys.
  const isSymbol = combo.key.length === 1 && !/[a-z0-9]/.test(combo.key);
  return isSymbol || event.shiftKey === combo.shift;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Global keyboard shortcut (window keydown). Kept in-house on purpose
 * (docs/ux-research.md §5.4): ~a dozen flat shortcuts, no nested scopes.
 * The full list shown to the user lives in shared/components/ShortcutsDialog.tsx.
 */
export function useHotkey(combo: string | string[], handler: (event: KeyboardEvent) => void, options: HotkeyOptions = {}) {
  const { enabled = true, allowInInput = false, preventDefault = true } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const combos = (Array.isArray(combo) ? combo : [combo]).join("|");

  useEffect(() => {
    if (!enabled) return;
    const parsed = combos.split("|").map(parse);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (!allowInInput && isTypingTarget(event.target))) return;
      if (!parsed.some((c) => matches(event, c))) return;
      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combos, enabled, allowInInput, preventDefault]);
}
