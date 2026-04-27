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

/** 아이템 내용 변경 */
export async function updateItemContent(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ content })
    .eq("id", id);
  if (error) throw error;
}

/** inbox draft 아이템 전체를 특정 paper로 이동 */
export async function assignAllDraftItemsToPaper(paperId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ paper_id: paperId })
    .is("paper_id", null)
    .eq("user_id", userId)
    .is("deleted_at", null);
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

/** inbox draft item을 특정 envelope의 draft paper로 분류 (없으면 paper 생성) */
export async function classifyItemToEnvelope(
  itemId: string,
  envelopeId: string,
  userId: string,
): Promise<void> {
  const { data: drafts } = await supabase
    .from("papers")
    .select("id")
    .eq("envelope_id", envelopeId)
    .eq("user_id", userId)
    .is("name", null)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1);

  let paperId: string;
  if (drafts && drafts.length > 0) {
    paperId = drafts[0].id;
  } else {
    const { data: newPaper, error } = await supabase
      .from("papers")
      .insert({ user_id: userId, envelope_id: envelopeId, name: null, status: "active" })
      .select("id")
      .single();
    if (error) throw error;
    paperId = newPaper.id;
  }

  const { error } = await supabase.from("items").update({ paper_id: paperId }).eq("id", itemId);
  if (error) throw error;
}

/** 아이템의 scheduled_date 변경 (날짜 이동 시 order 초기화) */
export async function updateItemScheduledDate(
  id: string,
  scheduledDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ scheduled_date: scheduledDate, order: null })
    .eq("id", id);
  if (error) throw error;
}

/** 아이템의 scheduled_date와 order를 함께 변경 */
export async function updateItemDateAndOrder(
  id: string,
  scheduledDate: string,
  order: number,
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ scheduled_date: scheduledDate, order })
    .eq("id", id);
  if (error) throw error;
}

/** 아이템 순서 일괄 업데이트 */
export async function updateItemOrders(
  updates: { id: string; order: number }[],
): Promise<void> {
  const results = await Promise.all(
    updates.map(({ id, order }) =>
      supabase.from("items").update({ order }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** 소프트 삭제 */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type ScheduledItemRow = Item & { source: string };

/** scheduled_date가 있는 전사 아이템 + 출처(source) 조회 */
export async function getScheduledItemsWithSource(): Promise<ScheduledItemRow[]> {
  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .not("scheduled_date", "is", null)
    .is("deleted_at", null)
    .order("scheduled_date")
    .order("created_at");
  if (error) throw error;
  if (!items?.length) return [];

  const paperIds = [...new Set(items.filter((i) => i.paper_id).map((i) => i.paper_id as string))];
  if (!paperIds.length) return items.map((i) => ({ ...i, source: "inbox" }));

  const { data: papers } = await supabase
    .from("papers")
    .select("id, name, envelope_id")
    .in("id", paperIds)
    .eq("status", "active")
    .is("deleted_at", null);
  const activePaperIds = new Set((papers ?? []).map((p) => p.id));
  const paperMap = new Map((papers ?? []).map((p) => [p.id, p]));

  const envelopeIds = [...new Set((papers ?? []).filter((p) => p.envelope_id).map((p) => p.envelope_id as string))];
  const envelopeMap = new Map<string, string>();
  if (envelopeIds.length) {
    const { data: envelopes } = await supabase
      .from("envelopes")
      .select("id, name")
      .in("id", envelopeIds)
      .is("deleted_at", null);
    (envelopes ?? []).forEach((e) => envelopeMap.set(e.id, e.name));
  }

  return items
    .filter((item) => !item.paper_id || activePaperIds.has(item.paper_id))
    .map((item) => {
      if (!item.paper_id) return { ...item, source: "inbox" };
      const paper = paperMap.get(item.paper_id);
      if (!paper) return { ...item, source: "inbox" };
      if (paper.envelope_id) return { ...item, source: envelopeMap.get(paper.envelope_id) ?? "inbox" };
      return { ...item, source: paper.name ?? "inbox" };
    });
}
