import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

export async function updateUsername(username: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, username }, { onConflict: "id" });
  if (error) throw error;
}

export async function requestAccountDeletion(reason?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: new Date().toISOString(), deletion_reason: reason ?? null })
    .eq("id", user.id);
  if (error) throw error;
}

/**
 * 로그인 시 탈퇴 요청 상태 확인 및 처리
 * - 'restored': 30일 이내 → deletion_requested_at 초기화, 계정 복구
 * - 'expired' : 30일 초과 → signOut, 접근 차단
 * - null      : 탈퇴 요청 없음 → 정상 로그인
 */
export async function cancelDeletion(): Promise<"restored" | "expired" | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await getProfile();
  if (!profile?.deletion_requested_at) return null;

  const daysPassed = (Date.now() - new Date(profile.deletion_requested_at).getTime()) / 86400000;

  if (daysPassed > 30) {
    await supabase.auth.signOut();
    return "expired";
  }

  await supabase.from("profiles").update({ deletion_requested_at: null }).eq("id", user.id);
  return "restored";
}
