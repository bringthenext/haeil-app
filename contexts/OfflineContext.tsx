import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getQueueLength, replayQueue } from "@/lib/offlineQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  enqueueRefresh: () => void;
};

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  enqueueRefresh: () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const wasOffline = useRef(false);

  async function refreshCount() {
    const count = await getQueueLength();
    setPendingCount(count);
  }

  const enqueueRefresh = useCallback(() => {
    refreshCount();
  }, []);

  // 온라인 복구 시 replay
  useEffect(() => {
    if (isOnline && wasOffline.current) {
      replayQueue().then(() => refreshCount());
    }
    wasOffline.current = !isOnline;
  }, [isOnline]);

  // 앱 포그라운드 복귀 시 replay
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isOnline) {
        replayQueue().then(() => refreshCount());
      }
    });
    return () => sub.remove();
  }, [isOnline]);

  // 초기 카운트 로드
  useEffect(() => {
    refreshCount();
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, enqueueRefresh }}>
      {children}
    </OfflineContext.Provider>
  );
}
