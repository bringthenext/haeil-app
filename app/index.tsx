import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useSession } from "@/hooks/useSession";

export default function Index() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1D9E75" />
      </View>
    );
  }

  if (session) return <Redirect href="/(app)/inbox" />;
  return <Redirect href="/(auth)/login" />;
}
