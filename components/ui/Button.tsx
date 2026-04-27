import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, spacing } from "@/lib/tokens";
import { Text } from "./Text";

type ButtonVariant = "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type Props = Omit<PressableProps, "style"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sizeStyle: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: spacing["8xl"], paddingHorizontal: spacing["2xl"] },
  md: { minHeight: spacing["10xl"], paddingHorizontal: spacing["4xl"] },
  lg: { minHeight: spacing["12xl"], paddingHorizontal: spacing["5xl"] },
};

const variantStyle: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  ghost: { backgroundColor: colors.surfaceMuted },
  danger: { backgroundColor: colors.danger },
};

const labelColor: Record<ButtonVariant, "white" | "body"> = {
  primary: "white",
  ghost: "body",
  danger: "white",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          alignItems: "center",
          borderRadius: radius.sm,
          flexDirection: "row",
          gap: spacing.lg,
          justifyContent: "center",
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        sizeStyle[size],
        variantStyle[variant],
        style,
      ]}
    >
      {loading && <ActivityIndicator color={variant === "ghost" ? colors.body : colors.white} size="small" />}
      {typeof children === "string" ? (
        <Text color={labelColor[variant]} size={size === "sm" ? "sm" : "base"} weight="semibold">
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
