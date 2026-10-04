import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

/** Compact status/counter label. `live` = used in game, `warning` = needs attention (e.g. active pack). */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-surface-raised text-muted-foreground",
        primary: "bg-primary text-primary-foreground",
        live: "bg-live text-live-foreground",
        warning: "bg-warning text-background",
        danger: "bg-danger text-danger-foreground",
        outline: "border border-border-strong text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
