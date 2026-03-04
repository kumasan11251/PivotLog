/**
 * InsightHistoryList - ふりかえり履歴一覧コンポーネント
 *
 * 週間・月間共通の履歴モーダルUI
 */

import React, { type ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { InsightHistoryItem } from '../../types/insightHistory';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface InsightHistoryListProps {
  /** 表示/非表示 */
  visible: boolean;
  /** 閉じる */
  onClose: () => void;
  /** 正規化済みアイテム一覧 */
  items: InsightHistoryItem[];
  /** アイテムを選択 */
  onSelectItem: (key: string) => void;
  /** 現在選択中のキー */
  currentKey?: string;
  /** 説明テキスト */
  descriptionText?: string;
  /** 空リストのタイトル */
  emptyTitle?: string;
  /** 空リストの説明 */
  emptyDescription?: string;
  /** 空リストのアイコン */
  emptyIconName?: IoniconsName;
}

interface HistoryListItemProps {
  item: InsightHistoryItem;
  onSelect: () => void;
  isSelected: boolean;
}

const HistoryListItem: React.FC<HistoryListItemProps> = ({
  item,
  onSelect,
  isSelected,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const itemBgStyle = { backgroundColor: themeColors.surface };
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
          <Ionicons name={item.iconName} size={16} color={themeColors.primary} />
          <Text style={[styles.itemTitle, { color: themeColors.text.primary }]}>
            {item.title}
          </Text>
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: themeColors.primary }]}>
              <Ionicons name="checkmark" size={12} color={themeColors.text.inverse} />
            </View>
          )}
        </View>
        {item.dateRange && (
          <Text style={[styles.itemDateRange, { color: themeColors.text.secondary }]}>
            {item.dateRange}
          </Text>
        )}
      </View>

      {item.summary && (
        <Text
          style={[styles.itemSummary, { color: themeColors.text.secondary }]}
          numberOfLines={2}
        >
          {item.summary}
        </Text>
      )}

      <View style={styles.itemFooter}>
        <View style={styles.itemMeta}>
          <Ionicons name="calendar-outline" size={12} color={themeColors.text.secondary} />
          <Text style={[styles.itemMetaText, { color: themeColors.text.secondary }]}>
            {item.entryCount}日分
          </Text>
        </View>
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={[styles.patternTags, { borderTopColor: themeColors.border }]}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View
              key={index}
              style={[styles.patternTag, { backgroundColor: `${themeColors.primary}15` }]}
            >
              <Text style={[styles.patternTagText, { color: themeColors.primary }]}>
                {tag.title}
              </Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={[styles.morePatterns, { color: themeColors.text.secondary }]}>
              +{item.tags.length - 3}
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
  items,
  onSelectItem,
  currentKey,
  descriptionText = '過去に生成したふりかえりを選択して再度閲覧できます',
  emptyTitle = '履歴がありません',
  emptyDescription = 'ふりかえりを生成すると\nここに表示されます',
  emptyIconName = 'analytics-outline',
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const handleSelectItem = (key: string) => {
    onSelectItem(key);
    onClose();
  };

  const renderItem = ({ item }: { item: InsightHistoryItem }) => (
    <HistoryListItem
      item={item}
      onSelect={() => handleSelectItem(item.key)}
      isSelected={item.key === currentKey}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name={emptyIconName} size={48} color={themeColors.text.secondary} />
      <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
        {emptyTitle}
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
        {emptyDescription}
      </Text>
    </View>
  );

  const descriptionBgStyle = { backgroundColor: themeColors.background };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
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
            {descriptionText}
          </Text>
        </View>

        {/* リスト */}
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      </SafeAreaView>
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
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
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
