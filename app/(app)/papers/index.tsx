import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
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
import { useSession } from "@/hooks/useSession";
import { addItem, getItemsByPaperIds, toggleItem } from "@/lib/api/items";
import { addPaper, completePaper, getPapers, toggleFavorite } from "@/lib/api/papers";
import { getEnvelopes } from "@/lib/api/envelopes";
import { addWave } from "@/lib/api/waves";
import type { Envelope, Item, Paper } from "@/lib/types";

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} 완료`;
}

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
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [itemsByPaperId, setItemsByPaperId] = useState<Record<string, Item[]>>({});
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddingPaper, setIsAddingPaper] = useState(false);
  const [newPaperName, setNewPaperName] = useState("");
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [inputText, setInputText] = useState("");
  const [selectedInputPaperId, setSelectedInputPaperId] = useState<string | null>(null);
  const newPaperInputRef = useRef<TextInput>(null);

  function handleInputPaperSelect(paperId: string | null) {
    setSelectedInputPaperId(paperId);
    if (paperId) setExpandedPaperId(paperId);
  }

  // ── 파생 상태 ─────────────────────────────────────────────────────────────────
  const activePapersAll = allPapers.filter(
    (p) => p.envelope_id === selectedEnvId && p.status === "active",
  );
  const draftPaper = activePapersAll.find((p) => p.name === null) ?? null;
  const activePapers = activePapersAll.filter((p) => p.name !== null);
  const draftItems = draftPaper ? (itemsByPaperId[draftPaper.id] ?? []) : [];
  const completedPapers = allPapers.filter(
    (p) => p.envelope_id === selectedEnvId && p.status === "completed",
  );

  useFocusEffect(useCallback(() => { setTab("active"); }, []));

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
        const items = await getItemsByPaperIds(paperIds);
        const grouped: Record<string, Item[]> = {};
        for (const item of items) {
          if (!item.paper_id) continue;
          grouped[item.paper_id] = grouped[item.paper_id] ?? [];
          grouped[item.paper_id].push(item);
        }
        setItemsByPaperId(grouped);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll(selectedEnvId ?? undefined);
    setRefreshing(false);
  };

  // ── Draft 항목 추가 ───────────────────────────────────────────────────────────
  async function handleAddToDraft(content: string, scheduledDate: string | null = null) {
    if (!userId) return;
    if (draftPaper) {
      const pid = draftPaper.id;
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
        const np = await addPaper(userId, { name: null, envelope_id: selectedEnvId, status: "active" });
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

  // ── 하단 InputBar 제출 (날짜 + paper 선택 포함) ────────────────────────────
  async function handleBottomSubmit(content: string, scheduledDate: string | null, paperId: string | null) {
    if (paperId) {
      const paper = activePapers.find((p) => p.id === paperId);
      if (paper) await handleAddToPaper(paper, content, scheduledDate);
    } else {
      await handleAddToDraft(content, scheduledDate);
    }
  }

  // ── Draft 완료 (draft paper name → 오늘날짜, status → completed) ───────────
  async function handleCompleteDraft() {
    if (!draftPaper || !userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    setAllPapers((prev) =>
      prev.map((p) =>
        p.id === draftPaper.id
          ? { ...p, status: "completed", name: today, completed_at: now }
          : p,
      ),
    );
    try {
      await completePaper(draftPaper.id, true);
      await addWave(userId, draftPaper.id);
    } catch {
      setAllPapers((prev) =>
        prev.map((p) =>
          p.id === draftPaper.id
            ? { ...p, status: "active", name: null, completed_at: null }
            : p,
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

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator color="#1D9E75" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingBottom: 8 }}
        >
          {envelopes.map((env) => {
            const active = env.id === selectedEnvId;
            return (
              <Pressable
                key={env.id}
                onPress={() => {
                  setSelectedEnvId(env.id);
                  setExpandedPaperId(null);
                  setIsAddingPaper(false);
                  setNewPaperName("");
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 20,
                  borderWidth: 0.5,
                  borderColor: active ? "#1D9E75" : "#ddd",
                  backgroundColor: active ? "#1D9E75" : "#fff",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: active ? "500" : "400", color: active ? "#fff" : "#888" }}>
                  {env.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 0.5, borderColor: "#ddd", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 12, color: "#aaa", lineHeight: 14 }}>+</Text>
          </Pressable>
        </ScrollView>

        <View style={{ height: 0.5, backgroundColor: "#eee", marginHorizontal: 12, marginBottom: 8 }} />

        {/* 스크롤 콘텐츠 */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1D9E75" />}
        >
          {envelopes.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <Text style={{ fontSize: 14, color: "#aaa" }}>envelope가 없습니다</Text>
            </View>
          ) : tab === "active" ? (
            <>
              {/* Draft Card — envelope 내 paper 없는 items (name=null paper) */}
              <DraftCard
                items={draftItems}
                previewText={selectedInputPaperId ? undefined : inputText}
                onToggle={(id, checked) => draftPaper && handleToggleItem(draftPaper.id, id, checked)}
                onComplete={draftPaper ? handleCompleteDraft : undefined}
              />

              {/* Named Paper Cards */}
              {activePapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  items={itemsByPaperId[paper.id] ?? []}
                  isExpanded={expandedPaperId === paper.id}
                  onToggleExpand={() =>
                    setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)
                  }
                  onToggleItem={(id, checked) => handleToggleItem(paper.id, id, checked)}
                  onComplete={() => handleComplete(paper)}
                  onAddItem={(content) => handleAddToPaper(paper, content)}
                  previewText={selectedInputPaperId === paper.id ? inputText : undefined}
                />
              ))}

              {/* 새 paper 인라인 입력 */}
              {isAddingPaper && (
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
                  onPress={() => { setIsAddingPaper(true); setTimeout(() => newPaperInputRef.current?.focus(), 80); }}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: "#ccc", borderStyle: "dashed" }}
                >
                  <Text style={{ fontSize: 11, color: "#aaa" }}>+  새 paper</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: "#ccc", borderStyle: "dashed" }}
                >
                  <Text style={{ fontSize: 11, color: "#aaa" }}>★  새 wave</Text>
                </Pressable>
              </View>
            </>
          ) : (
            /* 완료 탭 */
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
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#1a1a1a", marginRight: 8 }} numberOfLines={1}>
                          {paper.name}
                        </Text>
                        <Pressable onPress={() => handleToggleFavorite(paper)} hitSlop={8}>
                          <Text style={{ fontSize: 16, color: paper.is_favorite ? "#EF9F27" : "#ddd" }}>★</Text>
                        </Pressable>
                      </View>
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
                              onToggle={(id, checked) => handleToggleItem(paper.id, id, checked)}
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
        {tab === "active" && envelopes.length > 0 && (
          <InputBar
            value={inputText}
            onChangeText={setInputText}
            onSubmit={handleBottomSubmit}
            onPaperSelect={handleInputPaperSelect}
            papers={activePapers.map((p) => ({ id: p.id, name: p.name! }))}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
