import { Slot, usePathname, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBreakpoint } from "@/hooks/useBreakpoint";

const NAV_ITEMS = [
  { href: "/(app)/inbox", label: "inbox" },
  { href: "/(app)/papers", label: "papers" },
  { href: "/(app)/schedule", label: "schedule" },
  { href: "/(app)/me", label: "me" },
] as const;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDesktop } = useBreakpoint();

  const sidebarWidth = isDesktop ? "w-56" : "w-44";

  return (
    <>
      {/* 사이드바 */}
      <SafeAreaView
        className={`${sidebarWidth} border-r border-border bg-background`}
        edges={["top", "bottom", "left"]}
      >
        <View className="px-4 pb-4 pt-6">
          <Text className="mb-6 text-xl font-bold text-primary">해일</Text>

          <View className="gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(`/${item.label}`);
              return (
                <TouchableOpacity
                  key={item.href}
                  onPress={() => router.push(item.href)}
                  className={`rounded-xl px-3 py-2.5 ${
                    active ? "bg-primary/10" : "hover:bg-muted"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>

      {/* 콘텐츠 */}
      <View className="flex-1">
        <Slot />
      </View>
    </>
  );
}
