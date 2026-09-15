"use client";

import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full min-h-10 rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
  }
);
Input.displayName = "Input";

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// 스크롤바 대신 입력한 내용에 맞춰 글상자 높이가 자동으로 늘어나는 textarea입니다.
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onInput, ...props }, forwardedRef) => {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  // deps 없이 매 렌더링 후 실행: 타이핑뿐 아니라 값이 외부에서(예: react-hook-form의
  // reset()) DOM에 직접 반영되는 경우에도 높이가 맞춰집니다.
  useLayoutEffect(() => {
    resizeTextarea(innerRef.current);
  });

  return (
    <textarea
      ref={(el) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      className={cn(fieldClasses, "resize-none overflow-hidden", className)}
      onInput={(e) => {
        resizeTextarea(e.currentTarget);
        onInput?.(e);
      }}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
