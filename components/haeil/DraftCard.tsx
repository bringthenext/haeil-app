import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { colors, fontSize, radius } from "@/lib/tokens";
import type { Item } from "@/lib/types";
import { InputPreviewRow } from "./InputPreviewRow";
import { ItemRow } from "./ItemRow";
import { SortMenuModal, SORT_OPTIONS } from "./SortMenuModal";
import type { SortKey } from "./SortMenuModal";
import { SortableList } from "./SortableList";
import type { DragHandlers } from "./SortableList";

const VISIBLE_LIMIT = 5;

type Props = {
  items: Item[];
  previewText?: string;
  previewScheduledDate?: string | null;
  onToggle: (id: string, checked: boolean) => void;
  /** inbox: item 분류 콜백 */
  onClassifyItem?: (itemId: string) => void;
  /** papers draft용 인라인 추가 */
  onAddItem?: (content: string) => void;
  /** 완료 처리 콜백 */
  onComplete?: () => void;
  /** 아이템 순서 변경 (custom 정렬 시 drag 활성화) */
  onReorderItems?: (newItems: Item[]) => void;
  /** 아이템 드래그 시작/종료 — 부모 ScrollView 잠금용 */
  onItemDragStart?: () => void;
  onItemDragEnd?: () => void;
  /** 부모 ScrollView 동기 잠금/해제 (setNativeProps 기반) */
  disableParentScroll?: () => void;
  enableParentScroll?: () => void;
  /** 드래그 중 화면 가장자리 도달 시 자동 스크롤 (delta px) */
  scrollBy?: (delta: number) => void;
  onPreviewLayout?: (y: number) => void;
};

function sortItems(items: Item[], sort: SortKey): Item[] {
  if (sort === "custom") {
    return [...items].sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }
  return [...items].sort((a, b) => {
    switch (sort) {
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "created_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "deadline_asc":
        if (!a.scheduled_date && !b.scheduled_date) return 0;
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return a.scheduled_date.localeCompare(b.scheduled_date);
      case "deadline_desc":
        if (!a.scheduled_date && !b.scheduled_date) return 0;
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return b.scheduled_date.localeCompare(a.scheduled_date);
    }
  });
}

