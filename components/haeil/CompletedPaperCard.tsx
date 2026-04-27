import { Pressable, Text as RNText, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { colors, radius } from "@/lib/tokens";
import type { Item, Paper } from "@/lib/types";
import { ItemRow } from "./ItemRow";

type Props = {
  paper: Paper;
  items: Item[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleItem: (id: string, checked: boolean) => void;
  onToggleFavorite?: () => void;
  waveCount?: number;
};

function formatCompletedTime(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h < 12 ? "오전" : "오후";
  const time = `${ap} ${h % 12 || 12}:${m}`;
  if (isToday) return time;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

export function CompletedPaperCard({
  paper,
  items,
  isExpanded,
  onToggleExpand,
  onToggleItem,
  onToggleFavorite,
  waveCount = 0,
}: Props) {
  const checkedCount = items.filter((i) => i.is_checked).length;
  const sorted = [
    ...items.filter((i) => i.is_checked),
    ...items.filter((i) => !i.is_checked),
  ];

  // 서브텍스트 조각 조합
  const subParts: string[] = [];
  if (items.length > 0) subParts.push(`${checkedCount}/${items.length}`);
  if (paper.completed_at) subParts.push(formatCompletedTime(paper.completed_at));
  const subText = subParts.join("  ·  ");

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 5,
        borderRadius: radius.sm,
        borderWidth: 0.5,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      {/* 헤더 — Pressable에는 bg만, 레이아웃은 내부 View에 */}
      <Pressable
        onPress={onToggleExpand}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
        })}
      >
        <View style={{ paddingHorizontal: 10, paddingTop: 9, paddingBottom: isExpanded && sorted.length > 0 ? 5 : 9 }}>
          {/* 1행: 제목 + ★ + ∧/∨ */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              size="base"
              weight="medium"
              style={{ flex: 1, marginRight: 8 }}
              numberOfLines={1}
            >
              {paper.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {onToggleFavorite && (
                <Pressable onPress={onToggleFavorite} hitSlop={8}>
                  <RNText style={{ fontSize: 17, color: paper.is_favorite ? colors.warning : colors.hairline }}>★</RNText>
                </Pressable>
              )}
              <RNText style={{ fontSize: 13, color: "#cccccc" }}>{isExpanded ? "∧" : "∨"}</RNText>
            </View>
          </View>

          {/* 2행: 체크 현황 · 완료 시각 · wave 수 */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 6 }}>
            {!!subText && (
              <Text size="xs" color="disabled">{subText}</Text>
            )}
            {waveCount > 0 && (
              <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm }}>
                <Text size="xs" color="primary" weight="medium">
                  {waveCount} waves
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* 아이템 목록 — 펼침 시 */}
      {isExpanded && sorted.length > 0 && (
        <View style={{ paddingHorizontal: 10, paddingBottom: 9 }}>
          {sorted.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={onToggleItem} showTagIcon={false} suppressCheckedStyle />
          ))}
        </View>
      )}
    </View>
  );
}
