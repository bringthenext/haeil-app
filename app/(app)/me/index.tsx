import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Settings } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useSession } from "@/hooks/useSession";
import { getProfile } from "@/lib/api/profile";
import { getStreakStats, getWeekWaveStats, getEnvelopeWaveCounts } from "@/lib/api/stats";
import { InsightCard } from "@/components/me/InsightCard";
import { StreakCard } from "@/components/me/StreakCard";
import { WeekWaveCard } from "@/components/me/WeekWaveCard";
import { HeatmapCalendar } from "@/components/me/HeatmapCalendar";
import { RoutineWaveChart } from "@/components/me/RoutineWaveChart";
import { ChallengesTab } from "@/components/me/ChallengesTab";

type Tab = "dashboard" | "challenges";

const TAB_LABEL: Record<Tab, string> = {
  dashboard: "Dashboard",
  challenges: "Challenges",
};

export default function MeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [username, setUsername] = useState<string | null>(null);
  const [subGreeting, setSubGreeting] = useState<string>("");
  const isAnonymous = session?.user?.is_anonymous ?? false;

  useFocusEffect(
    useCallback(() => {
      if (isAnonymous) return;

      getProfile().then((p) => setUsername(p?.username ?? null)).catch(console.error);

      Promise.all([getStreakStats(), getWeekWaveStats(), getEnvelopeWaveCounts()])
        .then(([streak, week, envelopes]) => {
          const top = envelopes.sort((a, b) => b.count - a.count)[0];
          if (streak.currentStreak > 0 && streak.currentStreak === streak.bestStreak && streak.currentStreak >= 7) {
            setSubGreeting(`${streak.currentStreak}일 연속, 최고 기록이에요! 🏆`);
          } else if (top && top.count > 0) {
            setSubGreeting(`이번 주는 '${top.name}'에 집중하고 계시는군요`);
          } else if (week.thisWeek > week.lastWeek && week.lastWeek > 0) {
            setSubGreeting(`지난 주보다 wave가 늘었어요 📈`);
          } else if (week.thisWeek > 0) {
            setSubGreeting(`이번 주 ${week.thisWeek}개의 wave를 완료했어요`);
          } else {
            setSubGreeting(`오늘도 할 일을 해나가고 있어요`);
          }
        })
        .catch(console.error);
    }, [isAnonymous])
  );

  const displayName = isAnonymous
    ? null
    : username || session?.user?.email?.split("@")[0] || null;

  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f0]">
      {/* 헤더 */}
      <View className="bg-[#f5f5f0] px-5 pb-4 pt-5">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginRight: 12 }}>
            <Text variant="title" weight="bold">
              {displayName ? `${displayName}님,` : "안녕하세요,"}
            </Text>
            {subGreeting ? (
              <Text variant="body" color="foreground" style={{ flexShrink: 1 }}>
                {subGreeting}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => router.push("/(app)/settings")} hitSlop={8}>
            <Settings size={20} color="#999999" />
          </Pressable>
        </View>
      </View>

      {isAnonymous ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
          <Text variant="section" weight="bold" align="center">
            로그인하면 사용할 수 있어요
          </Text>
          <Text variant="meta" align="center">
            streak, wave 통계, 챌린지 기록은{"\n"}로그인 후 확인할 수 있습니다.
          </Text>
          <Button onPress={() => router.push("/(auth)/login")} size="lg" style={{ marginTop: 8, paddingHorizontal: 28 }}>
            로그인 / 회원가입
          </Button>
        </View>
      ) : (
        <>
          {/* 탭 토글 */}
          <View className="flex-row border-b border-[#e5e5e0] bg-[#f5f5f0] px-5">
            {(["dashboard", "challenges"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="mr-5 pb-2.5"
              >
                <Text
                  variant="section"
                  weight="semibold"
                  color={activeTab === tab ? "foreground" : "subtle"}
                >
                  {TAB_LABEL[tab]}
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
        </>
      )}
    </SafeAreaView>
  );
}
