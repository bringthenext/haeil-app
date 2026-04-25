import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable } from "react-native";

import { getYearlyWaveMap, type YearlyWaveMap } from "@/lib/api/stats";

// wave 수 → 색상 (4단계)
function heatColor(count: number): string {
  if (count === 0) return "#f0f0ec";
  if (count <= 2) return "#9FE1CB"; // primary-light
  if (count <= 5) return "#1D9E75"; // primary
  return "#0F6E56"; // primary-dark
}

const CELL = 11;
const GAP = 2;
const WEEKS = 53;
const MONTH_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function buildGrid(year: number, waveMap: YearlyWaveMap) {
  // 1월 1일이 무슨 요일인지 (0=일)
  const jan1 = new Date(year, 0, 1);
  const startOffset = jan1.getDay(); // 일요일 기준 offset

  // 연도의 전체 날짜
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

  // col별로 날짜 배열 (col=주, row=요일 0~6)
  const cols: { date: string; count: number; month: number }[][] = [];
  for (let col = 0; col < WEEKS; col++) {
    const week: { date: string; count: number; month: number }[] = [];
    for (let row = 0; row < 7; row++) {
      const dayIndex = col * 7 + row - startOffset;
      if (dayIndex < 0 || dayIndex >= totalDays) {
        week.push({ date: "", count: 0, month: -1 });
      } else {
        const d = new Date(year, 0, dayIndex + 1);
        const dateStr = d.toISOString().slice(0, 10);
        week.push({ date: dateStr, count: waveMap[dateStr] ?? 0, month: d.getMonth() });
      }
    }
    cols.push(week);
  }

  // 월 라벨 위치 (각 월의 첫 번째 칼럼)
  const monthColMap = new Map<number, number>();
  for (let col = 0; col < cols.length; col++) {
    for (const cell of cols[col]) {
      if (cell.month >= 0 && !monthColMap.has(cell.month)) {
        monthColMap.set(cell.month, col);
      }
    }
  }

  return { cols, monthColMap };
}

export function HeatmapCalendar() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [waveMap, setWaveMap] = useState<YearlyWaveMap>({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getYearlyWaveMap(year).then(setWaveMap).catch(console.error);
  }, [year]);

  // 현재 연도면 오늘 주 근처로 초기 스크롤
  useEffect(() => {
    if (year === currentYear) {
      const jan1 = new Date(year, 0, 1);
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - jan1.getTime()) / 86400000);
      const startOffset = jan1.getDay();
      const currentCol = Math.floor((dayOfYear + startOffset) / 7);
      const scrollX = Math.max(0, (currentCol - 2) * (CELL + GAP));
      setTimeout(() => scrollRef.current?.scrollTo({ x: scrollX, animated: false }), 50);
    }
  }, [year, currentYear]);

  const { cols, monthColMap } = buildGrid(year, waveMap);

  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      {/* 연도 네비게이터 */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-[#1a1a1a]">연간 히트맵</Text>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={8}>
            <ChevronLeft size={16} color="#555555" />
          </Pressable>
          <Text className="w-12 text-center text-sm font-medium text-[#555555]">{year}</Text>
          <Pressable
            onPress={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            hitSlop={8}
          >
            <ChevronRight size={16} color={year >= currentYear ? "#cccccc" : "#555555"} />
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* 월 라벨 행 */}
          <View style={{ flexDirection: "row", marginBottom: 3 }}>
            {cols.map((_, colIdx) => {
              const label = Array.from(monthColMap.entries()).find(
                ([, c]) => c === colIdx,
              );
              return (
                <View
                  key={colIdx}
                  style={{ width: CELL + GAP, alignItems: "flex-start" }}
                >
                  {label !== undefined ? (
                    <Text style={{ fontSize: 9, color: "#999999" }}>
                      {MONTH_LABELS[label[0]]}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* 셀 그리드 */}
          <View style={{ flexDirection: "row" }}>
            {cols.map((week, colIdx) => (
              <View
                key={colIdx}
                style={{ flexDirection: "column", marginRight: GAP }}
              >
                {week.map((cell, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      marginBottom: GAP,
                      backgroundColor: cell.date ? heatColor(cell.count) : "transparent",
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* 범례 */}
          <View className="mt-1 flex-row items-center gap-1 self-end">
            <Text style={{ fontSize: 9, color: "#999999", marginRight: 3 }}>적음</Text>
            {[0, 1, 3, 6].map((v) => (
              <View
                key={v}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  backgroundColor: heatColor(v),
                }}
              />
            ))}
            <Text style={{ fontSize: 9, color: "#999999", marginLeft: 3 }}>많음</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
