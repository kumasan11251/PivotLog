/**
 * MonthlyInsightBanner - 日記一覧に表示する月次インサイトバナー
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MIN_ENTRIES_FOR_MONTHLY_INSIGHT } from '../../utils/monthUtils';
import type { MonthlyInsightState } from '../../types/monthlyInsight';

interface MonthlyInsightBannerProps {
  /** 先月の記録数 */
  entryCount: number;
  /** インサイトの状態 */
  state: MonthlyInsightState;
  /** インサイトが存在するか */
  hasInsight: boolean;
  /** インサイト生成可能か */
  canGenerate: boolean;
  /** インサイトのサマリー（あれば） */
  summary?: string;
  /** バナーをタップしたときのコールバック */
  onPress: () => void;
}

export const MonthlyInsightBanner: React.FC<MonthlyInsightBannerProps> = ({
  entryCount,
  state,
  hasInsight,
  canGenerate,
  summary,
  onPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  // ローディング中
  if (state === 'loading') {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="calendar" size={20} color={themeColors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            月間ふりかえりを生成中...
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
            {entryCount}日分の記録を分析しています
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.text.secondary} />
      </TouchableOpacity>
    );
  }

  // インサイトあり
  if (hasInsight && summary) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="calendar" size={20} color={themeColors.primary} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              月間ふりかえり
            </Text>
            <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.badgeText, { color: themeColors.text.inverse }]}>
                {entryCount}日分
              </Text>
            </View>
          </View>
          <Text
            style={[styles.summaryText, { color: themeColors.text.secondary }]}
            numberOfLines={2}
          >
            {summary}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.text.secondary} />
      </TouchableOpacity>
    );
  }

  // 生成可能
  if (canGenerate) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: `${themeColors.primary}10`, borderColor: themeColors.primary }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="sparkles" size={20} color={themeColors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: themeColors.primary }]}>
            先月の月間ふりかえりを生成
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
            {entryCount}日分の記録をAIが分析します
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
      </TouchableOpacity>
    );
  }

  // 記録不足
  return (
    <View
      style={[
        styles.container,
        styles.containerInactive,
        { backgroundColor: themeColors.surface, borderColor: themeColors.border },
      ]}
    >
      <View style={[styles.iconContainer, isDark ? styles.iconContainerDark : styles.iconContainerLight]}>
        <Ionicons name="calendar-outline" size={20} color={themeColors.text.secondary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: themeColors.text.secondary }]}>
          月間ふりかえり
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
          あと{MIN_ENTRIES_FOR_MONTHLY_INSIGHT - entryCount}日分の記録で生成可能
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  containerInactive: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconContainerLight: {
    backgroundColor: '#F0F0F0',
  },
  iconContainerDark: {
    backgroundColor: '#333',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  badge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    lineHeight: 16,
  },
});
