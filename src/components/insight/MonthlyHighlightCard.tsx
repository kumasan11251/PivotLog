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
    connection: { icon: 'heart', lightColor: '#EC4899', darkColor: '#F472B6', label: 'つながり' },
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

export const MonthlyHighlightCard: React.FC<MonthlyHighlightCardProps> = ({ highlight }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { icon, color, label } = getHighlightStyle(highlight.type, isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.typeText, { color }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.contentSection}>
        <View style={styles.headerRow}>
          <Text style={[styles.date, { color: themeColors.text.secondary }]}>
            {formatDateDisplay(highlight.date)}
          </Text>
        </View>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          {highlight.title}
        </Text>
        <Text style={[styles.description, { color: themeColors.text.secondary }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  leftSection: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    ...textBase,
    fontSize: 10,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
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
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
