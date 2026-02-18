/**
 * ActionSuggestionCard - 来週へのアクション提案を表示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { WeeklyActionSuggestion } from '../../types/weeklyInsight';

// 背景色
const SECTION_BG = {
  light: '#FEF3F2',
  dark: '#251A1A',
} as const;


interface ActionSuggestionCardProps {
  actionSuggestion: WeeklyActionSuggestion;
}

export const ActionSuggestionCard: React.FC<ActionSuggestionCardProps> = ({
  actionSuggestion,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const bgColor = isDark ? SECTION_BG.dark : SECTION_BG.light;

  const { mainSuggestion, keepDoing } = actionSuggestion;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Ionicons name="rocket" size={20} color={themeColors.primary} />
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          来週へ
        </Text>
      </View>

      {/* メインアクション */}
      <View style={styles.mainActionContainer}>
        <Text style={[styles.actionText, { color: themeColors.text.primary }]}>
          {mainSuggestion.action}
        </Text>

        {/* 理由 */}
        {mainSuggestion.reason && (
          <Text style={[styles.reasonText, { color: themeColors.text.secondary }]}>
            {mainSuggestion.reason}
          </Text>
        )}
      </View>

      {/* 継続したいこと */}
      {keepDoing && (
        <View style={[styles.keepDoingContainer, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.keepDoingLabel, { color: themeColors.text.secondary }]}>
            続けたいこと:
          </Text>
          <Text style={[styles.keepDoingText, { color: themeColors.text.primary }]}>
            {keepDoing}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  mainActionContainer: {
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  keepDoingContainer: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  keepDoingLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
  },
  keepDoingText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
  },
});