export function DraftCard({
  items,
  previewText,
  previewScheduledDate = null,
  onToggle,
  onClassifyItem,
  onAddItem,
  onComplete,
  onReorderItems,
  onItemDragStart,
  onItemDragEnd,
  disableParentScroll,
  enableParentScroll,
  scrollBy,
  onPreviewLayout,
}: Props) {
  const [addText, setAddText] = useState("");
  const [sort, setSort] = useState<SortKey>("created_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isEscapingBottom, setIsEscapingBottom] = useState(false);
  const [listTop, setListTop] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // ── 분류하기 존 위치 측정 ────────────────────────────────────────────────────
  // SortableList 컨테이너 ref — 드래그 시작 시 measureInWindow로 bottom Y 확정
  const sortableWrapRef = useRef<View>(null);
  const classifyZoneY = useRef<number | undefined>(undefined);

  function handleItemDragStart() {
    setIsDragActive(true);
    onItemDragStart?.();
    // 드래그 시작 → SortableList 바닥 = 분류하기 존 상단
    // requestAnimationFrame: isDragActive state가 반영된 후 측정
    requestAnimationFrame(() => {
      sortableWrapRef.current?.measureInWindow((_x, y, _w, h) => {
        classifyZoneY.current = y + h;
      });
    });
  }

  function handleItemDragEnd() {
    setIsDragActive(false);
    setIsEscapingBottom(false);
    classifyZoneY.current = undefined;
    onItemDragEnd?.();
  }

  function handleAddSubmit() {
    const trimmed = addText.trim();
    if (!trimmed || !onAddItem) return;
    onAddItem(trimmed);
    setAddText("");
  }

  const previewItem = useMemo<Item | null>(() => {
    const trimmed = previewText?.trim();
    if (!trimmed) return null;
    const now = new Date().toISOString();
    return {
      id: "__input-preview__",
      user_id: "",
      paper_id: null,
      content: trimmed,
      is_checked: false,
      scheduled_date: previewScheduledDate,
      order: null,
      created_at: now,
      updated_at: now,
      checked_at: null,
      deleted_at: null,
    };
  }, [previewText, previewScheduledDate]);

  const unchecked = sortItems(items.filter((i) => !i.is_checked), sort);
  const checked = [...items.filter((i) => i.is_checked)].sort(
    (a, b) => new Date(b.checked_at!).getTime() - new Date(a.checked_at!).getTime(),
  );
  const uncheckedRows = previewItem
    ? sortItems([...items.filter((i) => !i.is_checked), previewItem], sort).map((item) =>
        item.id === previewItem.id ? ({ type: "preview" as const, text: item.content }) : ({ type: "item" as const, item }),
      )
    : unchecked.map((item) => ({ type: "item" as const, item }));
  const total = unchecked.length + checked.length;
  const visibleTotal = total + (previewItem ? 1 : 0);
  const checkedCount = checked.length;
  const needsExpand = visibleTotal > VISIBLE_LIMIT;
  const hiddenCount = visibleTotal - VISIBLE_LIMIT;
  const previewIndex = uncheckedRows.findIndex((row) => row.type === "preview");
  const displayUncheckedRows = isExpanded ? uncheckedRows : uncheckedRows.slice(0, Math.min(VISIBLE_LIMIT, uncheckedRows.length));
  const displayUncheckedItems = displayUncheckedRows
    .filter((row): row is { type: "item"; item: Item } => row.type === "item")
    .map((row) => row.item);
  const displayChecked = isExpanded
    ? checked
    : checked.slice(0, Math.max(0, VISIBLE_LIMIT - displayUncheckedRows.length));
  const isEmpty = total === 0 && !previewText;

  useEffect(() => {
    if (previewIndex >= VISIBLE_LIMIT) setIsExpanded(true);
  }, [previewIndex]);

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: radius.sm,
        borderWidth: 0.5,
        borderColor: "#cccccc",
        borderStyle: "dashed",
        backgroundColor: "#f8f8f4",
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      {/* 헤더 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text variant="caption" style={{ letterSpacing: 1.5 }}>
          TODO
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => setShowSortMenu(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            hitSlop={8}
          >
            <Text variant="sortTrigger">
              {SORT_OPTIONS.find((o) => o.key === sort)!.label}
            </Text>
            <RNText style={{ color: colors.subtle, fontSize: 13 }}>∨</RNText>
          </Pressable>
          {total > 0 && (
            <Text variant="meta">{checkedCount}/{total}</Text>
          )}
        </View>
      </View>

      <SortMenuModal
        visible={showSortMenu}
        currentKey={sort}
        onSelect={setSort}
        onClose={() => setShowSortMenu(false)}
      />

      {/* 프로그레스 바 */}
      <View style={{ height: 0.5, backgroundColor: "#eee", borderRadius: 1, marginBottom: 10 }}>
        <View
          style={{
            height: 0.5,
            backgroundColor: colors.primary,
            borderRadius: 1,
            width: total > 0 ? `${(checkedCount / total) * 100}%` : "0%",
          }}
        />
      </View>

      {/* 미체크 아이템 — SortableList (RNGH 기반) */}
      <View
        ref={sortableWrapRef}
        onLayout={(event) => setListTop(event.nativeEvent.layout.y)}
      >
        {previewItem ? (
          displayUncheckedRows.map((row) =>
            row.type === "preview" ? (
              <InputPreviewRow
                key="preview"
                text={row.text}
                onLayout={(event) => onPreviewLayout?.(listTop + event.nativeEvent.layout.y)}
              />
            ) : (
              <ItemRow
                key={row.item.id}
                item={row.item}
                onToggle={onToggle}
                onClassify={onClassifyItem ? () => onClassifyItem(row.item.id) : undefined}
              />
            ),
          )
        ) : (
          <SortableList
            data={displayUncheckedItems}
            keyExtractor={(item) => item.id}
            renderItem={(item: Item, _: number, dh: DragHandlers) => (
              <ItemRow
                item={item}
                onToggle={onToggle}
                onClassify={onClassifyItem ? () => onClassifyItem(item.id) : undefined}
                onLongPress={dh.onLongPress}
                onPressOut={dh.onPressOut}
                delayLongPress={dh.delayLongPress}
              />
            )}
            onReorder={(newUnchecked) => {
              setSort("custom"); // 드래그 리오더 시 자동으로 사용자 지정 전환
              const reordered = newUnchecked as Item[];
              const reorderedIds = new Set(reordered.map((item) => item.id));
              const hiddenUnchecked = unchecked.filter((item) => !reorderedIds.has(item.id));
              onReorderItems?.([...reordered, ...hiddenUnchecked, ...checked]);
            }}
            itemHeight={32}
            onDragStart={handleItemDragStart}
            onDragEnd={handleItemDragEnd}
            onEscapeBottom={onClassifyItem ? (item: Item) => { onClassifyItem(item.id); } : undefined}
            onDragOutOfBounds={onClassifyItem ? (dir: "top" | "bottom" | null) => {
              setIsEscapingBottom(dir === "bottom");
            } : undefined}
            onDragMoveY={onClassifyItem ? (absY: number) => {
              if (classifyZoneY.current !== undefined) {
                setIsEscapingBottom(absY >= classifyZoneY.current);
              }
            } : undefined}
            classifyZoneYRef={onClassifyItem ? classifyZoneY : undefined}
            disableParentScroll={disableParentScroll}
            enableParentScroll={enableParentScroll}
            scrollBy={scrollBy}
          />
        )}
      </View>

      {/* 분류하기 드롭 존 — 드래그 중에만 표시 */}
      {isDragActive && onClassifyItem && (
        <View
          style={{
            marginTop: 6,
            paddingVertical: 14,
            borderRadius: radius.sm,
            borderWidth: isEscapingBottom ? 1.5 : 1,
            borderStyle: "dashed",
            borderColor: isEscapingBottom ? colors.primary : "#aaaaaa",
            backgroundColor: isEscapingBottom ? colors.primarySoft : colors.chip,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Text variant="label" color={isEscapingBottom ? "primary" : "body"} weight={isEscapingBottom ? "bold" : "medium"} style={{ letterSpacing: 0.2 }}>
            {isEscapingBottom ? "✓  여기서 손 떼면 분류" : "↓  분류하기"}
          </Text>
          {!isEscapingBottom && (
            <Text variant="caption">이 영역으로 드래그하세요</Text>
          )}
        </View>
      )}

      {/* 체크된 아이템 */}
      {displayChecked.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          onToggle={onToggle}
        />
      ))}

      {/* 더보기 / 접기 */}
      {needsExpand && !isExpanded && (
        <Pressable
          onPress={() => setIsExpanded(true)}
          style={{ paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#eee" }}
        >
          <Text variant="control" align="center">
            {hiddenCount}개 더보기
          </Text>
        </Pressable>
      )}
      {needsExpand && isExpanded && (
        <Pressable
          onPress={() => setIsExpanded(false)}
          style={{ paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#eee" }}
        >
          <Text variant="control" align="center">접기</Text>
        </Pressable>
      )}

      {/* 빈 상태 */}
      {isEmpty && !onAddItem && (
        <View style={{ paddingVertical: 12 }}>
          <Text variant="meta" color="disabled" align="center">
            아직 항목이 없어요.
          </Text>
        </View>
      )}

      {/* 항목 추가 (papers draft용 인라인) */}
      {onAddItem && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#eee" }}>
          <Pressable onPress={() => inputRef.current?.focus()} hitSlop={8}>
            <RNText style={{ color: colors.disabled, fontSize: 18 }}>+</RNText>
          </Pressable>
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: fontSize.base, color: colors.foreground, paddingVertical: 2 }}
            placeholder="항목 추가..."
            placeholderTextColor="#ccc"
            value={addText}
            onChangeText={setAddText}
            onSubmitEditing={handleAddSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>
      )}

      {/* 완료 버튼 */}
      {onComplete && total > 0 && (
        <View style={{ alignItems: "flex-end", paddingTop: 10, marginTop: 6, borderTopWidth: 0.5, borderTopColor: "#eee" }}>
          <Button onPress={onComplete} size="sm">완료</Button>
        </View>
      )}
    </View>
  );
}
