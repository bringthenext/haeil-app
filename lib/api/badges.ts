import { supabase } from "@/lib/supabase";
import { BADGES, NORMAL_BADGES, type BadgeCheckState } from "@/lib/badges";
import { getBadgeStats } from "@/lib/api/stats";

/** DB에서 유저의 달성 badge_id 목록 조회 */
export async function getUserBadgeIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.badge_id as string));
}

/**
 * 현재 stats 기준으로 새로 달성한 뱃지를 DB에 저장.
 * 이미 있는 건 UNIQUE 제약으로 무시됨.
 * 반환값: 업데이트된 달성 badge_id 집합
 */
export async function syncUserBadges(): Promise<Set<string>> {
  const stats = await getBadgeStats();

  const baseState: BadgeCheckState = { ...stats, normalUnlocked: 0 };
  const normalUnlocked = NORMAL_BADGES.filter((b) => b.check(baseState)).length;
  const checkState: BadgeCheckState = { ...baseState, normalUnlocked };

  const earned = BADGES.filter((b) => b.check(checkState));
  if (earned.length > 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_badges").upsert(
        earned.map((b) => ({ user_id: user.id, badge_id: b.id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
    }
  }

  return getUserBadgeIds();
}
