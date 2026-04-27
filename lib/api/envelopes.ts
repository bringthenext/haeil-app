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

/** 유저에게 envelope가 하나도 없으면 기본 Envelope 생성 */
export async function ensureDefaultEnvelope(userId: string): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("envelopes")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(1);
  if (selectError) throw selectError;
  if (existing && existing.length > 0) return;

  const { error } = await supabase
    .from("envelopes")
    .insert({ user_id: userId, name: "Envelope", order: 0 });
  if (error) throw error;
}

/** 봉투 순서 일괄 업데이트 */
export async function updateEnvelopeOrders(
  updates: { id: string; order: number }[],
): Promise<void> {
  const results = await Promise.all(
    updates.map(({ id, order }) =>
      supabase.from("envelopes").update({ order }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/**
 * 봉투 소프트 삭제 — 하위 papers도 cascade soft delete.
 * 복원 시 envelope + 그 envelope_id를 가진 soft-deleted papers를 함께 살린다.
 */
export async function deleteEnvelope(id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error: envError } = await supabase
    .from("envelopes")
    .update({ deleted_at: now })
    .eq("id", id);
  if (envError) throw envError;

  const { error: papersError } = await supabase
    .from("papers")
    .update({ deleted_at: now })
    .eq("envelope_id", id)
    .is("deleted_at", null);
  if (papersError) throw papersError;
}

/** 봉투 복원 — envelope + 하위 soft-deleted papers 함께 복원 */
export async function restoreEnvelope(id: string): Promise<void> {
  const { error: envError } = await supabase
    .from("envelopes")
    .update({ deleted_at: null })
    .eq("id", id);
  if (envError) throw envError;

  const { error: papersError } = await supabase
    .from("papers")
    .update({ deleted_at: null })
    .eq("envelope_id", id)
    .not("deleted_at", "is", null);
  if (papersError) throw papersError;
}

/** 삭제된 봉투 목록 (30일 이내) */
export async function getDeletedEnvelopes(): Promise<Envelope[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("envelopes")
    .select("*")
    .not("deleted_at", "is", null)
    .gte("deleted_at", cutoff)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Envelope[];
}
