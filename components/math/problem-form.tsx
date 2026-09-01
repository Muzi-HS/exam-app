"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getPublicImageUrl,
  problemImagePath,
  removeProblemImages,
  uploadProblemImage,
} from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/math/tag-input";
import { ImageDropzone, type PendingImage } from "@/components/math/image-dropzone";

const PROBLEM_NUMBER_PATTERN = /^\d+(-\d+)?$/;

// 숫자만, 또는 "1-1"처럼 숫자-숫자 형식만 입력되도록 타이핑 중에 걸러냅니다.
function sanitizeProblemNumber(raw: string): string {
  let v = raw.replace(/[^0-9-]/g, "");
  v = v.replace(/-{2,}/g, "-");
  if (v.startsWith("-")) v = v.slice(1);
  const firstHyphen = v.indexOf("-");
  if (firstHyphen !== -1) {
    v = v.slice(0, firstHyphen + 1) + v.slice(firstHyphen + 1).replace(/-/g, "");
  }
  return v;
}

const schema = z.object({
  subject_id: z.string().min(1, "과목을 선택하세요"),
  topic_id: z.string().min(1, "단원을 선택하세요"),
  title: z.string().min(1, "제목을 입력하세요"),
  problem_number: z
    .string()
    .optional()
    .refine((v) => !v || PROBLEM_NUMBER_PATTERN.test(v), "숫자만, 또는 1-1 형식으로 입력하세요"),
  memo: z.string().optional(),
  youtube_url: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(v),
      "유효한 유튜브 URL이 아닙니다"
    ),
});

type FormValues = z.infer<typeof schema>;

interface SubjectWithTopics {
  id: string;
  name: string;
  math_topics: { id: string; name: string; order_index: number }[];
}

interface ExistingImage {
  id: string;
  storage_path: string;
  order_index: number;
  url: string;
}

interface EditFetchRow {
  id: string;
  topic_id: string;
  title: string;
  problem_number: string | null;
  memo: string | null;
  youtube_url: string | null;
  math_topics: { subject_id: string };
  problem_images: { id: string; storage_path: string; image_type: "problem" | "solution"; order_index: number }[];
  problem_tags: { tags: { id: string; name: string } }[];
}

