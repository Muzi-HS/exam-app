"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbox } from "@/components/math/lightbox";

export interface ViewerImage {
  id: string;
  url: string;
}

/**
 * 문제/해설 이미지를 보여주는 공용 뷰어.
 * 문제 상세, 연습 진행 화면, 시험 결과 화면에서 재사용합니다.
 * 시험 진행 중에는 allowSolution={false}로 해설 접근 자체를 막습니다.
 */
export function ProblemImageViewer({
  problemImages,
  solutionImages,
  allowSolution = true,
}: {
  problemImages: ViewerImage[];
  solutionImages: ViewerImage[];
  allowSolution?: boolean;
}) {
  const [showSolution, setShowSolution] = useState(false);
  const [lightbox, setLightbox] = useState<{ type: "problem" | "solution"; index: number } | null>(
    null
  );

  return (
    <>
      <Card>
        <p className="mb-2 text-sm font-medium text-text-primary">문제</p>
        <ImageGrid images={problemImages} onOpen={(index) => setLightbox({ type: "problem", index })} />
      </Card>

      {allowSolution && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">해설</p>
            {solutionImages.length > 0 && (
              <Button type="button" variant="secondary" onClick={() => setShowSolution((v) => !v)}>
                {showSolution ? "해설 숨기기" : "해설 보기"}
              </Button>
            )}
          </div>
          {solutionImages.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">등록된 해설 이미지가 없습니다.</p>
          ) : showSolution ? (
            <div className="mt-3">
              <ImageGrid
                images={solutionImages}
                onOpen={(index) => setLightbox({ type: "solution", index })}
              />
            </div>
          ) : null}
        </Card>
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.type === "problem" ? problemImages : solutionImages}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox({ type: lightbox.type, index })}
        />
      )}
    </>
  );
}

function ImageGrid({
  images,
  onOpen,
}: {
  images: ViewerImage[];
  onOpen: (index: number) => void;
}) {
  if (images.length === 0) {
    return <p className="text-sm text-text-secondary">등록된 이미지가 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {images.map((img, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.id}
          src={img.url}
          alt=""
          onClick={() => onOpen(index)}
          className="w-full cursor-zoom-in rounded-sm border border-border object-contain"
        />
      ))}
    </div>
  );
}
