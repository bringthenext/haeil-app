import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type MigrationPolicy = "keep-real" | "keep-anon";

/**
 * anon 유저와 실계정 유저 양쪽에 데이터가 있는지 확인.
 * anonAccessToken: 로그인 전에 저장해둔 anon 세션 토큰.
 */
/**
 * anonAccessToken: 로그인 전에 저장해둔 anon 세션 토큰.
 * realAccessToken: signInWithEmail() 결과에서 꺼낸 실계정 토큰 (싱글턴 타이밍 이슈 방지).
 */
export async function checkMigrationNeeded(
  anonUserId: string,
  anonAccessToken: string,
  realAccessToken: string,
): Promise<{ anonHasData: boolean; realHasData: boolean }> {
  const makeClient = (token: string) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

  const anonClient = makeClient(anonAccessToken);
  const realClient = makeClient(realAccessToken);

  const [
    { data: anonItems, error: e1 },
    { data: anonPapers, error: e2 },
    { data: realItems, error: e3 },
    { data: realPapers, error: e4 },
  ] = await Promise.all([
    anonClient.from("items").select("id").eq("user_id", anonUserId).is("deleted_at", null).limit(1),
    anonClient.from("papers").select("id").eq("user_id", anonUserId).is("deleted_at", null).limit(1),
    realClient.from("items").select("id").is("deleted_at", null).limit(1),
    realClient.from("papers").select("id").is("deleted_at", null).limit(1),
  ]);

  // 쿼리 실패 시 안전하게 "데이터 있음"으로 처리 → 모달 표시
  if (e1 || e2) throw new Error("anon data check failed");
  if (e3 || e4) throw new Error("real data check failed");

  const anonHasData = (anonItems?.length ?? 0) > 0 || (anonPapers?.length ?? 0) > 0;
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
