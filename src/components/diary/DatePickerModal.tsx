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
import { colors, fonts, spacing, textBase } from '../../theme';
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
            <View style={styles.content}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                  <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity onPress={() => handleMonthChange(1)}>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekdayHeader}>
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                  <View key={day} style={styles.weekdayCell}>
                    <Text
                      style={[
                        styles.weekdayText,
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
                <View style={styles.loaderContainer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                weeks.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} style={styles.weekRow}>
                    {week.days.map((calendarDay, dayIndex) => {
                      const { day, hasDiary, dateString, isToday, dayOfWeek } = calendarDay;
                      const isSelected = dateString === internalSelectedDate;

                      return (
                        <TouchableOpacity
                          key={`day-${dayIndex}`}
                          style={styles.dayCell}
                          onPress={() => handleDayPress(day)}
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
                ))
              )}

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>閉じる</Text>
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
    padding: spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthLabel: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    ...textBase,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
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
  loaderContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fonts.size.body,
    color: colors.text.inverse,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
});

export default DatePickerModal;
