import { Pressable, Text, View } from "react-native";
import type { Item } from "@/lib/types";

// 월요일 시작
const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

type Props = {
  items: Item[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
};

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekDates(): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0=일
  const diff = (day + 6) % 7; // 월요일까지 거리
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// [월,화,수,목,금,토,일] 인덱스로 변환 (getDay: 0=일,1=월...6=토)
function dayLabel(d: Date): string {
  return DAY_LABELS[(d.getDay() + 6) % 7];
}

export function WeekCalendarBar({ items, selectedDate, onSelectDate }: Props) {
  const todayStr = toDateStr(new Date());
  const weekDates = getWeekDates();

  const dotDates = new Set(
    items.map((i) => i.scheduled_date).filter(Boolean) as string[],
  );

  return (
    <View className="px-3 pb-2">
      <View className="flex-row">
        {weekDates.map((d) => {
          const dateStr = toDateStr(d);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasDot = dotDates.has(dateStr);

          const bgColor = isSelected ? "#1D9E75" : isToday ? "#E1F5EE" : undefined;
          const labelColor = isSelected ? "rgba(255,255,255,0.8)" : isToday ? "#1D9E75" : "#aaa";
          const numColor = isSelected ? "#fff" : isToday ? "#1D9E75" : "#1a1a1a";
          const dotColor = isSelected ? "#fff" : "#1D9E75";

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(isSelected ? null : dateStr)}
              className="flex-1 items-center py-1.5 rounded-xl"
              style={bgColor ? { backgroundColor: bgColor } : undefined}
            >
              <Text className="text-[10px]" style={{ color: labelColor }}>
                {dayLabel(d)}
              </Text>
              <Text className="text-[13px] font-medium mt-0.5" style={{ color: numColor }}>
                {d.getDate()}
              </Text>
              <View className="h-1.5 items-center justify-center mt-0.5">
                {hasDot && (
                  <View className="w-1 h-1 rounded-full" style={{ backgroundColor: dotColor }} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
