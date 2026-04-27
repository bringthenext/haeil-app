import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { borderWidth, colors, radius, spacing } from "@/lib/tokens";

type Props = {
  visible: boolean;
  loading: boolean;
  onKeepReal: () => void;
  onKeepAnon: () => void;
};

export function MigrationChoiceModal({ visible, loading, onKeepReal, onKeepAnon }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlaySoft }]} />
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing["4xl"],
            marginHorizontal: spacing["4xl"],
            width: "88%",
          }}
        >
          <Text variant="section" align="center" style={{ marginBottom: spacing.lg }}>
            데이터 충돌
          </Text>
          <Text variant="meta" color="subtle" align="center" style={{ marginBottom: spacing["3xl"] }}>
            비회원으로 작업한 내용과{"\n"}기존 계정 데이터가 모두 있어요.{"\n"}어떤 데이터를 유지할까요?
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing["2xl"] }} />
          ) : (
            <>
              <Pressable
                onPress={onKeepAnon}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.primaryDark : colors.primary,
                  borderRadius: radius.sm,
                  paddingVertical: spacing["2xl"],
                  alignItems: "center",
                  marginBottom: spacing.lg,
                })}
              >
                <Text variant="label" color="white">방금 작업한 내용 가져오기</Text>
              </Pressable>

              <Pressable
                onPress={onKeepReal}
                style={({ pressed }) => ({
                  backgroundColor: "transparent",
                  borderRadius: radius.sm,
                  borderWidth: borderWidth.hairline,
                  borderColor: colors.border,
                  paddingVertical: spacing["2xl"],
                  alignItems: "center",
                })}
              >
                <Text variant="label" color="body">기존 계정 데이터 유지</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
