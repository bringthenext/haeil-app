import { Pressable, Text, View } from "react-native";
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

export function ItemRow({ item, onToggle, showTagIcon = true, onClassify, suppressCheckedStyle = false, onLongPress, onPressOut, delayLongPress = 400 }: Props) {
  const hasDate = !!item.scheduled_date;

  return (
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
          className={`w-5 h-5 rounded-full border-[1.5px] items-center justify-center ${
            item.is_checked ? "bg-primary border-primary" : "border-[#ccc]"
          }`}
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

      <Pressable
        onPress={() => onToggle(item.id, !item.is_checked)}
        style={{ flex: 1 }}
        hitSlop={4}
      >
        <Text
          className={`text-sm ${
            item.is_checked && !suppressCheckedStyle ? "text-[#999] line-through" : "text-[#1a1a1a]"
          }`}
          numberOfLines={3}
        >
          {item.content}
        </Text>
      </Pressable>

      {/* 날짜 칩: 체크 여부와 무관하게 항상 표시 */}
      {hasDate && (
        <View className="bg-[#f0f0eb] rounded-full px-2 py-0.5">
          <Text className="text-[10px] text-[#888]">
            {formatScheduledDate(item.scheduled_date!)}
          </Text>
        </View>
      )}

      {/* 체크 시각 or ⊹ 아이콘 */}
      {item.is_checked && item.checked_at ? (
        <Text className="text-[10px] text-[#aaa]">
          {formatTime(item.checked_at)}
        </Text>
      ) : onClassify ? (
        <Pressable onPress={onClassify} hitSlop={8}>
          <Text style={{ color: "#bbb", fontSize: 16 }}>⊹</Text>
        </Pressable>
      ) : (
        !hasDate && showTagIcon && (
          <Text className="text-[#bbb] text-sm">⊹</Text>
        )
      )}
    </Pressable>
  );
}
