"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

export interface PendingImage {
  clientId: string;
  file: File;
  previewUrl: string;
}

export function ImageDropzone({
  label,
  images,
  onChange,
  className,
}: {
  label: string;
  images: PendingImage[];
  onChange: (images: PendingImage[]) => void;
  className?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      setCompressing(true);
      try {
        const compressed = await Promise.all(
          imageFiles.map(async (file) => {
            const result = await compressImage(file);
            return {
              clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              file: result,
              previewUrl: URL.createObjectURL(result),
            };
          })
        );
        onChange([...images, ...compressed]);
      } finally {
        setCompressing(false);
      }
    },
    [images, onChange]
  );

  function removeImage(clientId: string) {
    const target = images.find((img) => img.clientId === clientId);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.clientId !== clientId));
  }

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm text-text-secondary">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.items)
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((f): f is File => f !== null);
          if (files.length > 0) addFiles(files);
        }}
        tabIndex={0}
        role="button"
        aria-label={`${label} 업로드 영역`}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border p-4 text-center transition-colors",
          dragOver ? "border-accent bg-accent-soft" : "hover:border-accent"
        )}
      >
        {compressing ? (
          <Loader2 size={20} strokeWidth={1.75} className="animate-spin text-text-secondary" />
        ) : (
          <ImagePlus size={20} strokeWidth={1.5} className="text-text-secondary" />
        )}
        <p className="text-xs text-text-secondary">
          클릭 또는 드래그로 업로드 · 붙여넣기(Ctrl+V) 지원
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.clientId}
              className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.clientId);
                }}
                aria-label="이미지 삭제"
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-opacity"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
