import * as React from "react";
import { cn } from "@/shared/lib/utils";

/** Keyboard shortcut hint, e.g. <Kbd>Ctrl+K</Kbd>. */
function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded border border-border-strong bg-field px-1.5 font-mono text-[11px] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
