import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Item } from "@/lib/types";
import { ItemRow } from "./ItemRow";

type SortKey = "created_desc" | "created_asc" | "deadline_desc" | "deadline_asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "created_desc", label: "생성일 ↓" },
  { key: "created_asc", label: "생성일 ↑" },
  { key: "deadline_desc", label: "마감일 ↓" },
  { key: "deadline_asc", label: "마감일 ↑" },
];

const VISIBLE_LIMIT = 10;

type Props = {
  items: Item[];
  previewText?: string;
  onToggle: (id: string, checked: boolean) => void;
  /** papers draft용 인라인 추가 */
  onAddItem?: (content: string) => void;
  /** 완료 처리 콜백 */
  onComplete?: () => void;
};

function sortUnchecked(items: Item[], sort: SortKey): Item[] {
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

export function DraftCard({ items, previewText, onToggle, onAddItem, onComplete }: Props) {
  const [addText, setAddText] = useState("");
  const [sort, setSort] = useState<SortKey>("created_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handleAddSubmit() {
    const trimmed = addText.trim();
    if (!trimmed || !onAddItem) return;
    onAddItem(trimmed);
    setAddText("");
  }

  const unchecked = sortUnchecked(items.filter((i) => !i.is_checked), sort);
  const checked = [...items.filter((i) => i.is_checked)].sort(
    (a, b) => new Date(b.checked_at!).getTime() - new Date(a.checked_at!).getTime(),
  );
  const sorted = [...unchecked, ...checked];
  const total = sorted.length;
  const checkedCount = checked.length;
  const needsExpand = total > VISIBLE_LIMIT;
  const hiddenCount = total - VISIBLE_LIMIT;
  const displayItems = isExpanded ? sorted : sorted.slice(0, VISIBLE_LIMIT);
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
            minWidth: 110,
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

      {/* 아이템 목록 */}
      {displayItems.map((item) => (
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
