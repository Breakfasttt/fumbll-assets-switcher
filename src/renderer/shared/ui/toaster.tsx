import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";

// sonner styles its toasts through these CSS variables (its own selectors win
// over utility classes): map them onto the design tokens.
const tokenStyle = {
  "--normal-bg": "var(--surface-raised)",
  "--normal-border": "var(--border-strong)",
  "--normal-text": "var(--foreground)",
  "--border-radius": "var(--radius-lg)",
} as CSSProperties;

/** Mounted once at the app root (app/App.tsx); toasts are raised through shared/lib/notify.ts. */
function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      gap={8}
      visibleToasts={4}
      style={tokenStyle}
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm shadow-overlay",
          description: "text-xs text-muted-foreground! whitespace-pre-line",
          success: "[&_[data-icon]]:text-live",
          error: "border-danger! [&_[data-icon]]:text-danger",
          warning: "[&_[data-icon]]:text-warning",
          actionButton: "bg-primary! text-primary-foreground! font-medium!",
          cancelButton: "bg-surface! text-muted-foreground!",
        },
      }}
    />
  );
}

export { Toaster };
