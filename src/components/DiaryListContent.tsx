import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

  const handleNavigateToDetail = useCallback(
    (date: string) => {
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
    ({ item }: { item: DiaryEntry }) => (
      <DiaryCard
        entry={item}
        onPress={() => handleNavigateToDetail(item.date)}
      />
    ),
    [handleNavigateToDetail]
  );

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
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <FlatList
          data={filteredDiaries}
          renderItem={renderDiaryItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshing={isLoading}
          onRefresh={loadDiaries}
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
