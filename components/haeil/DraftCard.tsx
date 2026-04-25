import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Item } from "@/lib/types";
import { ItemRow } from "./ItemRow";
import { SortableList } from "./SortableList";
import type { DragHandlers } from "./SortableList";

type SortKey = "custom" | "created_desc" | "created_asc" | "deadline_desc" | "deadline_asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "custom", label: "사용자 지정" },
  { key: "created_asc", label: "생성일 ↑" },
  { key: "created_desc", label: "생성일 ↓" },
  { key: "deadline_asc", label: "마감일 ↑" },
  { key: "deadline_desc", label: "마감일 ↓" },
];

const VISIBLE_LIMIT = 10;

type Props = {
  items: Item[];
  previewText?: string;
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
}: Props) {
  const [addText, setAddText] = useState("");
  const [sort, setSort] = useState<SortKey>("created_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isEscapingBottom, setIsEscapingBottom] = useState(false);
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

  const unchecked = sortItems(items.filter((i) => !i.is_checked), sort);
  const checked = [...items.filter((i) => i.is_checked)].sort(
    (a, b) => new Date(b.checked_at!).getTime() - new Date(a.checked_at!).getTime(),
  );
  const sorted = [...unchecked, ...checked];
  const total = sorted.length;
  const checkedCount = checked.length;
  const needsExpand = total > VISIBLE_LIMIT;
  const hiddenCount = total - VISIBLE_LIMIT;
  const displayUnchecked = isExpanded ? unchecked : unchecked.slice(0, Math.min(VISIBLE_LIMIT, unchecked.length));
  const displayChecked = isExpanded
    ? checked
    : checked.slice(0, Math.max(0, VISIBLE_LIMIT - unchecked.length));
  const isEmpty = total === 0 && !previewText;

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: "#ccc",
        borderStyle: "dashed",
        backgroundColor: "#f8f8f4",
        paddingHorizontal: 12,
        paddingVertical: 10,
        zIndex: showSortMenu ? 100 : 1,
        elevation: showSortMenu ? 10 : 0,
      }}
    >
      {/* 헤더 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ fontSize: 10, color: "#aaa", fontWeight: "500", letterSpacing: 1.5 }}>
          DRAFT
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => setShowSortMenu((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 10, color: "#aaa" }}>
              {SORT_OPTIONS.find((o) => o.key === sort)!.label}
            </Text>
            <Text style={{ fontSize: 9, color: "#aaa" }}> ∨</Text>
          </Pressable>
          {total > 0 && (
            <Text style={{ fontSize: 10, color: "#aaa" }}>{checkedCount}/{total}</Text>
          )}
        </View>
      </View>

      {/* 정렬 드롭다운 */}
      {showSortMenu && (
        <View
          style={{
            position: "absolute",
            top: 30,
            right: 0,
            backgroundColor: "#fff",
            borderRadius: 8,
            borderWidth: 0.5,
            borderColor: "#eee",
            zIndex: 200,
            elevation: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            minWidth: 120,
          }}
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <Pressable
              key={opt.key}
              onPress={() => { setSort(opt.key); setShowSortMenu(false); }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderTopWidth: idx > 0 ? 0.5 : 0,
                borderTopColor: "#f5f5f5",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: sort === opt.key ? "#1D9E75" : "#555" }}>
                {opt.label}
              </Text>
              {sort === opt.key && <Text style={{ color: "#1D9E75", fontSize: 11 }}>✓</Text>}
            </Pressable>
          ))}
        </View>
      )}

      {/* 프로그레스 바 */}
      <View style={{ height: 0.5, backgroundColor: "#eee", borderRadius: 1, marginBottom: 10 }}>
        <View
          style={{
            height: 0.5,
            backgroundColor: "#1D9E75",
            borderRadius: 1,
            width: total > 0 ? `${(checkedCount / total) * 100}%` : "0%",
          }}
        />
      </View>

      {/* 입력 미리보기 */}
      {!!previewText && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, opacity: 0.4 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#1D9E75" }} />
          <Text style={{ flex: 1, fontSize: 14, color: "#1D9E75" }}>{previewText}</Text>
        </View>
      )}

      {/* 미체크 아이템 — SortableList (RNGH 기반) */}
      <View ref={sortableWrapRef}>
        <SortableList
          data={displayUnchecked}
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
      </View>

      {/* 분류하기 드롭 존 — 드래그 중에만 표시 */}
      {isDragActive && onClassifyItem && (
        <View
          style={{
            marginTop: 6,
            paddingVertical: 14,
            borderRadius: 8,
            borderWidth: isEscapingBottom ? 1.5 : 1,
            borderStyle: "dashed",
            borderColor: isEscapingBottom ? "#1D9E75" : "#aaa",
            backgroundColor: isEscapingBottom ? "#E1F5EE" : "#f0f0eb",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: isEscapingBottom ? "#1D9E75" : "#666",
              fontWeight: isEscapingBottom ? "700" : "500",
              letterSpacing: 0.2,
            }}
          >
            {isEscapingBottom ? "✓  여기서 손 떼면 분류" : "↓  분류하기"}
          </Text>
          {!isEscapingBottom && (
            <Text style={{ fontSize: 10, color: "#999" }}>이 영역으로 드래그하세요</Text>
          )}
        </View>
      )}

      {/* 체크된 아이템 */}
      {displayChecked.map((item) => (
        <ItemRow key={item.id} item={item} onToggle={onToggle} />
      ))}

      {/* 더보기 / 접기 */}
      {needsExpand && !isExpanded && (
        <Pressable
          onPress={() => setIsExpanded(true)}
          style={{ paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#eee" }}
        >
          <Text style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>
            {hiddenCount}개 더보기
          </Text>
        </Pressable>
      )}
      {needsExpand && isExpanded && (
        <Pressable
          onPress={() => setIsExpanded(false)}
          style={{ paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#eee" }}
        >
          <Text style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>접기</Text>
        </Pressable>
      )}

      {/* 빈 상태 */}
      {isEmpty && !onAddItem && (
        <View style={{ paddingVertical: 12 }}>
          <Text style={{ fontSize: 11, color: "#ccc", textAlign: "center" }}>
            아직 항목이 없어요.
          </Text>
        </View>
      )}

      {/* 항목 추가 (papers draft용 인라인) */}
      {onAddItem && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#eee" }}>
          <Pressable onPress={() => inputRef.current?.focus()} hitSlop={8}>
            <Text style={{ color: "#bbb", fontSize: 16 }}>+</Text>
          </Pressable>
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: 14, color: "#1a1a1a", paddingVertical: 2 }}
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
          <Pressable
            onPress={onComplete}
            style={{ backgroundColor: "#1D9E75", borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>완료</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
