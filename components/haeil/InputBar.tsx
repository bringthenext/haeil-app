import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
} from "react-native";

import { Text } from "@/components/ui/Text";
import { borderWidth, colors, fontSize, radius, spacing } from "@/lib/tokens";

type TagKey = "today" | "tomorrow" | "week" | "custom" | null;

type PaperOption = { id: string; name: string };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (content: string, scheduledDate: string | null, paperId: string | null) => void;
  showDatePicker?: boolean;
  /** true면 날짜 미선택 시 제출 불가 */
  requireDate?: boolean;
  placeholder?: string;
  /** 선택 가능한 paper 목록 (없으면 paper 칩 미노출) */
  papers?: PaperOption[];
  /** paper 선택 변경 시 부모에 알림 (preview 라우팅용) */
  onPaperSelect?: (paperId: string | null) => void;
  /** composer chips의 paper 추가 액션 */
  onAddPaperPress?: () => void;
  /** preview row 정렬/스크롤용 입력 메타 */
  onPreviewMetaChange?: (meta: { paperId: string | null; scheduledDate: string | null }) => void;
};

const PRESET_OPTIONS: { key: Exclude<TagKey, "custom" | null>; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "tomorrow", label: "내일" },
  { key: "week", label: "일주일" },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetDate(tag: TagKey): string | null {
  if (!tag || tag === "custom") return null;
  const d = new Date();
  if (tag === "tomorrow") d.setDate(d.getDate() + 1);
  if (tag === "week") d.setDate(d.getDate() + 7);
  return toDateStr(d);
}

function formatCustomLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function sameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDates(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d;
  });
}

