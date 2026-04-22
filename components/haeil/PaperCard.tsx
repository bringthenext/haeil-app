import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Item, Paper } from "@/lib/types";
import { ItemRow } from "./ItemRow";

type SortKey = "created_desc" | "created_asc" | "deadline_desc" | "deadline_asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "created_desc", label: "생성일 ↓" },
  { key: "created_asc", label: "생성일 ↑" },
  { key: "deadline_desc", label: "마감일 ↓" },
  { key: "deadline_asc", label: "마감일 ↑" },
];

type Props = {
  paper: Paper;
  items: Item[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleItem: (id: string, checked: boolean) => void;
  onComplete: () => void;
  onAddItem: (content: string) => void;
  previewText?: string;
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

export function PaperCard({
  paper,
  items,
  isExpanded,
  onToggleExpand,
  onToggleItem,
  onComplete,
  onAddItem,
  previewText,
}: Props) {
  const [addText, setAddText] = useState("");
  const [sort, setSort] = useState<SortKey>("created_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const unchecked = sortUnchecked(items.filter((i) => !i.is_checked), sort);
  const checked = [...items.filter((i) => i.is_checked)].sort(
    (a, b) => new Date(b.checked_at!).getTime() - new Date(a.checked_at!).getTime(),
  );
  const sorted = [...unchecked, ...checked];
  const checkedCount = checked.length;
  const total = sorted.length;
  const progress = total > 0 ? checkedCount / total : 0;

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
        style={{
          marginHorizontal: 12,
          marginBottom: 8,
          backgroundColor: "#fff",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 0.5,
          borderColor: "#ddd",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#1a1a1a", marginRight: 8 }} numberOfLines={1}>
            {paper.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 11, color: "#aaa" }}>{checkedCount}/{total}</Text>
            <Text style={{ color: "#ccc", fontSize: 16 }}>›</Text>
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
        backgroundColor: "#fff",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#9FE1CB",
        zIndex: showSortMenu ? 100 : 1,
        elevation: showSortMenu ? 10 : 0,
      }}
    >
      {/* 상단: 이름 + 정렬 + 접기 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#1a1a1a", marginRight: 8 }} numberOfLines={1}>
          {paper.name}
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
          <Pressable onPress={onToggleExpand} hitSlop={8}>
            <Text style={{ color: "#aaa", fontSize: 16 }}>∨</Text>
          </Pressable>
        </View>
      </View>

      {/* 정렬 드롭다운 */}
      {showSortMenu && (
        <View
          style={{
            position: "absolute",
            top: 36,
            right: 12,
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
      <View style={{ height: 2, backgroundColor: "#eee", borderRadius: 1, marginBottom: 12 }}>
        <View style={{ height: 2, backgroundColor: "#1D9E75", borderRadius: 1, width: `${progress * 100}%` }} />
      </View>

      {/* 입력 미리보기 — 아이템 목록 위에 표시 */}
      {!!previewText && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, opacity: 0.4 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#1D9E75" }} />
          <Text style={{ flex: 1, fontSize: 14, color: "#1D9E75" }}>{previewText}</Text>
        </View>
      )}

      {/* 아이템 목록 */}
      {sorted.map((item) => (
        <ItemRow key={item.id} item={item} onToggle={onToggleItem} showTagIcon={false} />
      ))}

      {/* 항목 추가 */}
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

      {/* 푸터: 카운트 + 완료 버튼 */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTopWidth: 0.5, borderTopColor: "#eee" }}>
        <Text style={{ fontSize: 11, color: "#aaa" }}>{checkedCount}/{total}</Text>
        <Pressable
          onPress={onComplete}
          style={{ backgroundColor: "#1D9E75", borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>완료</Text>
        </Pressable>
      </View>
    </View>
  );
}
