import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const PROGRESSIVE_MESSAGES = [
  { delay: 0, message: 'あなたの記録を読んでいます...' },
  { delay: 2000, message: 'じっくり考えています...' },
  { delay: 4000, message: 'もう少しお待ちください...' },
];

/**
 * AIリフレクション読み込み中の表示
 * パルスアニメーション付きのローディングインジケーター
 * 時間経過に応じてメッセージを段階的に切り替え
 */
const AIReflectionLoading: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [messageIndex, setMessageIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // プログレッシブメッセージの切り替え
  useEffect(() => {
    timersRef.current = [];

    for (let i = 1; i < PROGRESSIVE_MESSAGES.length; i++) {
      const timer = setTimeout(() => {
        setMessageIndex(i);
      }, PROGRESSIVE_MESSAGES[i].delay);
      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      setMessageIndex(0);
    };
  }, []);

  // ドットアニメーション用（useRefで安定化）
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // ドットのパルスアニメーション
    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createPulseAnimation(dot1Anim, 0);
    const animation2 = createPulseAnimation(dot2Anim, 200);
    const animation3 = createPulseAnimation(dot3Anim, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: themeColors.surface,
        borderLeftColor: themeColors.primary,
        shadowColor: themeColors.shadow,
      },
    ]}>
      <Text style={styles.icon}>✨</Text>
      <Text style={[styles.message, { color: themeColors.text.primary }]}>
        {PROGRESSIVE_MESSAGES[messageIndex].message}
      </Text>

      {/* ローディングドット */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1Anim, backgroundColor: themeColors.primary }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Anim, backgroundColor: themeColors.primary }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Anim, backgroundColor: themeColors.primary }]} />
      </View>

      <Text style={[styles.subMessage, { color: themeColors.text.secondary }]}>少々お待ちください</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.xl,
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    textAlign: 'center',
    ...textBase,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subMessage: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
});

export default AIReflectionLoading;
