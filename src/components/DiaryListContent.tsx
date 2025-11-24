import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing } from '../theme';
import { loadDiaryEntries, DiaryEntry } from '../utils/storage';

const DiaryListContent: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    loadDiaries();
  }, []);

  // タブが表示されるたびにデータを再読み込み
  useFocusEffect(
    useCallback(() => {
      loadDiaries();
    }, [])
  );

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  const renderDiaryItem = ({ item }: { item: DiaryEntry }) => {
    return (
      <TouchableOpacity
        style={styles.diaryItem}
        onPress={() => navigation.navigate('DiaryDetail', { date: item.date })}
      >
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        <Text style={styles.arrowIcon}>›</Text>
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
    <View style={styles.container}>
      <View style={styles.header}>
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
    </View>
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
  headerTitle: {
    fontSize: fonts.size.heading,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
  },
  listContent: {
    padding: spacing.padding.screen,
    flexGrow: 1,
  },
  diaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dateText: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.medium,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    flex: 1,
  },
  arrowIcon: {
    fontSize: fonts.size.title,
    color: colors.text.secondary,
    fontWeight: fonts.weight.light,
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
});

export default DiaryListContent;
