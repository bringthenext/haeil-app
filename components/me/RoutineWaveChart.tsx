import { useEffect, useState } from "react";
import { View } from "react-native";
import { BarChart2 } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import { getEnvelopeWaveCounts, type EnvelopeWaveCount } from "@/lib/api/stats";
import { colors } from "@/lib/tokens";

const PALETTE = [
  "#1D9E75", "#0F6E56", "#9FE1CB", "#EF9F27",
  "#E24B4A", "#6B7280", "#8B5CF6", "#F59E0B",
];

export function RoutineWaveChart() {
  const [data, setData] = useState<EnvelopeWaveCount[]>([]);

  useEffect(() => {
    getEnvelopeWaveCounts().then(setData).catch(console.error);
  }, []);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <View className="mb-3 flex-row items-center gap-1.5">
        <BarChart2 size={16} color={colors.primary} />
        <Text size="sm" weight="semibold">루틴별 누적 wave</Text>
      </View>

      {data.length === 0 ? (
        <Text size="xs" color="subtle" align="center" style={{ paddingVertical: 16 }}>
          envelope가 없어요
        </Text>
      ) : (
        <View className="gap-2.5">
          {data.map((item, idx) => {
            const barPct = item.count === 0 ? 0 : Math.max(item.count / maxCount, 0.03);
            const color = item.color ?? PALETTE[idx % PALETTE.length];
            return (
              <View key={item.envelopeId}>
                <View className="mb-1 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: color,
                      }}
                    />
                    <Text
                      size="xs"
                      color="body"
                      numberOfLines={1}
                      style={{ maxWidth: 160 }}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text size="xs" weight="medium">
                    {item.count}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-[#f0f0ec]">
                  <View
                    style={{
                      height: "100%",
                      width: `${barPct * 100}%`,
                      borderRadius: 99,
                      backgroundColor: color,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
