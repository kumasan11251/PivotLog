import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, spacing } from '../theme';
import { DiaryEntry } from '../utils/storage';
import { useDiaryList } from '../hooks/useDiaryList';
import ScreenHeader from './common/ScreenHeader';
import {
  DiaryCard,
  CalendarView,
  MonthSelector,
  EmptyList,
} from './diary';

type ViewMode = 'list' | 'calendar';

interface DiaryListContentProps {
  shouldRefresh?: boolean;
}

const DiaryListContent: React.FC<DiaryListContentProps> = ({ shouldRefresh }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  // アニメーションを実行すべきかどうかのフラグ
  const shouldAnimateRef = useRef(true); // 初回表示時はアニメーションあり
  // 詳細画面に遷移したかどうかを追跡
  const navigatedToDetailRef = useRef(false);
  // FlatListを強制的に再レンダリングするためのキー
  const [listKey, setListKey] = useState(0);
  // pull-to-refresh用のローディング状態（isLoadingとは別に管理）
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // 画面フォーカス時にアニメーションをトリガー（詳細画面から戻った時はスキップ）
  useFocusEffect(
    useCallback(() => {
      // 詳細画面から戻ってきた場合はアニメーションをスキップ
      if (navigatedToDetailRef.current) {
        navigatedToDetailRef.current = false;
        shouldAnimateRef.current = false;
        return;
      }
      shouldAnimateRef.current = true;
      setListKey(prev => prev + 1);
    }, [])
  );

  // pull-to-refreshハンドラー
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDiaries();
    setIsRefreshing(false);
  }, [loadDiaries]);

  // 月が変わった時のハンドラー（ラップして使用）
  const handlePreviousMonth = useCallback(() => {
    goToPreviousMonth();
    shouldAnimateRef.current = true;
    setListKey(prev => prev + 1);
  }, [goToPreviousMonth]);

  const handleNextMonth = useCallback(() => {
    goToNextMonth();
    shouldAnimateRef.current = true;
    setListKey(prev => prev + 1);
  }, [goToNextMonth]);

  // ビューモード切り替え時にアニメーションをトリガー
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === 'list' && viewMode === 'calendar') {
      // カレンダーからリストに切り替える時のみアニメーション
      shouldAnimateRef.current = true;
      setListKey(prev => prev + 1);
    }
    setViewMode(mode);
  }, [viewMode]);

  const handleNavigateToDetail = useCallback(
    (date: string) => {
      navigatedToDetailRef.current = true;
      navigation.navigate('DiaryDetail', { date });
    },
    [navigation]
  );

  const handleNavigateToEntry = useCallback(
    (date: string) => {
      navigation.navigate('DiaryEntry', { initialDate: date });
    },
    [navigation]
  );

  const renderDiaryItem = useCallback(
    ({ item, index }: { item: DiaryEntry; index: number }) => {
      // refの値を取得してアニメーションを実行するか決定
      const shouldAnimate = shouldAnimateRef.current;
      // アニメーション実行後はフラグをリセット（最初のアイテムでリセット）
      if (index === 0 && shouldAnimateRef.current) {
        // 次のレンダリングサイクルでリセット
        setTimeout(() => {
          shouldAnimateRef.current = false;
        }, 0);
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
    [handleNavigateToDetail]
  );

  // キーは常にアイテムIDのみを使用（アニメーション制御用のキーを含めない）
  const keyExtractor = useCallback((item: DiaryEntry) => item.id, []);

  const renderEmptyList = useCallback(
    () => (!isLoading ? <EmptyList /> : null),
    [isLoading]
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="記録一覧"
        rightAction={{
          type: 'settings',
          onPress: () => navigation.navigate('Settings'),
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
