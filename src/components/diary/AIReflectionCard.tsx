import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { AIReflectionData } from '../../types/aiReflection';

// 共通の型を再エクスポート
export type { AIReflectionData } from '../../types/aiReflection';

interface AIReflectionCardProps {
  reflection: AIReflectionData;
  fadeAnim?: Animated.Value;
}

/**
 * AIリフレクションカード
 * 日記に対するAIからの気づきと問いかけを表示
 */
const AIReflectionCard: React.FC<AIReflectionCardProps> = ({
  reflection,
  fadeAnim,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  const containerStyle = fadeAnim
    ? [
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderLeftColor: themeColors.primary,
          shadowColor: themeColors.shadow,
          opacity: fadeAnim,
        },
      ]
    : [
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderLeftColor: themeColors.primary,
          shadowColor: themeColors.shadow,
        },
      ];

  return (
    <Animated.View style={containerStyle}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✨</Text>
        <Text style={[styles.headerText, { color: themeColors.primary }]}>AIからの気づき</Text>
      </View>

      {/* メッセージ本文 */}
      <Text style={[styles.contentText, { color: themeColors.text.primary }]}>{reflection.content}</Text>

      {/* 問いかけボックス */}
      {reflection.question && (
        <View style={[styles.questionBox, { backgroundColor: `${themeColors.primary}15` }]}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionIcon}>💭</Text>
            <Text style={[styles.questionLabel, { color: themeColors.text.secondary }]}>明日へのヒント</Text>
          </View>
          <Text style={[styles.questionText, { color: themeColors.text.primary }]}>{reflection.question}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
    borderLeftWidth: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    marginLeft: spacing.sm,
    ...textBase,
  },
  contentText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 26,
    ...textBase,
  },
  questionBox: {
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  questionIcon: {
    fontSize: 16,
  },
  questionLabel: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
    ...textBase,
  },
  questionText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    fontStyle: 'italic',
    ...textBase,
  },
});

export default AIReflectionCard;
