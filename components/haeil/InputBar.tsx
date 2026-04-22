import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type TagKey = "today" | "tomorrow" | "week" | "custom" | null;

type PaperOption = { id: string; name: string };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (content: string, scheduledDate: string | null, paperId: string | null) => void;
  showDatePicker?: boolean;
  placeholder?: string;
  /** 선택 가능한 paper 목록 (없으면 paper 칩 미노출) */
  papers?: PaperOption[];
  /** paper 선택 변경 시 부모에 알림 (preview 라우팅용) */
  onPaperSelect?: (paperId: string | null) => void;
};

const PRESET_OPTIONS: { key: Exclude<TagKey, "custom" | null>; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "tomorrow", label: "내일" },
  { key: "week", label: "일주일" },
];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
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

export function InputBar({
  value,
  onChangeText,
  onSubmit,
  showDatePicker = true,
  placeholder = "할 일 추가...",
  papers,
  onPaperSelect,
}: Props) {
  const [selectedTag, setSelectedTag] = useState<TagKey>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [customDateStr, setCustomDateStr] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  function selectPaper(paperId: string | null) {
    setSelectedPaperId(paperId);
    onPaperSelect?.(paperId);
  }

  const showChips = isFocused || value.length > 0 || showPicker;

  function getScheduledDate(): string | null {
    if (!selectedTag) return null;
    if (selectedTag === "custom") return customDateStr;
    return getPresetDate(selectedTag);
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed, getScheduledDate(), selectedPaperId);
    onChangeText("");
  }

  function handleBlur() {
    setIsFocused(false);
  }

  function handleReset() {
    setSelectedTag(null);
    setCustomDateStr(null);
    setPickerDate(new Date());
    selectPaper(null);
  }

  function handlePresetTap(key: Exclude<TagKey, "custom" | null>) {
    setSelectedTag(selectedTag === key ? null : key);
  }

  function handleCustomTap() {
    if (selectedTag === "custom") {
      setShowPicker(true);
    } else {
      setSelectedTag("custom");
      setShowPicker(true);
    }
  }

  function handlePickerChange(_: unknown, date?: Date) {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (date) {
        setPickerDate(date);
        setCustomDateStr(toDateStr(date));
      } else {
        if (!customDateStr) setSelectedTag(null);
      }
    } else {
      if (date) setPickerDate(date);
    }
  }

  function handlePickerDone() {
    setShowPicker(false);
    setCustomDateStr(toDateStr(pickerDate));
  }

  function handlePickerCancel() {
    setShowPicker(false);
    if (!customDateStr) setSelectedTag(null);
  }

  const customLabel =
    selectedTag === "custom" && customDateStr
      ? formatCustomLabel(pickerDate)
      : "선택...";

  const hasSelection = selectedTag !== null || selectedPaperId !== null;

  return (
    <View style={{ borderTopWidth: 0.5, borderTopColor: "#eee", backgroundColor: "#fff" }}>

      {showChips && (showDatePicker || (papers && papers.length > 0)) && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            {/* 날짜 칩 */}
            {showDatePicker && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingHorizontal: 12, paddingTop: 8 }}
                contentContainerStyle={{ gap: 6, paddingRight: 12 }}
              >
                {PRESET_OPTIONS.map((opt) => {
                  const active = selectedTag === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => handlePresetTap(opt.key)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 20,
                        borderWidth: 0.5,
                        borderColor: active ? "#1D9E75" : "#ddd",
                        backgroundColor: active ? "#1D9E75" : "#fff",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#fff" : "#888" }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={handleCustomTap}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 20,
                    borderWidth: 0.5,
                    borderColor: selectedTag === "custom" ? "#1D9E75" : "#ddd",
                    backgroundColor: selectedTag === "custom" ? "#1D9E75" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: selectedTag === "custom" ? "#fff" : "#888" }}>
                    {customLabel}
                  </Text>
                </Pressable>
              </ScrollView>
            )}

            {/* Paper 선택 칩 */}
            {papers && papers.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingHorizontal: 12, paddingTop: 6 }}
                contentContainerStyle={{ gap: 6, paddingRight: 12 }}
              >
                {papers.map((p) => {
                  const selected = selectedPaperId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => selectPaper(selected ? null : p.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                        borderWidth: 0.5,
                        borderColor: selected ? "#1D9E75" : "#ddd",
                        backgroundColor: selected ? "#E1F5EE" : "#fff",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: selected ? "#1D9E75" : "#aaa" }}>□</Text>
                      <Text style={{ fontSize: 12, color: selected ? "#1D9E75" : "#888" }} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 선택 초기화 버튼 */}
          {hasSelection && (
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              style={{ paddingHorizontal: 12, paddingTop: 8, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 11, color: "#bbb" }}>초기화</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 입력 행 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: 14,
            color: "#1a1a1a",
            backgroundColor: "#f5f5f0",
            borderWidth: 0.5,
            borderColor: "#eee",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
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
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#1D9E75",
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
              borderBottomColor: "white",
              marginBottom: 1,
            }}
          />
        </Pressable>
      </View>

      {/* Android 날짜 피커 */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
        />
      )}

      {/* iOS 날짜 피커 모달 */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handlePickerCancel}
        >
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} onPress={handlePickerCancel} />
          <View style={{ backgroundColor: "#fff" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              <Pressable onPress={handlePickerCancel}>
                <Text style={{ color: "#888", fontSize: 14 }}>취소</Text>
              </Pressable>
              <Pressable onPress={handlePickerDone}>
                <Text style={{ color: "#1D9E75", fontSize: 14, fontWeight: "500" }}>완료</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              onChange={handlePickerChange}
              locale="ko-KR"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}
