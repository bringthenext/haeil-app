import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f0" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12 }}>
        <Pressable onPress={() => router.navigate("/(app)/settings")} hitSlop={8} style={{ padding: 8 }}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#1a1a1a", marginLeft: 4 }}>개인정보 처리방침</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 13, lineHeight: 22, color: "#555555" }}>
          {`제1조 (수집하는 개인정보)\n이메일 주소, 서비스 이용 데이터(할 일, 루틴, 완료 기록)를 수집합니다. 비회원의 경우 익명 식별자만 수집합니다.\n\n제2조 (수집 목적)\n수집된 정보는 서비스 제공, 데이터 동기화, 통계 기능(streak, wave 집계)에만 사용됩니다.\n\n제3조 (보관 기간)\n회원 탈퇴 시 모든 개인정보 및 서비스 데이터는 즉시 삭제됩니다.\n\n제4조 (제3자 제공)\n수집된 개인정보는 법령에 따른 경우를 제외하고 제3자에게 제공되지 않습니다.\n\n제5조 (처리 위탁)\n데이터 저장 및 인증 처리는 Supabase(미국 소재)에 위탁합니다.\n\n제6조 (권리)\n사용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다.\n\n시행일: 2026년 4월 26일`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
