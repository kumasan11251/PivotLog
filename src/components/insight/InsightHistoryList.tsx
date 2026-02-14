/**
 * InsightHistoryList - ふりかえり履歴一覧コンポーネント
 *
 * 過去に生成されたインサイトの一覧を表示するモーダル風UI
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { WeeklyInsightDocument } from '../../services/firebase/firestore';

interface InsightHistoryListProps {
  /** 表示/非表示 */
  visible: boolean;
  /** 閉じる */
  onClose: () => void;
  /** インサイト一覧 */
  insights: WeeklyInsightDocument[];
  /** インサイトを選択 */
  onSelectInsight: (weekKey: string) => void;
  /** 現在選択中の週キー */
  currentWeekKey?: string;
}

/**
 * 週キーをパースして表示用テキストを生成
 */
function formatWeekKey(weekKey: string): { year: number; weekNumber: number } {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return { year: 0, weekNumber: 0 };
  }
  return {
    year: parseInt(match[1], 10),
    weekNumber: parseInt(match[2], 10),
  };
}

/**
 * 日付範囲を短い形式で表示
 */
function formatDateRangeShort(startDate: string, endDate: string): string {
  const [, startMonth, startDay] = startDate.split('-').map(Number);
  const [, endMonth, endDay] = endDate.split('-').map(Number);
  return `${startMonth}/${startDay} 〜 ${endMonth}/${endDay}`;
}

interface InsightHistoryItemProps {
  insight: WeeklyInsightDocument;
  onSelect: () => void;
  isSelected: boolean;
}

const InsightHistoryItem: React.FC<InsightHistoryItemProps> = ({
  insight,
  onSelect,
  isSelected,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { year, weekNumber } = formatWeekKey(insight.weekKey);

  const itemBgStyle = { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' };
  const selectedStyle = isSelected
    ? { borderColor: themeColors.primary, borderWidth: 2 }
    : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        itemBgStyle,
        selectedStyle,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <Ionicons name="analytics" size={16} color={themeColors.primary} />
          <Text style={[styles.itemTitle, { color: themeColors.text.primary }]}>
            {year}年 第{weekNumber}週
          </Text>
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: themeColors.primary }]}>
              <Ionicons name="checkmark" size={12} color={themeColors.text.inverse} />
            </View>
          )}
        </View>
        <Text style={[styles.itemDateRange, { color: themeColors.text.secondary }]}>
          {formatDateRangeShort(insight.weekStartDate, insight.weekEndDate)}
        </Text>
      </View>

      <Text
        style={[styles.itemSummary, { color: themeColors.text.secondary }]}
        numberOfLines={2}
      >
        {insight.summary}
      </Text>

      <View style={styles.itemFooter}>
        <View style={styles.itemMeta}>
          <Ionicons name="calendar-outline" size={12} color={themeColors.text.secondary} />
          <Text style={[styles.itemMetaText, { color: themeColors.text.secondary }]}>
            {insight.entryCount}日分
          </Text>
        </View>
        <View style={styles.itemMeta}>
          <Ionicons name="bulb-outline" size={12} color={themeColors.text.secondary} />
          <Text style={[styles.itemMetaText, { color: themeColors.text.secondary }]}>
            {insight.patterns.length}パターン
          </Text>
        </View>
      </View>

      {insight.patterns.length > 0 && (
        <View style={[styles.patternTags, { borderTopColor: themeColors.border }]}>
          {insight.patterns.slice(0, 3).map((pattern, index) => (
            <View
              key={index}
              style={[styles.patternTag, { backgroundColor: `${themeColors.primary}15` }]}
            >
              <Text style={[styles.patternTagText, { color: themeColors.primary }]}>
                {pattern.title}
              </Text>
            </View>
          ))}
          {insight.patterns.length > 3 && (
            <Text style={[styles.morePatterns, { color: themeColors.text.secondary }]}>
              +{insight.patterns.length - 3}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const InsightHistoryList: React.FC<InsightHistoryListProps> = ({
  visible,
  onClose,
  insights,
  onSelectInsight,
  currentWeekKey,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const handleSelectInsight = (weekKey: string) => {
    onSelectInsight(weekKey);
    onClose();
  };

  const renderItem = ({ item }: { item: WeeklyInsightDocument }) => (
    <InsightHistoryItem
      insight={item}
      onSelect={() => handleSelectInsight(item.weekKey)}
      isSelected={item.weekKey === currentWeekKey}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="analytics-outline" size={48} color={themeColors.text.secondary} />
      <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
        履歴がありません
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
        週間ふりかえりを生成すると{'\n'}ここに表示されます
      </Text>
    </View>
  );

  const descriptionBgStyle = { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={themeColors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
            ふりかえり履歴
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 説明 */}
        <View style={[styles.descriptionContainer, descriptionBgStyle]}>
          <Ionicons name="information-circle-outline" size={16} color={themeColors.text.secondary} />
          <Text style={[styles.descriptionText, { color: themeColors.text.secondary }]}>
            過去に生成したふりかえりを選択して再度閲覧できます
          </Text>
        </View>

        {/* リスト */}
        <FlatList
          data={insights}
          renderItem={renderItem}
          keyExtractor={(item) => item.weekKey}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  itemContainer: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    marginBottom: spacing.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
    marginLeft: spacing.xs,
    flex: 1,
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDateRange: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    marginTop: 2,
    marginLeft: 20,
  },
  itemSummary: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemMetaText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginLeft: 4,
  },
  patternTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  patternTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  patternTagText: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  morePatterns: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
