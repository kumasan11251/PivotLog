/**
 * ActionSuggestionCard - 来週へのアクション提案を表示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { WeeklyActionSuggestion } from '../../types/weeklyInsight';

interface ActionSuggestionCardProps {
  actionSuggestion: WeeklyActionSuggestion;
}

export const ActionSuggestionCard: React.FC<ActionSuggestionCardProps> = ({
  actionSuggestion,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const { mainSuggestion, keepDoing } = actionSuggestion;
  const actionColor = isDark ? '#60A5FA' : '#3B82F6';
  const keepDoingColor = isDark ? '#34D399' : '#10B981';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      {/* メインアクション */}
      <View>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${actionColor}15` }]}>
            <Ionicons name="navigate" size={18} color={actionColor} />
          </View>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            {mainSuggestion.action}
          </Text>
        </View>

        {/* 理由 */}
        {mainSuggestion.reason && (
          <Text style={[styles.reasonText, { color: themeColors.text.primary }]}>
            {mainSuggestion.reason}
          </Text>
        )}
      </View>

      {/* 継続したいこと */}
      {keepDoing && (
        <View style={[styles.keepDoingContainer, { borderTopColor: themeColors.border }]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${keepDoingColor}15` }]}>
              <Ionicons name="checkmark-circle" size={18} color={keepDoingColor} />
            </View>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              続けたいこと
            </Text>
          </View>
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
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.bold,
    fontWeight: '500',
  },
  reasonText: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
  keepDoingContainer: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  keepDoingText: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
});
