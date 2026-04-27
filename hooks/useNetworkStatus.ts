import { useEffect, useState } from "react";
import * as Network from "expo-network";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const state = await Network.getNetworkStateAsync();
      if (!cancelled) setIsOnline(state.isConnected ?? true);
    }

    check();

    // expo-network은 이벤트 구독 미지원 → 앱 포커스 시 폴링으로 보완
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
