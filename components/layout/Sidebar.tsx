import { Slot, usePathname, useRouter } from "expo-router";
import { Calendar, Inbox, Layers, LucideIcon, User } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBreakpoint } from "@/hooks/useBreakpoint";

const NAV_ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/(app)/inbox", label: "inbox", Icon: Inbox },
  { href: "/(app)/papers", label: "papers", Icon: Layers },
  { href: "/(app)/schedule", label: "schedule", Icon: Calendar },
  { href: "/(app)/me", label: "me", Icon: User },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDesktop } = useBreakpoint();

  const sidebarWidth = isDesktop ? "w-56" : "w-44";

  return (
    <>
      <SafeAreaView
        className={`${sidebarWidth} border-r border-border bg-background`}
        edges={["top", "bottom", "left"]}
      >
        <View className="px-4 pb-4 pt-6">
          <Text className="mb-6 text-xl font-bold text-primary" style={{ fontFamily: "Pretendard-Bold" }}>
            해일
          </Text>

          <View className="gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(`/${item.label}`);
              return (
                <TouchableOpacity
                  key={item.href}
                  onPress={() => router.push(item.href as any)}
                  className={`rounded-xl px-3 py-2.5 ${active ? "bg-primary/10" : ""}`}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <item.Icon
                      size={18}
                      color={active ? "#1D9E75" : "#64748b"}
                      strokeWidth={1.8}
                    />
                    <Text
                      className={`text-sm ${active ? "text-primary" : "text-muted-foreground"}`}
                      style={{ fontFamily: active ? "Pretendard-SemiBold" : "Pretendard-Medium" }}
                    >
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>

      <View className="flex-1">
        <Slot />
      </View>
    </>
  );
}
