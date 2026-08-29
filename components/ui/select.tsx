import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "min-h-10 rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";
