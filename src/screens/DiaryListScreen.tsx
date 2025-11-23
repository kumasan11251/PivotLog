import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';
import { loadDiaryEntries, DiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';

interface DiaryListScreenProps {
  onNavigateToDiary: (date?: string) => void;
  onBack?: () => void;
}

const DiaryListScreen: React.FC<DiaryListScreenProps> = ({ onNavigateToDiary, onBack }) => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDiaries();
  }, []);

  const loadDiaries = async () => {
    setIsLoading(true);
    try {
      const entries = await loadDiaryEntries();
      setDiaries(entries);
    } catch (error) {
      console.error('日記の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  const renderDiaryItem = ({ item }: { item: DiaryEntry }) => {
    const hasContent = item.goodTime || item.wastedTime || item.tomorrow;

    return (
      <TouchableOpacity
        style={styles.diaryItem}
        onPress={() => onNavigateToDiary(item.date)}
      >
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>

        <View style={styles.contentPreview}>
          {item.goodTime && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>{DIARY_QUESTIONS.goodTime.label}</Text>
              <Text style={styles.previewText}>
                {item.goodTime}
              </Text>
            </View>
          )}

          {item.wastedTime && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>{DIARY_QUESTIONS.wastedTime.label}</Text>
              <Text style={styles.previewText}>
                {item.wastedTime}
              </Text>
            </View>
          )}

          {item.tomorrow && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>{DIARY_QUESTIONS.tomorrow.label}</Text>
              <Text style={styles.previewText}>
                {item.tomorrow}
              </Text>
            </View>
          )}

          {!hasContent && (
            <Text style={styles.emptyText}>記録なし</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>まだ記録がありません</Text>
      <Text style={styles.emptyDescription}>
        日記を記録して、毎日を振り返りましょう
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>記録一覧</Text>
      </View>

      <FlatList
        data={diaries}
        renderItem={renderDiaryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        refreshing={isLoading}
        onRefresh={loadDiaries}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => onNavigateToDiary()}
      >
        <Text style={styles.addButtonText}>+ 新しい記録</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
  },
  headerTitle: {
    fontSize: fonts.size.heading,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  listContent: {
    padding: spacing.padding.screen,
  },
  diaryItem: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dateContainer: {
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.medium,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
  },
  contentPreview: {
    gap: spacing.xs,
  },
  previewSection: {
    marginTop: spacing.xs,
  },
  previewLabel: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
  },
  previewText: {
    fontSize: fonts.size.label,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  emptyText: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    margin: spacing.padding.screen,
    paddingVertical: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.semibold,
    color: '#FFFFFF',
    fontFamily: fonts.family.bold,
  },
});

export default DiaryListScreen;
