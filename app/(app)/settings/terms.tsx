import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f0" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12 }}>
        <Pressable onPress={() => router.navigate("/(app)/settings")} hitSlop={8} style={{ padding: 8 }}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#1a1a1a", marginLeft: 4 }}>서비스 이용약관</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 13, lineHeight: 22, color: "#555555" }}>
          {`제1조 (목적)\n해일(이하 "서비스")은 사용자의 할 일 관리를 돕기 위해 제공됩니다.\n\n제2조 (서비스 이용)\n서비스는 iOS 및 Android 환경에서 무료로 이용할 수 있습니다.\n\n제3조 (계정)\n사용자는 비회원으로 서비스를 이용할 수 있으며, 회원가입을 통해 데이터를 영구 보관할 수 있습니다.\n\n제4조 (데이터)\n사용자의 데이터는 Supabase 서버에 암호화되어 저장됩니다. 회원 탈퇴 시 모든 데이터는 영구 삭제됩니다.\n\n제5조 (면책)\n서비스는 데이터 손실, 서비스 중단 등에 대해 책임을 지지 않습니다.\n\n제6조 (변경)\n본 약관은 사전 고지 후 변경될 수 있습니다.\n\n시행일: 2026년 4월 26일`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
