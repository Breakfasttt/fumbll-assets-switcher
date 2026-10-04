import * as React from "react";
import { cn } from "@/shared/lib/utils";

/** Empty / "nothing to do" state of a list or panel. Texts are passed in already translated. */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      {icon && <div className="text-faint-foreground [&_svg]:size-8">{icon}</div>}
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description && <div className="max-w-sm text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
