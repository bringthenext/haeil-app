import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type MigrationPolicy = "keep-real" | "keep-anon";

/**
 * anon 유저와 실계정 유저 양쪽에 데이터가 있는지 확인.
 * anonAccessToken: 로그인 전에 저장해둔 anon 세션 토큰.
 */
export async function checkMigrationNeeded(
  anonUserId: string,
  anonAccessToken: string,
): Promise<{ anonHasData: boolean; realHasData: boolean }> {
  // anon 데이터는 anon 토큰으로 별도 클라이언트 생성해 조회 (RLS 우회)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${anonAccessToken}` } },
    auth: { persistSession: false },
  });

  const [{ data: anonItems }, { data: anonPapers }] = await Promise.all([
    anonClient.from("items").select("id").eq("user_id", anonUserId).is("deleted_at", null).limit(1),
    anonClient.from("papers").select("id").eq("user_id", anonUserId).is("deleted_at", null).limit(1),
  ]);
  const anonHasData = (anonItems?.length ?? 0) > 0 || (anonPapers?.length ?? 0) > 0;

  // 실계정 데이터는 현재 세션으로 조회
  const [{ data: realItems }, { data: realPapers }] = await Promise.all([
    supabase.from("items").select("id").is("deleted_at", null).limit(1),
    supabase.from("papers").select("id").is("deleted_at", null).limit(1),
  ]);
  const realHasData = (realItems?.length ?? 0) > 0 || (realPapers?.length ?? 0) > 0;

  return { anonHasData, realHasData };
}

/**
 * Edge Function 호출로 마이그레이션 실행.
 * keep-real: anon 데이터 삭제
 * keep-anon: 실계정 데이터 삭제 후 anon → 실계정 이전
 */
export async function runMigration(
  anonUserId: string,
  anonAccessToken: string,
  policy: MigrationPolicy,
): Promise<void> {
  const { error } = await supabase.functions.invoke("migrate-anonymous-data", {
    body: { anonUserId, policy },
    headers: { "x-anon-token": anonAccessToken },
  });
  if (error) throw error;
}
