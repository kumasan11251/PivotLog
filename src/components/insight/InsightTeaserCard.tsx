/**
 * InsightTeaserCard - 無料ユーザー向けインサイトのチラ見せカード
 *
 * 実際のインサイトカード（WeeklyInsightCardV2 / MonthlyInsightCard）にサンプルデータを
 * 流し込み、ぼかし風マスクで隠して表示する。プレミアム（Paywall）への導線を重ねる。
 * 無料ユーザーには生成済みインサイトが存在しないため、表示するのはサンプルデータのみ。
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeeklyInsightCardV2 } from './WeeklyInsightCardV2';
import { MonthlyInsightCard } from './MonthlyInsightCard';
import { logAnalyticsEvent } from '../../services/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { SAMPLE_WEEKLY_INSIGHT, SAMPLE_MONTHLY_INSIGHT } from '../../constants/sampleInsights';
import { fonts, spacing, getColors } from '../../theme';

interface InsightTeaserCardProps {
  /** チラ見せ対象のインサイト種別 */
  type: 'weekly' | 'monthly';
  /** プレミアム導線（Paywallへの遷移） */
  onUpgrade: () => void;
}

const TEASER_CONTENT = {
  weekly: {
    lockTitle: '今月の無料生成分を使い切りました',
    lockDescription: 'プレミアムなら、毎週AIがあなたの1週間を\n一緒にふりかえります',
  },
  monthly: {
    lockTitle: '月間ふりかえりはプレミアム限定です',
    lockDescription: '1ヶ月分の記録から、あなたの変化と成長を\nAIがレポートします',
  },
} as const;

export const InsightTeaserCard: React.FC<InsightTeaserCardProps> = ({ type, onUpgrade }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const content = TEASER_CONTENT[type];

  useEffect(() => {
    logAnalyticsEvent('insight_teaser_viewed', { type });
    // マウント時に1回だけ記録する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* 実物のインサイトカードにサンプルデータを流し込んで背景に表示 */}
      <View style={styles.sampleLayer} pointerEvents="none">
        {type === 'weekly' ? (
          <WeeklyInsightCardV2 insight={SAMPLE_WEEKLY_INSIGHT} />
        ) : (
          <MonthlyInsightCard insight={SAMPLE_MONTHLY_INSIGHT} />
        )}
      </View>

      {/* ぼかし風マスク */}
      <View
        style={[styles.mask, { backgroundColor: themeColors.background }]}
        pointerEvents="none"
      />

      {/* ロックとプレミアム導線 */}
      <View style={styles.lockOverlay}>
        <View style={[styles.lockIconCircle, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="lock-closed" size={28} color={themeColors.primary} />
        </View>
        <Text style={[styles.lockTitle, { color: themeColors.text.primary }]}>
          {content.lockTitle}
        </Text>
        <Text style={[styles.lockDescription, { color: themeColors.text.secondary }]}>
          {content.lockDescription}
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: themeColors.primary }]}
          onPress={onUpgrade}
        >
          <Ionicons name="sparkles" size={18} color={themeColors.text.inverse} />
          <Text style={[styles.upgradeButtonText, { color: themeColors.text.inverse }]}>
            プレミアムで見る
          </Text>
        </TouchableOpacity>
        <Text style={[styles.sampleNote, { color: themeColors.text.placeholder }]}>
          ※ 背景の内容は表示サンプルです
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sampleLayer: {
    flex: 1,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockDescription: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  sampleNote: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
