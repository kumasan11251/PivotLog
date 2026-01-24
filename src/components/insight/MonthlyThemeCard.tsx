/**
 * MonthlyThemeCard - 月間テーマ表示カード
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { MonthlyTheme, MonthlyThemeType } from '../../types/monthlyInsight';

interface MonthlyThemeCardProps {
  theme: MonthlyTheme;
}

/**
 * テーマタイプに応じたアイコンと色を取得
 */
const getThemeStyle = (type: MonthlyThemeType, isDark: boolean): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
} => {
  const styles: Record<MonthlyThemeType, { icon: keyof typeof Ionicons.glyphMap; lightColor: string; darkColor: string }> = {
    recurring_joy: { icon: 'sunny', lightColor: '#F59E0B', darkColor: '#FBBF24' },
    persistent_challenge: { icon: 'trending-up', lightColor: '#10B981', darkColor: '#34D399' },
    evolving_priority: { icon: 'swap-horizontal', lightColor: '#6366F1', darkColor: '#818CF8' },
    relationship_pattern: { icon: 'people', lightColor: '#EC4899', darkColor: '#F472B6' },
    self_discovery: { icon: 'bulb', lightColor: '#8B5CF6', darkColor: '#A78BFA' },
    time_investment: { icon: 'time', lightColor: '#3B82F6', darkColor: '#60A5FA' },
    value_alignment: { icon: 'compass', lightColor: '#14B8A6', darkColor: '#2DD4BF' },
  };

  const style = styles[type] || styles.recurring_joy;
  const color = isDark ? style.darkColor : style.lightColor;

  return {
    icon: style.icon,
    color,
    bgColor: `${color}15`,
  };
};

export const MonthlyThemeCard: React.FC<MonthlyThemeCardProps> = ({ theme }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { icon, color, bgColor } = getThemeStyle(theme.type, isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      {/* アイコンとタイトル */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          {theme.title}
        </Text>
      </View>

      {/* 説明 */}
      <Text style={[styles.description, { color: themeColors.text.secondary }]}>
        {theme.description}
      </Text>

      {/* 引用例 */}
      {theme.examples && theme.examples.length > 0 && (
        <View style={styles.examplesContainer}>
          {theme.examples.slice(0, 2).map((example, index) => (
            <View
              key={index}
              style={[styles.exampleItem, isDark ? styles.exampleItemDark : styles.exampleItemLight]}
            >
              <Text style={[styles.exampleDate, { color: themeColors.text.secondary }]}>
                {formatDateShort(example.date)}
              </Text>
              <Text style={[styles.exampleQuote, { color: themeColors.text.primary }]}>
                「{example.quote}」
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * 日付を短い形式に変換（MM/DD）
 */
function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  examplesContainer: {
    marginTop: spacing.xs,
  },
  exampleItem: {
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  exampleItemLight: {
    backgroundColor: '#F8F8F8',
  },
  exampleItemDark: {
    backgroundColor: '#2A2A2A',
  },
  exampleDate: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
  },
  exampleQuote: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
  },
});
