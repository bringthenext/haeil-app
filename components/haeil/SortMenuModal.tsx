import { Modal, Pressable, StyleSheet, Text as RNText, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { borderWidth, colors, radius, spacing } from "@/lib/tokens";

export type SortKey = "custom" | "created_desc" | "created_asc" | "deadline_desc" | "deadline_asc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "custom", label: "사용자 지정" },
  { key: "created_asc", label: "생성일 ↑" },
  { key: "created_desc", label: "생성일 ↓" },
  { key: "deadline_asc", label: "마감일 ↑" },
  { key: "deadline_desc", label: "마감일 ↓" },
];

type Props = {
  visible: boolean;
  currentKey: SortKey;
  onSelect: (key: SortKey) => void;
  onClose: () => void;
};

export function SortMenuModal({ visible, currentKey, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlaySoft }]} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingBottom: spacing["6xl"],
            paddingTop: spacing.lg,
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: spacing.md, marginBottom: spacing.sm }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle }} />
          </View>
          {SORT_OPTIONS.map((opt, idx) => (
            <Pressable
              key={opt.key}
              onPress={() => { onSelect(opt.key); onClose(); }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfacePressed : "transparent",
              })}
            >
              <View
                style={{
                  paddingHorizontal: spacing["4xl"],
                  paddingVertical: spacing["2xl"],
                  borderTopWidth: idx > 0 ? borderWidth.hairline : 0,
                  borderTopColor: colors.borderSubtle,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="body" color={currentKey === opt.key ? "primary" : "foreground"}>
                  {opt.label}
                </Text>
                {currentKey === opt.key && (
                  <RNText style={{ color: colors.primary, fontSize: 15 }}>✓</RNText>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
