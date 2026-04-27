import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { colors, radius, spacing } from "@/lib/tokens";

type PaperOption = {
  id: string;
  name: string;
  envelopeId?: string | null;
  envelopeName?: string;
};

type Props = {
  visible: boolean;
  papers: PaperOption[];
  currentPaperId?: string | null;
  currentEnvelopeId?: string | null;
  currentEnvelopeName?: string;
  onSelect: (paperId: string) => void;
  onClose: () => void;
};

export function MoveItemSheet({
  visible,
  papers,
  currentPaperId,
  currentEnvelopeId,
  currentEnvelopeName = "현재 Envelope",
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const options = papers.filter((paper) => paper.id !== currentPaperId);
  const currentEnvelopePapers = options.filter((paper) => (paper.envelopeId ?? null) === (currentEnvelopeId ?? null));
  const otherEnvelopePapers = options.filter((paper) => (paper.envelopeId ?? null) !== (currentEnvelopeId ?? null));

  const renderPaper = (paper: PaperOption, label: string) => (
    <Pressable
      key={paper.id}
      onPress={() => { onSelect(paper.id); onClose(); }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.backgroundMuted : colors.surface,
      })}
    >
      <View style={{ paddingHorizontal: spacing["5xl"], paddingVertical: spacing["2xl"] }}>
        <Text variant="body">{label}</Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: spacing.xl,
              paddingBottom: insets.bottom + spacing["4xl"],
              maxHeight: "60%",
            }}
          >
            <View style={{ width: spacing["10xl"], height: spacing.sm, borderRadius: radius.xs, backgroundColor: colors.hairline, alignSelf: "center", marginBottom: spacing["4xl"] }} />
            <Text variant="sortTrigger" weight="semibold" style={{ paddingHorizontal: spacing["5xl"], marginBottom: spacing.lg }}>
              어느 paper로 이동할까요?
            </Text>
            {options.length === 0 ? (
              <Text variant="body" color="disabled" align="center" style={{ paddingVertical: spacing["8xl"] }}>
                이동할 paper가 없어요.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {currentEnvelopePapers.length > 0 && (
                  <View>
                    <Text variant="caption" style={{ paddingHorizontal: spacing["5xl"], paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
                      {currentEnvelopeName}
                    </Text>
                    {currentEnvelopePapers.map((paper) => renderPaper(paper, paper.name))}
                  </View>
                )}
                {currentEnvelopePapers.length > 0 && otherEnvelopePapers.length > 0 && (
                  <View style={{ height: 0.5, backgroundColor: colors.borderSubtle, marginVertical: spacing.lg }} />
                )}
                {otherEnvelopePapers.length > 0 && (
                  <View>
                    <Text variant="caption" style={{ paddingHorizontal: spacing["5xl"], paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
                      다른 Envelope
                    </Text>
                    {otherEnvelopePapers.map((paper) =>
                      renderPaper(paper, `${paper.envelopeName ?? "Inbox"}/${paper.name}`),
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
