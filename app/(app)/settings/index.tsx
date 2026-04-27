import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Toast from "react-native-toast-message";

import { useSession } from "@/hooks/useSession";
import { useWeekStart } from "@/hooks/useWeekStart";
import { signOut } from "@/lib/api/auth";
import { getProfile, requestAccountDeletion, updateUsername } from "@/lib/api/profile";

const APP_VERSION = "1.0.0";

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "600", color: "#999999", letterSpacing: 0.6, marginTop: 28, marginBottom: 6, marginHorizontal: 20 }}>
      {children}
    </Text>
  );
}

function SettingRow({
  label,
  value,
  onPress,
  danger,
  subtle,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  subtle?: boolean;
  right?: React.ReactNode;
}) {
  const textColor = danger ? "#E24B4A" : subtle ? "#999999" : "#1a1a1a";
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed && onPress ? "#f0f0eb" : "#ffffff",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0eb" }}>
        <Text style={{ flex: 1, fontSize: 15, color: textColor }}>{label}</Text>
        {right ?? (
          <>
            {value && <Text style={{ fontSize: 14, color: "#999999", marginRight: 6 }}>{value}</Text>}
            {onPress && <ChevronRight size={16} color="#cccccc" />}
          </>
        )}
      </View>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 16, borderRadius: 12, backgroundColor: "#ffffff", overflow: "hidden" }}>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { weekStart, update: updateWeekStart } = useWeekStart();

  const [username, setUsername] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<TextInput>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const isAnonymous = session?.user?.is_anonymous ?? true;
  const email = session?.user?.email ?? null;
  const provider = (session?.user?.identities?.[0]?.provider as string) ?? "email";

  const providerLabel: Record<string, string> = {
    google: "Google",
    email: "이메일",
    github: "GitHub",
  };

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.username) setUsername(p.username);
    }).catch(console.error);
  }, []);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const prev = username;
    setUsername(trimmed);
    setEditingName(false);
    try {
      await updateUsername(trimmed);
      Toast.show({ type: "success", text1: "이름이 변경되었습니다." });
    } catch (e) {
      console.error("updateUsername error:", e);
      setUsername(prev);
      Toast.show({ type: "error", text1: "저장에 실패했어요.", text2: String(e) });
    }
  };

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: async () => {
        await signOut();
        Toast.show({ type: "success", text1: "로그아웃 되었습니다." });
      } },
    ]);
  };

  const handleDeleteAccount = () => {
    setDeleteReason("");
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    Alert.alert("정말 탈퇴할까요?", "30일 후 계정이 삭제됩니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          setDeleteModalVisible(false);
          await requestAccountDeletion(deleteReason.trim() || undefined);
          Toast.show({ type: "info", text1: "계정이 비활성화 되었습니다." });
          await new Promise((r) => setTimeout(r, 1200));
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f0" }}>
      {/* 헤더 */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12 }}>
        <Pressable onPress={() => router.navigate("/(app)/me")} hitSlop={8} style={{ padding: 8 }}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#1a1a1a", marginLeft: 4 }}>설정</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* 계정 */}
        <SectionLabel>계정</SectionLabel>
        <Card>
          {isAnonymous ? (
            <SettingRow label="로그인 / 회원가입" onPress={() => router.push({ pathname: "/(auth)/login", params: { from: "settings" } })} />
          ) : (
            <>
              {/* 이름 */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0eb" }}>
                <Text style={{ flex: 1, fontSize: 15, color: "#1a1a1a" }}>이름</Text>
                {editingName ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      ref={nameInputRef}
                      value={nameInput}
                      onChangeText={setNameInput}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSaveName}
                      style={{ fontSize: 14, color: "#1a1a1a", borderBottomWidth: 1, borderBottomColor: "#1D9E75", minWidth: 80, paddingVertical: 2 }}
                    />
                    <Pressable onPress={handleSaveName}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#1D9E75" }}>저장</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingName(false)}>
                      <Text style={{ fontSize: 13, color: "#999999" }}>취소</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => { setNameInput(username); setEditingName(true); }} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 14, color: username ? "#555555" : "#999999" }}>
                      {username || "이름 없음"}
                    </Text>
                    <ChevronRight size={16} color="#cccccc" />
                  </Pressable>
                )}
              </View>
              {/* 이메일 */}
              <SettingRow label={email ?? ""} value={providerLabel[provider] ?? provider} />
            </>
          )}
        </Card>

        {/* 데이터 관리 */}
        <SectionLabel>데이터 관리</SectionLabel>
        <Card>
          <SettingRow label="최근 삭제됨" onPress={() => router.push("/(app)/settings/trash")} />
        </Card>

        {/* 앱 설정 */}
        <SectionLabel>앱 설정</SectionLabel>
        <Card>
          <SettingRow
            label="한 주의 시작"
            right={
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["mon", "sun"] as const).map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => updateWeekStart(day)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: weekStart === day ? "#1D9E75" : "#f0f0eb",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: weekStart === day ? "#ffffff" : "#555555" }}>
                      {day === "mon" ? "월" : "일"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            }
          />
        </Card>

        {/* 법적 고지 */}
        <SectionLabel>법적 고지</SectionLabel>
        <Card>
          <SettingRow label="서비스 이용약관" onPress={() => router.push("/(app)/settings/terms")} />
          <SettingRow label="개인정보 처리방침" onPress={() => router.push("/(app)/settings/privacy")} />
          <SettingRow label="오픈소스 라이선스" onPress={() => router.push("/(app)/settings/licenses")} />
        </Card>

        {/* 앱 정보 */}
        <SectionLabel>앱 정보</SectionLabel>
        <Card>
          <SettingRow label="버전" value={APP_VERSION} />
        </Card>

        {/* 계정 관리 */}
        {!isAnonymous && (
          <>
            <SectionLabel>계정 관리</SectionLabel>
            <Card>
              <SettingRow label="로그아웃" onPress={handleLogout} danger />
            </Card>
          </>
        )}

        {/* 회원 탈퇴 텍스트 버튼 */}
        {!isAnonymous && (
          <Pressable onPress={handleDeleteAccount} style={{ alignItems: "center", paddingVertical: 20, marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: "#bbbbbb" }}>회원 탈퇴</Text>
          </Pressable>
        )}

      </ScrollView>

      {/* 회원 탈퇴 모달 */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
            onPress={() => setDeleteModalVisible(false)}
          >
            <Pressable onPress={() => {}} style={{ width: "85%", backgroundColor: "#ffffff", borderRadius: 16, padding: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 }}>회원 탈퇴</Text>
              <Text style={{ fontSize: 13, color: "#555555", lineHeight: 20, marginBottom: 20 }}>
                {"탈퇴 요청 후 30일 이내 재로그인하면 계정을 복구할 수 있어요.\n30일이 지나면 모든 데이터가 영구 삭제됩니다."}
              </Text>
              <TextInput
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="탈퇴 사유를 입력해주세요 (선택)"
                placeholderTextColor="#bbbbbb"
                multiline
                numberOfLines={3}
                style={{
                  fontSize: 14,
                  color: "#1a1a1a",
                  backgroundColor: "#f5f5f0",
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 72,
                  textAlignVertical: "top",
                  marginBottom: 20,
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setDeleteModalVisible(false)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f0f0eb", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#555555" }}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDelete}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#1a1a1a", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff" }}>탈퇴</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
