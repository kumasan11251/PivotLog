import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, spacing, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { DiaryEntry } from '../utils/storage';
import { useDiaryList } from '../hooks/useDiaryList';
import { useWeeklyInsight } from '../hooks/useWeeklyInsight';
import ScreenHeader from './common/ScreenHeader';
import {
  DiaryCard,
  CalendarView,
  MonthSelector,
  EmptyList,
  YearMonthPickerModal,
} from './diary';
import { WeeklyInsightBanner } from './insight';

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
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isYearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);

  // 日記データの取得・管理
  const {
    isLoading,
    selectedYear,
    selectedMonth,
    filteredDiaries,
    isNextDisabled,
    selectedDate,
    setSelectedDate,
    setYearMonth,
    goToPreviousMonth,
    goToNextMonth,
    loadDiaries,
    removeDiaryFromCache,
  } = useDiaryList({ shouldRefresh });

  // 週次インサイト
  const {
    insight,
    state: insightState,
    lastWeekEntryCount,
    canGenerateInsight,
  } = useWeeklyInsight();

  // ========================================
  // ナビゲーションハンドラー
  // ========================================

  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleNavigateToEntry = useCallback(
    (date: string) => {
      navigation.navigate('DiaryEntry', { initialDate: date });
    },
    [navigation]
  );

  const handleNavigateToWeeklyInsight = useCallback(() => {
    // 週選択機能があるので常にナビゲート可能
    navigation.navigate('WeeklyInsight', {});
  }, [navigation]);

  // 日記削除ハンドラー
  const handleDeleteDiary = useCallback(
    (id: string) => {
      removeDiaryFromCache(id);
    },
    [removeDiaryFromCache]
  );

  // ========================================
  // 月選択ハンドラー
  // ========================================

  const handlePreviousMonth = useCallback(() => {
    goToPreviousMonth();
  }, [goToPreviousMonth]);

  const handleNextMonth = useCallback(() => {
    goToNextMonth();
  }, [goToNextMonth]);

  const handleOpenYearMonthPicker = useCallback(() => {
    setYearMonthPickerVisible(true);
  }, []);

  const handleCloseYearMonthPicker = useCallback(() => {
    setYearMonthPickerVisible(false);
  }, []);

  const handleConfirmYearMonth = useCallback(
    (year: number, month: number) => {
      setYearMonth(year, month);
      setYearMonthPickerVisible(false);
    },
    [setYearMonth]
  );

  // ========================================
  // ビューモード切り替え
  // ========================================

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

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
    ({ item }: { item: DiaryEntry }) => {
      return (
        <DiaryCard
          entry={item}
          onPress={() => handleNavigateToEntry(item.date)}
          onDelete={handleDeleteDiary}
        />
      );
    },
    [handleNavigateToEntry, handleDeleteDiary]
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
        onMonthPress={handleOpenYearMonthPicker}
      />

      {/* 週次インサイトバナー */}
      <WeeklyInsightBanner
        entryCount={lastWeekEntryCount}
        state={insightState}
        hasInsight={!!insight}
        canGenerate={canGenerateInsight}
        summary={insight?.summary}
        onPress={handleNavigateToWeeklyInsight}
      />

      {viewMode === 'list' ? (
        <FlatList
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
          onNavigateToEntry={handleNavigateToEntry}
        />
      )}

      <YearMonthPickerModal
        visible={isYearMonthPickerVisible}
        initialYear={selectedYear}
        initialMonth={selectedMonth}
        onClose={handleCloseYearMonthPicker}
        onConfirm={handleConfirmYearMonth}
      />
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
