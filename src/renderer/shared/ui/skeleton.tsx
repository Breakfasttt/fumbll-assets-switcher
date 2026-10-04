import * as React from "react";
import { cn } from "@/shared/lib/utils";

/** Loading placeholder: give it the exact size/ratio of the content it stands for (no layout shift). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-surface-raised", className)} {...props} />;
}

export { Skeleton };
