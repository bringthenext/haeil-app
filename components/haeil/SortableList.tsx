/**
 * SortableList — 롱탭(300ms) + 드래그로 순서 변경
 * react-native-gesture-handler v2 (Gesture API) + Animated (react-native 기본) 사용
 *
 * ─── 드래그 부드러움 개선 ─────────────────────────────────────────────────────
 * 각 아이템이 자체 localDragAnim(Animated.Value)을 보유.
 * Animated.add(localDragAnim, springAnim)으로 두 값을 항상 합산.
 * → isActive 조건부 value 전환 없음 → 네이티브 드라이버 바인딩 안정
 * → 드래그 시작 순간 glitch 제거.
 *
 * ─── 두 번째 드래그 버그 수정 ─────────────────────────────────────────────────
 * SortableItem에서 useMemo([], []) + ref 패턴으로 제스처를 한 번만 생성.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, Dimensions, View } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

// ─── 공개 타입 ────────────────────────────────────────────────────────────────
export type DragHandlers = {
  onLongPress: () => void;
  onPressOut: () => void;
  delayLongPress: number;
};

export type SortableListProps<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, dragHandlers: DragHandlers) => ReactNode;
  onReorder: (newData: T[]) => void;
  itemHeight: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onEscapeTop?: (item: T, overshoot: number) => void;
  onEscapeBottom?: (item: T, overshoot: number) => void;
  onDragOutOfBounds?: (dir: "top" | "bottom" | null, overshoot: number) => void;
  scrollBy?: (delta: number) => void;
  disableParentScroll?: () => void;
  enableParentScroll?: () => void;
  onDragMoveY?: (absoluteY: number) => void;
  classifyZoneYRef?: React.RefObject<number | undefined>;
};

// ─── SortableItem ─────────────────────────────────────────────────────────────
type SortableItemProps = {
  index: number;
  isActive: boolean;
  isAnyActive: boolean;
  springAnim: Animated.Value;
  onStart: (index: number) => void;
  onUpdate: (dy: number, absY: number) => void;
  onEnd: (from: number, dy: number, absY: number) => void;
  onReset: () => void;
  children: ReactNode;
};

const SortableItem = React.memo(function SortableItem({
  index,
  isActive,
  isAnyActive,
  springAnim,
  onStart,
  onUpdate,
  onEnd,
  onReset,
  children,
}: SortableItemProps) {
  const indexRef = useRef(index);
  indexRef.current = index;
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  // 아이템 자체 드래그 오프셋 — 조건부 value 전환 없이 항상 springAnim과 합산
  const localDragAnim = useRef(new Animated.Value(0)).current;
  // Animated.add는 항상 동일한 derived value → 네이티브 드라이버 바인딩 안정
  const translateY = useRef(Animated.add(localDragAnim, springAnim)).current;

  // ★ 빈 deps — 제스처를 최초 1회만 생성. 리렌더 시 동일 객체 반환.
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(300)
        .runOnJS(true)
        .onStart(() => {
          localDragAnim.setValue(0);
          onStartRef.current(indexRef.current);
        })
        .onUpdate(({ translationY: dy, absoluteY }) => {
          localDragAnim.setValue(dy);
          onUpdateRef.current(dy, absoluteY);
        })
        .onEnd(({ translationY: dy, absoluteY }) => {
          onEndRef.current(indexRef.current, dy, absoluteY);
        })
        .onFinalize(() => {
          localDragAnim.setValue(0);
          onResetRef.current();
        }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={{
          transform: [{ translateY }],
          zIndex: isActive ? 100 : 0,
          opacity: isActive ? 1 : isAnyActive ? 0.38 : 1,
          shadowColor: isActive ? "#000" : "transparent",
          shadowOpacity: isActive ? 0.18 : 0,
          shadowRadius: isActive ? 8 : 0,
          shadowOffset: isActive ? { width: 0, height: 4 } : { width: 0, height: 0 },
          elevation: isActive ? 8 : 0,
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  itemHeight,
  onDragStart,
  onDragEnd,
  onEscapeTop,
  onEscapeBottom,
  onDragOutOfBounds,
  scrollBy,
  disableParentScroll,
  enableParentScroll,
  onDragMoveY,
  classifyZoneYRef,
}: SortableListProps<T>) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIdxRef = useRef(-1);
  const dragStartedRef = useRef(false);

  // key(item.id)로 인덱싱된 springAnim Map — 리오더 후에도 아이템과 1:1 안정 바인딩
  const springAnims = useRef<Map<string, Animated.Value>>(new Map());
  const seenKeys = new Set<string>();
  for (const item of data) {
    const k = keyExtractor(item);
    seenKeys.add(k);
    if (!springAnims.current.has(k)) {
      springAnims.current.set(k, new Animated.Value(0));
    }
  }
  for (const k of Array.from(springAnims.current.keys())) {
    if (!seenKeys.has(k)) springAnims.current.delete(k);
  }

  // stale-closure 방지 ref
  const dataRef = useRef(data);               dataRef.current = data;
  const onReorderRef = useRef(onReorder);     onReorderRef.current = onReorder;
  const onDragStartRef = useRef(onDragStart); onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);     onDragEndRef.current = onDragEnd;
  const onEscapeTopRef = useRef(onEscapeTop); onEscapeTopRef.current = onEscapeTop;
  const onEscapeBottomRef = useRef(onEscapeBottom); onEscapeBottomRef.current = onEscapeBottom;
  const onDragOutOfBoundsRef = useRef(onDragOutOfBounds); onDragOutOfBoundsRef.current = onDragOutOfBounds;
  const scrollByRef = useRef(scrollBy);                   scrollByRef.current = scrollBy;
  const disableParentScrollRef = useRef(disableParentScroll); disableParentScrollRef.current = disableParentScroll;
  const enableParentScrollRef = useRef(enableParentScroll);   enableParentScrollRef.current = enableParentScroll;
  const onDragMoveYRef = useRef(onDragMoveY); onDragMoveYRef.current = onDragMoveY;
  const itemHeightRef = useRef(itemHeight);   itemHeightRef.current = itemHeight;

  const prevOutDirRef = useRef<"top" | "bottom" | null>(null);
  const prevOvershootRef = useRef(0);

  const autoScrollRafRef = useRef<number | null>(null);
  const autoScrollDirRef = useRef<"up" | "down" | null>(null);
  const currentMoveYRef = useRef(0);

  const fireDragEnd = useCallback(() => {
    if (dragStartedRef.current) {
      dragStartedRef.current = false;
      onDragEndRef.current?.();
    }
  }, []);

  const keyExtractorRef = useRef(keyExtractor);
  keyExtractorRef.current = keyExtractor;

  const resetAll = useCallback(() => {
    // localDragAnim은 각 SortableItem의 onFinalize에서 직접 리셋
    springAnims.current.forEach((a) => { a.stopAnimation(); a.setValue(0); });
    activeIdxRef.current = -1;
    setActiveIndex(-1);
    enableParentScrollRef.current?.();
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
      autoScrollDirRef.current = null;
    }
    if (prevOutDirRef.current !== null || prevOvershootRef.current !== 0) {
      prevOutDirRef.current = null;
      prevOvershootRef.current = 0;
      onDragOutOfBoundsRef.current?.(null, 0);
    }
    fireDragEnd();
  }, [fireDragEnd]);

  const handleDragStart = useCallback((index: number) => {
    activeIdxRef.current = index;
    setActiveIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    disableParentScrollRef.current?.();
    if (!dragStartedRef.current) {
      dragStartedRef.current = true;
      onDragStartRef.current?.();
    }
  }, []);

  const handleDragUpdate = useCallback((translationY: number, absoluteY: number) => {
    const active = activeIdxRef.current;
    const h = itemHeightRef.current;
    const count = dataRef.current.length;
    const newIdx = Math.min(Math.max(Math.round(active + translationY / h), 0), count - 1);
    for (let i = 0; i < count; i++) {
      if (i === active) continue;
      let target = 0;
      if (active < newIdx && i > active && i <= newIdx) target = -h;
      else if (active > newIdx && i < active && i >= newIdx) target = h;
      const key = keyExtractorRef.current(dataRef.current[i]);
      const anim = springAnims.current.get(key);
      if (!anim) continue;
      Animated.spring(anim, {
        toValue: target,
        useNativeDriver: true,
        speed: 200,
        bounciness: 0,
      }).start();
    }

    onDragMoveYRef.current?.(absoluteY);
    currentMoveYRef.current = absoluteY;

    if (onDragOutOfBoundsRef.current) {
      const rawTo = Math.round(active + translationY / h);
      let dir: "top" | "bottom" | null = null;
      let overshoot = 0;
      const classifyY = classifyZoneYRef?.current;
      if (classifyY !== undefined && absoluteY >= classifyY) {
        dir = "bottom"; overshoot = 1;
      } else if (rawTo < 0) {
        dir = "top"; overshoot = -rawTo;
      } else if (rawTo >= count && classifyY === undefined) {
        dir = "bottom"; overshoot = rawTo - count + 1;
      }
      if (dir !== prevOutDirRef.current || overshoot !== prevOvershootRef.current) {
        prevOutDirRef.current = dir;
        prevOvershootRef.current = overshoot;
        onDragOutOfBoundsRef.current(dir, overshoot);
      }
    }

    if (scrollByRef.current) {
      const EDGE = 110;
      const winH = Dimensions.get("window").height;
      const isNearTop = absoluteY < EDGE;
      const isNearBottom = absoluteY > winH - EDGE;
      if (isNearTop || isNearBottom) {
        const newDir: "up" | "down" = isNearTop ? "up" : "down";
        if (autoScrollDirRef.current !== newDir) {
          if (autoScrollRafRef.current !== null) cancelAnimationFrame(autoScrollRafRef.current);
          autoScrollDirRef.current = newDir;
          const tick = () => {
            if (autoScrollDirRef.current !== newDir) return;
            const y = currentMoveYRef.current;
            const wh = Dimensions.get("window").height;
            let speed = 0;
            if (y < EDGE) speed = Math.round(2 + (1 - y / EDGE) * 10);
            else if (y > wh - EDGE) speed = Math.round(2 + (1 - (wh - y) / EDGE) * 10);
            if (speed > 0) {
              scrollByRef.current?.(newDir === "up" ? -speed : speed);
              autoScrollRafRef.current = requestAnimationFrame(tick);
            } else {
              autoScrollRafRef.current = null;
              autoScrollDirRef.current = null;
            }
          };
          autoScrollRafRef.current = requestAnimationFrame(tick);
        }
      } else {
        if (autoScrollRafRef.current !== null) {
          cancelAnimationFrame(autoScrollRafRef.current);
          autoScrollRafRef.current = null;
          autoScrollDirRef.current = null;
        }
      }
    }
  }, [classifyZoneYRef]);

  const handleDragRelease = useCallback((from: number, translationY: number, absoluteY: number) => {
    const h = itemHeightRef.current;
    const rawTo = Math.round(from + translationY / h);
    const count = dataRef.current.length;

    const classifyY = classifyZoneYRef?.current;
    const isInClassifyZone = classifyY !== undefined && absoluteY >= classifyY;

    if (isInClassifyZone && onEscapeBottomRef.current) {
      const item = dataRef.current[from];
      resetAll();
      onEscapeBottomRef.current(item, 1);
      return;
    }
    if (!isInClassifyZone && rawTo >= count && onEscapeBottomRef.current) {
      const item = dataRef.current[from];
      resetAll();
      onEscapeBottomRef.current(item, rawTo - count + 1);
      return;
    }
    if (rawTo < 0 && onEscapeTopRef.current) {
      const item = dataRef.current[from];
      resetAll();
      onEscapeTopRef.current(item, -rawTo);
      return;
    }
    const to = Math.min(Math.max(rawTo, 0), count - 1);
    resetAll();
    if (from >= 0 && to !== from) {
      const next = [...dataRef.current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorderRef.current(next);
    }
  }, [classifyZoneYRef, resetAll]);

  const emptyHandlers: DragHandlers = { onLongPress: () => {}, onPressOut: () => {}, delayLongPress: 300 };

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item);
        return (
          <SortableItem
            key={key}
            index={index}
            isActive={index === activeIndex}
            isAnyActive={activeIndex >= 0}
            springAnim={springAnims.current.get(key)!}
            onStart={handleDragStart}
            onUpdate={handleDragUpdate}
            onEnd={handleDragRelease}
            onReset={resetAll}
          >
            {renderItem(item, index, emptyHandlers)}
          </SortableItem>
        );
      })}
    </View>
  );
}
