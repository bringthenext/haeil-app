/**
 * GlobalSortableList
 *
 * 헤더 + 아이템이 섞인 단일 배열을 받아 드래그 리오더를 지원.
 * - 아이템을 롱탭하면 들어올려지고, 다른 아이템들이 비켜서며 삽입 위치를 미리보기.
 * - 손가락을 떼는 순간 새 순서/날짜 확정 → onDragEnd 호출.
 * - 헤더(isDraggable=false)는 드래그 불가이지만 아이템이 헤더를 넘을 수 있음.
 *
 * 의존성: react-native 기본 Animated + PanResponder (reanimated/gesture-handler 불필요)
 */
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, PanResponder, RefreshControl, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";

export type DragHandlers = {
  onLongPress: () => void;
  onPressOut: () => void;
  delayLongPress: number;
};

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  /** false 반환 시 드래그 불가 (헤더 등) */
  isDraggable?: (item: T) => boolean;
  /** 아이템별 높이 — 삽입 위치 계산 & 시각 shift 크기 결정 */
  getItemHeight: (item: T) => number;
  renderItem: (
    item: T,
    index: number,
    dragHandlers: DragHandlers,
    isActive: boolean,
  ) => ReactNode;
  onDragEnd: (newData: T[]) => void;
  contentContainerStyle?: object;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: ReactNode;
  onScrollToRef?: (ref: ScrollView | null) => void;
};

export function GlobalSortableList<T>({
  data,
  keyExtractor,
  isDraggable,
  getItemHeight,
  renderItem,
  onDragEnd,
  contentContainerStyle,
  refreshing,
  onRefresh,
  ListHeaderComponent,
  onScrollToRef,
}: Props<T>) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIdxRef  = useRef(-1);
  const insertIdxRef  = useRef(-1);
  const isDraggingRef = useRef(false);

  const dragAnim = useRef(new Animated.Value(0)).current;

  // 아이템별 spring Animated.Value (shift 표현)
  const springAnims = useRef<Animated.Value[]>([]);
  while (springAnims.current.length < data.length) {
    springAnims.current.push(new Animated.Value(0));
  }

  const dataRef         = useRef(data);
  dataRef.current       = data;
  const onDragEndRef    = useRef(onDragEnd);
  onDragEndRef.current  = onDragEnd;
  const getHeightRef    = useRef(getItemHeight);
  getHeightRef.current  = getItemHeight;

  const scrollViewRef = useRef<ScrollView>(null);

  // ─── 누적 Y 위치 계산 (매 프레임 O(n), n≤60 이므로 문제 없음) ─────────────────
  function getYAt(index: number): number {
    let y = 0;
    for (let i = 0; i < index; i++) {
      y += getHeightRef.current(dataRef.current[i]);
    }
    return y;
  }

  // ─── 콘텐츠 Y → 삽입 인덱스 역산 ────────────────────────────────────────────
  // 드래그된 아이템의 중심 Y가 어느 아이템 중심에 가장 가까운지 결정
  function findInsertIndex(centerContentY: number): number {
    const items = dataRef.current;
    let y = 0;
    for (let i = 0; i < items.length; i++) {
      const h = getHeightRef.current(items[i]);
      if (centerContentY <= y + h / 2) return i;
      y += h;
    }
    return items.length - 1;
  }

  // ─── 비활성 아이템들 shift 애니메이션 ────────────────────────────────────────
  function updateShifts(from: number, insertIdx: number, activeH: number) {
    const count = dataRef.current.length;
    for (let i = 0; i < count; i++) {
      if (i === from) continue;
      let target = 0;
      if (from < insertIdx && i > from && i <= insertIdx) target = -activeH;
      else if (from > insertIdx && i < from && i >= insertIdx) target = activeH;
      Animated.spring(springAnims.current[i], {
        toValue: target,
        useNativeDriver: true,
        speed: 200,
        bounciness: 0,
      }).start();
    }
  }

  // ─── 드래그 상태 리셋 ────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    dragAnim.setValue(0);
    springAnims.current.forEach((a) => { a.stopAnimation(); a.setValue(0); });
    isDraggingRef.current = false;
    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
  }, [dragAnim]);

  // ─── PanResponder (전체 리스트에 단 하나) ────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // 활성 아이템이 있을 때만 제스처 가로챔
      onMoveShouldSetPanResponder:        () => activeIdxRef.current >= 0,
      onMoveShouldSetPanResponderCapture: () => activeIdxRef.current >= 0,
      // 다른 responder가 뺏으려 해도 거절
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        isDraggingRef.current = true;
      },

      onPanResponderMove: (_, { dy }) => {
        dragAnim.setValue(dy);

        const from    = activeIdxRef.current;
        const items   = dataRef.current;
        const activeH = getHeightRef.current(items[from]);
        const startY  = getYAt(from);
        const centerY = startY + dy + activeH / 2;

        const newInsertIdx = findInsertIndex(centerY);
        if (newInsertIdx !== insertIdxRef.current) {
          insertIdxRef.current = newInsertIdx;
          updateShifts(from, newInsertIdx, activeH);
        }
      },

      onPanResponderRelease: () => {
        const from      = activeIdxRef.current;
        const insertIdx = insertIdxRef.current;

        resetAll();
        activeIdxRef.current = -1;
        insertIdxRef.current = -1;
        setActiveIndex(-1);

        if (from >= 0 && insertIdx >= 0 && insertIdx !== from) {
          requestAnimationFrame(() => {
            const next = [...dataRef.current];
            const [moved] = next.splice(from, 1);
            next.splice(insertIdx, 0, moved);
            onDragEndRef.current(next);
          });
        }
      },

      onPanResponderTerminate: () => {
        resetAll();
        activeIdxRef.current = -1;
        insertIdxRef.current = -1;
        setActiveIndex(-1);
      },
    }),
  ).current;

  return (
    <ScrollView
      ref={(ref) => {
        (scrollViewRef as any).current = ref;
        onScrollToRef?.(ref);
      }}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor="#1D9E75" />
        ) : undefined
      }
    >
      {ListHeaderComponent}

      {/* PanResponder를 이 View에 부착 */}
      <View {...panResponder.panHandlers}>
        {data.map((item, index) => {
          const isActive = index === activeIndex;
          const draggable = !isDraggable || isDraggable(item);

          const dragHandlers: DragHandlers = {
            onLongPress: draggable
              ? () => {
                  activeIdxRef.current  = index;
                  insertIdxRef.current  = index;
                  setActiveIndex(index);
                  dragAnim.setValue(0);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                }
              : () => {},
            onPressOut: () => {
              // 드래그 없이 손가락만 뗀 경우 → 리셋
              if (!isDraggingRef.current && activeIdxRef.current === index) {
                activeIdxRef.current = -1;
                setActiveIndex(-1);
                scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
              }
            },
            delayLongPress: 250,
          };

          return (
            <Animated.View
              key={keyExtractor(item)}
              style={{
                transform: [
                  { translateY: isActive ? dragAnim : springAnims.current[index] },
                ],
                zIndex: isActive ? 100 : 0,
                opacity: 1,
                shadowColor: isActive ? "#000" : "transparent",
                shadowOpacity: isActive ? 0.16 : 0,
                shadowRadius: isActive ? 10 : 0,
                shadowOffset: isActive
                  ? { width: 0, height: 5 }
                  : { width: 0, height: 0 },
                elevation: isActive ? 8 : 0,
              }}
            >
              {renderItem(item, index, dragHandlers, isActive)}
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
