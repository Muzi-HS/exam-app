"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: { id: string; url: string }[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [index, images.length, onClose, onIndexChange]);

  if (typeof document === "undefined") return null;

  const current = images[index];
  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 rounded-sm p-2 text-white/80 hover:text-white"
      >
        <X size={22} strokeWidth={1.75} />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
          aria-label="이전 이미지"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:text-white sm:left-4"
        >
          <ChevronLeft size={28} strokeWidth={1.75} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full cursor-default object-contain"
      />

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % images.length);
          }}
          aria-label="다음 이미지"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:text-white sm:right-4"
        >
          <ChevronRight size={28} strokeWidth={1.75} />
        </button>
      )}

      {images.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-white/70">
          {index + 1} / {images.length}
        </p>
      )}
    </div>,
    document.body
  );
}
