import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { Pencil } from "lucide-react-native";
import Toast from "react-native-toast-message";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { EnvelopeEditSheet } from "@/components/haeil/EnvelopeEditSheet";
import { EnvelopeReorderSheet } from "@/components/haeil/EnvelopeReorderSheet";
import { FavoriteSheet } from "@/components/haeil/FavoriteSheet";
import { InputBar } from "@/components/haeil/InputBar";
import { ItemRow } from "@/components/haeil/ItemRow";
import { MoveItemSheet } from "@/components/haeil/MoveItemSheet";
import { PaperCard } from "@/components/haeil/PaperCard";
import { useSession } from "@/hooks/useSession";
import { addItem, assignItemToPaper, classifyItemToEnvelope, deleteItem, getItemsByPaperIds, toggleItem, updateItemContent, updateItemOrders } from "@/lib/api/items";
import { addEnvelope, deleteEnvelope, getEnvelopes, updateEnvelopeName, updateEnvelopeOrders } from "@/lib/api/envelopes";
import { addPaper, clonePaper, completePaper, deletePaper, getPapers, toggleFavorite, updatePaperName, updatePaperOrders } from "@/lib/api/papers";
import { addWave, getRoutineWaveCountsByPaperIds } from "@/lib/api/waves";
import { SortableList } from "@/components/haeil/SortableList";
import type { Envelope, Item, Paper } from "@/lib/types";

const COMPOSER_PREVIEW_INSET = 180;
const DELETE_WARNING_SKIP_KEY = "haeil.skipDeleteWarning";
const PREVIEW_TOP_GUARD = 16;
const PREVIEW_ROW_HEIGHT = 44;
const PREVIEW_BOTTOM_GUARD = 16;

