import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { fieldClasses } from "./input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClasses, "min-h-16 resize-none py-2", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
