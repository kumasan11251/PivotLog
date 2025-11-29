import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { colors, fonts, spacing, textBase } from '../theme';
import { loadDiaryEntries, DiaryEntry } from '../utils/storage';
import { DIARY_QUESTIONS } from '../constants/diary';
import ScreenHeader from './common/ScreenHeader';

const CARD_HEIGHT = 140; // 固定カードの高さ

type ViewMode = 'list' | 'calendar';

interface DiaryListContentProps {
  shouldRefresh?: boolean;
}

const DiaryListContent: React.FC<DiaryListContentProps> = ({ shouldRefresh }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 選択した月の日記をフィルタリング
  const filteredDiaries = useMemo(() => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}`;
    return diaries.filter((diary) => diary.date.startsWith(prefix));
  }, [diaries, selectedYear, selectedMonth]);

  // 前月に移動
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // 翌月に移動
  const goToNextMonth = () => {
    const now = new Date();
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    if (isCurrentMonth) return; // 未来には進めない

    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // 翌月ボタンが無効かどうか
  const isNextDisabled = useMemo(() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  }, [selectedYear, selectedMonth]);

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

  useEffect(() => {
    if (shouldRefresh) {
      loadDiaries();
    }
  }, [shouldRefresh]);

  const formatDateParts = (dateString: string): { day: string; weekday: string; dayOfWeek: number } => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = date.getDay();
    return {
      day: String(day),
      weekday: weekdays[dayOfWeek],
      dayOfWeek,
    };
  };

  const getDateSectionStyle = (dayOfWeek: number) => {
    if (dayOfWeek === 0) return styles.dateSectionSunday;
    if (dayOfWeek === 6) return styles.dateSectionSaturday;
    return null;
  };

  const getDateTextStyle = (dayOfWeek: number) => {
    if (dayOfWeek === 0) return styles.sundayText;
    if (dayOfWeek === 6) return styles.saturdayText;
    return null;
  };

  const getFilledQuestions = (item: DiaryEntry): { label: string; content: string }[] => {
    const questions: { label: string; content: string }[] = [];
    const questionKeys: (keyof typeof DIARY_QUESTIONS)[] = ['goodTime', 'wastedTime', 'tomorrow'];

    for (const key of questionKeys) {
      const content = item[key];
      if (content && content.trim()) {
        questions.push({
          label: DIARY_QUESTIONS[key].label,
          content: content.trim(),
        });
      }
    }

    // 入力されたすべての質問を返す（カードの高さで自然にクリップ）
    return questions;
  };

  const renderDiaryItem = ({ item }: { item: DiaryEntry }) => {
    const dateParts = formatDateParts(item.date);
    const filledQuestions = getFilledQuestions(item);
    const dateSectionStyle = getDateSectionStyle(dateParts.dayOfWeek);
    const dateTextStyle = getDateTextStyle(dateParts.dayOfWeek);

    return (
      <TouchableOpacity
        style={styles.diaryItem}
        onPress={() => navigation.navigate('DiaryDetail', { date: item.date })}
      >
        <View style={[styles.dateSection, dateSectionStyle]}>
          <Text style={[styles.weekdayText, dateTextStyle]}>{dateParts.weekday}</Text>
          <Text style={[styles.dayText, dateTextStyle]}>{dateParts.day}</Text>
        </View>
        <View style={styles.contentWrapper}>
          <View style={styles.contentSection}>
            {filledQuestions.length > 0 ? (
              filledQuestions.map((q, index) => (
                <View key={index} style={styles.questionItem}>
                  <Text style={styles.questionLabel}>{q.label}</Text>
                  <Text style={styles.questionContent}>{q.content}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyContent}>内容がありません</Text>
            )}
          </View>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
            style={styles.fadeOverlay}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>この月の記録はありません</Text>
      <Text style={styles.emptyDescription}>
        日記を記録して、毎日を振り返りましょう
      </Text>
    </View>
  );

  // カレンダービュー用のデータ生成
  const calendarData = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = 日曜日

    // 日記がある日のセット
    const diaryDates = new Set(
      filteredDiaries.map((d) => parseInt(d.date.split('-')[2], 10))
    );

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // 最初の週の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // 日にちを埋める
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 最後の週の空白
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return { weeks, diaryDates };
  }, [selectedYear, selectedMonth, filteredDiaries]);

  // 選択された日付の日記を取得
  const selectedDiary = useMemo(() => {
    if (!selectedDate) return null;
    return filteredDiaries.find((d) => d.date === selectedDate) || null;
  }, [selectedDate, filteredDiaries]);

  const handleCalendarDayPress = (day: number) => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;

    // 同じ日付を再度タップした場合は選択解除
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  };

  // 月を変更したら選択日付をリセット
  useEffect(() => {
    setSelectedDate(null);
  }, [selectedYear, selectedMonth]);

  const renderSelectedDateCard = () => {
    if (!selectedDate) return null;

    const dateParts = formatDateParts(selectedDate);
    const dateSectionStyle = getDateSectionStyle(dateParts.dayOfWeek);
    const dateTextStyle = getDateTextStyle(dateParts.dayOfWeek);

    if (selectedDiary) {
      const filledQuestions = getFilledQuestions(selectedDiary);
      return (
        <View style={styles.selectedCardContainer}>
          <TouchableOpacity
            style={styles.diaryItem}
            onPress={() => navigation.navigate('DiaryDetail', { date: selectedDate })}
          >
            <View style={[styles.dateSection, dateSectionStyle]}>
              <Text style={[styles.weekdayText, dateTextStyle]}>{dateParts.weekday}</Text>
              <Text style={[styles.dayText, dateTextStyle]}>{dateParts.day}</Text>
            </View>
            <View style={styles.contentWrapper}>
              <View style={styles.contentSection}>
                {filledQuestions.length > 0 ? (
                  filledQuestions.map((q, index) => (
                    <View key={index} style={styles.questionItem}>
                      <Text style={styles.questionLabel}>{q.label}</Text>
                      <Text style={styles.questionContent}>{q.content}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyContent}>内容がありません</Text>
                )}
              </View>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                style={styles.fadeOverlay}
              />
            </View>
          </TouchableOpacity>
        </View>
      );
    } else {
      // 日記がない場合は新規作成ボタンを表示
      return (
        <View style={styles.selectedCardContainer}>
          <View style={styles.noEntryCard}>
            <View style={[styles.dateSection, dateSectionStyle]}>
              <Text style={[styles.weekdayText, dateTextStyle]}>{dateParts.weekday}</Text>
              <Text style={[styles.dayText, dateTextStyle]}>{dateParts.day}</Text>
            </View>
            <View style={styles.noEntryContent}>
              <Text style={styles.noEntryText}>この日の記録はありません</Text>
              <TouchableOpacity
                style={styles.createEntryButton}
                onPress={() => navigation.navigate('DiaryEntry', { initialDate: selectedDate })}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.text.inverse} />
                <Text style={styles.createEntryButtonText}>日記を書く</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
  };

  const renderCalendarView = () => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const { weeks, diaryDates } = calendarData;

    return (
      <View style={styles.calendarContainer}>
        {/* 曜日ヘッダー */}
        <View style={styles.weekdayHeader}>
          {weekdays.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text style={[
                styles.weekdayHeaderText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* カレンダーグリッド */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const hasDiary = day !== null && diaryDates.has(day);
              const dayStr = day !== null ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const isSelected = dayStr === selectedDate;
              const isToday =
                day !== null &&
                selectedYear === new Date().getFullYear() &&
                selectedMonth === new Date().getMonth() + 1 &&
                day === new Date().getDate();

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={styles.dayCell}
                  onPress={() => day !== null && handleCalendarDayPress(day)}
                  disabled={day === null}
                >
                  {day !== null && (
                    <View style={[
                      styles.dayContent,
                      isToday && styles.todayContent,
                      isSelected && !isToday && styles.selectedContent,
                    ]}>
                      <Text style={[
                        styles.dayNumber,
                        dayIndex === 0 && styles.sundayText,
                        dayIndex === 6 && styles.saturdayText,
                        isToday && styles.todayText,
                        isSelected && !isToday && styles.selectedText,
                      ]}>
                        {day}
                      </Text>
                      {hasDiary && !isToday && !isSelected && (
                        <View style={styles.diaryMarker} />
                      )}
                      {hasDiary && (isToday || isSelected) && (
                        <View style={styles.diaryMarkerLight} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* 選択された日付のカード表示 */}
        {renderSelectedDateCard()}

        {/* この月の記録サマリー */}
        {!selectedDate && (
          <View style={styles.calendarSummary}>
            <Text style={styles.summaryText}>
              この月の記録: {filteredDiaries.length}件
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderMonthSelector = () => (
    <View style={styles.monthSelectorContainer}>
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {selectedYear}年{selectedMonth}月
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.arrowButton}
          disabled={isNextDisabled}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isNextDisabled ? colors.text.secondary : colors.text.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={20}
            color={viewMode === 'list' ? colors.text.inverse : colors.text.secondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={viewMode === 'calendar' ? colors.text.inverse : colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
    </View>
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

      {renderMonthSelector()}

      {viewMode === 'list' ? (
        <FlatList
          data={filteredDiaries}
          renderItem={renderDiaryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!isLoading ? renderEmptyList : null}
          refreshing={isLoading}
          onRefresh={loadDiaries}
        />
      ) : (
        renderCalendarView()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: spacing.borderWidth,
    borderBottomColor: colors.border,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    padding: spacing.xs,
  },
  monthText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.md,
    minWidth: 100,
    textAlign: 'center',
    ...textBase,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.small,
    padding: 2,
  },
  toggleButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  listContent: {
    padding: spacing.padding.screen,
    flexGrow: 1,
  },
  diaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  dateSection: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  dateSectionSunday: {
    // 背景色なし
  },
  dateSectionSaturday: {
    // 背景色なし
  },
  dayText: {
    fontSize: 20,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekdayText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
    ...textBase,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
  },
  contentSection: {
    paddingVertical: spacing.xs,
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
  },
  questionItem: {
    marginBottom: spacing.sm,
  },
  questionLabel: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    backgroundColor: 'rgba(139, 157, 131, 0.15)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    ...textBase,
  },
  questionContent: {
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    ...textBase,
  },
  emptyContent: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    fontStyle: 'italic',
    ...textBase,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
    ...textBase,
  },
  emptyDescription: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
  // カレンダービュー用スタイル
  calendarContainer: {
    flex: 1,
    padding: spacing.padding.screen,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayHeaderText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
    ...textBase,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.borderRadius.small,
  },
  todayContent: {
    backgroundColor: colors.primary,
  },
  dayNumber: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    ...textBase,
  },
  todayText: {
    color: colors.text.inverse,
    fontFamily: fonts.family.bold,
  },
  sundayText: {
    color: '#E57373',
  },
  saturdayText: {
    color: '#64B5F6',
  },
  diaryMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  diaryMarkerLight: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  selectedContent: {
    backgroundColor: colors.text.secondary,
  },
  selectedText: {
    color: colors.text.inverse,
    fontFamily: fonts.family.bold,
  },
  selectedCardContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderWidth,
    borderTopColor: colors.border,
  },
  noEntryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  noEntryContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  noEntryText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    ...textBase,
  },
  createEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.small,
    gap: spacing.xs,
  },
  createEntryButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    color: colors.text.inverse,
    ...textBase,
  },
  calendarSummary: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderWidth,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    ...textBase,
  },
});

export default DiaryListContent;
