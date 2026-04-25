// 뱃지 정의 — 31개
// threshold: 달성 기준 수치 (streak일수 / wave수 / item체크수 / envelope수)

export type BadgeCategory = "꾸준함" | "wave 마스터" | "할일 마스터" | "루틴 전문가" | "수집가" | "히든";

export type BadgeDef = {
  id: string;
  category: BadgeCategory;
  name: string;
  desc: string;
  icon: string; // 이모지
  /** 달성 조건 체크 함수 */
  check: (s: BadgeCheckState) => boolean;
};

export type BadgeCheckState = {
  currentStreak: number;
  bestStreak: number;
  totalWaves: number;
  totalCheckedItems: number;
  envelopeCount: number;
  /** 달성한 일반 뱃지(히든 제외) 수 */
  normalUnlocked: number;
};

export const BADGES: BadgeDef[] = [
  // ── 꾸준함 (6개) ─────────────────────────────────────────────
  {
    id: "streak_3",
    category: "꾸준함",
    name: "3일 연속",
    desc: "3일 연속 체크",
    icon: "🌱",
    check: (s) => s.currentStreak >= 3,
  },
  {
    id: "streak_7",
    category: "꾸준함",
    name: "일주일",
    desc: "7일 연속 체크",
    icon: "🌿",
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: "streak_14",
    category: "꾸준함",
    name: "2주 연속",
    desc: "14일 연속 체크",
    icon: "🌳",
    check: (s) => s.currentStreak >= 14,
  },
  {
    id: "streak_30",
    category: "꾸준함",
    name: "한 달",
    desc: "30일 연속 체크",
    icon: "🌲",
    check: (s) => s.currentStreak >= 30,
  },
  {
    id: "streak_100",
    category: "꾸준함",
    name: "100일",
    desc: "100일 연속 체크",
    icon: "🎋",
    check: (s) => s.currentStreak >= 100,
  },
  {
    id: "best_streak_30",
    category: "꾸준함",
    name: "최장 30일",
    desc: "최장 streak 30일 이상",
    icon: "🏆",
    check: (s) => s.bestStreak >= 30,
  },

  // ── wave 마스터 (7개) ─────────────────────────────────────────
  {
    id: "wave_1",
    category: "wave 마스터",
    name: "첫 wave",
    desc: "wave 1회 달성",
    icon: "🌊",
    check: (s) => s.totalWaves >= 1,
  },
  {
    id: "wave_5",
    category: "wave 마스터",
    name: "wave 5",
    desc: "wave 5회",
    icon: "🌊",
    check: (s) => s.totalWaves >= 5,
  },
  {
    id: "wave_10",
    category: "wave 마스터",
    name: "wave 10",
    desc: "wave 10회",
    icon: "🌊",
    check: (s) => s.totalWaves >= 10,
  },
  {
    id: "wave_50",
    category: "wave 마스터",
    name: "wave 50",
    desc: "wave 50회",
    icon: "🌊",
    check: (s) => s.totalWaves >= 50,
  },
  {
    id: "wave_100",
    category: "wave 마스터",
    name: "wave 100",
    desc: "wave 100회",
    icon: "🌊",
    check: (s) => s.totalWaves >= 100,
  },
  {
    id: "wave_500",
    category: "wave 마스터",
    name: "wave 500",
    desc: "wave 500회",
    icon: "🌊",
    check: (s) => s.totalWaves >= 500,
  },
  {
    id: "wave_3000",
    category: "wave 마스터",
    name: "wave 3000",
    desc: "wave 3000회",
    icon: "🌊",
    check: (s) => s.totalWaves >= 3000,
  },

  // ── 할일 마스터 (6개) ─────────────────────────────────────────
  {
    id: "check_1",
    category: "할일 마스터",
    name: "첫 체크",
    desc: "item 1개 체크",
    icon: "✅",
    check: (s) => s.totalCheckedItems >= 1,
  },
  {
    id: "check_10",
    category: "할일 마스터",
    name: "열 번 체크",
    desc: "item 10개 체크",
    icon: "✅",
    check: (s) => s.totalCheckedItems >= 10,
  },
  {
    id: "check_50",
    category: "할일 마스터",
    name: "50번 체크",
    desc: "item 50개 체크",
    icon: "✅",
    check: (s) => s.totalCheckedItems >= 50,
  },
  {
    id: "check_100",
    category: "할일 마스터",
    name: "100번 체크",
    desc: "item 100개 체크",
    icon: "✅",
    check: (s) => s.totalCheckedItems >= 100,
  },
  {
    id: "check_500",
    category: "할일 마스터",
    name: "500번 체크",
    desc: "item 500개 체크",
    icon: "✅",
    check: (s) => s.totalCheckedItems >= 500,
  },
  {
    id: "check_1000",
    category: "할일 마스터",
    name: "1000번 체크",
    desc: "item 1000개 체크",
    icon: "✅",
    check: (s) => s.totalCheckedItems >= 1000,
  },

  // ── 루틴 전문가 (4개) ─────────────────────────────────────────
  {
    id: "routine_1",
    category: "루틴 전문가",
    name: "첫 루틴",
    desc: "envelope 1개 생성",
    icon: "📋",
    check: (s) => s.envelopeCount >= 1,
  },
  {
    id: "routine_3",
    category: "루틴 전문가",
    name: "루틴 3개",
    desc: "envelope 3개 보유",
    icon: "📋",
    check: (s) => s.envelopeCount >= 3,
  },
  {
    id: "routine_5",
    category: "루틴 전문가",
    name: "루틴 5개",
    desc: "envelope 5개 보유",
    icon: "📋",
    check: (s) => s.envelopeCount >= 5,
  },
  {
    id: "routine_10",
    category: "루틴 전문가",
    name: "루틴 마스터",
    desc: "envelope 10개 보유",
    icon: "📋",
    check: (s) => s.envelopeCount >= 10,
  },

  // ── 수집가 (4개) ──────────────────────────────────────────────
  {
    id: "collect_1",
    category: "수집가",
    name: "수집 시작",
    desc: "뱃지 5개 달성",
    icon: "🏅",
    check: (s) => s.normalUnlocked >= 5,
  },
  {
    id: "collect_2",
    category: "수집가",
    name: "수집가",
    desc: "뱃지 10개 달성",
    icon: "🥈",
    check: (s) => s.normalUnlocked >= 10,
  },
  {
    id: "collect_3",
    category: "수집가",
    name: "열혈 수집가",
    desc: "뱃지 18개 달성",
    icon: "🥇",
    check: (s) => s.normalUnlocked >= 18,
  },
  {
    id: "collect_4",
    category: "수집가",
    name: "전설의 수집가",
    desc: "일반 뱃지 전부 달성",
    icon: "💎",
    check: (s) => s.normalUnlocked >= 27, // 히든 4개 제외
  },

  // ── 히든 (4개) — 일반 달성 5개마다 1개 해금 ─────────────────
  {
    id: "hidden_1",
    category: "히든",
    name: "???",
    desc: "5개 달성 시 해금",
    icon: "⚡",
    check: (s) => s.normalUnlocked >= 5,
  },
  {
    id: "hidden_2",
    category: "히든",
    name: "???",
    desc: "10개 달성 시 해금",
    icon: "🔥",
    check: (s) => s.normalUnlocked >= 10,
  },
  {
    id: "hidden_3",
    category: "히든",
    name: "???",
    desc: "15개 달성 시 해금",
    icon: "🌙",
    check: (s) => s.normalUnlocked >= 15,
  },
  {
    id: "hidden_4",
    category: "히든",
    name: "???",
    desc: "20개 달성 시 해금",
    icon: "🌟",
    check: (s) => s.normalUnlocked >= 20,
  },
];

export const NORMAL_BADGES = BADGES.filter((b) => b.category !== "히든");
export const HIDDEN_BADGES = BADGES.filter((b) => b.category === "히든");
