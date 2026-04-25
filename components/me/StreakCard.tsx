import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { getStreakStats, type StreakStats } from "@/lib/api/stats";

export function StreakCard() {
  const [stats, setStats] = useState<StreakStats | null>(null);

  useEffect(() => {
    getStreakStats().then(setStats).catch(console.error);
  }, []);

  const activeDaysCount = stats?.activeDays.size ?? 0;

  return (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#ffffff", padding: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#999999", letterSpacing: 0.8, marginBottom: 6 }}>
        STREAK
      </Text>
      <Text style={{ fontSize: 36, fontWeight: "800", color: "#1D9E75", lineHeight: 40 }}>
        {stats?.currentStreak ?? 0}
      </Text>
      <Text style={{ fontSize: 13, color: "#555555", marginBottom: 10 }}>일 연속</Text>
      <Text style={{ fontSize: 12, color: "#999999", marginBottom: 2 }}>
        최장 {stats?.bestStreak ?? 0}일
      </Text>
      <Text style={{ fontSize: 12, color: "#999999" }}>
        30일 중 {activeDaysCount}일
      </Text>
    </View>
  );
}
