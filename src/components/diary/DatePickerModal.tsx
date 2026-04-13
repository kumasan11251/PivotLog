import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useCalendar } from '../../hooks/useCalendar';
import { DiaryEntry, loadDiaryEntriesByMonth } from '../../utils/storage';
import { formatDateToString } from '../../utils/dateUtils';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (event: unknown, date?: Date) => void;
  onClose: () => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onDateChange,
  onClose,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const selectedDateString = useMemo(() => formatDateToString(selectedDate), [selectedDate]);
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(selectedDate.getMonth() + 1);
  const [monthDiaries, setMonthDiaries] = useState<DiaryEntry[]>([]);
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(selectedDateString);
  const [isLoading, setIsLoading] = useState(false);

  // 選択日が外から変わった場合に同期
  useEffect(() => {
    const syncState = setTimeout(() => {
      setInternalSelectedDate(selectedDateString);
      setDisplayYear(selectedDate.getFullYear());
      setDisplayMonth(selectedDate.getMonth() + 1);
    }, 0);

    return () => {
      clearTimeout(syncState);
    };
  }, [selectedDateString, selectedDate]);

  // 月別の日記を取得
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const fetchMonthDiaries = async () => {
      setIsLoading(true);
      try {
        const entries = await loadDiaryEntriesByMonth(displayYear, displayMonth);
        if (isMounted) {
          setMonthDiaries(entries);
        }
      } catch (error) {
        console.error('日記の読み込みに失敗しました:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMonthDiaries();

    return () => {
      isMounted = false;
    };
  }, [visible, displayYear, displayMonth]);

  const { weeks } = useCalendar({
    selectedYear: displayYear,
    selectedMonth: displayMonth,
    filteredDiaries: monthDiaries,
    selectedDate: internalSelectedDate,
    onSelectedDateChange: setInternalSelectedDate,
  });

  const isNextMonthDisabled = useMemo(() => {
    const nextDate = new Date(displayYear, displayMonth, 1);
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return nextDate > thisMonth;
  }, [displayYear, displayMonth]);

  const handleMonthChange = useCallback(
    (delta: number) => {
      const nextDate = new Date(displayYear, displayMonth - 1 + delta, 1);
      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      if (nextDate > thisMonth) return; // 未来の月には進めない

      setDisplayYear(nextDate.getFullYear());
      setDisplayMonth(nextDate.getMonth() + 1);
    },
    [displayYear, displayMonth]
  );

  const handleDayPress = useCallback(
    (day: number | null) => {
      if (day === null) return;
      const nextDate = new Date(displayYear, displayMonth - 1, day, 0, 0, 0, 0);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (nextDate > today) return;

      onDateChange(null, nextDate);
      onClose();
    },
    [displayYear, displayMonth, onClose, onDateChange]
  );

  if (!visible) return null;

  const monthLabel = `${displayYear}年${String(displayMonth).padStart(2, '0')}月`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, { backgroundColor: themeColors.surface }]}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                  <Ionicons name="chevron-back" size={20} color={themeColors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.monthLabel, { color: themeColors.text.primary }]}>{monthLabel}</Text>
                <TouchableOpacity
                  onPress={() => handleMonthChange(1)}
                  disabled={isNextMonthDisabled}
                  style={[isNextMonthDisabled && styles.arrowButtonDisabled]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={
                      isNextMonthDisabled
                        ? themeColors.text.secondary
                        : themeColors.text.primary
                    }
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.weekdayHeader}>
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                  <View key={day} style={styles.weekdayCell}>
                    <Text
                      style={[
                        styles.weekdayText,
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

              {isLoading ? (
                <View style={styles.calendarContainer}>
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator color={themeColors.primary} />
                  </View>
                </View>
              ) : (
                <View style={styles.calendarContainer}>
                  {/* 常に6週分のスペースを確保 */}
                  {Array.from({ length: 6 }).map((_, weekIndex) => {
                    const week = weeks[weekIndex];
                    return (
                      <View key={`week-${weekIndex}`} style={styles.weekRow}>
                        {week ? (
                          week.days.map((calendarDay, dayIndex) => {
                            const { day, hasDiary, dateString, isToday, isFuture, dayOfWeek } = calendarDay;
                            const isSelected = dateString === internalSelectedDate;

                            return (
                              <TouchableOpacity
                                key={`day-${dayIndex}`}
                                style={styles.dayCell}
                                onPress={() => handleDayPress(day)}
                                disabled={day === null || isFuture}
                              >
                                {day !== null && (
                                  <View
                                    style={[
                                      styles.dayContent,
                                      hasDiary && !isToday && !isSelected && { backgroundColor: `${themeColors.primary}33` },
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
                          })
                        ) : (
                          // 空の週行（高さを維持するため）
                          Array.from({ length: 7 }).map((_, dayIndex) => (
                            <View key={`empty-day-${dayIndex}`} style={styles.dayCell} />
                          ))
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity style={[styles.closeButton, { backgroundColor: themeColors.primary }]} onPress={onClose}>
                <Text style={[styles.closeButtonText, { color: themeColors.text.inverse }]}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthLabel: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  weekdayText: {
    fontSize: 11,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calendarContainer: {
    minHeight: 222, // 6週分の高さを固定（37px × 6）
  },
  dayCell: {
    flex: 1,
    height: 37, // aspectRatioの代わりに固定高さ
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  futureDayContent: {
    opacity: 0.3,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  sundayText: {
    color: '#E57373',
  },
  saturdayText: {
    color: '#64B5F6',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    marginTop: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
});

export default DatePickerModal;
