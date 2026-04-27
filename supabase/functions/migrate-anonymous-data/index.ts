// migrate-anonymous-data
// anon 세션 데이터를 실계정으로 이전하거나 삭제한다.
// policy "keep-real": anon 데이터 전체 삭제
// policy "keep-anon": 실계정 데이터 삭제 후 anon 데이터를 실계정 user_id로 교체

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-anon-token",
};

const TABLES = ["items", "papers", "envelopes", "waves"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 실계정 검증 (Authorization 헤더 — supabase.functions.invoke가 자동 첨부)
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user: realUser }, error: realErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (realErr || !realUser) throw new Error("Invalid real user token");

    // anon 계정 검증
    const anonToken = req.headers.get("x-anon-token") ?? "";
    const { data: { user: anonUser }, error: anonErr } = await admin.auth.getUser(anonToken);
    if (anonErr || !anonUser) throw new Error("Invalid anon token");
    if (!anonUser.is_anonymous) throw new Error("Not an anonymous user");

    const { anonUserId, policy } = await req.json() as {
      anonUserId: string;
      policy: "keep-real" | "keep-anon";
    };
    if (anonUser.id !== anonUserId) throw new Error("anonUserId mismatch");

    const realId = realUser.id;

    if (policy === "keep-real") {
      for (const table of TABLES) {
        await admin.from(table).delete().eq("user_id", anonUserId);
      }
    } else {
      // keep-anon: 실계정 데이터 삭제 → anon 데이터를 실계정 id로 교체
      for (const table of TABLES) {
        await admin.from(table).delete().eq("user_id", realId);
      }
      for (const table of TABLES) {
        await admin.from(table).update({ user_id: realId }).eq("user_id", anonUserId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
