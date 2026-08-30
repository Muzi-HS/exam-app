import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <FileQuestion size={40} strokeWidth={1.5} className="text-text-secondary" />
      <div>
        <h1 className="text-lg font-semibold text-text-primary">페이지를 찾을 수 없습니다</h1>
        <p className="mt-1 text-sm text-text-secondary">주소가 잘못됐거나 삭제된 페이지입니다.</p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-sm bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:opacity-90"
      >
        홈으로 이동
      </Link>
    </div>
  );
}
