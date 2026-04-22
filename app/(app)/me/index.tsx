import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { signOut } from "@/lib/api/auth";
import { useSession } from "@/hooks/useSession";

export default function MeScreen() {
  const { session } = useSession();
  const isAnonymous = session?.user?.is_anonymous ?? false;

  const handleSignOut = () => {
    Alert.alert("로그아웃", "정말 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => {
          Toast.show({ type: "success", text1: "로그아웃에 성공했습니다." });
          void signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        {/* 헤더 */}
        <Text className="mb-8 text-2xl font-bold text-foreground">나</Text>

        {/* 계정 정보 */}
        <View className="mb-6 rounded-xl border border-border bg-muted/50 p-4">
          <Text className="mb-1 text-xs text-muted-foreground">계정</Text>
          <Text className="text-sm font-medium text-foreground">
            {isAnonymous
              ? "비회원"
              : (session?.user?.email ?? "알 수 없음")}
          </Text>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="items-center rounded-xl border border-red-200 bg-red-50 py-3"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-medium text-red-500">로그아웃</Text>
        </TouchableOpacity>

        {/* TODO: T08에서 구현 */}
        <View className="mt-8 flex-1 items-center justify-center">
          <Text className="text-xs text-muted-foreground">추가 기능은 T08에서 구현</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
