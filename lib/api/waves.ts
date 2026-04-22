// ─────────────────────────────────────────────────────────────────────────────
// Waves API — 공통 인터페이스 (web/native 동일)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { Wave } from "@/lib/types";

/** Wave 기록 (paper 완료 이벤트) */
export async function addWave(userId: string, paperId: string): Promise<Wave> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("waves")
    .insert({ user_id: userId, paper_id: paperId, completed_at: now })
    .select("*")
    .single();
  if (error) throw error;
  return data as Wave;
}

/** 유저의 wave 목록 조회 */
export async function getWaves(): Promise<Wave[]> {
  const { data, error } = await supabase
    .from("waves")
    .select("*")
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Wave[];
}
