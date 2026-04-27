import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { colors, fontFamily, fontSize, lineHeight } from "@/lib/tokens";

type TextSize = keyof typeof fontSize;
type TextWeight = "regular" | "medium" | "semibold" | "bold";
type TextColor = keyof typeof colors;
type TextVariant =
  | "caption"
  | "meta"
  | "body"
  | "label"
  | "sortTrigger"
  | "control"
  | "section"
  | "title"
  | "display";

type Props = RNTextProps & {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  variant?: TextVariant;
  align?: TextStyle["textAlign"];
};

const weightFamily: Record<TextWeight, string> = {
  regular: fontFamily.regular,
  medium: fontFamily.medium,
  semibold: fontFamily.semibold,
  bold: fontFamily.bold,
};

const variantStyle: Record<TextVariant, { size: TextSize; weight: TextWeight; color: TextColor }> = {
  caption: { size: "xs", weight: "medium", color: "subtle" },
  meta: { size: "sm", weight: "regular", color: "subtle" },
  body: { size: "base", weight: "regular", color: "foreground" },
  label: { size: "sm", weight: "semibold", color: "body" },
  sortTrigger: { size: "sm", weight: "regular", color: "subtle" },
  control: { size: "sm", weight: "semibold", color: "muted" },
  section: { size: "md", weight: "semibold", color: "foreground" },
  title: { size: "lg", weight: "semibold", color: "foreground" },
  display: { size: "3xl", weight: "bold", color: "primary" },
};

export function Text({
  size,
  weight,
  color,
  variant,
  align,
  style,
  ...props
}: Props) {
  const resolved = variant ? variantStyle[variant] : variantStyle.body;
  const resolvedSize = size ?? resolved.size;
  const resolvedWeight = weight ?? resolved.weight;
  const resolvedColor = color ?? resolved.color;

  return (
    <RNText
      {...props}
      style={[
        {
          color: colors[resolvedColor],
          fontFamily: weightFamily[resolvedWeight],
          fontSize: fontSize[resolvedSize],
          lineHeight: lineHeight[resolvedSize],
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
