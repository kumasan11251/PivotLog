import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HabitCheckIconProps {
  completed: boolean;
  color: string;
  /** ユーザー操作でチェックされた項目のときだけ true（初回表示や日付切り替えでは弾ませない） */
  shouldAnimate: boolean;
  reduceMotion: boolean;
}

/**
 * 習慣項目のチェックマーク
 * 未完了→完了に変わった瞬間、少しだけ弾んで「押した実感」を返す
 */
const HabitCheckIcon: React.FC<HabitCheckIconProps> = ({ completed, color, shouldAnimate, reduceMotion }) => {
  const scale = useMemo(() => new Animated.Value(1), []);
  const prevCompletedRef = useRef(completed);

  useEffect(() => {
    const wasCompleted = prevCompletedRef.current;
    prevCompletedRef.current = completed;
    if (!completed || wasCompleted || !shouldAnimate || reduceMotion) return;

    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.25,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 10,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [completed, shouldAnimate, reduceMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={completed ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={color} />
    </Animated.View>
  );
};

export default HabitCheckIcon;
