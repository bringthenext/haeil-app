import { Redirect, Tabs } from "expo-router";
import { Calendar, Inbox, Layers, User } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sidebar } from "@/components/layout/Sidebar";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSession } from "@/hooks/useSession";

export const TABS = [
  { name: "inbox/index", label: "inbox", icon: "inbox" },
  { name: "papers/index", label: "papers", icon: "layers" },
  { name: "schedule/index", label: "schedule", icon: "calendar" },
  { name: "me/index", label: "me", icon: "user" },
] as const;

export default function AppLayout() {
  const { session, loading } = useSession();
  const { isMobile } = useBreakpoint();
  const insets = useSafeAreaInsets();

  if (!loading && !session) return <Redirect href="/" />;

  if (!isMobile) {
    return (
      <View className="flex-1 flex-row bg-background">
        <Sidebar />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: "#1D9E75",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500", fontFamily: "Pretendard-Medium" },
      }}
    >
      <Tabs.Screen
        name="inbox/index"
        options={{
          title: "inbox",
          tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="papers/index"
        options={{
          title: "papers",
          tabBarIcon: ({ color, size }) => <Layers size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="schedule/index"
        options={{
          title: "schedule",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="me/index"
        options={{
          title: "me",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
      <Tabs.Screen name="settings/terms" options={{ href: null }} />
      <Tabs.Screen name="settings/privacy" options={{ href: null }} />
      <Tabs.Screen name="settings/licenses" options={{ href: null }} />
      <Tabs.Screen name="settings/trash" options={{ href: null }} />
    </Tabs>
  );
}
