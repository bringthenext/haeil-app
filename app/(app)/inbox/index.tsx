import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DraftCard } from "@/components/haeil/DraftCard";
import { InputBar } from "@/components/haeil/InputBar";
import { ItemRow } from "@/components/haeil/ItemRow";
import { PaperCard } from "@/components/haeil/PaperCard";
import { WeekCalendarBar } from "@/components/haeil/WeekCalendarBar";
import { useSession } from "@/hooks/useSession";
import {
  addItem,
  assignAllDraftItemsToPaper,
  getInboxItems,
  getItemsByPaperIds,
  toggleItem,
} from "@/lib/api/items";
import { addPaper, completePaper, getPapers } from "@/lib/api/papers";
import { addWave } from "@/lib/api/waves";
import type { Item, Paper } from "@/lib/types";

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} 완료`;
}

function makeOptimistic(
  userId: string,
  content: string,
  paperId: string | null,
  scheduledDate: string | null = null,
): Item {
  return {
    id: `temp-${Date.now()}`,
    user_id: userId,
    paper_id: paperId,
    content,
    is_checked: false,
    scheduled_date: scheduledDate,
    order: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    checked_at: null,
    deleted_at: null,
  };
}

export default function InboxScreen() {
  const { userId } = useSession();

  // envelope_id=null 인 items (paper_id=null)
  const [draftItems, setDraftItems] = useState<Item[]>([]);
  // envelope_id=null 인 papers
  const [inboxPapers, setInboxPapers] = useState<Paper[]>([]);
  const [itemsByPaperId, setItemsByPaperId] = useState<Record<string, Item[]>>({});

  const [inputText, setInputText] = useState("");
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [isAddingPaper, setIsAddingPaper] = useState(false);
  const [newPaperName, setNewPaperName] = useState("");
  const [selectedInputPaperId, setSelectedInputPaperId] = useState<string | null>(null);
  const newPaperInputRef = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => { setTab("active"); }, []));

  // ── 데이터 패치 ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [items, papers] = await Promise.all([getInboxItems(), getPapers()]);
      setDraftItems(items);
      const inbox = papers.filter((p) => p.envelope_id === null);
      setInboxPapers(inbox);
      const paperIds = inbox.map((p) => p.id);
      if (paperIds.length > 0) {
        const paperItems = await getItemsByPaperIds(paperIds);
        const grouped: Record<string, Item[]> = {};
        for (const item of paperItems) {
          if (!item.paper_id) continue;
          grouped[item.paper_id] = grouped[item.paper_id] ?? [];
          grouped[item.paper_id].push(item);
        }
        setItemsByPaperId(grouped);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── Draft item 추가 ──────────────────────────────────────────────────────────
  async function handleAddToDraft(content: string, scheduledDate: string | null) {
    if (!userId) return;
    const opt = makeOptimistic(userId, content, null, scheduledDate);
    setDraftItems((prev) => [opt, ...prev]);
    try {
      const created = await addItem(userId, { content, paper_id: null, scheduled_date: scheduledDate });
      setDraftItems((prev) => prev.map((i) => (i.id === opt.id ? created : i)));
    } catch {
      setDraftItems((prev) => prev.filter((i) => i.id !== opt.id));
    }
  }

  // ── Paper item 추가 ──────────────────────────────────────────────────────────
  async function handleAddToPaper(paper: Paper, content: string, scheduledDate: string | null) {
    if (!userId) return;
    const pid = paper.id;
    const opt = makeOptimistic(userId, content, pid, scheduledDate);
    setItemsByPaperId((p) => ({ ...p, [pid]: [...(p[pid] ?? []), opt] }));
    try {
      const created = await addItem(userId, { content, paper_id: pid, scheduled_date: scheduledDate });
      setItemsByPaperId((p) => ({
        ...p, [pid]: (p[pid] ?? []).map((i) => (i.id === opt.id ? created : i)),
      }));
    } catch {
      setItemsByPaperId((p) => ({ ...p, [pid]: (p[pid] ?? []).filter((i) => i.id !== opt.id) }));
    }
  }

  // ── InputBar paper 선택 변경 ─────────────────────────────────────────────────
  function handleInputPaperSelect(paperId: string | null) {
    setSelectedInputPaperId(paperId);
    if (paperId) setExpandedPaperId(paperId); // 선택된 paper 자동 펼침
  }

  // ── 하단 InputBar 제출 (날짜 + paper 선택 포함) ────────────────────────────
  async function handleBottomSubmit(content: string, scheduledDate: string | null, paperId: string | null) {
    if (paperId) {
      const paper = activePapers.find((p) => p.id === paperId);
      if (paper) await handleAddToPaper(paper, content, scheduledDate);
    } else {
      await handleAddToDraft(content, scheduledDate);
    }
  }

  // ── Draft 완료 (draft items → 오늘날짜 paper로 묶어 완료) ───────────────────
  async function handleCompleteDraft() {
    if (!userId || draftItems.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const snapshot = [...draftItems];
    setDraftItems([]);
    try {
      const newPaper = await addPaper(userId, { name: today, envelope_id: null, status: "active" });
      await assignAllDraftItemsToPaper(newPaper.id, userId);
      await completePaper(newPaper.id, false);
      await addWave(userId, newPaper.id);
      const completedPaper: Paper = {
        ...newPaper, name: today, status: "completed", completed_at: now,
      };
      setInboxPapers((prev) => [...prev, completedPaper]);
      setItemsByPaperId((prev) => ({ ...prev, [newPaper.id]: snapshot }));
    } catch {
      setDraftItems(snapshot);
    }
  }

  // ── Draft item 토글 ──────────────────────────────────────────────────────────
  async function handleToggleDraft(id: string, checked: boolean) {
    const checkedAt = checked ? new Date().toISOString() : null;
    setDraftItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_checked: checked, checked_at: checkedAt } : i)),
    );
    try {
      await toggleItem(id, checked);
    } catch {
      setDraftItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_checked: !checked, checked_at: null } : i)),
      );
    }
  }

  // ── Paper item 토글 ──────────────────────────────────────────────────────────
  async function handleTogglePaperItem(paperId: string, itemId: string, checked: boolean) {
    const checkedAt = checked ? new Date().toISOString() : null;
    setItemsByPaperId((p) => ({
      ...p,
      [paperId]: (p[paperId] ?? []).map((i) =>
        i.id === itemId ? { ...i, is_checked: checked, checked_at: checkedAt } : i,
      ),
    }));
    try {
      await toggleItem(itemId, checked);
    } catch {
      setItemsByPaperId((p) => ({
        ...p,
        [paperId]: (p[paperId] ?? []).map((i) =>
          i.id === itemId ? { ...i, is_checked: !checked, checked_at: null } : i,
        ),
      }));
    }
  }

  // ── 새 paper 생성 ────────────────────────────────────────────────────────────
  async function handleCreatePaper() {
    const name = newPaperName.trim();
    setIsAddingPaper(false);
    setNewPaperName("");
    if (!name || !userId) return;
    try {
      const created = await addPaper(userId, { name, envelope_id: null, status: "active" });
      setInboxPapers((prev) => [...prev, created]);
      setItemsByPaperId((prev) => ({ ...prev, [created.id]: [] }));
      setExpandedPaperId(created.id);
    } catch { /* silent */ }
  }

  // ── Paper 완료 ───────────────────────────────────────────────────────────────
  async function handleComplete(paper: Paper) {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    setInboxPapers((prev) =>
      prev.map((p) =>
        p.id === paper.id
          ? { ...p, status: "completed", name: paper.name ?? today, completed_at: now }
          : p,
      ),
    );
    if (expandedPaperId === paper.id) setExpandedPaperId(null);
    try {
      await completePaper(paper.id, paper.name === null);
      await addWave(userId, paper.id);
    } catch {
      setInboxPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, status: "active", name: paper.name, completed_at: null } : p)),
      );
    }
  }

  // ── 파생 상태 ─────────────────────────────────────────────────────────────────
  const activePapers = inboxPapers.filter((p) => p.status === "active");
  const completedPapers = inboxPapers.filter((p) => p.status === "completed");

  const visibleDraftItems = selectedDate
    ? draftItems.filter((i) => i.scheduled_date === null || i.scheduled_date === selectedDate)
    : draftItems;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={56}
      >
        {/* 헤더 */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: "#1a1a1a" }}>inbox</Text>
          <View style={{ flexDirection: "row", borderRadius: 20, borderWidth: 1, borderColor: "#eee", overflow: "hidden" }}>
            <Pressable
              onPress={() => setTab("active")}
              style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: tab === "active" ? "#1D9E75" : "transparent" }}
            >
              <Text style={{ fontSize: 13, color: tab === "active" ? "#fff" : "#888" }}>활성</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("completed")}
              style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: tab === "completed" ? "#1D9E75" : "transparent" }}
            >
              <Text style={{ fontSize: 13, color: tab === "completed" ? "#fff" : "#888" }}>완료</Text>
            </Pressable>
          </View>
        </View>

        {/* 주간 캘린더 바 */}
        <WeekCalendarBar
          items={draftItems}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <View style={{ height: 0.5, backgroundColor: "#eee", marginHorizontal: 12, marginBottom: 8 }} />

        {/* 스크롤 콘텐츠 */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1D9E75" />
          }
        >
          {tab === "active" ? (
            <>
              {/* Draft Card — paper 선택 중이 아닐 때만 preview */}
              <DraftCard
                items={visibleDraftItems}
                previewText={selectedInputPaperId ? undefined : inputText}
                onToggle={handleToggleDraft}
                onComplete={handleCompleteDraft}
              />

              {/* Active inbox papers (envelope_id=null) */}
              {activePapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  items={itemsByPaperId[paper.id] ?? []}
                  isExpanded={expandedPaperId === paper.id}
                  onToggleExpand={() =>
                    setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)
                  }
                  onToggleItem={(id, checked) => handleTogglePaperItem(paper.id, id, checked)}
                  onComplete={() => handleComplete(paper)}
                  onAddItem={(content) => handleAddToPaper(paper, content, null)}
                  previewText={selectedInputPaperId === paper.id ? inputText : undefined}
                />
              ))}

              {/* 새 paper 인라인 입력 */}
              {isAddingPaper && (
                <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: "#9FE1CB", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10 }}>
                  <TextInput
                    ref={newPaperInputRef}
                    style={{ fontSize: 14, color: "#1a1a1a" }}
                    placeholder="paper 이름..."
                    placeholderTextColor="#ccc"
                    value={newPaperName}
                    onChangeText={setNewPaperName}
                    onSubmitEditing={handleCreatePaper}
                    onBlur={() => { if (!newPaperName.trim()) { setIsAddingPaper(false); setNewPaperName(""); } }}
                    returnKeyType="done"
                    autoFocus
                  />
                </View>
              )}

              <Pressable
                onPress={() => { setIsAddingPaper(true); setTimeout(() => newPaperInputRef.current?.focus(), 80); }}
                style={{ marginHorizontal: 12, marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 8, borderWidth: 0.5, borderColor: "#ccc", borderStyle: "dashed" }}
              >
                <Text style={{ fontSize: 11, color: "#aaa" }}>+  새 paper</Text>
              </Pressable>
            </>
          ) : (
            /* 완료 탭 — 완료된 inbox papers */
            <>
              {completedPapers.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 60 }}>
                  <Text style={{ fontSize: 14, color: "#aaa" }}>완료된 paper가 없습니다</Text>
                </View>
              ) : (
                completedPapers.map((paper) => {
                  const paperItems = itemsByPaperId[paper.id] ?? [];
                  return (
                    <View
                      key={paper.id}
                      style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 8, borderWidth: 0.5, borderColor: "#ddd", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10 }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "500", color: "#1a1a1a", marginBottom: 2 }}>{paper.name}</Text>
                      {paper.completed_at && (
                        <Text style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
                          {formatCompletedAt(paper.completed_at)}
                        </Text>
                      )}
                      {paperItems.length > 0 && (
                        <View style={{ borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 4 }}>
                          {paperItems.map((item) => (
                            <ItemRow
                              key={item.id}
                              item={item}
                              onToggle={(id, checked) => handleTogglePaperItem(paper.id, id, checked)}
                              showTagIcon={false}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {/* 하단 InputBar — 활성 탭에서만 */}
        {tab === "active" && (
          <InputBar
            value={inputText}
            onChangeText={setInputText}
            onSubmit={handleBottomSubmit}
            onPaperSelect={handleInputPaperSelect}
            papers={activePapers.filter((p) => p.name !== null).map((p) => ({ id: p.id, name: p.name! }))}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
