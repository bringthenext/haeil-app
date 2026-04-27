import { useEffect, useRef } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";

import { Text } from "@/components/ui/Text";
import { colors, fontSize, radius, spacing } from "@/lib/tokens";
import type { Item } from "@/lib/types";

type Props = {
  item: Item;
  onToggle: (id: string, checked: boolean) => void;
  showTagIcon?: boolean;
  onClassify?: () => void;
  /** 완료된 paper 내 아이템: 체크돼도 취소선·회색 적용 안 함 */
  suppressCheckedStyle?: boolean;
  /** SortableList drag 핸들러 — 롱탭 드래그용 */
  onLongPress?: () => void;
  onPressOut?: () => void;
  delayLongPress?: number;
  onMove?: () => void;
  onDelete?: () => void;
  canEditContent?: boolean;
  isEditingContent?: boolean;
  editContent?: string;
  onStartEditContent?: () => void;
  onChangeEditContent?: (content: string) => void;
  onSaveEditContent?: () => void;
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 || 12;
  return `${period} ${displayHour}:${minutes}`;
}

function formatScheduledDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === -1) return "어제";
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";

  const [year, month, day] = dateStr.split("-").map(Number);
  const thisYear = today.getFullYear();
  if (year !== thisYear) return `${year}/${month}/${day}`;
  return `${month}/${day}`;
}

export function ItemRow({
  item,
  onToggle,
  showTagIcon = true,
  onClassify,
  suppressCheckedStyle = false,
  onLongPress,
  onPressOut,
  delayLongPress = 400,
  onMove,
  onDelete,
  canEditContent = false,
  isEditingContent = false,
  editContent,
  onStartEditContent,
  onChangeEditContent,
  onSaveEditContent,
}: Props) {
  const hasDate = !!item.scheduled_date;
  const hasSwipeAction = !!onMove || !!onDelete;
  const swipeableRef = useRef<Swipeable>(null);
  const didTriggerSwipeActionRef = useRef(false);
  const editInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isEditingContent) return;
    requestAnimationFrame(() => editInputRef.current?.focus());
  }, [isEditingContent]);

  const row = (
    <Pressable
      onLongPress={onLongPress ?? onClassify}
      onPressOut={onPressOut}
      delayLongPress={delayLongPress}
      className="flex-row items-center gap-2 py-1.5"
    >
      <Pressable
        onPress={() => onToggle(item.id, !item.is_checked)}
        hitSlop={8}
        className="flex-shrink-0"
      >
        <View
          style={{
            alignItems: "center",
            borderColor: item.is_checked ? colors.primary : "#cccccc",
            borderRadius: 10,
            borderWidth: 1.5,
            height: 20,
            justifyContent: "center",
            width: 20,
            backgroundColor: item.is_checked ? colors.primary : "transparent",
          }}
        >
          {item.is_checked && (
            <View
              style={{
                width: 6,
                height: 3.5,
                borderLeftWidth: 1.5,
                borderBottomWidth: 1.5,
                borderColor: "white",
                transform: [{ rotate: "-45deg" }, { translateY: -1 }],
              }}
            />
          )}
        </View>
      </Pressable>

      {isEditingContent ? (
        <TextInput
          ref={editInputRef}
          value={editContent ?? item.content}
          onChangeText={onChangeEditContent}
          onSubmitEditing={onSaveEditContent}
          onBlur={onSaveEditContent}
          style={{ flex: 1, color: colors.foreground, fontSize: fontSize.base, paddingVertical: 0 }}
          placeholder="item 이름"
          placeholderTextColor={colors.disabled}
          returnKeyType="done"
        />
      ) : (
        <Pressable
          onPress={() => onToggle(item.id, !item.is_checked)}
          style={{ flex: 1 }}
          hitSlop={4}
        >
          <Text
            size="base"
            color={item.is_checked && !suppressCheckedStyle ? "subtle" : "foreground"}
            numberOfLines={3}
            style={{ textDecorationLine: item.is_checked && !suppressCheckedStyle ? "line-through" : "none" }}
          >
            {item.content}
          </Text>
        </Pressable>
      )}

      {canEditContent && !isEditingContent && (
        <Pressable onPress={onStartEditContent} hitSlop={8}>
          <Pencil size={14} color={colors.subtle} />
        </Pressable>
      )}

      {/* 날짜 칩: 체크 여부와 무관하게 항상 표시 */}
      {hasDate && (
        <View className="bg-[#f0f0eb] rounded-full px-2 py-0.5">
          <Text size="xs" color="muted">
            {formatScheduledDate(item.scheduled_date!)}
          </Text>
        </View>
      )}

      {/* 체크 시각 or ⊹ 아이콘 */}
      {item.is_checked && item.checked_at ? (
        <Text size="xs" color="subtle">
          {formatTime(item.checked_at)}
        </Text>
      ) : onClassify ? (
        <Pressable onPress={onClassify} hitSlop={8}>
          <RNText style={{ color: colors.disabled, fontSize: 16 }}>⊹</RNText>
        </Pressable>
      ) : (
        !hasDate && showTagIcon && (
          <RNText style={{ color: colors.disabled, fontSize: 16 }}>⊹</RNText>
        )
      )}
    </Pressable>
  );

  if (!hasSwipeAction) return row;

  return (
    <Swipeable
      ref={swipeableRef}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={(direction) => {
        if (didTriggerSwipeActionRef.current) return;
        didTriggerSwipeActionRef.current = true;
        if (direction === "left") onMove?.();
        if (direction === "right") onDelete?.();
        requestAnimationFrame(() => {
          swipeableRef.current?.close();
          didTriggerSwipeActionRef.current = false;
        });
      }}
      renderLeftActions={() => (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.primarySoft,
            borderRadius: radius.sm,
            justifyContent: "center",
            marginVertical: spacing.xs,
            paddingHorizontal: spacing["4xl"],
          }}
        >
          <Text variant="control" color="primary">이동</Text>
        </View>
      )}
      renderRightActions={() => (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.danger,
            borderRadius: radius.sm,
            justifyContent: "center",
            marginVertical: spacing.xs,
            paddingHorizontal: spacing["4xl"],
          }}
        >
          <Text variant="control" color="white">삭제</Text>
        </View>
      )}
    >
      {row}
    </Swipeable>
  );
}
