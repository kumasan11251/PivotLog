import { useState, useEffect, useRef, useMemo } from 'react';
import { Animated, Easing } from 'react-native';

// プログレス円の定数
const CIRCLE_RADIUS = 90;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

interface AnimatedValues {
  /** プログレスバー用のアニメーション幅（0%〜100%） */
  width: Animated.AnimatedInterpolation<string | number>;
  /** プログレス円用のアニメーションストロークオフセット */
  strokeDashoffset: Animated.AnimatedInterpolation<string | number>;
}

interface UseProgressAnimationResult {
  /** アニメーション化された値 */
  animatedValues: AnimatedValues;
  /** アニメーションを再実行する */
  triggerAnimation: () => void;
  /** プログレス円の定数 */
  circleConstants: {
    radius: number;
    circumference: number;
  };
}

/**
 * プログレスバー/円のアニメーションを管理するカスタムフック
 * アニメーション値の計算もフック内で完結させる
 */
export const useProgressAnimation = (
  targetProgress: number,
  duration: number = 1200
): UseProgressAnimationResult => {
  const [progressAnim] = useState(() => new Animated.Value(0));
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // 初回のみアニメーション実行
    if (!hasAnimatedRef.current && targetProgress > 0) {
      hasAnimatedRef.current = true;
      Animated.timing(progressAnim, {
        toValue: targetProgress,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [targetProgress, progressAnim, duration]);

  const triggerAnimation = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  // アニメーション値の計算をメモ化
  const animatedValues = useMemo<AnimatedValues>(() => ({
    width: progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    }),
    strokeDashoffset: progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: [CIRCLE_CIRCUMFERENCE, 0],
    }),
  }), [progressAnim]);

  const circleConstants = useMemo(() => ({
    radius: CIRCLE_RADIUS,
    circumference: CIRCLE_CIRCUMFERENCE,
  }), []);

  return { animatedValues, triggerAnimation, circleConstants };
};
