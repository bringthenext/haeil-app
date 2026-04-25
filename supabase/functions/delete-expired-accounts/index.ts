// 매일 실행 — deletion_requested_at 이 30일 지난 계정을 삭제
// Supabase 대시보드 > Edge Functions > Schedule: 0 3 * * * (매일 새벽 3시)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .not("deletion_requested_at", "is", null)
    .lte("deletion_requested_at", thirtyDaysAgo.toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const ids = (profiles ?? []).map((p) => p.id as string);
  let deleted = 0;

  for (const id of ids) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
    if (!deleteError) deleted++;
  }

  return new Response(JSON.stringify({ deleted, total: ids.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
