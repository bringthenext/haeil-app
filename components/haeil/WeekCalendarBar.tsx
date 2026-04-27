import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text as RNText,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { borderWidth, colors, radius, spacing } from "@/lib/tokens";
import type { Item } from "@/lib/types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]; // JS getDay() 기준
const RANGE = 104;
const TOTAL = RANGE * 2 + 1;
const INITIAL = RANGE;
const MONTH_ROW_H = 52;

type Props = {
  items: Item[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onWeekChange?: (weekDates: Date[]) => void;
  weekStart?: "mon" | "sun";
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

function getWeekStartOf(date: Date, weekStart: "mon" | "sun"): Date {
  const d = new Date(date);
  const diff = weekStart === "mon" ? (d.getDay() + 6) % 7 : d.getDay();
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(offset: number, weekStart: "mon" | "sun"): Date[] {
  const start = getWeekStartOf(new Date(), weekStart);
  start.setDate(start.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getWeekLabel(offset: number, weekStart: "mon" | "sun" = "mon"): string {
  const dates = getWeekDates(offset, weekStart);
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

export function WeekCalendarBar({ items, selectedDate, onSelectDate, onWeekChange, weekStart = "mon" }: Props) {
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

  const currentWeekFirstDay = getWeekDates(currentOffset, weekStart)[0];
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
    const todayMonday = getWeekStartOf(new Date(), weekStart);
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
          paddingHorizontal: spacing["3xl"],
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => setShowMonthPicker(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
        >
          <Text variant="sortTrigger" color="muted">
            {getWeekLabel(currentOffset, weekStart)}
          </Text>
          <RNText style={{ fontSize: 13, color: colors.disabled }}>∨</RNText>
        </Pressable>

        <Pressable
          onPress={scrollToToday}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xs,
            borderRadius: radius.chip,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Text variant="control" color="primary">오늘</Text>
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
          onWeekChange?.(getWeekDates(newIndex - INITIAL, weekStart));
        }}
        renderItem={({ item: offset }) => {
          const weekDates = getWeekDates(offset, weekStart);
          return (
            <View style={{ width, flexDirection: "row", paddingHorizontal: spacing["2xl"], paddingBottom: spacing.sm }}>
              {weekDates.map((d) => {
                const dateStr = toDateStr(d);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasDot = dotDates.has(dateStr);
                const bgColor = isSelected ? colors.primary : isToday ? colors.primarySoft : undefined;
                const labelColor = isSelected ? colors.onPrimaryMuted : isToday ? colors.primary : colors.subtle;
                const numColor = isSelected ? colors.white : isToday ? colors.primary : colors.foreground;
                const dotColor = isSelected ? colors.white : colors.primary;

                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => onSelectDate(isSelected ? null : dateStr)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: spacing.md,
                      borderRadius: radius.md,
                      backgroundColor: bgColor,
                    }}
                  >
                    <Text variant="meta" weight="medium" style={{ color: labelColor }}>{dayLabel(d)}</Text>
                    <Text variant="section" weight="semibold" style={{ marginTop: spacing.xxs, color: numColor }}>
                      {d.getDate()}
                    </Text>
                    <View style={{ height: spacing.md, alignItems: "center", justifyContent: "center", marginTop: spacing.xxs }}>
                      {hasDot && (
                        <View style={{ width: spacing.sm, height: spacing.sm, borderRadius: radius.xs, backgroundColor: dotColor }} />
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
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}
          onPress={() => setShowMonthPicker(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: spacing.xl,
              paddingBottom: insets.bottom + spacing["4xl"],
              maxHeight: "55%",
            }}
          >
            {/* 핸들 */}
            <View
              style={{
                width: spacing["10xl"],
                height: spacing.sm,
                borderRadius: radius.xs,
                backgroundColor: colors.hairline,
                alignSelf: "center",
                marginBottom: spacing["4xl"],
              }}
            />

            {/* 타이틀 */}
            <Text
              variant="sortTrigger"
              weight="semibold"
              style={{ paddingHorizontal: spacing["5xl"], marginBottom: spacing.sm, letterSpacing: 0.3 }}
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
                      borderTopWidth: borderWidth.hairline,
                      borderTopColor: colors.chip,
                      backgroundColor: pressed ? colors.backgroundMuted : isViewing ? colors.backgroundMuted : colors.surface,
                    })}
                  >
                    <View
                      style={{
                        height: MONTH_ROW_H,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: spacing["5xl"],
                      }}
                    >
                      <Text
                        variant="body"
                        weight={isViewing ? "semibold" : "regular"}
                        color={isNow ? "primary" : "foreground"}
                        style={{ flex: 1 }}
                      >
                        {year}년 {month}월
                      </Text>
                      {isNow && (
                        <View
                          style={{
                            backgroundColor: colors.primarySoft,
                            paddingHorizontal: spacing.lg,
                            paddingVertical: spacing.xs,
                            borderRadius: radius.chip,
                            marginRight: isViewing ? spacing.xl : 0,
                          }}
                        >
                          <Text variant="control" color="primary">
                            이번 달
                          </Text>
                        </View>
                      )}
                      {isViewing && (
                        <RNText style={{ fontSize: 15, color: colors.primary }}>✓</RNText>
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
