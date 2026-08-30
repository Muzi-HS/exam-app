import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DataExport } from "@/components/settings/data-export";

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text-primary">설정</h1>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">계정</p>
        <Card>
          <p className="text-xs text-text-secondary">로그인 이메일</p>
          <p className="mt-1 text-sm text-text-primary">{user?.email ?? "알 수 없음"}</p>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">데이터</p>
        <DataExport />
      </div>
    </div>
  );
}
