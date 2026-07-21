import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { logAnalyticsEvent } from '../../services/firebase';
import type { TimeHop, TimeHopDistance } from '../../hooks/useTimeHop';

interface TimeHopCardProps {
  /** 表示する過去エントリ。呼び出し側で null の場合は描画しないこと */
  timeHop: TimeHop;
  /** 「この日の日記を読む」タップ時にその日付へ移動する */
  onNavigateToDate: (dateString: string) => void;
}

const DISTANCE_LABELS: Record<TimeHopDistance, string> = {
  week: '1週間前',
  month: '1ヶ月前',
  year: '1年前',
};

// 抜粋の最大文字数（長文はぼかして本文への再会はタップ先に譲る）
const EXCERPT_MAX_LENGTH = 80;

/**
 * 「あの日のあなた」——1週間前・1ヶ月前・1年前の同日の日記をそっと差し出す折りたたみカード。
 *
 * - デフォルトは閉じた状態。気になる人だけそっと開ける軽さを保つ
 * - 引用は goodTime（無ければ tomorrow）のみ。過去のネガティブ（wastedTime）は突きつけない
 * - 展開でその日の記録に再会し、さらにタップでその日の日記へ移動できる
 */
const TimeHopCard: React.FC<TimeHopCardProps> = ({ timeHop, onNavigateToDate }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  // 別日付の表示では key（timeHop.dateString）でリマウントされるため、常に閉じた状態から始まる
  const [expanded, setExpanded] = useState(false);

  const excerpt = useMemo(() => {
    const source = timeHop.entry.goodTime?.trim() || timeHop.entry.tomorrow?.trim() || '';
    const singleLine = source.replace(/\s+/g, ' ');
    return singleLine.length > EXCERPT_MAX_LENGTH
      ? `${singleLine.slice(0, EXCERPT_MAX_LENGTH)}…`
      : singleLine;
  }, [timeHop.entry]);

  const distanceLabel = DISTANCE_LABELS[timeHop.distance];

  const handleToggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        logAnalyticsEvent('timehop_viewed', { distance: timeHop.distance });
      }
      return next;
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.surface, borderColor: themeColors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? `${distanceLabel}の今日の記録を閉じる`
            : `${distanceLabel}の今日の記録を開く`
        }
      >
        <Text style={[styles.title, { color: themeColors.text.secondary }]}>
          {distanceLabel}の今日、あなたはこう書いていました
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={themeColors.text.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <TouchableOpacity
          onPress={() => onNavigateToDate(timeHop.dateString)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="この日の日記へ移動"
        >
          <Text style={[styles.body, { color: themeColors.text.primary }]}>{excerpt}</Text>
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.primary }]}>
              この日の日記を読む
            </Text>
            <Ionicons name="chevron-forward" size={12} color={themeColors.primary} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.padding.screen,
    // DateNavigator の marginBottom: xxl(48) が直前にあるため、間隔が空きすぎないよう詰める
    marginTop: -spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  body: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
    marginTop: spacing.sm,
    ...textBase,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: 2,
  },
  footerText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default TimeHopCard;
