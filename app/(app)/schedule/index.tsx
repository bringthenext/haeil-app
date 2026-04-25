import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlobalSortableList, type DragHandlers } from "@/components/haeil/GlobalSortableList";
import { InputBar } from "@/components/haeil/InputBar";
import { WeekCalendarBar } from "@/components/haeil/WeekCalendarBar";
import { useSession } from "@/hooks/useSession";
import {
  addItem,
  getScheduledItemsWithSource,
  toggleItem,
  updateItemOrders,
  updateItemScheduledDate,
} from "@/lib/api/items";
import { getPapers } from "@/lib/api/papers";
import type { ScheduledItemRow } from "@/lib/api/items";

// ─── Flat list 엔트리 ─────────────────────────────────────────────────────────
// 날짜 헤더와 할일 아이템을 하나의 배열로 관리.
// drag end 시 헤더 위치 기준으로 각 아이템의 날짜·순서를 확정한다.
type HeaderEntry = { kind: "header"; key: string; date: string };
type ItemEntry   = { kind: "item";   key: string; date: string; item: ScheduledItemRow };
type FlatEntry   = HeaderEntry | ItemEntry;

// ─── 유틸 ────────────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string, todayStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dayName = days[d.getDay()];
  const yesterdayStr = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toDateStr(y);
  })();
  if (dateStr === todayStr)     return `오늘 · ${month}월 ${date}일`;
  if (dateStr === yesterdayStr) return `어제 · ${month}월 ${date}일`;
  return `${dayName} · ${month}월 ${date}일`;
}

// ─── 날짜 헤더 높이 / 아이템 높이 (GlobalSortableList의 getItemHeight 기준) ──
// SectionHeader: paddingTop:16 + text(fontSize12, lineHeight≈16) + paddingBottom:5 ≈ 37
// ScheduleItem: outer paddingBottom:3 + inner paddingVertical:8*2 + content(fontSize13, lineHeight≈18) ≈ 37
const HEADER_H = 37;
const ITEM_H   = 37;

function getEntryHeight(entry: FlatEntry): number {
  return entry.kind === "header" ? HEADER_H : ITEM_H;
}

