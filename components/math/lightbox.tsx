"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function distance(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

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
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const gesturingRef = useRef(false);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  // 이미지가 바뀌면 확대/이동 상태를 초기화합니다.
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (scale === 1) {
        if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
        if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [index, images.length, onClose, onIndexChange, scale]);

  if (typeof document === "undefined") return null;

  const current = images[index];
  if (!current) return null;

  function resetZoom() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function toggleZoom() {
    if (scale > 1) resetZoom();
    else setScale(2);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      gesturingRef.current = true;
      pinchRef.current = { startDist: distance(e.touches[0], e.touches[1]), startScale: scale };
    } else if (e.touches.length === 1 && scale > 1) {
      gesturingRef.current = true;
      panRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        originX: translate.x,
        originY: translate.y,
      };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = distance(e.touches[0], e.touches[1]);
      const next = (pinchRef.current.startScale * dist) / pinchRef.current.startDist;
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
    } else if (e.touches.length === 1 && panRef.current) {
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setTranslate({ x: panRef.current.originX + dx, y: panRef.current.originY + dy });
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length < 1) {
      panRef.current = null;
      gesturingRef.current = false;
    }
    setScale((s) => {
      if (s <= 1) {
        setTranslate({ x: 0, y: 0 });
        return 1;
      }
      return s;
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={scale === 1 ? onClose : undefined}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-sm text-white/80 hover:text-white"
      >
        <X size={22} strokeWidth={1.75} />
      </button>

      {images.length > 1 && scale === 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
          aria-label="이전 이미지"
          className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/80 hover:text-white sm:left-3"
        >
          <ChevronLeft size={28} strokeWidth={1.75} />
        </button>
      )}

      <div
        className="flex h-full w-full touch-none items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
          className="max-h-full max-w-full cursor-default select-none object-contain"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: gesturingRef.current ? "none" : "transform 0.15s ease-out",
          }}
          draggable={false}
        />
      </div>

      {images.length > 1 && scale === 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % images.length);
          }}
          aria-label="다음 이미지"
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/80 hover:text-white sm:right-3"
        >
          <ChevronRight size={28} strokeWidth={1.75} />
        </button>
      )}

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-white/70">
        {images.length > 1 && `${index + 1} / ${images.length} · `}
        {scale > 1 ? "두 손가락으로 축소하거나 더블 탭하세요" : "핀치 또는 더블 탭으로 확대"}
      </p>
    </div>,
    document.body
  );
}
