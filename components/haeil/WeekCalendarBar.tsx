import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Item } from "@/lib/types";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const RANGE = 104;
const TOTAL = RANGE * 2 + 1;
const INITIAL = RANGE;
const MONTH_ROW_H = 52;

type Props = {
  items: Item[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  /** 주간 페이지가 바뀔 때마다 호출 (momentum 종료 시점) */
  onWeekChange?: (weekDates: Date[]) => void;
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date): string {
  return DAY_LABELS[(d.getDay() + 6) % 7];
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(offset: number): Date[] {
  const monday = getMondayOf(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekLabel(offset: number): string {
  const dates = getWeekDates(offset);
  const m = dates[0].getMonth() + 1;
  const d = dates[0].getDate();
  return `${m}월 ${d}일 주`;
}

function generateMonths(): { year: number; month: number }[] {
  const now = new Date();
  const result: { year: number; month: number }[] = [];
  for (let i = -24; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

const ALL_MONTHS = generateMonths();
const ALL_WEEKS = Array.from({ length: TOTAL }, (_, i) => i - RANGE);

export function WeekCalendarBar({ items, selectedDate, onSelectDate, onWeekChange }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const weekListRef = useRef<FlatList>(null);
  const monthListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(INITIAL);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const todayStr = toDateStr(new Date());

  const currentOffset = currentIndex - INITIAL;
  const isCurrentWeek = currentOffset === 0;

  const dotDates = new Set(
    items.map((i) => i.scheduled_date).filter(Boolean) as string[],
  );

  const currentWeekFirstDay = getWeekDates(currentOffset)[0];
  const nowMonth = new Date().getMonth() + 1;
  const nowYear = new Date().getFullYear();

  const viewingMonthIndex = ALL_MONTHS.findIndex(
    ({ year, month }) =>
      year === currentWeekFirstDay.getFullYear() &&
      month === currentWeekFirstDay.getMonth() + 1,
  );

  useEffect(() => {
    setTimeout(() => {
      weekListRef.current?.scrollToIndex({ index: INITIAL, animated: false });
    }, 50);
  }, []);

  useEffect(() => {
    if (showMonthPicker && viewingMonthIndex >= 0) {
      setTimeout(() => {
        monthListRef.current?.scrollToIndex({
          index: Math.max(0, viewingMonthIndex - 3),
          animated: false,
        });
      }, 80);
    }
  }, [showMonthPicker, viewingMonthIndex]);

  function scrollToToday() {
    weekListRef.current?.scrollToIndex({ index: INITIAL, animated: true });
    setCurrentIndex(INITIAL);
    onSelectDate(todayStr);
  }

  function jumpToMonth(year: number, month: number) {
    const target = new Date(year, month - 1, 1);
    const todayMonday = getMondayOf(new Date());
    const diffMs = target.getTime() - todayMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    const clampedOffset = Math.max(-RANGE, Math.min(RANGE, diffWeeks));
    weekListRef.current?.scrollToIndex({ index: INITIAL + clampedOffset, animated: false });
    setCurrentIndex(INITIAL + clampedOffset);
    setShowMonthPicker(false);
  }

  return (
    <View>
      {/* 주 레이블 + 오늘 버튼 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={() => setShowMonthPicker(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
        >
          <Text style={{ fontSize: 11, color: "#888" }}>
            {getWeekLabel(currentOffset)}
          </Text>
          <Text style={{ fontSize: 9, color: "#bbb" }}>∨</Text>
        </Pressable>

        <Pressable
          onPress={scrollToToday}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: "#E1F5EE",
          }}
        >
          <Text style={{ fontSize: 11, color: "#1D9E75", fontWeight: "500" }}>오늘</Text>
        </Pressable>
      </View>

      {/* 7일 페이징 FlatList */}
      <FlatList
        ref={weekListRef}
        horizontal
        pagingEnabled
        data={ALL_WEEKS}
        keyExtractor={(offset) => String(offset)}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={INITIAL}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
          onWeekChange?.(getWeekDates(newIndex - INITIAL));
        }}
        renderItem={({ item: offset }) => {
          const weekDates = getWeekDates(offset);
          return (
            <View style={{ width, flexDirection: "row", paddingHorizontal: 12, paddingBottom: 4 }}>
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
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: bgColor,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: labelColor }}>{dayLabel(d)}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "500", marginTop: 2, color: numColor }}>
                      {d.getDate()}
                    </Text>
                    <View style={{ height: 6, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      {hasDot && (
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: dotColor }} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        }}
      />

      {/* 월 선택 모달 */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setShowMonthPicker(false)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 10,
              paddingBottom: insets.bottom + 16,
              maxHeight: "55%",
            }}
          >
            {/* 핸들 */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#D9D9D9",
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* 타이틀 */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: "#999",
                paddingHorizontal: 20,
                marginBottom: 4,
                letterSpacing: 0.3,
              }}
            >
              월 선택
            </Text>

            <FlatList
              ref={monthListRef}
              data={ALL_MONTHS}
              keyExtractor={({ year, month }) => `${year}-${month}`}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: MONTH_ROW_H,
                offset: MONTH_ROW_H * index,
                index,
              })}
              renderItem={({ item: { year, month }, index }) => {
                const isNow = year === nowYear && month === nowMonth;
                const isViewing = index === viewingMonthIndex;

                return (
                  <Pressable
                    onPress={() => jumpToMonth(year, month)}
                    style={({ pressed }) => ({
                      borderTopWidth: 0.5,
                      borderTopColor: "#f0f0eb",
                      backgroundColor: pressed ? "#f5f5f0" : isViewing ? "#f5f5f0" : "#fff",
                    })}
                  >
                    <View
                      style={{
                        height: MONTH_ROW_H,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 20,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: isNow ? "#1D9E75" : "#1a1a1a",
                          fontWeight: isViewing ? "600" : "400",
                        }}
                      >
                        {year}년 {month}월
                      </Text>
                      {isNow && (
                        <View
                          style={{
                            backgroundColor: "#E1F5EE",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            marginRight: isViewing ? 10 : 0,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: "#1D9E75", fontWeight: "500" }}>
                            이번 달
                          </Text>
                        </View>
                      )}
                      {isViewing && (
                        <Text style={{ fontSize: 14, color: "#1D9E75", fontWeight: "500" }}>✓</Text>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
