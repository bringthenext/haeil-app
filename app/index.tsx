import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { signInAnonymously } from "@/lib/api/auth";
import { useSession } from "@/hooks/useSession";

export default function Index() {
  const { session, loading } = useSession();
  const [guestFailed, setGuestFailed] = useState(false);

  useEffect(() => {
    if (loading || session || guestFailed) return;

    signInAnonymously().then(({ error }) => {
      if (error) setGuestFailed(true);
    }).catch(() => {
      setGuestFailed(true);
    });
  }, [guestFailed, loading, session]);

  if (loading || (!session && !guestFailed)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1D9E75" />
      </View>
    );
  }

  if (session) return <Redirect href="/(app)/inbox" />;
  return <Redirect href="/(auth)/login" />;
}