function makeOptimistic(
  userId: string,
  content: string,
  paperId: string,
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

export default function PapersScreen() {
  const { userId } = useSession();
  const [contentWidth, setContentWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const pagerHeight = useRef(0);

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [itemsByPaperId, setItemsByPaperId] = useState<Record<string, Item[]>>({});
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddingPaper, setIsAddingPaper] = useState(false);
  const [newPaperName, setNewPaperName] = useState("");
  const [isAddingEnvelope, setIsAddingEnvelope] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [completedSort, setCompletedSort] = useState<"desc" | "asc">("desc");
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [selectedInputPaperId, setSelectedInputPaperId] = useState<string | null>(null);
  const [inputScheduledDate, setInputScheduledDate] = useState<string | null>(null);
  const [showFavoriteSheet, setShowFavoriteSheet] = useState(false);
  const [showEnvReorder, setShowEnvReorder] = useState(false);
  const [showEnvelopeMenu, setShowEnvelopeMenu] = useState(false);
  const [waveCounts, setWaveCounts] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [moveItemTarget, setMoveItemTarget] = useState<Item | null>(null);
  const [paperEditModeId, setPaperEditModeId] = useState<string | null>(null);
  const [paperEditName, setPaperEditName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [editEnvelopeTarget, setEditEnvelopeTarget] = useState<Envelope | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "paper"; paper: Paper }
    | { type: "envelope"; envelope: Envelope }
    | null
  >(null);
  // { itemId, fromPaperId } — 분류 시트를 열기 위한 대상
  const [classifyTarget, setClassifyTarget] = useState<{ itemId: string; fromPaperId: string } | null>(null);
  // envelope별 내부 ScrollView ref + 스크롤 오프셋 (아이템 드래그용)
  const envScrollRefs = useRef(new Map<string, ScrollView | null>());
  const envScrollOffsets = useRef(new Map<string, number>());
  const draftCardYRefs = useRef(new Map<string, number>());
  const draftPreviewOffsetRefs = useRef(new Map<string, number>());
  const paperCardYRefs = useRef(new Map<string, number>());
  const paperPreviewOffsetRefs = useRef(new Map<string, number>());
  const envelopeMenuButtonRef = useRef<View>(null);
  const newPaperInputRef = useRef<TextInput>(null);
  const newEnvInputRef = useRef<TextInput>(null);
  const [envelopeMenuPos, setEnvelopeMenuPos] = useState<{ top: number; left: number } | null>(null);

  function handleInputPaperSelect(paperId: string | null) {
    setSelectedInputPaperId(paperId);
    if (paperId) setExpandedPaperId(paperId);
  }

  const handlePreviewMetaChange = useCallback((meta: { paperId: string | null; scheduledDate: string | null }) => {
    setInputScheduledDate(meta.scheduledDate);
  }, []);

  // ── 파생 상태 (selectedEnvId 기준) ──────────────────────────────────────────
  const activePapersForEnv = (envId: string | null) =>
    allPapers.filter((p) => p.envelope_id === envId && p.status === "active" && p.name !== null);

  const draftPaperForEnv = (envId: string | null) =>
    allPapers.find((p) => p.envelope_id === envId && p.status === "active" && p.name === null) ?? null;

  const completedPapersForEnv = (envId: string | null) =>
    allPapers.filter((p) => p.envelope_id === envId && p.status === "completed");

  const favoritePapers = allPapers.filter(
    (p) => p.is_favorite && p.status === "completed" && p.envelope_id === selectedEnvId,
  );

  // 현재 선택된 envelope 기준 (InputBar용)
  const currentActivePapers = activePapersForEnv(selectedEnvId);
  const selectedEnvelope = envelopes.find((env) => env.id === selectedEnvId) ?? envelopes[0] ?? null;
  const composerBottomPadding = inputText.trim() ? COMPOSER_PREVIEW_INSET : 24;

  function getPreviewScrollY(envId: string, previewY: number): number {
    const currentY = envScrollOffsets.current.get(envId) ?? 0;
    const viewportHeight = pagerHeight.current;
    const topLimit = currentY + PREVIEW_TOP_GUARD;
    const bottomLimit = currentY + viewportHeight - composerBottomPadding - PREVIEW_BOTTOM_GUARD;
    if (previewY < topLimit) return Math.max(0, previewY - PREVIEW_TOP_GUARD);
    if (previewY + PREVIEW_ROW_HEIGHT > bottomLimit) {
      return Math.max(0, previewY + PREVIEW_ROW_HEIGHT - viewportHeight + composerBottomPadding + PREVIEW_BOTTOM_GUARD);
    }
    return currentY;
  }

  function getAbsolutePreviewY(envId: string): number | null {
    if (selectedInputPaperId) {
      const cardY = paperCardYRefs.current.get(selectedInputPaperId);
      const previewOffset = paperPreviewOffsetRefs.current.get(selectedInputPaperId);
      if (cardY === undefined || previewOffset === undefined) return null;
      return cardY + previewOffset;
    }
    const cardY = draftCardYRefs.current.get(envId);
    const previewOffset = draftPreviewOffsetRefs.current.get(envId);
    if (cardY === undefined || previewOffset === undefined) return null;
    return cardY + previewOffset;
  }

  function requestPreviewScroll(envId = selectedEnvId) {
    if (!envId) return;
    requestAnimationFrame(() => {
      const currentScroll = envScrollRefs.current.get(envId);
      const previewY = getAbsolutePreviewY(envId);
      if (!currentScroll || previewY === null) return;
      currentScroll.scrollTo({
        y: getPreviewScrollY(envId, previewY),
        animated: true,
      });
    });
  }

  useEffect(() => {
    if (!inputText.trim() || !selectedEnvId) return;
    if (selectedInputPaperId) setExpandedPaperId(selectedInputPaperId);
    requestPreviewScroll(selectedEnvId);
  }, [inputText, selectedEnvId, selectedInputPaperId, composerBottomPadding]);

  // ── 데이터 패치 ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (keepEnvId?: string) => {
    try {
      const [envs, papers] = await Promise.all([getEnvelopes(), getPapers()]);
      setEnvelopes(envs);
      setAllPapers(papers);
      const nextEnvId = keepEnvId ?? (envs.length > 0 ? envs[0].id : null);
      setSelectedEnvId(nextEnvId);

      const paperIds = papers.map((p) => p.id);
      if (paperIds.length > 0) {
        const [items, counts] = await Promise.all([
          getItemsByPaperIds(paperIds),
          getRoutineWaveCountsByPaperIds(paperIds),
        ]);
        const grouped: Record<string, Item[]> = {};
        for (const item of items) {
          if (!item.paper_id) continue;
          grouped[item.paper_id] = grouped[item.paper_id] ?? [];
          grouped[item.paper_id].push(item);
        }
        setItemsByPaperId(grouped);
        setWaveCounts(counts);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useFocusEffect(useCallback(() => { setTab("active"); fetchAll(selectedEnvId ?? undefined); }, [fetchAll, selectedEnvId]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll(selectedEnvId ?? undefined);
    setRefreshing(false);
  };

  // ── Pager 동기화 (tab 선택 → scroll) ────────────────────────────────────────
  useEffect(() => {
    const index = envelopes.findIndex((e) => e.id === selectedEnvId);
    if (index >= 0 && pagerRef.current) {
      pagerRef.current.scrollTo({ x: index * contentWidth, animated: false });
    }
  }, [selectedEnvId, envelopes, contentWidth]);

  function handlePageSwipe(x: number) {
    const index = Math.round(x / contentWidth);
    const env = envelopes[index];
    if (env && env.id !== selectedEnvId) {
      setSelectedEnvId(env.id);
      setExpandedPaperId(null);
    }
  }

  // ── Envelope 추가 ────────────────────────────────────────────────────────────
  async function handleCreateEnvelope() {
    const name = newEnvName.trim();
    setIsAddingEnvelope(false);
    setNewEnvName("");
    if (!name || !userId) return;
    try {
      const created = await addEnvelope(userId, { name });
      setEnvelopes((prev) => [...prev, created]);
      setSelectedEnvId(created.id);
    } catch { /* silent */ }
  }

  // ── Envelope 순서 변경 ───────────────────────────────────────────────────────
  async function handleReorderEnvelopes(newEnvelopes: Envelope[]) {
    setEnvelopes(newEnvelopes);
    try {
      await updateEnvelopeOrders(newEnvelopes.map((e, i) => ({ id: e.id, order: i })));
    } catch {
      await fetchAll(selectedEnvId ?? undefined);
    }
  }

  // ── Paper 순서 변경 ──────────────────────────────────────────────────────────
  async function handleReorderPapers(newPapers: Paper[], envId: string) {
    setAllPapers((prev) => {
      const others = prev.filter((p) => p.envelope_id !== envId || p.name === null);
      return [...others, ...newPapers];
    });
    try {
      await updatePaperOrders(newPapers.map((p, i) => ({ id: p.id, order: i })));
    } catch {
      await fetchAll(selectedEnvId ?? undefined);
    }
  }

  // ── Item 순서 변경 ───────────────────────────────────────────────────────────
  async function handleReorderItems(paperId: string, newItems: Item[]) {
    setItemsByPaperId((prev) => ({ ...prev, [paperId]: newItems }));
    try {
      await updateItemOrders(newItems.map((item, i) => ({ id: item.id, order: i })));
    } catch {
      await fetchAll(selectedEnvId ?? undefined);
    }
  }

  // ── Draft 항목 추가 ───────────────────────────────────────────────────────────
  async function handleAddToDraft(content: string, envId: string, scheduledDate: string | null = null) {
    if (!userId) return;
    const draft = draftPaperForEnv(envId);
    if (draft) {
      const pid = draft.id;
      const opt = makeOptimistic(userId, content, pid, scheduledDate);
      setItemsByPaperId((p) => ({ ...p, [pid]: [opt, ...(p[pid] ?? [])] }));
      try {
        const created = await addItem(userId, { content, paper_id: pid, scheduled_date: scheduledDate });
        setItemsByPaperId((p) => ({
          ...p, [pid]: (p[pid] ?? []).map((i) => (i.id === opt.id ? created : i)),
        }));
      } catch {
        setItemsByPaperId((p) => ({ ...p, [pid]: (p[pid] ?? []).filter((i) => i.id !== opt.id) }));
      }
    } else {
      try {
        const np = await addPaper(userId, { name: null, envelope_id: envId, status: "active" });
        const created = await addItem(userId, { content, paper_id: np.id, scheduled_date: scheduledDate });
        setAllPapers((prev) => [...prev, np]);
        setItemsByPaperId((prev) => ({ ...prev, [np.id]: [created] }));
      } catch { /* silent */ }
    }
  }

  // ── Named paper 항목 추가 ─────────────────────────────────────────────────────
  async function handleAddToPaper(paper: Paper, content: string, scheduledDate: string | null = null) {
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

  // ── 하단 InputBar 제출 ────────────────────────────────────────────────────────
  async function handleBottomSubmit(content: string, scheduledDate: string | null, paperId: string | null) {
    if (paperId) {
      const paper = currentActivePapers.find((p) => p.id === paperId);
      if (paper) await handleAddToPaper(paper, content, scheduledDate);
    } else {
      await handleAddToDraft(content, selectedEnvId!, scheduledDate);
    }
  }

  // ── Draft 완료 ───────────────────────────────────────────────────────────────
  async function handleCompleteDraft(envId: string) {
    const draft = draftPaperForEnv(envId);
    if (!draft || !userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    setAllPapers((prev) =>
      prev.map((p) =>
        p.id === draft.id ? { ...p, status: "completed", name: today, completed_at: now } : p,
      ),
    );
    try {
      await completePaper(draft.id, true);
      await addWave(userId, draft.id);
      setWaveCounts((prev) => {
        const next = { ...prev, [draft.id]: (prev[draft.id] ?? 0) + 1 };
        if (draft.parent_paper_id) next[draft.parent_paper_id] = (prev[draft.parent_paper_id] ?? 0) + 1;
        return next;
      });
    } catch {
      setAllPapers((prev) =>
        prev.map((p) =>
          p.id === draft.id ? { ...p, status: "active", name: null, completed_at: null } : p,
        ),
      );
    }
  }

  // ── 새 paper 생성 ────────────────────────────────────────────────────────────
  async function handleCreatePaper() {
    const name = newPaperName.trim();
    setIsAddingPaper(false);
    setNewPaperName("");
    if (!name || !userId) return;
    try {
      const created = await addPaper(userId, { name, envelope_id: selectedEnvId, status: "active" });
      setAllPapers((prev) => [...prev, created]);
      setItemsByPaperId((prev) => ({ ...prev, [created.id]: [] }));
      setExpandedPaperId(created.id);
    } catch { /* silent */ }
  }

  // ── 아이템 체크 토글 ─────────────────────────────────────────────────────────
  async function handleToggleItem(paperId: string, itemId: string, checked: boolean) {
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

  async function requestDeleteTarget(target: NonNullable<typeof deleteTarget>) {
    const skip = await AsyncStorage.getItem(DELETE_WARNING_SKIP_KEY);
    if (skip === "1") {
      await performDelete(target);
      return;
    }
    setDeleteTarget(target);
  }

  async function deleteItemImmediately(item: Item) {
    setItemsByPaperId((prev) => ({
      ...prev,
      ...(item.paper_id ? { [item.paper_id]: (prev[item.paper_id] ?? []).filter((i) => i.id !== item.id) } : {}),
    }));
    try {
      await deleteItem(item.id);
      Toast.show({ type: "success", text1: "삭제되었습니다." });
    } catch {
      Toast.show({ type: "error", text1: "삭제에 실패했어요." });
      await fetchAll(selectedEnvId ?? undefined);
    }
  }

  async function performDelete(target: NonNullable<typeof deleteTarget>) {
    if (target.type === "paper") {
      const paper = target.paper;
      setAllPapers((prev) => prev.filter((p) => p.id !== paper.id));
      if (expandedPaperId === paper.id) setExpandedPaperId(null);
      if (paperEditModeId === paper.id) setPaperEditModeId(null);
      try {
        await deletePaper(paper.id);
        Toast.show({ type: "success", text1: "삭제되었습니다.", text2: "설정 > 최근 삭제됨에서 30일 내 복구할 수 있어요." });
      } catch {
        Toast.show({ type: "error", text1: "삭제에 실패했어요." });
        await fetchAll(selectedEnvId ?? undefined);
      }
      return;
    }

    const envelope = target.envelope;
    setEnvelopes((prev) => prev.filter((env) => env.id !== envelope.id));
    setAllPapers((prev) => prev.filter((paper) => paper.envelope_id !== envelope.id));
    if (selectedEnvId === envelope.id) setSelectedEnvId(envelopes.find((env) => env.id !== envelope.id)?.id ?? null);
    try {
      await deleteEnvelope(envelope.id);
      Toast.show({ type: "success", text1: "삭제되었습니다.", text2: "설정 > 최근 삭제됨에서 30일 내 복구할 수 있어요." });
    } catch {
      Toast.show({ type: "error", text1: "삭제에 실패했어요." });
      await fetchAll(selectedEnvId ?? undefined);
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
      await fetchAll(selectedEnvId ?? undefined);
    } catch {
      Toast.show({ type: "error", text1: "이동에 실패했어요." });
    }
  }

  function startPaperEdit(paper: Paper) {
    setExpandedPaperId(paper.id);
    setPaperEditModeId(paper.id);
    setPaperEditName(paper.name ?? "");
  }

  async function savePaperEdit(paper: Paper) {
    const name = paperEditName.trim();
    if (!name) return;
    setPaperEditModeId(null);
    setAllPapers((prev) => prev.map((p) => (p.id === paper.id ? { ...p, name } : p)));
    try {
      await updatePaperName(paper.id, name);
      Toast.show({ type: "success", text1: "이름이 변경되었습니다." });
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요." });
      await fetchAll(selectedEnvId ?? undefined);
    }
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
    }
    try {
      await updateItemContent(item.id, content);
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요." });
      await fetchAll(selectedEnvId ?? undefined);
    }
  }

  async function handleRenameEnvelope(envelope: Envelope, name: string) {
    setEditEnvelopeTarget(null);
    setEnvelopes((prev) => prev.map((env) => (env.id === envelope.id ? { ...env, name } : env)));
    try {
      await updateEnvelopeName(envelope.id, name);
      Toast.show({ type: "success", text1: "이름이 변경되었습니다." });
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요." });
      await fetchAll(selectedEnvId ?? undefined);
    }
  }

  // ── Paper 완료 ───────────────────────────────────────────────────────────────
  async function handleComplete(paper: Paper) {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    setAllPapers((prev) =>
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
      setAllPapers((prev) =>
        prev.map((p) =>
          p.id === paper.id
            ? { ...p, status: "active", name: paper.name, completed_at: null }
            : p,
        ),
      );
    }
  }

  // ── 즐겨찾기 토글 ────────────────────────────────────────────────────────────
  async function handleToggleFavorite(paper: Paper) {
    setAllPapers((prev) =>
      prev.map((p) => (p.id === paper.id ? { ...p, is_favorite: !p.is_favorite } : p)),
    );
    try {
      await toggleFavorite(paper.id, paper.is_favorite);
    } catch {
      setAllPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, is_favorite: paper.is_favorite } : p)),
      );
    }
  }

  // ── 새 Wave (즐겨찾기 복제) ──────────────────────────────────────────────────
  async function handleCloneFavorite(original: Paper) {
    if (!userId) return;
    const originalItems = itemsByPaperId[original.id] ?? [];
    try {
      const { paper: newPaper, items: newItems } = await clonePaper(original, originalItems, userId);
      setAllPapers((prev) => [...prev, newPaper]);
      setItemsByPaperId((prev) => ({ ...prev, [newPaper.id]: newItems }));
      // 복제된 paper가 속한 envelope로 이동 + 펼침
      if (newPaper.envelope_id) setSelectedEnvId(newPaper.envelope_id);
      setExpandedPaperId(newPaper.id);
      setTab("active");
    } catch { /* silent */ }
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator color="#1D9E75" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* 헤더 */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: "#1a1a1a" }}>papers</Text>
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

        {/* Envelope 탭 */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: 8, zIndex: showEnvelopeMenu ? 50 : 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, paddingRight: 8 }}
          >
            {envelopes.map((env) => {
              const active = env.id === selectedEnvId;
              return (
                <Pressable
                  key={env.id}
                  onPress={() => {
                    setShowEnvelopeMenu(false);
                    setSelectedEnvId(env.id);
                    setExpandedPaperId(null);
                    setIsAddingPaper(false);
                    setNewPaperName("");
                  }}
                  onLongPress={() => setShowEnvReorder(true)}
                  delayLongPress={400}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 20,
                    borderWidth: 0.5,
                    borderColor: active ? "#1D9E75" : "#ddd",
                    backgroundColor: active ? "#1D9E75" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? "500" : "400", color: active ? "#fff" : "#888" }}>
                    {env.name}
                  </Text>
                </Pressable>
              );
            })}

            {/* envelope 추가 */}
            {isAddingEnvelope ? (
              <View style={{ borderRadius: 20, borderWidth: 0.5, borderColor: "#9FE1CB", paddingHorizontal: 10, paddingVertical: 4 }}>
                <TextInput
                  ref={newEnvInputRef}
                  style={{ fontSize: 15, color: "#1a1a1a", minWidth: 60 }}
                  placeholder="이름..."
                  placeholderTextColor="#ccc"
                  value={newEnvName}
                  onChangeText={setNewEnvName}
                  onSubmitEditing={handleCreateEnvelope}
                  onBlur={() => { if (!newEnvName.trim()) { setIsAddingEnvelope(false); setNewEnvName(""); } }}
                  returnKeyType="done"
                  autoFocus
                />
              </View>
            ) : (
              <Pressable
                onPress={() => { setIsAddingEnvelope(true); setTimeout(() => newEnvInputRef.current?.focus(), 80); }}
                style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 0.5, borderColor: "#ddd", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, color: "#aaa", lineHeight: 16 }}>+</Text>
              </Pressable>
            )}
          </ScrollView>
          <View ref={envelopeMenuButtonRef} style={{ marginRight: 8, flexShrink: 0 }}>
            <Pressable
              onPress={() => {
                envelopeMenuButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setEnvelopeMenuPos({
                    top: y + height + 4,
                    left: Math.max(8, x + width - 170),
                  });
                });
                setShowEnvelopeMenu((value) => !value);
              }}
              hitSlop={8}
              style={{
                width: 34,
                height: 28,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pencil size={17} color={showEnvelopeMenu ? "#1D9E75" : "#999"} />
            </Pressable>
          </View>
        </View>

        <Modal
          visible={showEnvelopeMenu && !!selectedEnvelope}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEnvelopeMenu(false)}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowEnvelopeMenu(false)}>
            {selectedEnvelope && envelopeMenuPos && (
              <View
                style={{
                  position: "absolute",
                  top: envelopeMenuPos.top,
                  left: envelopeMenuPos.left,
                  width: 170,
                  borderRadius: 8,
                  borderWidth: 0.5,
                  borderColor: "#eee",
                  backgroundColor: "#fff",
                  elevation: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                }}
              >
                <Pressable
                  onPress={() => {
                    setShowEnvelopeMenu(false);
                    setEditEnvelopeTarget(selectedEnvelope);
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 13, color: "#555" }}>{selectedEnvelope.name} 편집</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowEnvelopeMenu(false);
                    requestDeleteTarget({ type: "envelope", envelope: selectedEnvelope });
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: "#f5f5f5" }}
                >
                  <Text style={{ fontSize: 13, color: "#E24B4A" }}>{selectedEnvelope.name} 삭제</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Modal>

        <View style={{ height: 0.5, backgroundColor: "#eee", marginHorizontal: 12, marginBottom: 8 }} />

        {/* Envelope 페이지 (좌우 스와이프) */}
        {envelopes.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 14, color: "#aaa" }}>+ 버튼으로 envelope를 추가해보세요</Text>
          </View>
        ) : (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => handlePageSwipe(e.nativeEvent.contentOffset.x)}
            style={{ flex: 1 }}
            scrollEnabled={!isDragging}
            onLayout={(e) => {
              pagerHeight.current = e.nativeEvent.layout.height;
              setContentWidth(e.nativeEvent.layout.width);
            }}
          >
            {envelopes.map((env) => {
              const draft = draftPaperForEnv(env.id);
              const draftItems = draft ? (itemsByPaperId[draft.id] ?? []) : [];
              const activePapers = activePapersForEnv(env.id);
              const completedPapers = completedPapersForEnv(env.id);

              const disableEnvScroll = () => envScrollRefs.current.get(env.id)?.setNativeProps({ scrollEnabled: false });
              const enableEnvScroll  = () => envScrollRefs.current.get(env.id)?.setNativeProps({ scrollEnabled: true });
              const scrollByEnv = (delta: number) => {
                const offset = envScrollOffsets.current.get(env.id) ?? 0;
                const newY = offset + delta;
                envScrollOffsets.current.set(env.id, newY);
                envScrollRefs.current.get(env.id)?.scrollTo({ y: newY, animated: false });
              };

              return (
                <View key={env.id} style={{ width: contentWidth }}>
                  <ScrollView
                    ref={(ref) => { envScrollRefs.current.set(env.id, ref); }}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    scrollEnabled={!isDragging}
                    scrollEventThrottle={16}
                    onScroll={(e) => { envScrollOffsets.current.set(env.id, e.nativeEvent.contentOffset.y); }}
                    contentContainerStyle={{ paddingBottom: composerBottomPadding }}
                    refreshControl={
                      env.id === selectedEnvId
                        ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1D9E75" />
                        : undefined
                    }
                  >
                    {tab === "active" ? (
                      <>
                        <View onLayout={(event) => { draftCardYRefs.current.set(env.id, event.nativeEvent.layout.y); }}>
                          <DraftCard
                            items={draftItems}
                            previewText={selectedInputPaperId || env.id !== selectedEnvId ? undefined : inputText}
                            previewScheduledDate={inputScheduledDate}
                            onToggle={(id, checked) => draft && handleToggleItem(draft.id, id, checked)}
                            onComplete={draft ? () => handleCompleteDraft(env.id) : undefined}
                            onReorderItems={draft ? (newItems) => handleReorderItems(draft.id, newItems) : undefined}
                            onClassifyItem={draft ? (itemId) => setClassifyTarget({ itemId, fromPaperId: draft.id }) : undefined}
                            onPreviewLayout={(y) => {
                              draftPreviewOffsetRefs.current.set(env.id, y);
                              requestPreviewScroll(env.id);
                            }}
                            onItemDragStart={() => setIsDragging(true)}
                            onItemDragEnd={() => setIsDragging(false)}
                            disableParentScroll={disableEnvScroll}
                            enableParentScroll={enableEnvScroll}
                            scrollBy={scrollByEnv}
                          />
                        </View>

                        <SortableList
                          data={activePapers}
                          keyExtractor={(p) => p.id}
                          onReorder={(newPapers) => handleReorderPapers(newPapers, env.id)}
                          itemHeight={62}
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
                                onToggleItem={(id, checked) => handleToggleItem(paper.id, id, checked)}
                                onComplete={() => handleComplete(paper)}
                                onAddItem={(content) => handleAddToPaper(paper, content)}
                                onReorderItems={(newItems) => handleReorderItems(paper.id, newItems)}
                                onClassifyItem={(itemId) => setClassifyTarget({ itemId, fromPaperId: paper.id })}
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
                                previewText={selectedInputPaperId === paper.id && env.id === selectedEnvId ? inputText : undefined}
                                previewScheduledDate={inputScheduledDate}
                                onPreviewLayout={(y) => {
                                  paperPreviewOffsetRefs.current.set(paper.id, y);
                                  requestPreviewScroll(env.id);
                                }}
                                onLongPress={dh.onLongPress}
                                onPressOut={dh.onPressOut}
                                delayLongPress={dh.delayLongPress}
                                onItemDragStart={() => setIsDragging(true)}
                                onItemDragEnd={() => setIsDragging(false)}
                                disableParentScroll={disableEnvScroll}
                                enableParentScroll={enableEnvScroll}
                                scrollBy={scrollByEnv}
                              />
                            </View>
                          )}
                        />

                        {/* 새 paper 인라인 입력 */}
                        {isAddingPaper && env.id === selectedEnvId && (
                          <View style={{ marginHorizontal: 12, marginBottom: 6, borderRadius: 8, borderWidth: 1, borderColor: "#9FE1CB", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10 }}>
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

                        <View style={{ flexDirection: "row", gap: 4, marginHorizontal: 12, marginTop: 2 }}>
                          <Pressable
                            onPress={() => {
                              setIsAddingPaper(true);
                              setTimeout(() => newPaperInputRef.current?.focus(), 80);
                            }}
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: "#ccc", borderStyle: "dashed" }}
                          >
                            <Text style={{ fontSize: 13, color: "#888" }}>+  새 paper</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setShowFavoriteSheet(true)}
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: "#ccc", borderStyle: "dashed" }}
                          >
                            <Text style={{ fontSize: 13, color: "#888" }}>★  새 wave</Text>
                          </Pressable>
                        </View>
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
                                onToggleItem={(id, checked) => handleToggleItem(paper.id, id, checked)}
                                onToggleFavorite={() => handleToggleFavorite(paper)}
                                waveCount={waveCounts[paper.id] ?? 0}
                              />
                            ))
                        )}
                      </>
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* 하단 InputBar — 활성 탭 + envelope 있을 때만 */}
        {tab === "active" && envelopes.length > 0 && (
          <InputBar
            value={inputText}
            onChangeText={setInputText}
            onSubmit={handleBottomSubmit}
            onPaperSelect={handleInputPaperSelect}
            onAddPaperPress={() => { setIsAddingPaper(true); setTimeout(() => newPaperInputRef.current?.focus(), 80); }}
            onPreviewMetaChange={handlePreviewMetaChange}
            papers={currentActivePapers.map((p) => ({ id: p.id, name: p.name! }))}
          />
        )}
      </KeyboardAvoidingView>

      <MoveItemSheet
        visible={moveItemTarget !== null}
        papers={allPapers
          .filter((p) => p.status === "active" && p.name !== null)
          .map((p) => ({
            id: p.id,
            name: p.name!,
            envelopeId: p.envelope_id,
            envelopeName: envelopes.find((env) => env.id === p.envelope_id)?.name,
          }))}
        currentPaperId={moveItemTarget?.paper_id}
        currentEnvelopeId={allPapers.find((paper) => paper.id === moveItemTarget?.paper_id)?.envelope_id ?? selectedEnvId}
        currentEnvelopeName={envelopes.find((env) => env.id === (allPapers.find((paper) => paper.id === moveItemTarget?.paper_id)?.envelope_id ?? selectedEnvId))?.name ?? "현재 Envelope"}
        onSelect={handleMoveItem}
        onClose={() => setMoveItemTarget(null)}
      />

      <EnvelopeEditSheet
        visible={editEnvelopeTarget !== null}
        envelope={editEnvelopeTarget}
        onClose={() => setEditEnvelopeTarget(null)}
        onRename={handleRenameEnvelope}
        onDelete={(envelope) => {
          setEditEnvelopeTarget(null);
          requestDeleteTarget({ type: "envelope", envelope });
        }}
      />

      <DeleteConfirmModal
        visible={deleteTarget !== null}
        title="삭제할까요?"
        message={
          deleteTarget?.type === "envelope"
              ? "이 envelope와 안의 paper들이 삭제됩니다."
              : "이 paper와 안의 항목들이 삭제됩니다."
        }
        recoveryHint="설정 > 최근 삭제됨에서 30일 내 복구할 수 있어요."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 새 Wave 바텀시트 */}
      <FavoriteSheet
        visible={showFavoriteSheet}
        favorites={favoritePapers}
        itemsByPaperId={itemsByPaperId}
        waveCounts={waveCounts}
        onSelect={(paper) => {
          setShowFavoriteSheet(false);
          handleCloneFavorite(paper);
        }}
        onClose={() => setShowFavoriteSheet(false)}
      />

      {/* Envelope 순서 변경 바텀시트 */}
      <EnvelopeReorderSheet
        visible={showEnvReorder}
        envelopes={envelopes}
        onReorder={handleReorderEnvelopes}
        onClose={() => setShowEnvReorder(false)}
      />

      {/* 아이템 → 다른 Envelope 분류 시트 */}
      <ClassifySheet
        visible={classifyTarget !== null}
        envelopes={envelopes}
        onSelect={(envId) => {
          if (classifyTarget && userId) {
            const { itemId, fromPaperId } = classifyTarget;
            // 낙관적으로 현재 paper에서 제거
            setItemsByPaperId((prev) => ({
              ...prev,
              [fromPaperId]: (prev[fromPaperId] ?? []).filter((i) => i.id !== itemId),
            }));
            classifyItemToEnvelope(itemId, envId, userId).catch(() => fetchAll(selectedEnvId ?? undefined));
          }
          setClassifyTarget(null);
        }}
        onClose={() => setClassifyTarget(null)}
      />
    </SafeAreaView>
  );
}
