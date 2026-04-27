import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { colors, fontSize, radius } from "@/lib/tokens";
import type { Item, Paper } from "@/lib/types";
import { InputPreviewRow } from "./InputPreviewRow";
import { ItemRow } from "./ItemRow";
import { SortableList } from "./SortableList";
import type { DragHandlers } from "./SortableList";

import { SortMenuModal, SORT_OPTIONS } from "./SortMenuModal";
import type { SortKey } from "./SortMenuModal";

type Props = {
  paper: Paper;
  items: Item[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleItem: (id: string, checked: boolean) => void;
  onComplete: () => void;
  onAddItem: (content: string) => void;
  onReorderItems?: (newItems: Item[]) => void;
  /** 아이템을 분류할 때 호출 (드래그 → 분류하기 존 → 손 떼기) */
  onClassifyItem?: (itemId: string) => void;
  isPaperEditMode?: boolean;
  editName?: string;
  onChangeEditName?: (name: string) => void;
  onStartPaperEdit?: () => void;
  onSavePaperEdit?: () => void;
  onDeletePaper?: () => void;
  onMoveItem?: (item: Item) => void;
  onDeleteItem?: (item: Item) => void;
  editingItemId?: string | null;
  editItemContent?: string;
  onStartEditItem?: (item: Item) => void;
  onChangeEditItemContent?: (content: string) => void;
  onSaveEditItem?: (item: Item) => void;
  previewText?: string;
  previewScheduledDate?: string | null;
  /** SortableList drag 핸들러 — 카드 자체를 드래그할 때 */
  onLongPress?: () => void;
  onPressOut?: () => void;
  delayLongPress?: number;
  /** 카드 내부 아이템 드래그 시 부모 ScrollView 제어용 */
  onItemDragStart?: () => void;
  onItemDragEnd?: () => void;
  /** 부모 ScrollView 동기 잠금/해제 (setNativeProps 기반) */
  disableParentScroll?: () => void;
  enableParentScroll?: () => void;
  /** 드래그 중 화면 가장자리 도달 시 자동 스크롤 (delta px) */
  scrollBy?: (delta: number) => void;
  onPreviewLayout?: (y: number) => void;
};

function sortUnchecked(items: Item[], sort: SortKey): Item[] {
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

export function PaperCard({
  paper,
  items,
  isExpanded,
  onToggleExpand,
  onToggleItem,
  onComplete,
  onAddItem,
  onReorderItems,
  onClassifyItem,
  isPaperEditMode = false,
  editName,
  onChangeEditName,
  onStartPaperEdit,
  onSavePaperEdit,
  onDeletePaper,
  onMoveItem,
  onDeleteItem,
  editingItemId = null,
  editItemContent,
  onStartEditItem,
  onChangeEditItemContent,
  onSaveEditItem,
  previewText,
  previewScheduledDate = null,
  onLongPress,
  onPressOut,
  delayLongPress = 300,
  onItemDragStart,
  onItemDragEnd,
  disableParentScroll,
  enableParentScroll,
  scrollBy,
  onPreviewLayout,
}: Props) {
  const [addText, setAddText] = useState("");
  const [sort, setSort] = useState<SortKey>("custom");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isEscapingBottom, setIsEscapingBottom] = useState(false);
  const [listTop, setListTop] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  // ── 분류하기 존 위치 측정 ─────────────────────────────────────────────────
  const sortableWrapRef = useRef<View>(null);
  const classifyZoneY = useRef<number | undefined>(undefined);

  function handleItemDragStart() {
    setIsDragActive(true);
    onItemDragStart?.();
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

  const unchecked = sortUnchecked(items.filter((i) => !i.is_checked), sort);
  const checked = [...items.filter((i) => i.is_checked)].sort(
    (a, b) => new Date(b.checked_at!).getTime() - new Date(a.checked_at!).getTime(),
  );
  const previewItem = useMemo<Item | null>(() => {
    const trimmed = previewText?.trim();
    if (!trimmed) return null;
    const now = new Date().toISOString();
    return {
      id: "__input-preview__",
      user_id: paper.user_id,
      paper_id: paper.id,
      content: trimmed,
      is_checked: false,
      scheduled_date: previewScheduledDate,
      order: null,
      created_at: now,
      updated_at: now,
      checked_at: null,
      deleted_at: null,
    };
  }, [paper.id, paper.user_id, previewText, previewScheduledDate]);
  const uncheckedRows = previewItem
    ? sortUnchecked([...items.filter((i) => !i.is_checked), previewItem], sort).map((item) =>
        item.id === previewItem.id ? ({ type: "preview" as const, text: item.content }) : ({ type: "item" as const, item }),
      )
    : unchecked.map((item) => ({ type: "item" as const, item }));
  const sorted = [...unchecked, ...checked];
  const checkedCount = checked.length;
  const total = sorted.length;
  const progress = total > 0 ? checkedCount / total : 0;

  useEffect(() => {
    if (!isPaperEditMode) return;
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [isPaperEditMode]);

  function handleAddSubmit() {
    const trimmed = addText.trim();
    if (!trimmed) return;
    onAddItem(trimmed);
    setAddText("");
  }

  // ── 접힌 상태 ──────────────────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <Pressable
        onPress={onToggleExpand}
        onLongPress={onLongPress}
        onPressOut={onPressOut}
        delayLongPress={delayLongPress}
        style={{
          marginHorizontal: 12,
          marginBottom: 8,
          backgroundColor: colors.surface,
          borderRadius: radius.sm,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 0.5,
          borderColor: colors.hairline,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginRight: 8 }}>
            {isPaperEditMode ? (
              <TextInput
                ref={nameInputRef}
                value={editName ?? paper.name ?? ""}
                onChangeText={onChangeEditName}
                onSubmitEditing={onSavePaperEdit}
                style={{ flex: 1, fontSize: fontSize.base, color: colors.foreground, paddingVertical: 0 }}
                placeholder="paper 이름"
                placeholderTextColor={colors.disabled}
                returnKeyType="done"
              />
            ) : (
              <Pressable onPress={onStartPaperEdit} style={{ flexShrink: 1 }}>
                <Text variant="body" weight="medium" numberOfLines={1}>
                  {paper.name}
                </Text>
              </Pressable>
            )}
            {!isPaperEditMode && (
              <Pressable onPress={onStartPaperEdit} hitSlop={8} style={{ marginLeft: 5 }}>
                <Pencil size={15} color={colors.subtle} />
              </Pressable>
            )}
            {isPaperEditMode && (
              <>
                <Pressable onPress={onDeletePaper} hitSlop={8} style={{ marginLeft: 5 }}>
                  <Trash2 size={15} color={colors.danger} />
                </Pressable>
                <Pressable onPress={onSavePaperEdit} hitSlop={8} style={{ marginLeft: 6 }}>
                  <Text variant="control" color="primary">저장</Text>
                </Pressable>
              </>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text variant="meta">{checkedCount}/{total}</Text>
            <RNText style={{ color: "#cccccc", fontSize: 16 }}>›</RNText>
          </View>
        </View>
        <View style={{ height: 2, backgroundColor: "#eee", borderRadius: 1 }}>
          <View style={{ height: 2, backgroundColor: "#1D9E75", borderRadius: 1, width: `${progress * 100}%` }} />
        </View>
      </Pressable>
    );
  }

  // ── 펼친 상태 ──────────────────────────────────────────────────────────────
  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        backgroundColor: colors.surface,
        borderRadius: radius.sm,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
      }}
    >
      {/* 상단: 이름 + 정렬 + 접기 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {/* 이름 영역 — 롱탭으로 카드 드래그 가능 */}
        <Pressable
          style={{ flex: 1, marginRight: 8 }}
          onLongPress={onLongPress}
          onPressOut={onPressOut}
          delayLongPress={delayLongPress}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {isPaperEditMode ? (
              <TextInput
                ref={nameInputRef}
                value={editName ?? paper.name ?? ""}
                onChangeText={onChangeEditName}
                onSubmitEditing={onSavePaperEdit}
                style={{ flex: 1, fontSize: fontSize.base, color: colors.foreground, paddingVertical: 0 }}
                placeholder="paper 이름"
                placeholderTextColor={colors.disabled}
                returnKeyType="done"
              />
            ) : (
              <Pressable onPress={onStartPaperEdit} style={{ flexShrink: 1 }}>
                <Text variant="body" weight="medium" numberOfLines={1}>
                  {paper.name}
                </Text>
              </Pressable>
            )}
            {!isPaperEditMode && (
              <Pressable onPress={onStartPaperEdit} hitSlop={8} style={{ marginLeft: 5 }}>
                <Pencil size={15} color={colors.subtle} />
              </Pressable>
            )}
            {isPaperEditMode && (
              <>
                <Pressable onPress={onDeletePaper} hitSlop={8} style={{ marginLeft: 5 }}>
                  <Trash2 size={15} color={colors.danger} />
                </Pressable>
                <Pressable onPress={onSavePaperEdit} hitSlop={8} style={{ marginLeft: 6 }}>
                  <Text variant="control" color="primary">저장</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
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
          <Pressable onPress={onToggleExpand} hitSlop={8}>
            <RNText style={{ color: colors.subtle, fontSize: 16 }}>∨</RNText>
          </Pressable>
        </View>
      </View>

      <SortMenuModal
        visible={showSortMenu}
        currentKey={sort}
        onSelect={setSort}
        onClose={() => setShowSortMenu(false)}
      />

      {/* 프로그레스 바 */}
        <View style={{ height: 2, backgroundColor: "#eee", borderRadius: 1, marginBottom: 12 }}>
        <View style={{ height: 2, backgroundColor: colors.primary, borderRadius: 1, width: `${progress * 100}%` }} />
      </View>

      {/* 미체크 아이템 — SortableList (RNGH 기반) */}
      <View
        ref={sortableWrapRef}
        onLayout={(event) => setListTop(event.nativeEvent.layout.y)}
      >
        {previewItem ? (
          uncheckedRows.map((row) =>
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
                onToggle={onToggleItem}
                showTagIcon={false}
                onMove={isPaperEditMode && onMoveItem ? () => onMoveItem(row.item) : undefined}
                onDelete={isPaperEditMode && onDeleteItem ? () => onDeleteItem(row.item) : undefined}
                canEditContent={isPaperEditMode}
                isEditingContent={editingItemId === row.item.id}
                editContent={editingItemId === row.item.id ? editItemContent : row.item.content}
                onStartEditContent={() => onStartEditItem?.(row.item)}
                onChangeEditContent={onChangeEditItemContent}
                onSaveEditContent={() => onSaveEditItem?.(row.item)}
              />
            ),
          )
        ) : (
          <SortableList
            data={unchecked}
            keyExtractor={(item) => item.id}
            renderItem={(item: Item, _: number, dh: DragHandlers) => (
              <ItemRow
                item={item}
                onToggle={onToggleItem}
                showTagIcon={false}
                onLongPress={dh.onLongPress}
                onPressOut={dh.onPressOut}
                delayLongPress={dh.delayLongPress}
                onMove={isPaperEditMode && onMoveItem ? () => onMoveItem(item) : undefined}
                onDelete={isPaperEditMode && onDeleteItem ? () => onDeleteItem(item) : undefined}
                canEditContent={isPaperEditMode}
                isEditingContent={editingItemId === item.id}
                editContent={editingItemId === item.id ? editItemContent : item.content}
                onStartEditContent={() => onStartEditItem?.(item)}
                onChangeEditContent={onChangeEditItemContent}
                onSaveEditContent={() => onSaveEditItem?.(item)}
              />
            )}
            onReorder={(newUnchecked) => {
              setSort("custom"); // 드래그 리오더 시 자동으로 사용자 지정 전환
              onReorderItems?.([...(newUnchecked as Item[]), ...checked]);
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

      {/* 체크된 아이템 (정렬 불가 — 체크 순서 고정) */}
      {checked.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          onToggle={onToggleItem}
          showTagIcon={false}
          onMove={isPaperEditMode && onMoveItem ? () => onMoveItem(item) : undefined}
          onDelete={isPaperEditMode && onDeleteItem ? () => onDeleteItem(item) : undefined}
          canEditContent={isPaperEditMode}
          isEditingContent={editingItemId === item.id}
          editContent={editingItemId === item.id ? editItemContent : item.content}
          onStartEditContent={() => onStartEditItem?.(item)}
          onChangeEditContent={onChangeEditItemContent}
          onSaveEditContent={() => onSaveEditItem?.(item)}
        />
      ))}

      {/* 항목 추가 */}
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

      {/* 푸터: 카운트 + 완료 버튼 */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTopWidth: 0.5, borderTopColor: "#eee" }}>
        <Text variant="meta">{checkedCount}/{total}</Text>
        <Button onPress={onComplete} size="sm">완료</Button>
      </View>
    </View>
  );
}