export function ProblemForm({
  mode = "create",
  problemId,
}: {
  mode?: "create" | "edit";
  problemId?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit" && !!problemId;

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["math-subjects-with-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_subjects")
        .select("id, name, order_index, math_topics(id, name, order_index)")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as SubjectWithTopics[]).map((s) => ({
        ...s,
        math_topics: [...s.math_topics].sort((a, b) => a.order_index - b.order_index),
      }));
    },
  });

  const { data: editData, isLoading: editLoading } = useQuery({
    queryKey: ["math-problem-edit", problemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_problems")
        .select(
          "id, topic_id, title, problem_number, memo, youtube_url," +
            " math_topics!inner(subject_id)," +
            " problem_images(id, storage_path, image_type, order_index)," +
            " problem_tags(tags(id, name))"
        )
        .eq("id", problemId as string)
        .single()
        .returns<EditFetchRow>();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_id: "",
      topic_id: "",
      title: "",
      problem_number: "",
      memo: "",
      youtube_url: "",
    },
  });

  const [tags, setTags] = useState<string[]>([]);
  const [originalTags, setOriginalTags] = useState<{ id: string; name: string }[]>([]);
  const [existingProblemImages, setExistingProblemImages] = useState<ExistingImage[]>([]);
  const [existingSolutionImages, setExistingSolutionImages] = useState<ExistingImage[]>([]);
  const [removedExisting, setRemovedExisting] = useState<ExistingImage[]>([]);
  const [problemImages, setProblemImages] = useState<PendingImage[]>([]);
  const [solutionImages, setSolutionImages] = useState<PendingImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!editData) return;
    reset({
      subject_id: editData.math_topics.subject_id,
      topic_id: editData.topic_id,
      title: editData.title,
      problem_number: editData.problem_number ?? "",
      memo: editData.memo ?? "",
      youtube_url: editData.youtube_url ?? "",
    });
    setTags(editData.problem_tags.map((pt) => pt.tags.name));
    setOriginalTags(editData.problem_tags.map((pt) => pt.tags));
    const toExisting = (type: "problem" | "solution") =>
      editData.problem_images
        .filter((img) => img.image_type === type)
        .sort((a, b) => a.order_index - b.order_index)
        .map((img) => ({ ...img, url: getPublicImageUrl(supabase, img.storage_path) }));
    setExistingProblemImages(toExisting("problem"));
    setExistingSolutionImages(toExisting("solution"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData]);

  const subjectField = register("subject_id");
  const problemNumberField = register("problem_number");
  const selectedSubjectId = watch("subject_id");
  const topics = useMemo(
    () => subjects?.find((s) => s.id === selectedSubjectId)?.math_topics ?? [],
    [subjects, selectedSubjectId]
  );

  function removeExistingImage(type: "problem" | "solution", image: ExistingImage) {
    setRemovedExisting((prev) => [...prev, image]);
    if (type === "problem") {
      setExistingProblemImages((prev) => prev.filter((i) => i.id !== image.id));
    } else {
      setExistingSolutionImages((prev) => prev.filter((i) => i.id !== image.id));
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const totalProblemImages = existingProblemImages.length + problemImages.length;
    if (totalProblemImages === 0) {
      setImageError("문제 이미지를 최소 1장 등록하세요");
      return;
    }
    setImageError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError("로그인이 필요합니다.");
      return;
    }

    if (isEdit) {
      await handleEditSubmit(values, user.id, problemId as string);
    } else {
      await handleCreateSubmit(values, user.id);
    }
  }

  async function handleCreateSubmit(values: FormValues, userId: string) {
    const { data: problem, error: insertError } = await supabase
      .from("math_problems")
      .insert({
        topic_id: values.topic_id,
        user_id: userId,
        title: values.title,
        problem_number: values.problem_number || null,
        memo: values.memo || null,
        youtube_url: values.youtube_url || null,
      })
      .select("id")
      .single();

    if (insertError || !problem) {
      setSubmitError("문제를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    const newProblemId = problem.id;
    const uploadedPaths: string[] = [];
    const allImages = [
      ...problemImages.map((img) => ({ img, type: "problem" as const })),
      ...solutionImages.map((img) => ({ img, type: "solution" as const })),
    ];
    setProgress({ done: 0, total: allImages.length });

    try {
      for (let i = 0; i < allImages.length; i++) {
        const { img, type } = allImages[i];
        const path = problemImagePath(userId, newProblemId, type, img.file.name);
        await uploadProblemImage(supabase, path, img.file);
        uploadedPaths.push(path);
        const { error: imageInsertError } = await supabase.from("problem_images").insert({
          problem_id: newProblemId,
          user_id: userId,
          image_type: type,
          storage_path: path,
          order_index: type === "problem" ? i : i - problemImages.length,
        });
        if (imageInsertError) throw imageInsertError;
        setProgress({ done: i + 1, total: allImages.length });
      }

      await syncTags(newProblemId, userId, [], tags);

      queryClient.invalidateQueries({ queryKey: ["math-problems"] });
      router.push(`/math/problems/${newProblemId}`);
      router.refresh();
    } catch {
      // 이미지/태그 저장 중 실패 시, 방금 만든 문제와 업로드된 이미지를 정리합니다.
      await removeProblemImages(supabase, uploadedPaths);
      await supabase.from("math_problems").delete().eq("id", newProblemId);
      setSubmitError("이미지 또는 태그 저장 중 문제가 발생했습니다. 다시 시도해 주세요.");
      setProgress(null);
    }
  }

  async function handleEditSubmit(values: FormValues, userId: string, targetId: string) {
    try {
      const { error: updateError } = await supabase
        .from("math_problems")
        .update({
          topic_id: values.topic_id,
          title: values.title,
          problem_number: values.problem_number || null,
          memo: values.memo || null,
          youtube_url: values.youtube_url || null,
        })
        .eq("id", targetId);
      if (updateError) throw updateError;

      if (removedExisting.length > 0) {
        const { error: deleteError } = await supabase
          .from("problem_images")
          .delete()
          .in(
            "id",
            removedExisting.map((i) => i.id)
          );
        if (deleteError) throw deleteError;
        await removeProblemImages(
          supabase,
          removedExisting.map((i) => i.storage_path)
        );
      }

      const maxOrder = (images: ExistingImage[]) =>
        images.length > 0 ? Math.max(...images.map((i) => i.order_index)) : -1;
      const problemStart = maxOrder(existingProblemImages) + 1;
      const solutionStart = maxOrder(existingSolutionImages) + 1;

      const allNewImages = [
        ...problemImages.map((img, i) => ({ img, type: "problem" as const, order: problemStart + i })),
        ...solutionImages.map((img, i) => ({ img, type: "solution" as const, order: solutionStart + i })),
      ];
      setProgress({ done: 0, total: allNewImages.length });

      for (let i = 0; i < allNewImages.length; i++) {
        const { img, type, order } = allNewImages[i];
        const path = problemImagePath(userId, targetId, type, img.file.name);
        await uploadProblemImage(supabase, path, img.file);
        const { error: imageInsertError } = await supabase.from("problem_images").insert({
          problem_id: targetId,
          user_id: userId,
          image_type: type,
          storage_path: path,
          order_index: order,
        });
        if (imageInsertError) throw imageInsertError;
        setProgress({ done: i + 1, total: allNewImages.length });
      }

      await syncTags(targetId, userId, originalTags, tags);

      queryClient.invalidateQueries({ queryKey: ["math-problems"] });
      queryClient.invalidateQueries({ queryKey: ["math-problem", targetId] });
      router.push(`/math/problems/${targetId}`);
      router.refresh();
    } catch {
      setSubmitError("수정 내용을 저장하지 못했습니다. 다시 시도해 주세요.");
      setProgress(null);
    }
  }

  async function syncTags(
    targetProblemId: string,
    userId: string,
    original: { id: string; name: string }[],
    current: string[]
  ) {
    const toAdd = current.filter((name) => !original.some((o) => o.name === name));
    const toRemove = original.filter((o) => !current.includes(o.name));

    if (toAdd.length > 0) {
      const { data: tagRows, error: tagUpsertError } = await supabase
        .from("tags")
        .upsert(
          toAdd.map((name) => ({ user_id: userId, name })),
          { onConflict: "user_id,name", ignoreDuplicates: false }
        )
        .select("id, name");
      if (tagUpsertError) throw tagUpsertError;

      const links = (tagRows ?? []).map((t) => ({ problem_id: targetProblemId, tag_id: t.id }));
      if (links.length > 0) {
        const { error: linkError } = await supabase.from("problem_tags").insert(links);
        if (linkError) throw linkError;
      }
    }

    if (toRemove.length > 0) {
      const { error: unlinkError } = await supabase
        .from("problem_tags")
        .delete()
        .eq("problem_id", targetProblemId)
        .in(
          "tag_id",
          toRemove.map((t) => t.id)
        );
      if (unlinkError) throw unlinkError;
    }
  }

  if (isEdit && editLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">과목 *</label>
            <Select
              {...subjectField}
              onChange={(e) => {
                subjectField.onChange(e);
                setValue("topic_id", "");
              }}
              disabled={subjectsLoading}
            >
              <option value="">선택하세요</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {errors.subject_id && (
              <p className="text-xs text-status-unknown">{errors.subject_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">단원 *</label>
            <Select {...register("topic_id")} disabled={!selectedSubjectId}>
              <option value="">선택하세요</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {errors.topic_id && (
              <p className="text-xs text-status-unknown">{errors.topic_id.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">제목 *</label>
          <Input {...register("title")} placeholder="문제 제목" />
          {errors.title && <p className="text-xs text-status-unknown">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">문제번호</label>
          <Input
            {...problemNumberField}
            onChange={(e) => {
              e.target.value = sanitizeProblemNumber(e.target.value);
              problemNumberField.onChange(e);
            }}
            inputMode="numeric"
            placeholder="예: 3 또는 1-1"
          />
          {errors.problem_number && (
            <p className="text-xs text-status-unknown">{errors.problem_number.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">유튜브 URL</label>
          <Input {...register("youtube_url")} placeholder="https://youtube.com/..." />
          {errors.youtube_url && (
            <p className="text-xs text-status-unknown">{errors.youtube_url.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">메모</label>
          <Textarea {...register("memo")} rows={3} placeholder="풀이 아이디어, 주의할 점 등" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">태그</label>
          <TagInput value={tags} onChange={setTags} />
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <div>
          <ExistingImageGrid
            label="문제 이미지 *"
            images={existingProblemImages}
            onRemove={(img) => removeExistingImage("problem", img)}
          />
          <ImageDropzone
            label={existingProblemImages.length > 0 ? "문제 이미지 추가" : "문제 이미지 *"}
            images={problemImages}
            onChange={setProblemImages}
            className="mt-2"
          />
          {imageError && <p className="mt-1 text-xs text-status-unknown">{imageError}</p>}
        </div>
        <div>
          <ExistingImageGrid
            label="해설 이미지"
            images={existingSolutionImages}
            onRemove={(img) => removeExistingImage("solution", img)}
          />
          <ImageDropzone
            label={existingSolutionImages.length > 0 ? "해설 이미지 추가" : "해설 이미지"}
            images={solutionImages}
            onChange={setSolutionImages}
            className="mt-2"
          />
        </div>
      </Card>

      {submitError && <p className="text-sm text-status-unknown">{submitError}</p>}
      {progress && (
        <p className="font-mono text-xs text-text-secondary">
          이미지 업로드 중... {progress.done}/{progress.total}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(isEdit ? `/math/problems/${problemId}` : "/math/problems")}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "저장 중..." : isEdit ? "수정 저장" : "문제 등록"}
        </Button>
      </div>
    </form>
  );
}

function ExistingImageGrid({
  label,
  images,
  onRemove,
}: {
  label: string;
  images: ExistingImage[];
  onRemove: (image: ExistingImage) => void;
}) {
  if (images.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-sm text-text-secondary">{label}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(img)}
              aria-label="이미지 삭제"
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-opacity"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
