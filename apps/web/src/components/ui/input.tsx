import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-body text-ink-primary ring-offset-surface-elevated transition-colors file:border-0 file:bg-transparent file:text-body-sm file:font-medium placeholder:text-ink-quaternary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-muted disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
