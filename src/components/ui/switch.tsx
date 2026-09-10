import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "defaultChecked"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked = false, onCheckedChange, disabled, onClick, ...props }, ref) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const isChecked = checked ?? uncontrolledChecked;

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          const nextChecked = !isChecked;
          if (checked === undefined) setUncontrolledChecked(nextChecked);
          onCheckedChange?.(nextChecked);
        }}
        ref={ref}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
            isChecked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
