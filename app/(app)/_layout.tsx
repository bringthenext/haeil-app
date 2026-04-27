import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { Calendar, Inbox, Layers, User } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sidebar } from "@/components/layout/Sidebar";
import { Text } from "@/components/ui/Text";
import { OfflineProvider, useOffline } from "@/contexts/OfflineContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSession } from "@/hooks/useSession";
import { colors, fontFamily, fontSize, spacing } from "@/lib/tokens";

const TAB_PATHS = ["/inbox", "/papers", "/schedule", "/me"];

export const TABS = [
  { name: "inbox/index", label: "inbox", icon: "inbox" },
  { name: "papers/index", label: "papers", icon: "layers" },
  { name: "schedule/index", label: "schedule", icon: "calendar" },
  { name: "me/index", label: "me", icon: "user" },
] as const;

export default function AppLayout() {
  const { session, loading } = useSession();
  if (!loading && !session) return <Redirect href="/" />;
  return (
    <OfflineProvider>
      <AppLayoutInner />
    </OfflineProvider>
  );
}

function AppLayoutInner() {
  const { isMobile } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const prevIsMobile = useRef(isMobile);
  const { isOnline, pendingCount } = useOffline();

  // 와이드→모바일 전환 시 탭 경로가 아니면 inbox로 이동
  useEffect(() => {
    if (!prevIsMobile.current && isMobile) {
      const isTabRoute = TAB_PATHS.some((p) => pathname.startsWith(p));
      if (!isTabRoute) router.replace("/(app)/inbox");
    }
    prevIsMobile.current = isMobile;
  }, [isMobile]);

  const offlineBanner = !isOnline && (
    <View style={{ backgroundColor: colors.muted, paddingVertical: spacing.sm, paddingHorizontal: spacing["2xl"], alignItems: "center" }}>
      <Text variant="meta" color="subtle">
        오프라인 {pendingCount > 0 ? `· ${pendingCount}개 대기 중` : ""}
      </Text>
    </View>
  );

  if (!isMobile) {
    return (
      <View style={{ flex: 1 }}>
        {offlineBanner}
        <View className="flex-1 flex-row bg-background">
          <Sidebar />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {offlineBanner}
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: fontSize.sm, fontWeight: "500", fontFamily: fontFamily.medium },
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
    </View>
  );
}