// ─── 날짜 헤더 컴포넌트 ──────────────────────────────────────────────────────
function SectionHeader({ date, todayStr }: { date: string; todayStr: string }) {
  const isPast  = date < todayStr;
  const isToday = date === todayStr;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 5,
        backgroundColor: "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: isToday ? "700" : "500",
          color: isToday ? "#1D9E75" : isPast ? "#aaa" : "#555",
        }}
      >
        {formatDateLabel(date, todayStr)}
      </Text>
      {isPast && !isToday && (
        <View style={{ backgroundColor: "#FFE8E8", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
          <Text style={{ fontSize: 10, color: "#E24B4A" }}>지남</Text>
        </View>
      )}
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const { userId } = useSession();

  const [scheduledItems, setScheduledItems] = useState<ScheduledItemRow[]>([]);
  const [activePapers, setActivePapers]     = useState<{ id: string; name: string }[]>([]);
  const [inputText, setInputText]           = useState("");
  const [refreshing, setRefreshing]         = useState(false);
  const [selectedDate, setSelectedDate]     = useState<string | null>(null);

  const todayStr = toDateStr(new Date());

  // ── 날짜 범위: 기본 3일 전 ~ 6일 후, 주간 스와이프 시 동적 확장 ───────────
  const [dateRange, setDateRange] = useState<string[]>(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = -3; i <= 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(toDateStr(d));
    }
    return dates;
  });

  // target 날짜가 dateRange 밖이면 range를 그쪽으로 확장 (연속된 날짜 유지)
  const ensureDateInRange = useCallback((targetDate: string) => {
    setDateRange((prev) => {
      const first = prev[0];
      const last = prev[prev.length - 1];
      if (targetDate >= first && targetDate <= last) return prev;
      const startStr = targetDate < first ? targetDate : first;
      const endStr   = targetDate > last  ? targetDate : last;
      const result: string[] = [];
      const d = new Date(startStr + "T00:00:00");
      const end = new Date(endStr + "T00:00:00");
      while (d <= end) {
        result.push(toDateStr(d));
        d.setDate(d.getDate() + 1);
      }
      return result;
    });
  }, []);

  // ── 날짜별 섹션 ─────────────────────────────────────────────────────────────
  const sections = useMemo(() => {
    const map = new Map<string, ScheduledItemRow[]>();
    for (const date of dateRange) map.set(date, []);
    for (const item of scheduledItems) {
      if (!item.scheduled_date) continue;
      const arr = map.get(item.scheduled_date) ?? [];
      arr.push(item);
      map.set(item.scheduled_date, arr);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items: [...items].sort((a, b) => {
          if (a.order !== null && b.order !== null) return a.order - b.order;
          if (a.order !== null) return -1;
          if (b.order !== null) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }),
      }));
  }, [scheduledItems, dateRange]);

  // ── Flat data: 헤더 + 아이템을 하나의 배열로 ────────────────────────────────
  const flatData = useMemo<FlatEntry[]>(() => {
    const result: FlatEntry[] = [];
    for (const section of sections) {
      result.push({ kind: "header", key: `hdr-${section.date}`, date: section.date });
      for (const item of section.items) {
        result.push({ kind: "item", key: item.id, date: section.date, item });
      }
    }
    return result;
  }, [sections]);

  // ── 데이터 패치 ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [items, papers] = await Promise.all([
        getScheduledItemsWithSource(),
        getPapers(),
      ]);
      setScheduledItems(items);
      setActivePapers(
        papers
          .filter((p) => p.status === "active" && p.name !== null)
          .map((p) => ({ id: p.id, name: p.name! })),
      );
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── 오늘 섹션으로 스크롤 ────────────────────────────────────────────────────
  // 초기 fetch 완료 후 flatData가 안정되면 한 번 스크롤.
  const scrollViewRef = useRef<ScrollView>(null);
  const flatDataRef = useRef(flatData);
  flatDataRef.current = flatData;

  const scrollToToday = useCallback((animated: boolean) => {
    const entries = flatDataRef.current;
    let y = 0;
    for (const entry of entries) {
      if (entry.kind === "header" && entry.date === todayStr) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 4), animated });
        return;
      }
      y += getEntryHeight(entry);
    }
  }, [todayStr]);

  const shouldScrollToTodayRef = useRef(true);
  const didInitialFetchRef = useRef(false);

  useEffect(() => {
    if (!shouldScrollToTodayRef.current || !didInitialFetchRef.current) return;
    shouldScrollToTodayRef.current = false;
    const t = setTimeout(() => scrollToToday(false), 50);
    return () => clearTimeout(t);
  }, [flatData, scrollToToday]);

  useFocusEffect(useCallback(() => {
    shouldScrollToTodayRef.current = true;
    fetchAll().finally(() => {
      didInitialFetchRef.current = true;
      // flatData가 이미 최신이라 useEffect가 안 탈 수 있으니 직접 시도
      if (shouldScrollToTodayRef.current) {
        shouldScrollToTodayRef.current = false;
        setTimeout(() => scrollToToday(false), 50);
      }
    });
  }, [fetchAll, scrollToToday]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── 주간 캘린더 스와이프 → 해당 주 월요일 헤더로 스크롤 ────────────────────
  // dateRange 확장 후 flatData 업데이트를 기다려야 하므로 pending ref로 처리
  const pendingScrollDateRef = useRef<string | null>(null);

  const tryScrollToPending = useCallback(() => {
    const pending = pendingScrollDateRef.current;
    if (!pending) return false;
    let y = 0;
    for (const entry of flatDataRef.current) {
      if (entry.kind === "header" && entry.date === pending) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
        pendingScrollDateRef.current = null;
        return true;
      }
      y += getEntryHeight(entry);
    }
    return false;
  }, []);

  const handleWeekChange = useCallback((weekDates: Date[]) => {
    const targetStr = toDateStr(weekDates[0]); // 월요일 (해당 주의 첫 번째 요일)
    setSelectedDate(targetStr);
    ensureDateInRange(targetStr);
    pendingScrollDateRef.current = targetStr;
    // 범위 안이면 flatData가 안 바뀌어 effect가 안 탈 수 있으므로 즉시 시도
    setTimeout(tryScrollToPending, 30);
  }, [ensureDateInRange, tryScrollToPending]);

  // dateRange가 확장되어 flatData가 바뀐 경우 한 프레임 뒤 재시도
  useEffect(() => {
    if (!pendingScrollDateRef.current) return;
    const t = setTimeout(tryScrollToPending, 30);
    return () => clearTimeout(t);
  }, [flatData, tryScrollToPending]);

  // ── 날짜 탭 → 해당 섹션으로 스크롤 ─────────────────────────────────────────
  function handleSelectDate(date: string | null) {
    setSelectedDate(date);
    if (!date) return;
    // 해당 헤더의 content Y 계산
    let y = 0;
    for (const entry of flatData) {
      if (entry.kind === "header" && entry.date === date) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
        return;
      }
      y += getEntryHeight(entry);
    }
  }

  // ── 아이템 체크/언체크 ──────────────────────────────────────────────────────
  const handleToggle = useCallback(async (id: string, checked: boolean) => {
    const checkedAt = checked ? new Date().toISOString() : null;
    setScheduledItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_checked: checked, checked_at: checkedAt } : i)),
    );
    try {
      await toggleItem(id, checked);
    } catch {
      setScheduledItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_checked: !checked, checked_at: null } : i)),
      );
    }
  }, []);

  // ── 드래그 완료 → 날짜 + 순서 일괄 갱신 ────────────────────────────────────
  // 새 배열을 순서대로 순회:
  //   헤더를 만날 때마다 "현재 날짜" 갱신
  //   아이템은 바로 위 헤더의 날짜 + 해당 섹션 내 순서 확정
  function handleDragEnd(newFlatData: FlatEntry[]) {
    let currentDate = sections[0]?.date ?? todayStr;
    const updates: Array<{ id: string; newDate: string; newOrder: number }> = [];
    const orderCountByDate: Record<string, number> = {};

    for (const entry of newFlatData) {
      if (entry.kind === "header") {
        currentDate = entry.date;
      } else {
        if (!orderCountByDate[currentDate]) orderCountByDate[currentDate] = 0;
        updates.push({
          id: entry.item.id,
          newDate: currentDate,
          newOrder: orderCountByDate[currentDate]++,
        });
      }
    }

    const prevItems = scheduledItems;

    // 낙관적 업데이트
    setScheduledItems((prev) =>
      prev.map((item) => {
        const u = updates.find((x) => x.id === item.id);
        return u ? { ...item, scheduled_date: u.newDate, order: u.newOrder } : item;
      }),
    );

    // API 병렬 호출
    const dateChanges = updates.filter((u) => {
      const old = prevItems.find((i) => i.id === u.id);
      return old && old.scheduled_date !== u.newDate;
    });

    Promise.all([
      ...dateChanges.map((u) => updateItemScheduledDate(u.id, u.newDate)),
      updateItemOrders(updates.map((u) => ({ id: u.id, order: u.newOrder }))),
    ]).catch(() => fetchAll());
  }

  // ── 아이템 추가 ─────────────────────────────────────────────────────────────
  async function handleSubmit(
    content: string,
    scheduledDate: string | null,
    paperId: string | null,
  ) {
    if (!userId || !scheduledDate) return;
    try {
      const created = await addItem(userId, {
        content,
        paper_id: paperId,
        scheduled_date: scheduledDate,
      });
      const source = paperId
        ? (activePapers.find((p) => p.id === paperId)?.name ?? "inbox")
        : "inbox";
      setScheduledItems((prev) => [...prev, { ...created, source }]);
    } catch { /* silent */ }
  }

  // ── 스케줄 아이템 행 렌더 ───────────────────────────────────────────────────
  function renderScheduleItem(
    item: ScheduledItemRow,
    date: string,
    isActive: boolean,
    dragHandlers: DragHandlers,
  ) {
    const isPast  = date < todayStr;
    const isToday = date === todayStr;
    const isInbox = item.source === "inbox";

    return (
      <Pressable
        onLongPress={dragHandlers.onLongPress}
        onPressOut={dragHandlers.onPressOut}
        delayLongPress={dragHandlers.delayLongPress}
        style={{ paddingHorizontal: 12, paddingBottom: 3 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: isActive ? "#fff" : isToday ? "#E1F5EE" : "#f5f5f0",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          {/* 체크 버튼 */}
          <Pressable onPress={() => handleToggle(item.id, !item.is_checked)} hitSlop={8}>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 1.5,
                borderColor: item.is_checked ? "#1D9E75" : isToday ? "#1D9E75" : "#ccc",
                backgroundColor: item.is_checked ? "#1D9E75" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.is_checked && (
                <View
                  style={{
                    width: 5,
                    height: 3,
                    borderLeftWidth: 1.5,
                    borderBottomWidth: 1.5,
                    borderColor: "white",
                    transform: [{ rotate: "-45deg" }, { translateY: -0.5 }],
                  }}
                />
              )}
            </View>
          </Pressable>

          {/* 내용 */}
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: item.is_checked ? "#999" : "#1a1a1a",
              textDecorationLine: item.is_checked ? "line-through" : "none",
            }}
            numberOfLines={2}
          >
            {item.content}
          </Text>

          {/* 출처 뱃지 */}
          <View
            style={{
              backgroundColor: isInbox ? "#eee" : "#E1F5EE",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
              borderWidth: isInbox ? 0 : 0.5,
              borderColor: isInbox ? "transparent" : "#9FE1CB",
            }}
          >
            <Text style={{ fontSize: 10, color: isInbox ? "#aaa" : "#0F6E56" }}>
              {item.source}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // ── GlobalSortableList renderItem ────────────────────────────────────────
  const renderItem = (
    entry: FlatEntry,
    _index: number,
    dragHandlers: DragHandlers,
    isActive: boolean,
  ) => {
    if (entry.kind === "header") {
      return <SectionHeader date={entry.date} todayStr={todayStr} />;
    }
    return renderScheduleItem(entry.item, entry.date, isActive, dragHandlers);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={56}
      >
        {/* 헤더 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: "#1a1a1a" }}>schedule</Text>
        </View>

        {/* 주간 캘린더 바 */}
        <WeekCalendarBar
          items={scheduledItems}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onWeekChange={handleWeekChange}
        />

        <View style={{ height: 0.5, backgroundColor: "#eee", marginHorizontal: 12, marginBottom: 4 }} />

        {/* 드래그 가능한 날짜별 아이템 리스트 */}
        <GlobalSortableList<FlatEntry>
          data={flatData}
          keyExtractor={(e) => e.key}
          isDraggable={(e) => e.kind === "item"}
          getItemHeight={getEntryHeight}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: 80 }}
          onScrollToRef={(ref) => { (scrollViewRef as any).current = ref; }}
        />

        {/* 하단 입력창 */}
        <InputBar
          value={inputText}
          onChangeText={setInputText}
          onSubmit={handleSubmit}
          requireDate
          papers={activePapers}
          placeholder="할 일 추가..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
