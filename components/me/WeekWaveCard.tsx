import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { getWeekWaveStats, type WeekWaveStats } from "@/lib/api/stats";

export function WeekWaveCard() {
  const [stats, setStats] = useState<WeekWaveStats | null>(null);

  useEffect(() => {
    getWeekWaveStats().then(setStats).catch(console.error);
  }, []);

  const diff = (stats?.thisWeek ?? 0) - (stats?.lastWeek ?? 0);
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
  const diffText = diff === 0 ? "지난 주와 동일" : `지난 주 ${diff > 0 ? "+" : ""}${diff}`;
  const diffColor = diff > 0 ? "#1D9E75" : diff < 0 ? "#E24B4A" : "#999999";

  return (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#ffffff", padding: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#999999", letterSpacing: 0.8, marginBottom: 6 }}>
        이번 주
      </Text>
      <Text style={{ fontSize: 36, fontWeight: "800", color: "#1D9E75", lineHeight: 40 }}>
        {stats?.thisWeek ?? 0}
      </Text>
      <Text style={{ fontSize: 13, color: "#555555", marginBottom: 10 }}>waves</Text>
      {diff !== 0 && (
        <Text style={{ fontSize: 12, color: diffColor }}>
          {arrow} {diffText}
        </Text>
      )}
      {diff === 0 && (
        <Text style={{ fontSize: 12, color: "#999999" }}>{diffText}</Text>
      )}
    </View>
  );
}
