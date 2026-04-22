import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: T05에서 구현
export default function InboxScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-muted-foreground">inbox — T05에서 구현</Text>
      </View>
    </SafeAreaView>
  );
}
