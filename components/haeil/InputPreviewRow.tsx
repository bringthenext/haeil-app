import { type LayoutChangeEvent, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { borderWidth, colors, radius, spacing } from "@/lib/tokens";

type Props = {
  text: string;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function InputPreviewRow({ text, onLayout }: Props) {
  return (
    <View onLayout={onLayout} style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.md, opacity: 0.45 }}>
      <View style={{ width: spacing["5xl"], height: spacing["5xl"], borderRadius: radius.full, borderWidth: borderWidth.medium, borderColor: colors.primary }} />
      <Text variant="body" color="primary" style={{ flex: 1 }} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}
