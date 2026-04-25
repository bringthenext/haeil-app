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

import { ClassifySheet } from "@/components/haeil/ClassifySheet";
import { CompletedPaperCard } from "@/components/haeil/CompletedPaperCard";
import { DraftCard } from "@/components/haeil/DraftCard";
import { InputBar } from "@/components/haeil/InputBar";
import { ItemRow } from "@/components/haeil/ItemRow";
import { PaperCard } from "@/components/haeil/PaperCard";
import { useSession } from "@/hooks/useSession";
import {
  addItem,
  assignAllDraftItemsToPaper,
  classifyItemToEnvelope,
  getInboxItems,
  getItemsByPaperIds,
  toggleItem,
  updateItemOrders,
} from "@/lib/api/items";
import { addPaper, completePaper, getPapers, updatePaperOrders } from "@/lib/api/papers";
import { SortableList } from "@/components/haeil/SortableList";
import { addWave, getRoutineWaveCountsByPaperIds } from "@/lib/api/waves";
import { getEnvelopes } from "@/lib/api/envelopes";
import type { Envelope, Item, Paper } from "@/lib/types";


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
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [classifyItemId, setClassifyItemId] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [completedSort, setCompletedSort] = useState<"desc" | "asc">("desc");
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null);
  const [isAddingPaper, setIsAddingPaper] = useState(false);
  const [newPaperName, setNewPaperName] = useState("");
  const [selectedInputPaperId, setSelectedInputPaperId] = useState<string | null>(null);
  const [waveCounts, setWaveCounts] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);
  const mainScrollOffsetRef = useRef(0);
  const newPaperInputRef = useRef<TextInput>(null);

  // ── 데이터 패치 ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [items, papers, envs] = await Promise.all([getInboxItems(), getPapers(), getEnvelopes()]);
      setDraftItems(items);
      setEnvelopes(envs);
      const inbox = papers.filter((p) => p.envelope_id === null);
      setInboxPapers(inbox);
      const paperIds = inbox.map((p) => p.id);
      if (paperIds.length > 0) {
        const [paperItems, counts] = await Promise.all([
          getItemsByPaperIds(paperIds),
          getRoutineWaveCountsByPaperIds(paperIds),
        ]);
        const grouped: Record<string, Item[]> = {};
        for (const item of paperItems) {
          if (!item.paper_id) continue;
          grouped[item.paper_id] = grouped[item.paper_id] ?? [];
          grouped[item.paper_id].push(item);
        }
        setItemsByPaperId(grouped);
        setWaveCounts(counts);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useFocusEffect(useCallback(() => { setTab("active"); fetchAll(); }, [fetchAll]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── Inbox paper 순서 변경 ────────────────────────────────────────────────────
  async function handleReorderInboxPapers(newPapers: Paper[]) {
    setInboxPapers((prev) => {
      const completed = prev.filter((p) => p.status === "completed");
      return [...newPapers, ...completed];
    });
    try {
      await updatePaperOrders(newPapers.map((p, i) => ({ id: p.id, order: i })));
    } catch {
      await fetchAll();
    }
  }

  // ── Inbox paper 내 item 순서 변경 ────────────────────────────────────────────
  async function handleReorderInboxItems(paperId: string, newItems: Item[]) {
    setItemsByPaperId((prev) => ({ ...prev, [paperId]: newItems }));
    try {
      await updateItemOrders(newItems.map((item, i) => ({ id: item.id, order: i })));
    } catch {
      await fetchAll();
    }
  }

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
      setWaveCounts((prev) => ({ ...prev, [newPaper.id]: 1 }));
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

  // ── Draft item 순서 변경 ─────────────────────────────────────────────────────
  async function handleReorderDraftItems(newItems: Item[]) {
    setDraftItems(newItems);
    try {
      await updateItemOrders(newItems.map((item, i) => ({ id: item.id, order: i })));
    } catch {
      await fetchAll();
    }
  }

  // ── Draft item 분류 (Envelope로) ─────────────────────────────────────────────
  async function handleClassify(itemId: string, envelopeId: string) {
    if (!userId) return;
    setDraftItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await classifyItemToEnvelope(itemId, envelopeId, userId);
    } catch {
      // 실패 시 fetchAll로 복원
      await fetchAll();
    }
  }

  // ── Paper item 분류 (envelope으로) ──────────────────────────────────────────
  const [classifyPaperItemId, setClassifyPaperItemId] = useState<{ itemId: string; fromPaperId: string } | null>(null);

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
      setWaveCounts((prev) => {
        const next = { ...prev, [paper.id]: (prev[paper.id] ?? 0) + 1 };
        if (paper.parent_paper_id) next[paper.parent_paper_id] = (prev[paper.parent_paper_id] ?? 0) + 1;
        return next;
      });
    } catch {
      setInboxPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, status: "active", name: paper.name, completed_at: null } : p)),
      );
    }
  }

  // ── 파생 상태 ─────────────────────────────────────────────────────────────────
  const activePapers = inboxPapers.filter((p) => p.status === "active");
  const completedPapers = inboxPapers.filter((p) => p.status === "completed");

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
              onPress={() => { setTab("active"); }}
              style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: tab === "active" ? "#1D9E75" : "transparent" }}
            >
              <Text style={{ fontSize: 13, color: tab === "active" ? "#fff" : "#888" }}>활성</Text>
            </Pressable>
            <Pressable
              onPress={() => { setTab("completed"); }}
              style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: tab === "completed" ? "#1D9E75" : "transparent" }}
            >
              <Text style={{ fontSize: 13, color: tab === "completed" ? "#fff" : "#888" }}>완료</Text>
            </Pressable>
          </View>
        </View>

        {/* 스크롤 콘텐츠 */}
        <ScrollView
          ref={mainScrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          scrollEnabled={!isDragging}
          scrollEventThrottle={16}
          onScroll={(e) => { mainScrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1D9E75" />
          }
        >
          {tab === "active" ? (
            <>
              {/* Draft Card — paper 선택 중이 아닐 때만 preview */}
              <DraftCard
                items={draftItems}
                previewText={selectedInputPaperId ? undefined : inputText}
                onToggle={handleToggleDraft}
                onClassifyItem={(itemId) => setClassifyItemId(itemId)}
                onComplete={handleCompleteDraft}
                onReorderItems={handleReorderDraftItems}
                onItemDragStart={() => setIsDragging(true)}
                onItemDragEnd={() => setIsDragging(false)}
                disableParentScroll={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: false })}
                enableParentScroll={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: true })}
                scrollBy={(delta) => {
                  const newY = mainScrollOffsetRef.current + delta;
                  mainScrollOffsetRef.current = newY;
                  mainScrollRef.current?.scrollTo({ y: newY, animated: false });
                }}
              />

              {/* Active inbox papers — 롱탭 드래그로 순서 변경 */}
              <SortableList
                data={activePapers}
                keyExtractor={(p) => p.id}
                onReorder={handleReorderInboxPapers}
                itemHeight={60}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                renderItem={(paper, _, dh) => (
                  <PaperCard
                    paper={paper}
                    items={itemsByPaperId[paper.id] ?? []}
                    isExpanded={expandedPaperId === paper.id}
                    onToggleExpand={() =>
                      setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)
                    }
                    onToggleItem={(id, checked) => handleTogglePaperItem(paper.id, id, checked)}
                    onComplete={() => handleComplete(paper)}
                    onAddItem={(content) => handleAddToPaper(paper, content, null)}
                    onReorderItems={(newItems) => handleReorderInboxItems(paper.id, newItems)}
                    onClassifyItem={(itemId) => setClassifyPaperItemId({ itemId, fromPaperId: paper.id })}
                    previewText={selectedInputPaperId === paper.id ? inputText : undefined}
                    onLongPress={dh.onLongPress}
                    onPressOut={dh.onPressOut}
                    delayLongPress={dh.delayLongPress}
                    onItemDragStart={() => setIsDragging(true)}
                    onItemDragEnd={() => setIsDragging(false)}
                    disableParentScroll={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: false })}
                    enableParentScroll={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: true })}
                    scrollBy={(delta) => {
                      const newY = mainScrollOffsetRef.current + delta;
                      mainScrollOffsetRef.current = newY;
                      mainScrollRef.current?.scrollTo({ y: newY, animated: false });
                    }}
                  />
                )}
              />

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
            /* 완료 탭 */
            <>
              {/* 정렬 토글 */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, marginBottom: 6 }}>
                <Pressable
                  onPress={() => setCompletedSort((s) => s === "desc" ? "asc" : "desc")}
                  style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, borderWidth: 0.5, borderColor: "#ddd" }}
                >
                  <Text style={{ fontSize: 11, color: "#888" }}>
                    {completedSort === "desc" ? "최신순 ↓" : "오래된순 ↑"}
                  </Text>
                </Pressable>
              </View>

              {completedPapers.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 60 }}>
                  <Text style={{ fontSize: 14, color: "#aaa" }}>완료된 paper가 없습니다</Text>
                </View>
              ) : (
                [...completedPapers]
                  .sort((a, b) => {
                    const ta = new Date(a.completed_at ?? a.created_at).getTime();
                    const tb = new Date(b.completed_at ?? b.created_at).getTime();
                    return completedSort === "desc" ? tb - ta : ta - tb;
                  })
                  .map((paper) => (
                    <CompletedPaperCard
                      key={paper.id}
                      paper={paper}
                      items={itemsByPaperId[paper.id] ?? []}
                      isExpanded={expandedCompletedId === paper.id}
                      onToggleExpand={() =>
                        setExpandedCompletedId(expandedCompletedId === paper.id ? null : paper.id)
                      }
                      onToggleItem={(id, checked) => handleTogglePaperItem(paper.id, id, checked)}
                      waveCount={waveCounts[paper.id] ?? 0}
                    />
                  ))
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

      {/* Draft item → Envelope 분류 시트 */}
      <ClassifySheet
        visible={classifyItemId !== null}
        envelopes={envelopes}
        onSelect={(envId) => {
          if (classifyItemId) handleClassify(classifyItemId, envId);
          setClassifyItemId(null);
        }}
        onClose={() => setClassifyItemId(null)}
      />

      {/* Paper item → 다른 Paper 분류 시트 */}
      <ClassifySheet
        visible={classifyPaperItemId !== null}
        envelopes={envelopes}
        onSelect={(envId) => {
          if (classifyPaperItemId && userId) {
            const { itemId, fromPaperId } = classifyPaperItemId;
            // envelope의 draft paper로 이동
            classifyItemToEnvelope(itemId, envId, userId)
              .then(() => {
                setItemsByPaperId((prev) => ({
                  ...prev,
                  [fromPaperId]: (prev[fromPaperId] ?? []).filter((i) => i.id !== itemId),
                }));
              })
              .catch(() => fetchAll());
          }
          setClassifyPaperItemId(null);
        }}
        onClose={() => setClassifyPaperItemId(null)}
      />
    </SafeAreaView>
  );
}
