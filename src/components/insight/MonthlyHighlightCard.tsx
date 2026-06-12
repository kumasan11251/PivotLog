/**
 * MonthlyHighlightCard - 月間ハイライト表示カード
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { MonthlyHighlight } from '../../types/monthlyInsight';

interface MonthlyHighlightCardProps {
  highlight: MonthlyHighlight;
  isLast?: boolean;
}

/**
 * ハイライトタイプに応じたアイコンと色を取得
 */
const getHighlightStyle = (type: MonthlyHighlight['type'], isDark: boolean): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
} => {
  const styles: Record<MonthlyHighlight['type'], { icon: keyof typeof Ionicons.glyphMap; lightColor: string; darkColor: string; label: string }> = {
    achievement: { icon: 'trophy', lightColor: '#F59E0B', darkColor: '#FBBF24', label: '達成' },
    connection: { icon: 'heart', lightColor: '#EC4899', darkColor: '#F472B6', label: '繋がり' },
    discovery: { icon: 'bulb', lightColor: '#8B5CF6', darkColor: '#A78BFA', label: '発見' },
    turning_point: { icon: 'flag', lightColor: '#10B981', darkColor: '#34D399', label: '転機' },
  };

  const style = styles[type] || styles.achievement;
  const color = isDark ? style.darkColor : style.lightColor;

  return {
    icon: style.icon,
    color,
    label: style.label,
  };
};

/**
 * 日付をフォーマット（M月D日）
 */
function formatDateDisplay(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${month}月${day}日`;
}

export const MonthlyHighlightCard: React.FC<MonthlyHighlightCardProps> = ({ highlight, isLast = false }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { icon, color, label } = getHighlightStyle(highlight.type, isDark);

  return (
    <View style={[
      styles.container,
      isLast && styles.lastContainer,
      { backgroundColor: themeColors.surface, borderColor: themeColors.border },
    ]}>
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.typeText, { color }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.headingSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.date, { color: themeColors.text.secondary }]}>
              {formatDateDisplay(highlight.date)}
            </Text>
          </View>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            {highlight.title}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: themeColors.text.primary }]}>
        {highlight.description}
      </Text>
      {highlight.quote && (
        <View style={[styles.quoteContainer, isDark ? styles.quoteContainerDark : styles.quoteContainerLight]}>
          <Text style={[styles.quoteText, { color: themeColors.text.primary }]}>
            「{highlight.quote}」
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
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  lastContainer: {
    marginBottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  leftSection: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 52,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    ...textBase,
    fontSize: 11,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    lineHeight: 16,
  },
  headingSection: {
    flex: 1,
  },
  headerRow: {
    marginBottom: 4,
  },
  date: {
    fontSize: fonts.size.insightSub,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightSub,
  },
  title: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.bold,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
  quoteContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
  },
  quoteContainerLight: {
    backgroundColor: '#F8F8F8',
  },
  quoteContainerDark: {
    backgroundColor: '#2A2A2A',
  },
  quoteText: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
});