export function InputBar({
  value,
  onChangeText,
  onSubmit,
  showDatePicker = true,
  requireDate = false,
  placeholder = "할 일 추가...",
  papers,
  onPaperSelect,
  onAddPaperPress,
  onPreviewMetaChange,
}: Props) {
  // requireDate=true 이면 기본값을 "오늘"로 고정
  const [selectedTag, setSelectedTag] = useState<TagKey>(() => requireDate ? "today" : null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [customDateStr, setCustomDateStr] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  function selectPaper(paperId: string | null) {
    setSelectedPaperId(paperId);
    onPaperSelect?.(paperId);
  }

  const showChips = isFocused || value.length > 0 || showPicker;
  const canSubmit = value.trim().length > 0 && (!requireDate || !!getScheduledDate());

  function getScheduledDate(): string | null {
    if (!selectedTag) return null;
    if (selectedTag === "custom") return customDateStr;
    return getPresetDate(selectedTag);
  }

  useEffect(() => {
    onPreviewMetaChange?.({ paperId: selectedPaperId, scheduledDate: getScheduledDate() });
  }, [selectedPaperId, selectedTag, customDateStr, onPreviewMetaChange]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (requireDate && !getScheduledDate()) return; // 날짜 필수
    onSubmit(trimmed, getScheduledDate(), selectedPaperId);
    onChangeText("");
  }

  function handleBlur() {
    setIsFocused(false);
  }

  function handleReset() {
    // requireDate=true 이면 초기화해도 "오늘"로 (null 불가)
    setSelectedTag(requireDate ? "today" : null);
    setCustomDateStr(null);
    setPickerDate(new Date());
    setCalendarMonth(new Date());
    selectPaper(null);
  }

  function handlePresetTap(key: Exclude<TagKey, "custom" | null>) {
    // requireDate=true 이면 이미 선택된 날짜를 해제할 수 없음
    if (requireDate && selectedTag === key) return;
    setSelectedTag(selectedTag === key ? null : key);
  }

  function handleCustomTap() {
    setCalendarMonth(pickerDate);
    setShowPicker(true);
  }

  function handleCalendarSelect(date: Date) {
    setSelectedTag("custom");
    setPickerDate(date);
    setCustomDateStr(toDateStr(date));
    setShowPicker(false);
  }

  function moveCalendarMonth(delta: number) {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function handlePickerCancel() {
    setShowPicker(false);
  }

  const customLabel =
    selectedTag === "custom" && customDateStr
      ? formatCustomLabel(pickerDate)
      : "날짜";

  const hasSelection = selectedTag !== null || selectedPaperId !== null;
  const calendarDates = buildCalendarDates(calendarMonth);
  const today = new Date();

  return (
    <View style={{ borderTopWidth: borderWidth.hairline, borderTopColor: colors.borderSubtle, backgroundColor: colors.surface }}>

      {showChips && (showDatePicker || (papers && papers.length > 0)) && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            {/* 날짜 칩 */}
            {showDatePicker && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingHorizontal: spacing["2xl"], paddingTop: spacing.lg }}
                contentContainerStyle={{ gap: spacing.md, paddingRight: spacing["2xl"] }}
              >
                <Pressable
                  onPress={handleCustomTap}
                  style={{
                    paddingHorizontal: spacing["2xl"],
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                    borderWidth: borderWidth.hairline,
                    borderColor: selectedTag === "custom" ? colors.primary : colors.hairline,
                    backgroundColor: selectedTag === "custom" ? colors.primary : colors.surface,
                  }}
                >
                  <Text variant="label" color={selectedTag === "custom" ? "white" : "muted"}>
                    {customLabel}
                  </Text>
                </Pressable>
                {PRESET_OPTIONS.map((opt) => {
                  const active = selectedTag === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => handlePresetTap(opt.key)}
                      style={{
                        paddingHorizontal: spacing["2xl"],
                        paddingVertical: spacing.sm,
                        borderRadius: radius.full,
                        borderWidth: borderWidth.hairline,
                        borderColor: active ? colors.primary : colors.hairline,
                        backgroundColor: active ? colors.primary : colors.surface,
                      }}
                    >
                      <Text variant="label" color={active ? "white" : "muted"}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Paper 선택 칩 */}
            {((papers && papers.length > 0) || onAddPaperPress) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingHorizontal: spacing["2xl"], paddingTop: spacing.md }}
                contentContainerStyle={{ gap: spacing.md, paddingRight: spacing["2xl"] }}
              >
                {papers?.map((p) => {
                  const selected = selectedPaperId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => selectPaper(selected ? null : p.id)}
                      style={{
                        paddingHorizontal: spacing.xl,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.full,
                        borderWidth: borderWidth.hairline,
                        borderColor: selected ? colors.primary : colors.hairline,
                        backgroundColor: selected ? colors.primarySoft : colors.surface,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.sm,
                      }}
                    >
                      <RNText style={{ fontSize: 13, color: selected ? colors.primary : colors.subtle }}>□</RNText>
                      <Text variant="label" color={selected ? "primary" : "muted"} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
                {onAddPaperPress && (
                  <Pressable
                    onPress={onAddPaperPress}
                    style={{
                      paddingHorizontal: spacing.xl,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.full,
                      borderWidth: borderWidth.hairline,
                      borderColor: colors.hairline,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text variant="label" color="muted">+ 페이퍼 추가</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </View>

          {/* 선택 초기화 버튼 */}
          {hasSelection && (
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              style={{ paddingHorizontal: spacing["2xl"], paddingTop: spacing.lg, alignSelf: "flex-start" }}
            >
              <Text variant="caption" color="disabled">초기화</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 입력 행 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: fontSize.base,
            color: colors.foreground,
            backgroundColor: colors.backgroundMuted,
            borderWidth: borderWidth.hairline,
            borderColor: colors.borderSubtle,
            borderRadius: radius.full,
            paddingHorizontal: spacing["4xl"],
            paddingVertical: spacing.xl,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.disabled}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: spacing["9xl"],
            height: spacing["9xl"],
            borderRadius: radius.full,
            backgroundColor: canSubmit ? colors.primary : colors.iconMuted,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 4,
              borderRightWidth: 4,
              borderBottomWidth: 7,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: colors.white,
              marginBottom: 1,
            }}
          />
        </Pressable>
      </View>

      {/* 캘린더 날짜 선택 모달 */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={handlePickerCancel}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlaySoft }]} onPress={handlePickerCancel} />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingHorizontal: spacing["5xl"] - spacing.xxs,
              paddingTop: spacing["3xl"],
              paddingBottom: spacing["6xl"],
            }}
          >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing["3xl"] }}>
                <Pressable onPress={() => moveCalendarMonth(-1)} hitSlop={spacing.lg} style={{ padding: spacing.md }}>
                  <RNText style={{ color: colors.body, fontSize: 18 }}>‹</RNText>
                </Pressable>
                <Text variant="section">
                  {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                </Text>
                <Pressable onPress={() => moveCalendarMonth(1)} hitSlop={spacing.lg} style={{ padding: spacing.md }}>
                  <RNText style={{ color: colors.body, fontSize: 18 }}>›</RNText>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
                {DAY_LABELS.map((label) => (
                  <Text key={label} variant="caption" align="center" style={{ flex: 1 }}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {calendarDates.map((date) => {
                  const inMonth = date.getMonth() === calendarMonth.getMonth();
                  const selected = selectedTag === "custom" && customDateStr === toDateStr(date);
                  const isToday = sameDate(date, today);

                  return (
                    <Pressable
                      key={toDateStr(date)}
                      onPress={() => handleCalendarSelect(date)}
                      style={{
                        width: `${100 / 7}%`,
                        aspectRatio: 1.15,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: spacing.xs,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: radius.full,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: selected ? colors.primary : isToday ? colors.primarySoft : "transparent",
                          borderWidth: isToday && !selected ? borderWidth.hairline : 0,
                          borderColor: colors.primaryBorder,
                        }}
                      >
                        <Text
                          variant="label"
                          color={selected ? "white" : inMonth ? "foreground" : "disabled"}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
      </Modal>
    </View>
  );
}
