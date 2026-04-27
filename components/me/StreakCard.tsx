import { useEffect, useState } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import { getStreakStats, type StreakStats } from "@/lib/api/stats";
import { colors, radius } from "@/lib/tokens";

export function StreakCard() {
  const [stats, setStats] = useState<StreakStats | null>(null);

  useEffect(() => {
    getStreakStats().then(setStats).catch(console.error);
  }, []);

  const activeDaysCount = stats?.activeDays.size ?? 0;

  return (
    <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16 }}>
      <Text variant="caption" weight="bold" style={{ letterSpacing: 0.8, marginBottom: 6 }}>
        STREAK
      </Text>
      <Text variant="display">
        {stats?.currentStreak ?? 0}
      </Text>
      <Text variant="meta" color="body" style={{ marginBottom: 10 }}>일 연속</Text>
      <Text variant="meta" style={{ marginBottom: 2 }}>
        최장 {stats?.bestStreak ?? 0}일
      </Text>
      <Text variant="meta">
        30일 중 {activeDaysCount}일
      </Text>
    </View>
  );
}
