import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';
import { DiaryEntry } from '../../utils/storage';
import { useCalendar } from '../../hooks/useCalendar';
import DiaryCard, { formatDateParts } from './DiaryCard';

const CARD_HEIGHT = 140;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface CalendarViewProps {
  selectedYear: number;
  selectedMonth: number;
  filteredDiaries: DiaryEntry[];
  selectedDate: string | null;
  onSelectedDateChange: (date: string | null) => void;
  onNavigateToDetail: (date: string) => void;
  onNavigateToEntry: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  selectedYear,
  selectedMonth,
  filteredDiaries,
  selectedDate,
  onSelectedDateChange,
  onNavigateToDetail,
  onNavigateToEntry,
}) => {
  const { weeks, selectedDiary, handleDayPress, diaryCount } =
    useCalendar({
      selectedYear,
      selectedMonth,
      filteredDiaries,
      selectedDate,
      onSelectedDateChange,
    });

  const renderSelectedDateCard = () => {
    if (!selectedDate) return null;

    const dateParts = formatDateParts(selectedDate);
    const dateSectionStyle =
      dateParts.dayOfWeek === 0
        ? styles.dateSectionSunday
        : dateParts.dayOfWeek === 6
          ? styles.dateSectionSaturday
          : null;
    const dateTextStyle =
      dateParts.dayOfWeek === 0
        ? styles.sundayText
        : dateParts.dayOfWeek === 6
          ? styles.saturdayText
          : null;

    if (selectedDiary) {
      return (
        <View style={styles.selectedCardContainer}>
          <DiaryCard
            entry={selectedDiary}
            onPress={() => onNavigateToDetail(selectedDate)}
          />
        </View>
      );
    }

    // 日記がない場合は新規作成ボタンを表示
    return (
      <View style={styles.selectedCardContainer}>
        <View style={styles.noEntryCard}>
          <View style={[styles.dateSection, dateSectionStyle]}>
            <Text style={[styles.weekdayText, dateTextStyle]}>
              {dateParts.weekday}
            </Text>
            <Text style={[styles.dayText, dateTextStyle]}>{dateParts.day}</Text>
          </View>
          <View style={styles.noEntryContent}>
            <Text style={styles.noEntryText}>この日の記録はありません</Text>
            <TouchableOpacity
              style={styles.createEntryButton}
              onPress={() => onNavigateToEntry(selectedDate)}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.text.inverse}
              />
              <Text style={styles.createEntryButtonText}>日記を書く</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 曜日ヘッダー */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayHeaderText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* カレンダーグリッド */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.days.map((calendarDay, dayIndex) => {
            const { day, hasDiary, dateString, isToday, dayOfWeek } =
              calendarDay;
            const isSelected = dateString === selectedDate;

            return (
              <TouchableOpacity
                key={dayIndex}
                style={styles.dayCell}
                onPress={() => day !== null && handleDayPress(day)}
                disabled={day === null}
              >
                {day !== null && (
                  <View
                    style={[
                      styles.dayContent,
                      hasDiary && !isToday && !isSelected && styles.hasDiaryContent,
                      isToday && styles.todayContent,
                      isSelected && !isToday && styles.selectedContent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        dayOfWeek === 0 && !hasDiary && !isToday && !isSelected && styles.sundayText,
                        dayOfWeek === 6 && !hasDiary && !isToday && !isSelected && styles.saturdayText,
                        hasDiary && !isToday && !isSelected && styles.hasDiaryText,
                        isToday && styles.todayText,
                        isSelected && !isToday && styles.selectedText,
                      ]}
                    >
                      {day}
                    </Text>
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
          <Text style={styles.summaryText}>この月の記録: {diaryCount}件</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  hasDiaryContent: {
    backgroundColor: 'rgba(139, 157, 131, 0.25)',
  },
  todayContent: {
    backgroundColor: colors.primary,
  },
  selectedContent: {
    backgroundColor: colors.text.secondary,
  },
  dayNumber: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    ...textBase,
  },
  hasDiaryText: {
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  todayText: {
    color: colors.text.inverse,
    fontFamily: fonts.family.bold,
  },
  selectedText: {
    color: colors.text.inverse,
    fontFamily: fonts.family.bold,
  },
  sundayText: {
    color: '#E57373',
  },
  saturdayText: {
    color: '#64B5F6',
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
  dateSection: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  dateSectionSunday: {},
  dateSectionSaturday: {},
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

export default CalendarView;
