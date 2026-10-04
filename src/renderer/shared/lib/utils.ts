import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Color tokens of shared/styles/tokens.css (kept in sync by check-arch, rule twmerge-tokens):
// declared so tailwind-merge resolves conflicts like "text-xs text-muted-foreground" correctly.
export const COLOR_TOKENS = [
  "background",
  "sidebar",
  "surface",
  "surface-raised",
  "field",
  "well",
  "overlay",
  "foreground",
  "muted-foreground",
  "faint-foreground",
  "border",
  "border-strong",
  "ring",
  "primary",
  "primary-hover",
  "primary-foreground",
  "live",
  "live-foreground",
  "warning",
  "danger",
  "danger-hover",
  "danger-foreground",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [...COLOR_TOKENS],
      shadow: ["overlay"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
