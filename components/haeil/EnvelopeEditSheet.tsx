import { useEffect, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { colors, fontSize, radius, spacing } from "@/lib/tokens";
import type { Envelope } from "@/lib/types";

type Props = {
  visible: boolean;
  envelope: Envelope | null;
  onClose: () => void;
  onRename: (envelope: Envelope, name: string) => void;
  onDelete: (envelope: Envelope) => void;
};

export function EnvelopeEditSheet({ visible, envelope, onClose, onRename, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(envelope?.name ?? "");
  }, [envelope]);

  if (!envelope) return null;

  const trimmed = name.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingHorizontal: spacing["5xl"],
              paddingTop: spacing.xl,
              paddingBottom: insets.bottom + spacing["4xl"],
            }}
          >
            <View style={{ width: spacing["10xl"], height: spacing.sm, borderRadius: radius.xs, backgroundColor: colors.hairline, alignSelf: "center", marginBottom: spacing["4xl"] }} />
            <Text variant="title">envelope 편집</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="envelope 이름"
              placeholderTextColor={colors.disabled}
              style={{
                marginTop: spacing["4xl"],
                borderWidth: 0.5,
                borderColor: colors.borderSubtle,
                borderRadius: radius.sm,
                color: colors.foreground,
                fontSize: fontSize.base,
                paddingHorizontal: spacing["3xl"],
                paddingVertical: spacing["2xl"],
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.lg, marginTop: spacing["5xl"] }}>
              <Button variant="danger" size="sm" onPress={() => onDelete(envelope)}>삭제</Button>
              <View style={{ flexDirection: "row", gap: spacing.lg }}>
                <Button variant="ghost" size="sm" onPress={onClose}>닫기</Button>
                <Button size="sm" disabled={!trimmed} onPress={() => onRename(envelope, trimmed)}>저장</Button>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
