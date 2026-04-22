// ─────────────────────────────────────────────────────────────────────────────
// Items API — 공통 인터페이스 (web/native 동일)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { AddItemPayload, Item } from "@/lib/types";

/** inbox draft 아이템 조회 (paper_id=null) */
export async function getInboxItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("paper_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Item[];
}

/** paper에 속한 아이템 조회 */
export async function getItemsByPaperIds(paperIds: string[]): Promise<Item[]> {
  if (paperIds.length === 0) return [];
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .in("paper_id", paperIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Item[];
}

/** 아이템 추가 */
export async function addItem(
  userId: string,
  payload: AddItemPayload,
): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .insert({ ...payload, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Item;
}

/** 체크 토글 */
export async function toggleItem(
  id: string,
  checked: boolean,
): Promise<void> {
  const checkedAt = checked ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("items")
    .update({ is_checked: checked, checked_at: checkedAt })
    .eq("id", id);
  if (error) throw error;
}

/** 아이템을 특정 paper로 이동 */
export async function assignItemToPaper(
  id: string,
  paperId: string,
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ paper_id: paperId })
    .eq("id", id);
  if (error) throw error;
}

/** 소프트 삭제 */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
