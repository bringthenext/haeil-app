import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f0]">
      <View className="flex-1 px-6 pt-6">
        <Text className="mb-8 text-2xl font-bold text-[#1a1a1a]">설정</Text>
        <Text className="text-sm text-[#999999]">준비 중이에요.</Text>
      </View>
    </SafeAreaView>
  );
}
