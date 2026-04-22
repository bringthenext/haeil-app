import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";

import { Sidebar } from "@/components/layout/Sidebar";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSession } from "@/hooks/useSession";

// 탭 정의
export const TABS = [
  { name: "inbox/index", label: "inbox", icon: "inbox" },
  { name: "papers/index", label: "papers", icon: "layers" },
  { name: "schedule/index", label: "schedule", icon: "calendar" },
  { name: "me/index", label: "me", icon: "user" },
] as const;

export default function AppLayout() {
  const { session, loading } = useSession();
  const { isMobile } = useBreakpoint();

  if (!loading && !session) return <Redirect href="/(auth)/login" />;

  // 태블릿/데스크탑: 사이드바 레이아웃
  if (!isMobile) {
    return (
      <View className="flex-1 flex-row bg-background">
        <Sidebar />
        {/* 콘텐츠 영역은 Sidebar 내 Slot이 처리 */}
      </View>
    );
  }

  // 모바일: 하단 탭바
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 56,
        },
        tabBarActiveTintColor: "#1D9E75",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen name="inbox/index" options={{ title: "inbox" }} />
      <Tabs.Screen name="papers/index" options={{ title: "papers" }} />
      <Tabs.Screen name="schedule/index" options={{ title: "schedule" }} />
      <Tabs.Screen name="me/index" options={{ title: "me" }} />
    </Tabs>
  );
}
