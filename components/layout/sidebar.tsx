"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sigma, GraduationCap, Shapes, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/math/history",
    label: "전공수학",
    icon: Sigma,
    match: (p: string) => p === "/math" || p.startsWith("/math/"),
  },
  {
    href: "/pedagogy/topics",
    label: "교육학",
    icon: GraduationCap,
    match: (p: string) => p === "/pedagogy" || p.startsWith("/pedagogy/"),
  },
  {
    href: "/math-education/topics",
    label: "수학교육",
    icon: Shapes,
    match: (p: string) => p === "/math-education" || p.startsWith("/math-education/"),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // 서버 렌더링과 첫 렌더는 항상 펼친 상태로 맞추고(hydration mismatch 방지),
  // 마운트 후에 이전에 저장해둔 선택을 반영합니다.
  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-surface transition-[width] duration-150 md:flex md:flex-col",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={cn("flex items-center px-2 py-5", collapsed ? "justify-center" : "justify-between px-4")}>
        {!collapsed && (
          <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            임용 학습
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary"
        >
          {collapsed ? (
            <PanelLeftOpen size={17} strokeWidth={1.75} />
          ) : (
            <PanelLeftClose size={17} strokeWidth={1.75} />
          )}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-text-secondary hover:bg-accent-soft hover:text-text-primary"
              )}
            >
              <Icon size={17} strokeWidth={1.75} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 pb-3">
        <Link
          href="/settings"
          title={collapsed ? "설정" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
            collapsed && "justify-center px-0",
            pathname.startsWith("/settings")
              ? "bg-accent-soft font-medium text-accent"
              : "text-text-secondary hover:bg-accent-soft hover:text-text-primary"
          )}
        >
          <Settings size={17} strokeWidth={1.75} />
          {!collapsed && "설정"}
        </Link>
      </div>
    </aside>
  );
}
