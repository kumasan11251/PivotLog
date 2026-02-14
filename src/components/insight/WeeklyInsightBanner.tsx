/**
 * WeeklyInsightBanner - 週次インサイト表示のコンパクトなバナー
 * DiaryListContentの上部に表示する
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { WeeklyInsightState } from '../../types/weeklyInsight';

interface WeeklyInsightBannerProps {
  /** 先週の記録数 */
  entryCount: number;
  /** 現在の状態 */
  state: WeeklyInsightState;
  /** インサイトが生成済みか */
  hasInsight: boolean;
  /** インサイト生成可能か */
  canGenerate: boolean;
  /** サマリー（生成済みの場合） */
  summary?: string;
  /** バナータップ時のハンドラ */
  onPress: () => void;
}

export const WeeklyInsightBanner: React.FC<WeeklyInsightBannerProps> = ({
  entryCount,
  state,
  hasInsight,
  canGenerate,
  summary,
  onPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  // 状態に応じた表示内容を決定
  const renderContent = () => {
    // ローディング中
    if (state === 'loading') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>
            週間ふりかえりを生成中...
          </Text>
        </View>
      );
    }

    // インサイトが生成済み
    if (hasInsight && summary) {
      return (
        <>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
              <Ionicons name="analytics" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: themeColors.text.primary }]}>
                先週のふりかえり
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
                {entryCount}日分の記録を分析
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.text.secondary} />
          </View>
          <Text
            style={[styles.summary, { color: themeColors.text.primary }]}
            numberOfLines={2}
          >
            {summary}
          </Text>
        </>
      );
    }

    // 生成可能だが未生成
    if (canGenerate) {
      return (
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
            <Ionicons name="sparkles" size={18} color={themeColors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              週間ふりかえりを見る
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
              先週の{entryCount}日分の記録をAIが分析します
            </Text>
          </View>
          <View style={[styles.generateButton, { backgroundColor: themeColors.primary }]}>
            <Text style={[styles.generateButtonText, { color: themeColors.text.inverse }]}>
              生成
            </Text>
          </View>
        </View>
      );
    }

    // データ不足
    return (
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#EEE' }]}>
          <Ionicons name="analytics-outline" size={18} color={themeColors.text.secondary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            週間ふりかえり
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>
            タップして過去の週を分析
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.text.secondary} />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderColor: hasInsight ? themeColors.primary : themeColors.border,
          borderWidth: hasInsight ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={state === 'loading'}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
  },
  summary: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  generateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  generateButtonText: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.sm,
  },
});
