import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { signInAnonymously, SKIP_ANONYMOUS_KEY } from "@/lib/api/auth";
import { useSession } from "@/hooks/useSession";

export default function Index() {
  const { session, loading } = useSession();
  const [guestFailed, setGuestFailed] = useState(false);
  const [skipAnonymous, setSkipAnonymous] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SKIP_ANONYMOUS_KEY).then((val) => {
      if (val) {
        AsyncStorage.removeItem(SKIP_ANONYMOUS_KEY);
        setSkipAnonymous(true);
      } else {
        setSkipAnonymous(false);
      }
    });
  }, []);

  useEffect(() => {
    if (loading || session || guestFailed || skipAnonymous === null || skipAnonymous) return;

    signInAnonymously().then(({ error }) => {
      if (error) setGuestFailed(true);
    }).catch(() => {
      setGuestFailed(true);
    });
  }, [guestFailed, loading, session, skipAnonymous]);

  if (loading || skipAnonymous === null || (!session && !guestFailed && !skipAnonymous)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1D9E75" />
      </View>
    );
  }

  if (session) return <Redirect href="/(app)/inbox" />;
  return <Redirect href="/(auth)/login" />;
}
