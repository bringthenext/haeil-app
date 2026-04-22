import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: T06에서 구현
export default function PapersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-muted-foreground">papers — T06에서 구현</Text>
      </View>
    </SafeAreaView>
  );
}
