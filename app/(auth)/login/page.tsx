"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    // router.push + router.refresh는 @supabase/ssr 브라우저 클라이언트가
    // 세션 쿠키를 document.cookie에 다 쓰기 전에 다음 네비게이션(및 그에 따른
    // middleware 실행)이 시작될 수 있어, 쿠키가 아직 없다고 판단한 middleware가
    // 다시 /login으로 돌려보내는 경우가 있었습니다(그래서 두 번째 클릭부터만 성공).
    // window.location.href로 완전한 하드 네비게이션을 하면 브라우저가 실제 요청을
    // 보내는 시점에는 쿠키 쓰기가 항상 끝나 있으므로 이 경쟁 상태가 사라집니다.
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold text-text-primary">로그인</h1>
        <p className="mb-6 text-sm text-text-secondary">
          임용고시 학습 시스템에 접속합니다.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-text-secondary">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-text-secondary">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-sm border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-status-unknown">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
