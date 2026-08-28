"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-end gap-2 border-b border-border bg-surface px-4 py-3">
      {mounted && (
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="테마 전환"
        >
          {theme === "dark" ? "라이트 모드" : "다크 모드"}
        </Button>
      )}
      <Button variant="ghost" onClick={handleSignOut}>
        로그아웃
      </Button>
    </header>
  );
}
