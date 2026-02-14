/**
 * InsightPatternCard - インサイトパターン表示カード
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { InsightPattern, InsightPatternType, InsightPatternV2 } from '../../types/weeklyInsight';

interface InsightPatternCardProps {
  pattern: InsightPattern | InsightPatternV2;
}

/**
 * パターンタイプに応じたアイコンと色を取得
 */
const getPatternStyle = (type: InsightPatternType, isDark: boolean): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
} => {
  const styles: Record<InsightPatternType, { icon: keyof typeof Ionicons.glyphMap; lightColor: string; darkColor: string }> = {
    positive_theme: { icon: 'sunny', lightColor: '#F59E0B', darkColor: '#FBBF24' },
    growth_area: { icon: 'trending-up', lightColor: '#10B981', darkColor: '#34D399' },
    time_awareness: { icon: 'time', lightColor: '#6366F1', darkColor: '#818CF8' },
    relationship: { icon: 'people', lightColor: '#EC4899', darkColor: '#F472B6' },
    self_care: { icon: 'heart', lightColor: '#EF4444', darkColor: '#F87171' },
    work_life: { icon: 'briefcase', lightColor: '#3B82F6', darkColor: '#60A5FA' },
    intention_action: { icon: 'flag', lightColor: '#8B5CF6', darkColor: '#A78BFA' },
  };

  const style = styles[type] || styles.positive_theme;
  const color = isDark ? style.darkColor : style.lightColor;

  return {
    icon: style.icon,
    color,
    bgColor: `${color}15`,
  };
};

export const InsightPatternCard: React.FC<InsightPatternCardProps> = ({ pattern }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { icon, color, bgColor } = getPatternStyle(pattern.type, isDark);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      {/* アイコンとタイトル */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          {pattern.title}
        </Text>
        {'frequency' in pattern && pattern.frequency && pattern.frequency > 1 && (
          <View style={[styles.frequencyBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.frequencyText, { color }]}>
              {pattern.frequency}回
            </Text>
          </View>
        )}
      </View>

      {/* 説明 */}
      <Text style={[styles.description, { color: themeColors.text.secondary }]}>
        {pattern.description}
      </Text>

      {/* 引用例 */}
      {pattern.examples && pattern.examples.length > 0 && (
        <View style={styles.examplesContainer}>
          {pattern.examples.slice(0, 2).map((example, index) => (
            <View
              key={index}
              style={[styles.exampleItem, { backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8' }]}
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

      {/* 深掘り（V2のみ） */}
      {'insight' in pattern && pattern.insight && (
        <Text style={[styles.insightText, { color: themeColors.text.secondary }]}>
          {pattern.insight}
        </Text>
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
  frequencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  frequencyText: {
    fontSize: 12,
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
  exampleDate: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
  },
  exampleQuote: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
  },
  insightText: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
});
