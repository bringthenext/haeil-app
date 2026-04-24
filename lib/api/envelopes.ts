// ─────────────────────────────────────────────────────────────────────────────
// Envelopes API — 공통 인터페이스 (web/native 동일)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { AddEnvelopePayload, Envelope } from "@/lib/types";

/** 활성 봉투 목록 조회 (생성순) */
export async function getEnvelopes(): Promise<Envelope[]> {
  const { data, error } = await supabase
    .from("envelopes")
    .select("*")
    .is("deleted_at", null)
    .order("order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Envelope[];
}

/** 봉투 생성 */
export async function addEnvelope(
  userId: string,
  payload: AddEnvelopePayload,
): Promise<Envelope> {
  const { data, error } = await supabase
    .from("envelopes")
    .insert({ ...payload, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Envelope;
}

/** 봉투 순서 일괄 업데이트 */
export async function updateEnvelopeOrders(
  updates: { id: string; order: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, order }) =>
      supabase.from("envelopes").update({ order }).eq("id", id),
    ),
  );
}

/** 봉투 소프트 삭제 */
export async function deleteEnvelope(id: string): Promise<void> {
  const { error } = await supabase
    .from("envelopes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
