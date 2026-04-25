import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";

import { useSession } from "@/hooks/useSession";
import { InsightCard } from "@/components/me/InsightCard";
import { StreakCard } from "@/components/me/StreakCard";
import { WeekWaveCard } from "@/components/me/WeekWaveCard";
import { HeatmapCalendar } from "@/components/me/HeatmapCalendar";
import { RoutineWaveChart } from "@/components/me/RoutineWaveChart";
import { ChallengesTab } from "@/components/me/ChallengesTab";

type Tab = "dashboard" | "challenges";

export default function MeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const isAnonymous = session?.user?.is_anonymous ?? false;
  const email = isAnonymous ? "비회원" : (session?.user?.email ?? "알 수 없음");

  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f0]">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between bg-[#f5f5f0] px-5 pb-3 pt-5">
        <Text className="text-xl font-bold text-[#1a1a1a]">{email}</Text>
        <Pressable
          onPress={() => router.push("/(app)/settings")}
          hitSlop={8}
        >
          <Settings size={20} color="#999999" />
        </Pressable>
      </View>

      {/* 탭 토글 */}
      <View className="flex-row border-b border-[#e5e5e0] bg-[#f5f5f0] px-5">
        {(["dashboard", "challenges"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="mr-5 pb-2.5"
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab ? "text-[#1a1a1a]" : "text-[#999999]"
              }`}
            >
              {tab}
            </Text>
            {activeTab === tab && (
              <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D9E75]" />
            )}
          </Pressable>
        ))}
      </View>

      {/* 콘텐츠 */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {activeTab === "dashboard" ? (
          <>
            <InsightCard />
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <StreakCard />
              <WeekWaveCard />
            </View>
            <HeatmapCalendar />
            <RoutineWaveChart />
          </>
        ) : (
          <ChallengesTab />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
