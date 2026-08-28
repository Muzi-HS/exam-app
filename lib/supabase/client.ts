import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// 클라이언트 컴포넌트(브라우저)에서 사용하는 Supabase 클라이언트.
// NEXT_PUBLIC_ 환경변수만 사용하므로 브라우저에 노출되어도 안전합니다.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
