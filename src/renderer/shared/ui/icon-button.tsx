import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface IconButtonProps extends Omit<ButtonProps, "size" | "children"> {
  /** Required: becomes the aria-label AND the tooltip (an icon alone is never self-explanatory). */
  label: string;
  icon: React.ReactNode;
  /** Extra tooltip text, e.g. a keyboard shortcut. */
  hint?: React.ReactNode;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, hint, variant = "ghost", ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button ref={ref} variant={variant} size="icon" aria-label={label} {...props}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {hint && <span className="ml-2 text-faint-foreground">{hint}</span>}
      </TooltipContent>
    </Tooltip>
  )
);
IconButton.displayName = "IconButton";

export { IconButton };
