import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { DiaryEntry } from '../../utils/storage';
import { useCalendar } from '../../hooks/useCalendar';
import DiaryCard, { formatDateParts } from './DiaryCard';

const CARD_HEIGHT = 110;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface CalendarViewProps {
  selectedYear: number;
  selectedMonth: number;
  filteredDiaries: DiaryEntry[];
  selectedDate: string | null;
  onSelectedDateChange: (date: string | null) => void;
  onNavigateToEntry: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  selectedYear,
  selectedMonth,
  filteredDiaries,
  selectedDate,
  onSelectedDateChange,
  onNavigateToEntry,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

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
        <View style={[styles.selectedCardContainer, { borderTopColor: themeColors.border }]}>
          <DiaryCard
            entry={selectedDiary}
            onPress={() => onNavigateToEntry(selectedDate)}
          />
        </View>
      );
    }

    // 日記がない場合は新規作成ボタンを表示
    return (
      <View style={[styles.selectedCardContainer, { borderTopColor: themeColors.border }]}>
        <View style={[styles.noEntryCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={[styles.dateSection, dateSectionStyle]}>
            <Text style={[styles.weekdayText, { color: themeColors.text.secondary }, dateTextStyle]}>
              {dateParts.weekday}
            </Text>
            <Text style={[styles.dayText, { color: themeColors.text.primary }, dateTextStyle]}>{dateParts.day}</Text>
          </View>
          <View style={styles.noEntryContent}>
            <Text style={[styles.noEntryText, { color: themeColors.text.secondary }]}>この日の記録はありません</Text>
            <TouchableOpacity
              style={[styles.createEntryButton, { backgroundColor: themeColors.primary }]}
              onPress={() => onNavigateToEntry(selectedDate)}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={themeColors.text.inverse}
              />
              <Text style={[styles.createEntryButtonText, { color: themeColors.text.inverse }]}>日記を書く</Text>
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
                { color: themeColors.text.secondary },
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
            const { day, hasDiary, dateString, isToday, isFuture, dayOfWeek } =
              calendarDay;
            const isSelected = dateString === selectedDate;

            return (
              <TouchableOpacity
                key={dayIndex}
                style={styles.dayCell}
                onPress={() => day !== null && handleDayPress(day)}
                disabled={day === null || isFuture}
              >
                {day !== null && (
                  <View
                    style={[
                      styles.dayContent,
                      hasDiary && !isToday && !isSelected && { backgroundColor: `${themeColors.primary}40` },
                      isToday && { backgroundColor: themeColors.primary },
                      isSelected && !isToday && { backgroundColor: themeColors.text.secondary },
                      isFuture && styles.futureDayContent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: themeColors.text.primary },
                        dayOfWeek === 0 && !hasDiary && !isToday && !isSelected && !isFuture && styles.sundayText,
                        dayOfWeek === 6 && !hasDiary && !isToday && !isSelected && !isFuture && styles.saturdayText,
                        hasDiary && !isToday && !isSelected && { color: themeColors.primary, fontFamily: fonts.family.bold },
                        isToday && { color: themeColors.text.inverse, fontFamily: fonts.family.bold },
                        isSelected && !isToday && { color: themeColors.text.inverse, fontFamily: fonts.family.bold },
                        isFuture && { color: themeColors.text.secondary },
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
        <View style={[styles.calendarSummary, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.summaryText, { color: themeColors.text.secondary }]}>この月の記録: {diaryCount}件</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  hasDiaryContent: {},
  todayContent: {},
  selectedContent: {},
  futureDayContent: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  hasDiaryText: {},
  todayText: {},
  selectedText: {},
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
  },
  noEntryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
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
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekdayText: {
    fontSize: 10,
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
    marginBottom: spacing.sm,
    ...textBase,
  },
  createEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.small,
    gap: spacing.xs,
  },
  createEntryButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  calendarSummary: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderWidth,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default CalendarView;
