import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface SaveMomentNoteProps {
  /** その日の初回保存時の一言。nullなら何も表示しない */
  text: string | null;
}

// 表示してからフェードアウトを始めるまでの時間
const VISIBLE_DURATION_MS = 4000;

/**
 * 日記の初回保存直後に、積み重ねをそっと伝える一言。
 *
 * - トースト/モーダルにはしない（軽さを壊さない）。静かにフェードインして自然に消える
 * - 一度表示された後は高さを保ったまま透明になり、レイアウトが跳ねないようにする
 */
const SaveMomentNote: React.FC<SaveMomentNoteProps> = ({ text }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  // アニメーション値（useMemoで安定した参照を維持）
  const opacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!text) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, VISIBLE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [text, opacity]);

  if (!text) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={[styles.text, { color: themeColors.text.secondary }]}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.padding.screen,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  text: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    textAlign: 'center',
    ...textBase,
  },
});

export default SaveMomentNote;
