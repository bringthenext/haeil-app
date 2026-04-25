import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { syncUserBadges } from "@/lib/api/badges";
import { BADGES, NORMAL_BADGES, type BadgeDef } from "@/lib/badges";

type BadgeItemProps = {
  badge: BadgeDef;
  unlocked: boolean;
  hidden: boolean;
};

function BadgeItem({ badge, unlocked, hidden }: BadgeItemProps) {
  const isHiddenLocked = hidden && !unlocked;

  return (
    <View
      className="items-center"
      style={{ width: "25%", paddingHorizontal: 4, marginBottom: 16, opacity: unlocked ? 1 : 0.3 }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: unlocked ? "#E1F5EE" : "#f0f0ec",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 24 }}>
          {isHiddenLocked ? "?" : badge.icon}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={{
          fontSize: 10,
          textAlign: "center",
          color: "#1a1a1a",
          fontWeight: unlocked ? "600" : "400",
          lineHeight: 13,
        }}
      >
        {isHiddenLocked ? "???" : badge.name}
      </Text>
    </View>
  );
}

const CATEGORIES = ["꾸준함", "wave 마스터", "할일 마스터", "루틴 전문가", "수집가", "히든"] as const;

export function ChallengesTab() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    // 현재 stats 기준 신규 달성 뱃지 DB에 저장 후 전체 달성 목록 반환
    syncUserBadges().then(setUnlockedIds).catch(console.error);
  }, []);

  if (!unlockedIds) {
    return (
      <View className="items-center justify-center py-20">
        <Text className="text-xs text-[#999999]">불러오는 중...</Text>
      </View>
    );
  }

  const totalNormal = NORMAL_BADGES.length;
  const unlockedNormal = NORMAL_BADGES.filter((b) => unlockedIds.has(b.id)).length;
  const progressPct = Math.round((unlockedNormal / totalNormal) * 100);

  return (
    <View>
      {/* 전체 진행도 */}
      <View className="mb-4 rounded-2xl bg-white p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-[#1a1a1a]">전체 달성</Text>
          <Text className="text-sm font-bold text-[#1D9E75]">
            {unlockedNormal} / {totalNormal}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-[#f0f0ec]">
          <View
            style={{
              height: "100%",
              width: `${progressPct}%`,
              borderRadius: 99,
              backgroundColor: "#1D9E75",
            }}
          />
        </View>
      </View>

      {/* 카테고리별 뱃지 그리드 */}
      {CATEGORIES.map((cat) => {
        const catBadges = BADGES.filter((b) => b.category === cat);
        return (
          <View key={cat} className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-3 text-xs font-semibold text-[#555555]">{cat}</Text>
            <View className="flex-row flex-wrap">
              {catBadges.map((badge) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  unlocked={unlockedIds.has(badge.id)}
                  hidden={badge.category === "히든"}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
