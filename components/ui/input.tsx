import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={cn(fieldClasses, "resize-y", className)} {...props} />;
});
Textarea.displayName = "Textarea";
