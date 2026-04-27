import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
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
import { DeleteConfirmModal } from "@/components/haeil/DeleteConfirmModal";
import { DraftCard } from "@/components/haeil/DraftCard";
import { InputBar } from "@/components/haeil/InputBar";
import { ItemRow } from "@/components/haeil/ItemRow";
import { MoveItemSheet } from "@/components/haeil/MoveItemSheet";
import { PaperCard } from "@/components/haeil/PaperCard";
import { useSession } from "@/hooks/useSession";
import {
  addItem,
  assignAllDraftItemsToPaper,
  assignItemToPaper,
  classifyItemToEnvelope,
  deleteItem,
  getInboxItems,
  getItemsByPaperIds,
  toggleItem,
  updateItemContent,
  updateItemOrders,
} from "@/lib/api/items";
import { addPaper, completePaper, deletePaper, getPapers, updatePaperName, updatePaperOrders } from "@/lib/api/papers";
import { SortableList } from "@/components/haeil/SortableList";
import { addWave, getRoutineWaveCountsByPaperIds } from "@/lib/api/waves";
import { getEnvelopes } from "@/lib/api/envelopes";
import type { Envelope, Item, Paper } from "@/lib/types";

const COMPOSER_PREVIEW_INSET = 180;
const DELETE_WARNING_SKIP_KEY = "haeil.skipDeleteWarning";
const PREVIEW_TOP_GUARD = 16;
const PREVIEW_ROW_HEIGHT = 44;
const PREVIEW_BOTTOM_GUARD = 16;

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
  const [inputScheduledDate, setInputScheduledDate] = useState<string | null>(null);
  const [waveCounts, setWaveCounts] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [moveItemTarget, setMoveItemTarget] = useState<Item | null>(null);
  const [paperEditModeId, setPaperEditModeId] = useState<string | null>(null);
  const [paperEditName, setPaperEditName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "paper"; paper: Paper } | null>(null);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const mainScrollRef = useRef<ScrollView>(null);
  const mainScrollOffsetRef = useRef(0);
  const draftCardYRef = useRef(0);
  const draftPreviewOffsetRef = useRef<number | null>(null);
  const paperCardYRefs = useRef(new Map<string, number>());
  const paperPreviewOffsetRefs = useRef(new Map<string, number>());
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

  const handlePreviewMetaChange = useCallback((meta: { paperId: string | null; scheduledDate: string | null }) => {
    setInputScheduledDate(meta.scheduledDate);
  }, []);

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

  async function requestDeleteTarget(target: typeof deleteTarget) {
    if (!target) return;
    const skip = await AsyncStorage.getItem(DELETE_WARNING_SKIP_KEY);
    if (skip === "1") {
      await performDelete(target);
      return;
    }
    setDeleteTarget(target);
  }

  async function deleteItemImmediately(item: Item) {
    if (item.paper_id) {
      setItemsByPaperId((prev) => ({
        ...prev,
        [item.paper_id!]: (prev[item.paper_id!] ?? []).filter((i) => i.id !== item.id),
      }));
    } else {
      setDraftItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    try {
      await deleteItem(item.id);
      Toast.show({ type: "success", text1: "삭제되었습니다." });
    } catch {
      Toast.show({ type: "error", text1: "삭제에 실패했어요." });
      await fetchAll();
    }
  }

  async function performDelete(target: NonNullable<typeof deleteTarget>) {
    const paper = target.paper;
    setInboxPapers((prev) => prev.filter((p) => p.id !== paper.id));
    if (expandedPaperId === paper.id) setExpandedPaperId(null);
    if (paperEditModeId === paper.id) setPaperEditModeId(null);
    try {
      await deletePaper(paper.id);
      Toast.show({ type: "success", text1: "삭제되었습니다.", text2: "설정 > 최근 삭제됨에서 30일 내 복구할 수 있어요." });
    } catch {
      Toast.show({ type: "error", text1: "삭제에 실패했어요." });
      await fetchAll();
    }
  }

  async function handleDeleteConfirm(dontShowAgain: boolean) {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (dontShowAgain) await AsyncStorage.setItem(DELETE_WARNING_SKIP_KEY, "1");
    await performDelete(target);
  }

  async function handleMoveItem(targetPaperId: string) {
    if (!moveItemTarget) return;
    const item = moveItemTarget;
    setMoveItemTarget(null);
    try {
      await assignItemToPaper(item.id, targetPaperId);
      Toast.show({ type: "success", text1: "이동되었습니다." });
      await fetchAll();
    } catch {
      Toast.show({ type: "error", text1: "이동에 실패했어요." });
    }
  }

  function startPaperEdit(paper: Paper) {
    setExpandedPaperId(paper.id);
    setPaperEditModeId(paper.id);
    setPaperEditName(paper.name ?? "");
  }

  function startItemEdit(item: Item) {
    setEditingItemId(item.id);
    setEditingItemContent(item.content);
  }

  async function saveItemEdit(item: Item) {
    if (editingItemId !== item.id) return;
    const content = editingItemContent.trim();
    if (!content) return;
    setEditingItemId(null);
    if (item.paper_id) {
      setItemsByPaperId((prev) => ({
        ...prev,
        [item.paper_id!]: (prev[item.paper_id!] ?? []).map((i) => (i.id === item.id ? { ...i, content } : i)),
      }));
    } else {
      setDraftItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, content } : i)));
    }
    try {
      await updateItemContent(item.id, content);
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요." });
      await fetchAll();
    }
  }

  async function savePaperEdit(paper: Paper) {
    const name = paperEditName.trim();
    if (!name) return;
    setPaperEditModeId(null);
    setInboxPapers((prev) => prev.map((p) => (p.id === paper.id ? { ...p, name } : p)));
    try {
      await updatePaperName(paper.id, name);
      Toast.show({ type: "success", text1: "이름이 변경되었습니다." });
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요." });
      await fetchAll();
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
  const composerBottomPadding = inputText.trim() ? COMPOSER_PREVIEW_INSET : 24;

  function getPreviewScrollY(previewY: number): number {
    const currentY = mainScrollOffsetRef.current;
    const topLimit = currentY + PREVIEW_TOP_GUARD;
    const bottomLimit = currentY + scrollViewportHeight - composerBottomPadding - PREVIEW_BOTTOM_GUARD;
    if (previewY < topLimit) return Math.max(0, previewY - PREVIEW_TOP_GUARD);
    if (previewY + PREVIEW_ROW_HEIGHT > bottomLimit) {
      return Math.max(0, previewY + PREVIEW_ROW_HEIGHT - scrollViewportHeight + composerBottomPadding + PREVIEW_BOTTOM_GUARD);
    }
    return currentY;
  }

  function getAbsolutePreviewY(): number | null {
    if (selectedInputPaperId) {
      const cardY = paperCardYRefs.current.get(selectedInputPaperId);
      const previewOffset = paperPreviewOffsetRefs.current.get(selectedInputPaperId);
      if (cardY === undefined || previewOffset === undefined) return null;
      return cardY + previewOffset;
    }
    if (draftPreviewOffsetRef.current === null) return null;
    return draftCardYRef.current + draftPreviewOffsetRef.current;
  }

  function requestPreviewScroll() {
    requestAnimationFrame(() => {
      const previewY = getAbsolutePreviewY();
      if (previewY === null) return;
      mainScrollRef.current?.scrollTo({
        y: getPreviewScrollY(previewY),
        animated: true,
      });
    });
  }

  useEffect(() => {
    if (!inputText.trim()) return;
    if (selectedInputPaperId) setExpandedPaperId(selectedInputPaperId);
    requestPreviewScroll();
  }, [inputText, selectedInputPaperId, scrollViewportHeight, composerBottomPadding]);

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
          onLayout={(event) => setScrollViewportHeight(event.nativeEvent.layout.height)}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          scrollEnabled={!isDragging}
          scrollEventThrottle={16}
          onScroll={(e) => { mainScrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          contentContainerStyle={{ paddingBottom: composerBottomPadding }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1D9E75" />
          }
        >
          {tab === "active" ? (
            <>
              {/* Draft Card — paper 선택 중이 아닐 때만 preview */}
              <View onLayout={(event) => { draftCardYRef.current = event.nativeEvent.layout.y; }}>
                <DraftCard
                  items={draftItems}
                  previewText={selectedInputPaperId ? undefined : inputText}
                  previewScheduledDate={inputScheduledDate}
                  onToggle={handleToggleDraft}
                  onClassifyItem={(itemId) => setClassifyItemId(itemId)}
                  onComplete={handleCompleteDraft}
                  onReorderItems={handleReorderDraftItems}
                  onPreviewLayout={(y) => {
                    draftPreviewOffsetRef.current = y;
                    requestPreviewScroll();
                  }}
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
              </View>

              {/* Active inbox papers — 롱탭 드래그로 순서 변경 */}
              <SortableList
                data={activePapers}
                keyExtractor={(p) => p.id}
                onReorder={handleReorderInboxPapers}
                itemHeight={60}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                renderItem={(paper, _, dh) => (
                  <View onLayout={(event) => { paperCardYRefs.current.set(paper.id, event.nativeEvent.layout.y); }}>
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
                      isPaperEditMode={paperEditModeId === paper.id}
                      editName={paperEditModeId === paper.id ? paperEditName : paper.name ?? ""}
                      onChangeEditName={setPaperEditName}
                      onStartPaperEdit={() => startPaperEdit(paper)}
                      onSavePaperEdit={() => savePaperEdit(paper)}
                      onDeletePaper={() => requestDeleteTarget({ type: "paper", paper })}
                      onMoveItem={setMoveItemTarget}
                      onDeleteItem={deleteItemImmediately}
                      editingItemId={editingItemId}
                      editItemContent={editingItemContent}
                      onStartEditItem={startItemEdit}
                      onChangeEditItemContent={setEditingItemContent}
                      onSaveEditItem={saveItemEdit}
                      previewText={selectedInputPaperId === paper.id ? inputText : undefined}
                      previewScheduledDate={inputScheduledDate}
                      onPreviewLayout={(y) => {
                        paperPreviewOffsetRefs.current.set(paper.id, y);
                        requestPreviewScroll();
                      }}
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
                  </View>
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
                <Text style={{ fontSize: 13, color: "#888" }}>+  새 paper</Text>
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
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#888" }}>
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
            onAddPaperPress={() => { setIsAddingPaper(true); setTimeout(() => newPaperInputRef.current?.focus(), 80); }}
            onPreviewMetaChange={handlePreviewMetaChange}
            papers={activePapers.filter((p) => p.name !== null).map((p) => ({ id: p.id, name: p.name! }))}
          />
        )}
      </KeyboardAvoidingView>

      <MoveItemSheet
        visible={moveItemTarget !== null}
        papers={activePapers.filter((p) => p.name !== null).map((p) => ({ id: p.id, name: p.name!, envelopeId: null, envelopeName: "Inbox" }))}
        currentPaperId={moveItemTarget?.paper_id}
        currentEnvelopeId={null}
        currentEnvelopeName="Inbox"
        onSelect={handleMoveItem}
        onClose={() => setMoveItemTarget(null)}
      />

      <DeleteConfirmModal
        visible={deleteTarget !== null}
        title="삭제할까요?"
        message="이 paper와 안의 항목들이 삭제됩니다."
        recoveryHint="설정 > 최근 삭제됨에서 30일 내 복구할 수 있어요."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

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
