import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react-native";
import Toast from "react-native-toast-message";

import { getDeletedEnvelopes, restoreEnvelope } from "@/lib/api/envelopes";
import { getDeletedPapers, restorePaper } from "@/lib/api/papers";
import type { Envelope, Paper } from "@/lib/types";

function formatDeletedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘 삭제됨";
  if (diffDays === 1) return "1일 전 삭제됨";
  return `${diffDays}일 전 삭제됨`;
}

function daysUntilExpiry(iso: string): number {
  const deletedAt = new Date(iso).getTime();
  const expiry = deletedAt + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function TrashScreen() {
  const router = useRouter();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([getDeletedEnvelopes(), getDeletedPapers()]);
      setEnvelopes(e);
      setPapers(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRestoreEnvelope = async (envelope: Envelope) => {
    try {
      await restoreEnvelope(envelope.id);
      Toast.show({ type: "success", text1: `'${envelope.name}' 복원됨` });
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: "복원에 실패했어요." });
    }
  };

  const handleRestorePaper = async (paper: Paper) => {
    try {
      await restorePaper(paper.id);
      Toast.show({ type: "success", text1: `'${paper.name ?? paper.id}' 복원됨` });
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: "복원에 실패했어요." });
    }
  };

  const isEmpty = envelopes.length === 0 && papers.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f0" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 8 }}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#1a1a1a", marginLeft: 4 }}>최근 삭제됨</Text>
      </View>

      <Text style={{ fontSize: 13, color: "#999999", marginHorizontal: 20, marginBottom: 12 }}>
        삭제 후 30일 이내 항목을 복원할 수 있어요.
      </Text>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, color: "#999999" }}>불러오는 중...</Text>
        </View>
      ) : isEmpty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
          <Trash2 size={40} color="#cccccc" strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: "#999999", marginTop: 12 }}>삭제된 항목이 없어요</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Envelopes */}
          {envelopes.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#999999", letterSpacing: 0.6, marginTop: 8, marginBottom: 6, marginHorizontal: 20 }}>
                ENVELOPE
              </Text>
              <View style={{ marginHorizontal: 16, borderRadius: 12, backgroundColor: "#ffffff", overflow: "hidden" }}>
                {envelopes.map((env) => (
                  <View
                    key={env.id}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0eb" }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: "#1a1a1a" }}>{env.name}</Text>
                      <Text style={{ fontSize: 13, color: "#999999", marginTop: 2 }}>
                        {formatDeletedAt(env.deleted_at!)} · {daysUntilExpiry(env.deleted_at!)}일 후 영구 삭제
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRestoreEnvelope(env)}
                      hitSlop={8}
                      style={{ padding: 8 }}
                    >
                      <RotateCcw size={18} color="#1D9E75" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Papers */}
          {papers.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#999999", letterSpacing: 0.6, marginTop: 24, marginBottom: 6, marginHorizontal: 20 }}>
                PAPER
              </Text>
              <View style={{ marginHorizontal: 16, borderRadius: 12, backgroundColor: "#ffffff", overflow: "hidden" }}>
                {papers.map((paper) => (
                  <View
                    key={paper.id}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0eb" }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: "#1a1a1a" }}>
                        {paper.name ?? "이름 없는 paper"}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#999999", marginTop: 2 }}>
                        {formatDeletedAt(paper.deleted_at!)} · {daysUntilExpiry(paper.deleted_at!)}일 후 영구 삭제
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRestorePaper(paper)}
                      hitSlop={8}
                      style={{ padding: 8 }}
                    >
                      <RotateCcw size={18} color="#1D9E75" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
