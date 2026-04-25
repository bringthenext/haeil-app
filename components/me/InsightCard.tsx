import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { getStreakStats, getWeekWaveStats, getYearlyWaveMap } from "@/lib/api/stats";

type Insight = { emoji: string; text: string };

function buildInsight(
  streak: number,
  thisWeek: number,
  lastWeek: number,
  totalThisYear: number,
): Insight {
  const diff = thisWeek - lastWeek;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일
  const daysLeft = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  if (totalThisYear === 0)
    return { emoji: "🌊", text: "첫 번째 wave를 만들어보세요!" };

  if (streak >= 30)
    return { emoji: "🔥", text: `${streak}일 연속 달리는 중이에요. 진짜 대단해요.` };

  if (streak >= 7 && diff > 0)
    return { emoji: "🚀", text: `${streak}일 연속! 이번 주도 지난 주보다 +${diff}개 순항 중이에요.` };

  if (streak >= 3 && thisWeek === 0)
    return { emoji: "💪", text: `${streak}일 연속 유지 중. 오늘 wave 하나 어때요?` };

  if (diff > 0 && thisWeek > 0)
    return { emoji: "📈", text: `이번 주 벌써 ${thisWeek}개, 지난 주보다 ${diff}개 앞서고 있어요.` };

  if (thisWeek > 0 && thisWeek === lastWeek)
    return { emoji: "⚖️", text: `지난 주랑 딱 같은 페이스예요. 한 개 더 해볼까요?` };

  if (diff < 0 && daysLeft > 0)
    return { emoji: "💡", text: `지난 주보다 ${Math.abs(diff)}개 적어요. 아직 ${daysLeft}일 남았어요!` };

  if (diff < 0 && daysLeft === 0)
    return { emoji: "💡", text: `지난 주보다 ${Math.abs(diff)}개 적었어요. 다음 주엔 더!` };

  if (thisWeek > 0)
    return { emoji: "✨", text: `이번 주 ${thisWeek}개 완료했어요. 꾸준히 가고 있어요.` };

  if (streak > 0)
    return { emoji: "🌿", text: `${streak}일 연속 중이에요. 오늘도 이어가 봐요.` };

  return { emoji: "🌱", text: "오늘부터 새로운 흐름을 만들어볼까요?" };
}

export function InsightCard() {
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    const year = new Date().getFullYear();
    Promise.all([getStreakStats(), getWeekWaveStats(), getYearlyWaveMap(year)])
      .then(([streak, week, yearMap]) => {
        const totalThisYear = Object.values(yearMap).reduce((s, v) => s + v, 0);
        setInsight(buildInsight(streak.currentStreak, week.thisWeek, week.lastWeek, totalThisYear));
      })
      .catch(console.error);
  }, []);

  if (!insight) return null;

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: "#E1F5EE",
        padding: 16,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 28 }}>{insight.emoji}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#0F6E56", lineHeight: 20 }}>
        {insight.text}
      </Text>
    </View>
  );
}
