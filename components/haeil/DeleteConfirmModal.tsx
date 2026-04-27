import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { colors, radius, spacing } from "@/lib/tokens";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  recoveryHint?: string;
  onCancel: () => void;
  onConfirm: (dontShowAgain: boolean) => void;
};

export function DeleteConfirmModal({
  visible,
  title,
  message,
  recoveryHint,
  onCancel,
  onConfirm,
}: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing["5xl"] }}
        onPress={onCancel}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            padding: spacing["5xl"],
          }}
        >
          <Text variant="title">{title}</Text>
          <Text variant="body" color="body" style={{ marginTop: spacing["2xl"] }}>
            {message}
          </Text>
          {!!recoveryHint && (
            <Text variant="meta" color="muted" style={{ marginTop: spacing.lg }}>
              {recoveryHint}
            </Text>
          )}

          <Pressable
            onPress={() => setDontShowAgain((value) => !value)}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing["4xl"] }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: radius.xs,
                borderWidth: 1,
                borderColor: dontShowAgain ? colors.primary : colors.hairline,
                backgroundColor: dontShowAgain ? colors.primary : colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {dontShowAgain && <Text size="xs" color="white" weight="bold">✓</Text>}
            </View>
            <Text variant="meta">다시 보지 않기</Text>
          </Pressable>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg, marginTop: spacing["5xl"] }}>
            <Button variant="ghost" size="sm" onPress={onCancel}>취소</Button>
            <Button variant="danger" size="sm" onPress={() => onConfirm(dontShowAgain)}>삭제</Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
