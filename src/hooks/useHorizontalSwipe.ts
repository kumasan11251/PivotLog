/* eslint-disable react-hooks/refs */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, type GestureResponderHandlers } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReduceMotion } from './useReduceMotion';

// 横スワイプによる前後移動の判定・演出パラメータ
const SWIPE_TRIGGER_DISTANCE = 50;
const SWIPE_TRIGGER_VELOCITY = 0.3;
const SLIDE_DISTANCE = 60;
const DRAG_DAMPING = 0.4;

interface UseHorizontalSwipeOptions {
  /** 右へ払ったとき（前へ） */
  onPrevious: () => void;
  /** 左へ払ったとき（次へ） */
  onNext: () => void;
  /** 横スワイプ中は親ScrollViewの縦スクロールを止めるための通知 */
  onSwipeActiveChange?: (isSwiping: boolean) => void;
  /** false を返すとスワイプを開始しない（入力中など） */
  canStart?: () => boolean;
}

export interface HorizontalSwipeResult {
  /** スワイプを受け付けるビューに展開する */
  panHandlers: GestureResponderHandlers;
  /** 同じビューに当てる。ドラッグ追従と、スライドアウト/インの演出 */
  animatedStyle: {
    transform: { translateX: Animated.Value }[];
    opacity: Animated.AnimatedInterpolation<number>;
  };
  /** スワイプと同じ演出で前へ移動（矢印ボタンなどから） */
  goPrevious: () => void;
  /** スワイプと同じ演出で次へ移動 */
  goNext: () => void;
}

/**
 * 左右スワイプで前後へ移動するための共通ロジック
 *
 * - 指の動きに少し追従 → しきい値を越えたらスライドアウト → 内容を切り替え → 反対側からスライドイン
 * - 左に払う＝次へ、右に払う＝前へ（カレンダーと習慣カードで同じ約束にする）
 * - 「視差効果を減らす」が有効なときはスライド演出を省き、即座に切り替える
 */
export const useHorizontalSwipe = ({
  onPrevious,
  onNext,
  onSwipeActiveChange,
  canStart,
}: UseHorizontalSwipeOptions): HorizontalSwipeResult => {
  const reduceMotion = useReduceMotion();
  const swipeAnim = useMemo(() => new Animated.Value(0), []);
  const isTransitioningRef = useRef(false);

  // PanResponder コールバックから最新のpropsを参照するためのref
  const onPreviousRef = useRef(onPrevious);
  const onNextRef = useRef(onNext);
  const onSwipeActiveChangeRef = useRef(onSwipeActiveChange);
  const canStartRef = useRef(canStart);
  const reduceMotionRef = useRef(reduceMotion);
  useEffect(() => {
    onPreviousRef.current = onPrevious;
    onNextRef.current = onNext;
    onSwipeActiveChangeRef.current = onSwipeActiveChange;
    canStartRef.current = canStart;
    reduceMotionRef.current = reduceMotion;
  }, [onPrevious, onNext, onSwipeActiveChange, canStart, reduceMotion]);

  // アンマウント時に親ScrollViewのスクロールを必ず戻す
  useEffect(
    () => () => {
      onSwipeActiveChangeRef.current?.(false);
    },
    []
  );

  // スライドアウト → 切り替え → 反対側からスライドイン
  const runTransition = useCallback(
    (direction: 'previous' | 'next') => {
      if (isTransitioningRef.current) return;
      const action = direction === 'next' ? onNextRef.current : onPreviousRef.current;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (reduceMotionRef.current) {
        swipeAnim.setValue(0);
        action();
        return;
      }

      isTransitioningRef.current = true;
      const outValue = direction === 'next' ? -SLIDE_DISTANCE : SLIDE_DISTANCE;
      Animated.timing(swipeAnim, { toValue: outValue, duration: 100, useNativeDriver: true }).start(() => {
        action();
        swipeAnim.setValue(-outValue);
        Animated.timing(swipeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
          isTransitioningRef.current = false;
        });
      });
    },
    [swipeAnim]
  );

  const resetSwipePosition = useCallback(() => {
    Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  }, [swipeAnim]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          !isTransitioningRef.current &&
          (canStartRef.current?.() ?? true) &&
          Math.abs(dx) > Math.abs(dy) &&
          Math.abs(dx) > 10,
        onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
          !isTransitioningRef.current &&
          (canStartRef.current?.() ?? true) &&
          Math.abs(dx) > Math.abs(dy) * 1.5 &&
          Math.abs(dx) > 15,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          // 横スワイプ中は親ScrollViewの縦スクロールを止めて上下の揺れを防ぐ
          onSwipeActiveChangeRef.current?.(true);
        },
        onPanResponderMove: (_, { dx }) => {
          if (reduceMotionRef.current) return;
          swipeAnim.setValue(dx * DRAG_DAMPING);
        },
        onPanResponderRelease: (_, { dx, vx }) => {
          onSwipeActiveChangeRef.current?.(false);
          if (dx < 0 && (dx < -SWIPE_TRIGGER_DISTANCE || vx < -SWIPE_TRIGGER_VELOCITY)) {
            runTransition('next');
          } else if (dx > 0 && (dx > SWIPE_TRIGGER_DISTANCE || vx > SWIPE_TRIGGER_VELOCITY)) {
            runTransition('previous');
          } else {
            resetSwipePosition();
          }
        },
        onPanResponderTerminate: () => {
          onSwipeActiveChangeRef.current?.(false);
          resetSwipePosition();
        },
      }),
    [swipeAnim, runTransition, resetSwipePosition]
  );

  const swipeOpacity = useMemo(
    () =>
      swipeAnim.interpolate({
        inputRange: [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE],
        outputRange: [0.3, 1, 0.3],
        extrapolate: 'clamp',
      }),
    [swipeAnim]
  );

  const animatedStyle = useMemo(
    () => ({ transform: [{ translateX: swipeAnim }], opacity: swipeOpacity }),
    [swipeAnim, swipeOpacity]
  );

  const goPrevious = useCallback(() => runTransition('previous'), [runTransition]);
  const goNext = useCallback(() => runTransition('next'), [runTransition]);

  return { panHandlers: panResponder.panHandlers, animatedStyle, goPrevious, goNext };
};
