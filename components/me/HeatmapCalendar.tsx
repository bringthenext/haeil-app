import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";

import {
  getWaveDetailsByDate,
  getYearlyWaveMap,
  type WaveDetail,
  type YearlyWaveMap,
} from "@/lib/api/stats";

function heatColor(count: number): string {
  if (count === 0) return "#f0f0ec";
  if (count <= 2) return "#9FE1CB";
  if (count <= 5) return "#1D9E75";
  return "#0F6E56";
}

const CELL = 11;
const GAP = 2;
const WEEKS = 53;
const MONTH_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function buildGrid(year: number, waveMap: YearlyWaveMap) {
  const jan1 = new Date(year, 0, 1);
  const startOffset = jan1.getDay();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

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

type PopoverState = {
  date: string;
  count: number;
  waves: WaveDetail[] | null; // null = 로딩 중
};

export function HeatmapCalendar() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [waveMap, setWaveMap] = useState<YearlyWaveMap>({});
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getYearlyWaveMap(year).then(setWaveMap).catch(console.error);
  }, [year]);

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

  const handleCellPress = (date: string, count: number) => {
    setPopover({ date, count, waves: null });
    getWaveDetailsByDate(date)
      .then((waves) => setPopover((p) => p?.date === date ? { ...p, waves } : p))
      .catch(console.error);
  };

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
              const label = Array.from(monthColMap.entries()).find(([, c]) => c === colIdx);
              return (
                <View key={colIdx} style={{ width: CELL + GAP, alignItems: "flex-start" }}>
                  {label !== undefined ? (
                    <Text style={{ fontSize: 9, color: "#999999" }}>{MONTH_LABELS[label[0]]}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* 셀 그리드 */}
          <View style={{ flexDirection: "row" }}>
            {cols.map((week, colIdx) => (
              <View key={colIdx} style={{ flexDirection: "column", marginRight: GAP }}>
                {week.map((cell, rowIdx) => (
                  <Pressable
                    key={rowIdx}
                    onPress={() => cell.date ? handleCellPress(cell.date, cell.count) : undefined}
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
                style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: heatColor(v) }}
              />
            ))}
            <Text style={{ fontSize: 9, color: "#999999", marginLeft: 3 }}>많음</Text>
          </View>
        </View>
      </ScrollView>

      {/* 팝오버 모달 */}
      <Modal
        visible={popover !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPopover(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" }}
          onPress={() => setPopover(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                paddingBottom: 36,
                minHeight: 160,
              }}
            >
              {/* 헤더 */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>
                    {popover?.date}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999999", marginTop: 2 }}>
                    wave {popover?.count ?? 0}개
                  </Text>
                </View>
                <Pressable onPress={() => setPopover(null)} hitSlop={8}>
                  <X size={18} color="#999999" />
                </Pressable>
              </View>

              {/* wave 목록 */}
              {popover?.waves === null ? (
                <Text style={{ fontSize: 13, color: "#999999", textAlign: "center", paddingVertical: 12 }}>
                  불러오는 중...
                </Text>
              ) : popover?.count === 0 ? (
                <Text style={{ fontSize: 13, color: "#999999", textAlign: "center", paddingVertical: 12 }}>
                  이 날은 wave가 없어요
                </Text>
              ) : (
                popover?.waves?.map((w) => (
                  <View
                    key={w.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f5f5f0",
                    }}
                  >
                    <Text style={{ fontSize: 14, color: "#1a1a1a", flex: 1 }} numberOfLines={1}>
                      {w.paperName}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#999999", marginLeft: 8 }}>
                      {w.completedAt}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
