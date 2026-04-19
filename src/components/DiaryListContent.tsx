import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { spacing, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  DiaryEntry,
  loadDiaryViewMode,
  saveDiaryViewMode,
  type DiaryViewMode,
} from '../utils/storage';
import { useDiaryList } from '../hooks/useDiaryList';
import { useWeeklyInsight } from '../hooks/useWeeklyInsight';
import { useMonthlyInsight } from '../hooks/useMonthlyInsight';
import ScreenHeader from './common/ScreenHeader';
import {
  DiaryCard,
  CalendarView,
  MonthSelector,
  EmptyList,
  YearMonthPickerModal,
} from './diary';
import { CompactInsightButtons } from './insight';

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
  const { isPremium } = useSubscription();
  const [viewMode, setViewMode] = useState<DiaryViewMode>('calendar');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isYearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);

  // 起動時に保存済みの表示モードを復元
  useEffect(() => {
    (async () => {
      const saved = await loadDiaryViewMode();
      setViewMode(saved);
    })();
  }, []);

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
  // isCurrentWeekCached: Firestoreにキャッシュ済み（生成済み）かどうか
  const {
    state: insightState,
    lastWeekEntryCount,
    canGenerateInsight,
    isCurrentWeekCached,
    refreshCacheStatus: refreshWeeklyCacheStatus,
  } = useWeeklyInsight();

  // 月次インサイト
  // isCurrentMonthCached: Firestoreにキャッシュ済み（生成済み）かどうか
  const {
    state: monthlyInsightState,
    currentMonthEntryCount,
    canGenerateInsight: canGenerateMonthlyInsight,
    isCurrentMonthCached,
    refreshCacheStatus: refreshMonthlyCacheStatus,
  } = useMonthlyInsight();

  // 画面フォーカス時にキャッシュ状態を更新（インサイト画面から戻ってきた時など）
  useFocusEffect(
    useCallback(() => {
      refreshWeeklyCacheStatus();
      refreshMonthlyCacheStatus();
    }, [refreshWeeklyCacheStatus, refreshMonthlyCacheStatus])
  );

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
    navigation.navigate('WeeklyInsight', {});
  }, [navigation]);

  const handleNavigateToMonthlyInsight = useCallback(() => {
    if (!isPremium) {
      navigation.navigate('Paywall', { source: 'monthly_insight' });
      return;
    }
    navigation.navigate('MonthlyInsight', {});
  }, [navigation, isPremium]);

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

  const handleViewModeChange = useCallback((mode: DiaryViewMode) => {
    setViewMode(mode);
    saveDiaryViewMode(mode); // fire-and-forget（失敗時は関数内で console.error）
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

      {/* コンパクトなインサイトボタン */}
      <CompactInsightButtons
        weeklyEntryCount={lastWeekEntryCount}
        weeklyState={insightState}
        hasWeeklyInsight={isCurrentWeekCached}
        canGenerateWeekly={canGenerateInsight}
        onWeeklyPress={handleNavigateToWeeklyInsight}
        monthlyEntryCount={currentMonthEntryCount}
        monthlyState={monthlyInsightState}
        hasMonthlyInsight={isCurrentMonthCached}
        canGenerateMonthly={canGenerateMonthlyInsight}
        onMonthlyPress={handleNavigateToMonthlyInsight}
        isPremium={isPremium}
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
        <ScrollView
          style={styles.calendarScrollView}
          contentContainerStyle={styles.calendarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CalendarView
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            filteredDiaries={filteredDiaries}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            onNavigateToEntry={handleNavigateToEntry}
            onDelete={handleDeleteDiary}
          />
        </ScrollView>
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
  },
  listContent: {
    padding: spacing.padding.screen,
    flexGrow: 1,
  },
  calendarScrollView: {
    flex: 1,
  },
  calendarScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
});

export default DiaryListContent;
