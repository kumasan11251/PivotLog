import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, spacing } from '../theme';
import { DiaryEntry } from '../utils/storage';
import { useDiaryList } from '../hooks/useDiaryList';
import { useDiaryListAnimation } from '../hooks/useDiaryListAnimation';
import ScreenHeader from './common/ScreenHeader';
import {
  DiaryCard,
  CalendarView,
  MonthSelector,
  EmptyList,
} from './diary';

type ViewMode = 'list' | 'calendar';

interface DiaryListContentProps {
  /** 外部からのリフレッシュトリガー */
  shouldRefresh?: boolean;
}

/**
 * 記録一覧画面のメインコンテンツ
 * リスト表示とカレンダー表示を切り替えて日記一覧を表示
 */
const DiaryListContent: React.FC<DiaryListContentProps> = ({ shouldRefresh }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 日記データの取得・管理
  const {
    isLoading,
    selectedYear,
    selectedMonth,
    filteredDiaries,
    isNextDisabled,
    selectedDate,
    setSelectedDate,
    goToPreviousMonth,
    goToNextMonth,
    loadDiaries,
  } = useDiaryList({ shouldRefresh });

  // カードアニメーションの制御
  const {
    listKey,
    getShouldAnimate,
    markNavigatedToDetail,
    triggerMonthChangeAnimation,
    triggerViewModeChangeAnimation,
    resetAnimationFlag,
  } = useDiaryListAnimation();

  // ========================================
  // ナビゲーションハンドラー
  // ========================================

  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleNavigateToDetail = useCallback(
    (date: string) => {
      markNavigatedToDetail();
      navigation.navigate('DiaryDetail', { date });
    },
    [navigation, markNavigatedToDetail]
  );

  const handleNavigateToEntry = useCallback(
    (date: string) => {
      navigation.navigate('DiaryEntry', { initialDate: date });
    },
    [navigation]
  );

  // ========================================
  // 月選択ハンドラー
  // ========================================

  const handlePreviousMonth = useCallback(() => {
    goToPreviousMonth();
    triggerMonthChangeAnimation();
  }, [goToPreviousMonth, triggerMonthChangeAnimation]);

  const handleNextMonth = useCallback(() => {
    goToNextMonth();
    triggerMonthChangeAnimation();
  }, [goToNextMonth, triggerMonthChangeAnimation]);

  // ========================================
  // ビューモード切り替え
  // ========================================

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    // カレンダーからリストに切り替える時のみアニメーション
    if (mode === 'list' && viewMode === 'calendar') {
      triggerViewModeChangeAnimation();
    }
    setViewMode(mode);
  }, [viewMode, triggerViewModeChangeAnimation]);

  // ========================================
  // Pull-to-refresh
  // ========================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDiaries();
    setIsRefreshing(false);
  }, [loadDiaries]);

  // ========================================
  // リストレンダリング
  // ========================================

  const renderDiaryItem = useCallback(
    ({ item, index }: { item: DiaryEntry; index: number }) => {
      const shouldAnimate = getShouldAnimate();

      // 最初のアイテムレンダリング時にフラグをリセット
      if (index === 0 && shouldAnimate) {
        resetAnimationFlag();
      }

      return (
        <DiaryCard
          entry={item}
          onPress={() => handleNavigateToDetail(item.date)}
          index={index}
          shouldAnimate={shouldAnimate}
        />
      );
    },
    [getShouldAnimate, resetAnimationFlag, handleNavigateToDetail]
  );

  const keyExtractor = useCallback((item: DiaryEntry) => item.id, []);

  const renderEmptyList = useCallback(
    () => (!isLoading ? <EmptyList /> : null),
    [isLoading]
  );

  // ========================================
  // レンダリング
  // ========================================

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="記録一覧"
        rightAction={{
          type: 'settings',
          onPress: handleNavigateToSettings,
        }}
      />

      <MonthSelector
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        viewMode={viewMode}
        isNextDisabled={isNextDisabled}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onViewModeChange={handleViewModeChange}
      />

      {viewMode === 'list' ? (
        <FlatList
          key={listKey}
          data={filteredDiaries}
          renderItem={renderDiaryItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <CalendarView
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          filteredDiaries={filteredDiaries}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          onNavigateToDetail={handleNavigateToDetail}
          onNavigateToEntry={handleNavigateToEntry}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.padding.screen,
    flexGrow: 1,
  },
});

export default DiaryListContent;
