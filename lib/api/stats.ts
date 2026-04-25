// ─────────────────────────────────────────────────────────────────────────────
// Stats API — 클라이언트 계산 (추후 Supabase RPC로 교체 용이)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";

export type StreakStats = {
  currentStreak: number;
  bestStreak: number;
  /** 최근 30일 중 체크 있는 날짜 집합 (YYYY-MM-DD) */
  activeDays: Set<string>;
};

export type WeekWaveStats = {
  thisWeek: number;
  lastWeek: number;
};

/** date → wave 수 */
export type YearlyWaveMap = Record<string, number>;

export type EnvelopeWaveCount = {
  envelopeId: string;
  name: string;
  color: string | null;
  count: number;
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function toDateStr(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 해당 연도의 월요일 기준 주의 [start, end] (YYYY-MM-DD) */
function getWeekRange(offsetWeeks: number): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=일,1=월,...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offsetWeeks * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Streak 통계 — item checked_at 기준 */
export async function getStreakStats(): Promise<StreakStats> {
  const { data, error } = await supabase
    .from("items")
    .select("checked_at")
    .eq("is_checked", true)
    .not("checked_at", "is", null)
    .is("deleted_at", null);
  if (error) throw error;

  const dateSet = new Set<string>(
    (data ?? []).map((r) => toDateStr(r.checked_at as string)),
  );

  const today = new Date().toISOString().slice(0, 10);

  // 최근 30일 activeDays
  const activeDays = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    if (dateSet.has(d)) activeDays.add(d);
  }

  // 현재 streak — 오늘부터 역순으로 연속 일수
  let currentStreak = 0;
  let cursor = today;
  while (dateSet.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  // 오늘 체크 없으면 어제부터도 체크
  if (currentStreak === 0) {
    cursor = addDays(today, -1);
    while (dateSet.has(cursor)) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }
  }

  // 최장 streak — 전체 날짜 정렬 후 계산
  const sorted = Array.from(dateSet).sort();
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || addDays(sorted[i - 1], 1) === sorted[i]) {
      run++;
    } else {
      run = 1;
    }
    if (run > bestStreak) bestStreak = run;
  }

  return { currentStreak, bestStreak, activeDays };
}

/** 이번 주 / 지난 주 wave 수 */
export async function getWeekWaveStats(): Promise<WeekWaveStats> {
  const thisWeekRange = getWeekRange(0);
  const lastWeekRange = getWeekRange(-1);

  const { data, error } = await supabase
    .from("waves")
    .select("completed_at")
    .gte("completed_at", lastWeekRange.start + "T00:00:00.000Z")
    .lte("completed_at", thisWeekRange.end + "T23:59:59.999Z");
  if (error) throw error;

  let thisWeek = 0;
  let lastWeek = 0;
  for (const row of data ?? []) {
    const d = toDateStr(row.completed_at as string);
    if (d >= thisWeekRange.start && d <= thisWeekRange.end) thisWeek++;
    else if (d >= lastWeekRange.start && d <= lastWeekRange.end) lastWeek++;
  }
  return { thisWeek, lastWeek };
}

/** 특정 연도의 날짜별 wave 수 */
export async function getYearlyWaveMap(year: number): Promise<YearlyWaveMap> {
  const { data, error } = await supabase
    .from("waves")
    .select("completed_at")
    .gte("completed_at", `${year}-01-01T00:00:00.000Z`)
    .lte("completed_at", `${year}-12-31T23:59:59.999Z`);
  if (error) throw error;

  const map: YearlyWaveMap = {};
  for (const row of data ?? []) {
    const d = toDateStr(row.completed_at as string);
    map[d] = (map[d] ?? 0) + 1;
  }
  return map;
}

export type BadgeStats = {
  currentStreak: number;
  bestStreak: number;
  totalWaves: number;
  totalCheckedItems: number;
  envelopeCount: number;
};

/** Challenges 뱃지 달성 판단용 통계 — 한 번에 조회 */
export async function getBadgeStats(): Promise<BadgeStats> {
  const [streakStats, wavesRes, itemsRes, envelopesRes] = await Promise.all([
    getStreakStats(),
    supabase.from("waves").select("id", { count: "exact", head: true }),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("is_checked", true).is("deleted_at", null),
    supabase.from("envelopes").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  return {
    currentStreak: streakStats.currentStreak,
    bestStreak: streakStats.bestStreak,
    totalWaves: wavesRes.count ?? 0,
    totalCheckedItems: itemsRes.count ?? 0,
    envelopeCount: envelopesRes.count ?? 0,
  };
}

/** envelope별 누적 wave 수 (wave 없는 envelope도 포함, count=0) */
export async function getEnvelopeWaveCounts(): Promise<EnvelopeWaveCount[]> {
  // 1) 모든 envelopes
  const { data: envelopes, error: envErr } = await supabase
    .from("envelopes")
    .select("id, name, color")
    .is("deleted_at", null)
    .order("order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (envErr) throw envErr;
  if (!envelopes?.length) return [];

  // 2) envelope에 속한 모든 paper id
  const envelopeIds = envelopes.map((e) => e.id as string);
  const { data: papers, error: paperErr } = await supabase
    .from("papers")
    .select("id, envelope_id, parent_paper_id")
    .in("envelope_id", envelopeIds)
    .is("deleted_at", null);
  if (paperErr) throw paperErr;

  // 3) 각 paper의 모든 자식(복제본)도 포함
  const allPaperIds = (papers ?? []).map((p) => p.id as string);
  let childPapers: { id: string; parent_paper_id: string }[] = [];
  if (allPaperIds.length > 0) {
    const { data } = await supabase
      .from("papers")
      .select("id, parent_paper_id")
      .in("parent_paper_id", allPaperIds)
      .is("deleted_at", null);
    childPapers = (data ?? []) as { id: string; parent_paper_id: string }[];
  }

  // paper id → envelope id 매핑 (자식은 부모의 envelope)
  const paperToEnvelope = new Map<string, string>();
  for (const p of papers ?? []) {
    if (p.envelope_id) paperToEnvelope.set(p.id as string, p.envelope_id as string);
  }
  const parentToEnvelope = new Map<string, string>(
    (papers ?? [])
      .filter((p) => p.envelope_id)
      .map((p) => [p.id as string, p.envelope_id as string]),
  );
  for (const c of childPapers) {
    const envId = parentToEnvelope.get(c.parent_paper_id);
    if (envId) paperToEnvelope.set(c.id, envId);
  }

  // 4) wave 조회
  const paperIds = Array.from(paperToEnvelope.keys());
  let wavePaperIds: string[] = [];
  if (paperIds.length > 0) {
    const { data: waves, error: waveErr } = await supabase
      .from("waves")
      .select("paper_id")
      .in("paper_id", paperIds);
    if (waveErr) throw waveErr;
    wavePaperIds = (waves ?? []).map((w) => w.paper_id as string);
  }

  // 5) envelope별 wave 수 집계
  const counts = new Map<string, number>(envelopeIds.map((id) => [id, 0]));
  for (const paperId of wavePaperIds) {
    const envId = paperToEnvelope.get(paperId);
    if (envId) counts.set(envId, (counts.get(envId) ?? 0) + 1);
  }

  return envelopes.map((e) => ({
    envelopeId: e.id as string,
    name: e.name as string,
    color: e.color as string | null,
    count: counts.get(e.id as string) ?? 0,
  }));
}
