import { useEffect, useState } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import { getWeekWaveStats, type WeekWaveStats } from "@/lib/api/stats";
import { colors, radius } from "@/lib/tokens";

export function WeekWaveCard() {
  const [stats, setStats] = useState<WeekWaveStats | null>(null);

  useEffect(() => {
    getWeekWaveStats().then(setStats).catch(console.error);
  }, []);

  const diff = (stats?.thisWeek ?? 0) - (stats?.lastWeek ?? 0);
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
  const diffText = diff === 0 ? "지난 주와 동일" : `지난 주 ${diff > 0 ? "+" : ""}${diff}`;
  const diffColor = diff > 0 ? colors.primary : diff < 0 ? colors.danger : colors.subtle;

  return (
    <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16 }}>
      <Text variant="caption" weight="bold" style={{ letterSpacing: 0.8, marginBottom: 6 }}>
        이번 주
      </Text>
      <Text variant="display">
        {stats?.thisWeek ?? 0}
      </Text>
      <Text variant="meta" color="body" style={{ marginBottom: 10 }}>waves</Text>
      {diff !== 0 && (
        <Text variant="meta" style={{ color: diffColor }}>
          {arrow} {diffText}
        </Text>
      )}
      {diff === 0 && (
        <Text variant="meta">{diffText}</Text>
      )}
    </View>
  );
}
