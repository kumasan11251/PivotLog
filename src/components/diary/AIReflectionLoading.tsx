import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

interface AIReflectionLoadingProps {
  message?: string;
}

/**
 * AIリフレクション読み込み中の表示
 * パルスアニメーション付きのローディングインジケーター
 */
const AIReflectionLoading: React.FC<AIReflectionLoadingProps> = ({
  message = 'あなたの記録を読んでいます...',
}) => {
  // ドットアニメーション用（useMemoで安定化）
  const dot1Anim = useMemo(() => new Animated.Value(0.3), []);
  const dot2Anim = useMemo(() => new Animated.Value(0.3), []);
  const dot3Anim = useMemo(() => new Animated.Value(0.3), []);

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
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✨</Text>
      <Text style={styles.message}>{message}</Text>

      {/* ローディングドット */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
      </View>

      <Text style={styles.subMessage}>少々お待ちください</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.xl,
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    // シャドウ
    shadowColor: colors.shadow,
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
    color: colors.text.primary,
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
    backgroundColor: colors.primary,
  },
  subMessage: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    ...textBase,
  },
});

export default AIReflectionLoading;
