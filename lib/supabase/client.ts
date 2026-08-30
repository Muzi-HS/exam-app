import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// 클라이언트 컴포넌트(브라우저)에서 사용하는 Supabase 클라이언트.
// NEXT_PUBLIC_ 환경변수만 사용하므로 브라우저에 노출되어도 안전합니다.
//
// persistSession + autoRefreshToken로 로그아웃하기 전까지는 세션이 쿠키에 저장되어
// 브라우저를 껐다 켜도 자동으로 로그인 상태가 유지됩니다(액세스 토큰은 만료돼도
// 리프레시 토큰으로 자동 갱신됩니다).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}
