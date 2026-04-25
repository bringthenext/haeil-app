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

/** paper id 목록별 wave 횟수 (단순 per-paper) */
export async function getWaveCountsByPaperIds(
  paperIds: string[],
): Promise<Record<string, number>> {
  if (paperIds.length === 0) return {};
  const { data, error } = await supabase
    .from("waves")
    .select("paper_id")
    .in("paper_id", paperIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.paper_id] = (counts[row.paper_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * 루틴 wave 횟수 — 자신의 wave + parent_paper_id가 자신인 자식들의 wave를 합산.
 * FavoriteSheet / CompletedPaperCard에서 "이 루틴이 총 몇 번 완료됐는지" 표시용.
 */
export async function getRoutineWaveCountsByPaperIds(
  paperIds: string[],
): Promise<Record<string, number>> {
  if (paperIds.length === 0) return {};

  // 1) 직접 wave
  const { data: directWaves } = await supabase
    .from("waves")
    .select("paper_id")
    .in("paper_id", paperIds);

  // 2) 자식 paper 목록 (parent_paper_id IN paperIds)
  const { data: children } = await supabase
    .from("papers")
    .select("id, parent_paper_id")
    .in("parent_paper_id", paperIds)
    .is("deleted_at", null);

  const childIds = (children ?? []).map((c) => c.id as string);
  const childToParent = new Map<string, string>(
    (children ?? []).map((c) => [c.id as string, c.parent_paper_id as string]),
  );

  // 3) 자식들의 wave
  let childWaves: { paper_id: string }[] = [];
  if (childIds.length > 0) {
    const { data } = await supabase
      .from("waves")
      .select("paper_id")
      .in("paper_id", childIds);
    childWaves = (data ?? []) as { paper_id: string }[];
  }

  // 4) 집계 — 직접 wave는 본인에, 자식 wave는 부모에
  const counts: Record<string, number> = {};
  for (const w of directWaves ?? []) {
    counts[w.paper_id] = (counts[w.paper_id] ?? 0) + 1;
  }
  for (const w of childWaves) {
    const parentId = childToParent.get(w.paper_id);
    if (parentId) counts[parentId] = (counts[parentId] ?? 0) + 1;
  }
  return counts;
}
