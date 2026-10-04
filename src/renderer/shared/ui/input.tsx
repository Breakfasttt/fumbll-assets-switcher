import * as React from "react";
import { cn } from "@/shared/lib/utils";

const fieldClasses =
  "w-full rounded border border-border-strong bg-field px-3 text-sm text-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldClasses, "h-9 py-2", className)} {...props} />
  )
);
Input.displayName = "Input";

export { Input, fieldClasses };
