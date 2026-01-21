import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';
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
  const containerStyle = fadeAnim
    ? [styles.container, { opacity: fadeAnim }]
    : styles.container;

  return (
    <Animated.View style={containerStyle}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✨</Text>
        <Text style={styles.headerText}>AIからの気づき</Text>
      </View>

      {/* メッセージ本文 */}
      <Text style={styles.contentText}>{reflection.content}</Text>

      {/* 問いかけボックス */}
      {reflection.question && (
        <View style={styles.questionBox}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionIcon}>💭</Text>
            <Text style={styles.questionLabel}>明日へのヒント</Text>
          </View>
          <Text style={styles.questionText}>{reflection.question}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
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
    color: colors.primary,
    marginLeft: spacing.sm,
    ...textBase,
  },
  contentText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 26,
    ...textBase,
  },
  questionBox: {
    backgroundColor: 'rgba(139, 157, 131, 0.1)', // primary の薄い背景
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
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    ...textBase,
  },
  questionText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 22,
    fontStyle: 'italic',
    ...textBase,
  },
});

export default AIReflectionCard;
