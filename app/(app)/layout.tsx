import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";

// 이 레이아웃 하위의 모든 페이지는 middleware.ts에 의해
// 로그인하지 않으면 접근할 수 없습니다.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
