import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// 서버 컴포넌트, Server Action, Route Handler에서 사용하는 Supabase 클라이언트.
// 쿠키를 통해 로그인 세션을 읽고 갱신합니다.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 호출된 경우 무시 (middleware가 세션을 갱신함)
          }
        },
      },
    }
  );
}
