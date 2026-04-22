// ─────────────────────────────────────────────────────────────────────────────
// Papers API — 공통 인터페이스 (web/native 동일)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { AddPaperPayload, Paper } from "@/lib/types";

/** 전체 paper 조회 (삭제 안 된 것, 오래된순) */
export async function getPapers(): Promise<Paper[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .is("deleted_at", null)
    .order("order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Paper[];
}

/** Paper 생성 */
export async function addPaper(
  userId: string,
  payload: AddPaperPayload,
): Promise<Paper> {
  const { data, error } = await supabase
    .from("papers")
    .insert({ ...payload, user_id: userId, status: payload.status ?? "active" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Paper;
}

/** Paper 완료 처리 (name null이면 날짜로 자동 명명) */
export async function completePaper(id: string, isDraft: boolean): Promise<void> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const update: Record<string, unknown> = { status: "completed", completed_at: now };
  if (isDraft) update.name = today;
  const { error } = await supabase.from("papers").update(update).eq("id", id);
  if (error) throw error;
}

/** Paper 순서 일괄 업데이트 */
export async function updatePaperOrders(
  updates: { id: string; order: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, order }) =>
      supabase.from("papers").update({ order }).eq("id", id),
    ),
  );
}

/** 즐겨찾기 토글 */
export async function toggleFavorite(id: string, current: boolean): Promise<void> {
  const { error } = await supabase
    .from("papers")
    .update({ is_favorite: !current })
    .eq("id", id);
  if (error) throw error;
}

/** 소프트 삭제 */
export async function deletePaper(id: string): Promise<void> {
  const { error } = await supabase
    .from("papers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
