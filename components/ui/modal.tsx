"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface p-5 shadow-subtle",
          className
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-sm p-1 text-text-secondary hover:bg-accent-soft hover:text-text-primary"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
