import { useState, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface UseProgressAnimationResult {
  progressAnim: Animated.Value;
  triggerAnimation: () => void;
}

/**
 * プログレスバー/円のアニメーションを管理するカスタムフック
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

  return { progressAnim, triggerAnimation };
};
