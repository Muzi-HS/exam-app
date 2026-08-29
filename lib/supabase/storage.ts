import type { SupabaseClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import type { Database, ImageType } from "@/types/database";

export const PROBLEM_IMAGES_BUCKET = "problem-images";

// 작은 글씨(수식 등)가 흐려지지 않도록 보수적인 압축 옵션을 사용합니다.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2400,
  initialQuality: 0.92,
  useWebWorker: true,
};

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS);
  } catch {
    return file;
  }
}

export function problemImagePath(
  userId: string,
  problemId: string,
  imageType: ImageType,
  fileName: string
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  return `${userId}/${problemId}/${imageType}/${unique}`;
}

export async function uploadProblemImage(
  supabase: SupabaseClient<Database>,
  path: string,
  file: File
) {
  const { error } = await supabase.storage.from(PROBLEM_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
}

export function getPublicImageUrl(supabase: SupabaseClient<Database>, path: string) {
  return supabase.storage.from(PROBLEM_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

// 실패해도 무시합니다 (DB row cascade 삭제가 이미 끝난 뒤 최선을 다해 정리하는 용도).
export async function removeProblemImages(
  supabase: SupabaseClient<Database>,
  paths: string[]
) {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(PROBLEM_IMAGES_BUCKET).remove(paths);
  } catch {
    // 스토리지 정리는 best-effort. 실패해도 DB 정합성에는 영향 없음.
  }
}
