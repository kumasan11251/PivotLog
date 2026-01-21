import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface YearMonthPickerModalProps {
  visible: boolean;
  initialYear: number;
  initialMonth: number;
  onClose: () => void;
  onConfirm: (year: number, month: number) => void;
}

const MIN_YEAR = 1900;

const YearMonthPickerModal: React.FC<YearMonthPickerModalProps> = ({
  visible,
  initialYear,
  initialMonth,
  onClose,
  onConfirm,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [{ year, month }, setSelection] = useState({ year: initialYear, month: initialMonth });
  const { currentYear, currentMonth } = useMemo(() => {
    const now = new Date();
    return { currentYear: now.getFullYear(), currentMonth: now.getMonth() + 1 };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    const timer = setTimeout(() => {
      setSelection({ year: initialYear, month: initialMonth });
    }, 0);

    return () => clearTimeout(timer);
  }, [visible, initialYear, initialMonth]);

  const isFutureMonth = useCallback(
    (targetYear: number, targetMonth: number) => {
      if (targetYear > currentYear) return true;
      if (targetYear === currentYear && targetMonth > currentMonth) return true;
      return false;
    },
    [currentYear, currentMonth]
  );

  const clampToPast = useCallback(
    (nextYear: number, nextMonth: number) => {
      let safeYear = Math.max(MIN_YEAR, nextYear);
      let safeMonth = nextMonth;

      if (isFutureMonth(safeYear, safeMonth)) {
        safeYear = currentYear;
        safeMonth = Math.min(safeMonth, currentMonth);
      }

      return { safeYear, safeMonth };
    },
    [currentMonth, currentYear, isFutureMonth]
  );

  const handleYearChange = useCallback(
    (delta: number) => {
      const { safeYear, safeMonth } = clampToPast(year + delta, month);
      setSelection({ year: safeYear, month: safeMonth });
    },
    [clampToPast, month, year]
  );

  const handleSelectMonth = useCallback(
    (selectedMonth: number) => {
      if (isFutureMonth(year, selectedMonth)) {
        return;
      }

      // 月選択で即確定してモーダルを閉じる
      onConfirm(year, selectedMonth);
      onClose();
    },
    [isFutureMonth, year, onConfirm, onClose]
  );

  const nextYearDisabled = isFutureMonth(year + 1, month);

  if (!visible) return null;

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
                <Text style={[styles.title, { color: themeColors.text.primary }]}>年月を選択</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={themeColors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.yearRow}>
                <TouchableOpacity onPress={() => handleYearChange(-1)} style={[styles.yearButton, { backgroundColor: themeColors.background }]}>
                  <Ionicons name="chevron-back" size={18} color={themeColors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.yearText, { color: themeColors.text.primary }]}>{year}年</Text>
                <TouchableOpacity
                  onPress={() => handleYearChange(1)}
                  style={[styles.yearButton, { backgroundColor: themeColors.background }]}
                  disabled={nextYearDisabled}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={nextYearDisabled ? themeColors.text.secondary : themeColors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.monthGrid}>
                {Array.from({ length: 12 }).map((_, index) => {
                  const monthNumber = index + 1;
                  const isDisabled = isFutureMonth(year, monthNumber);
                  const isSelected = monthNumber === month;

                  return (
                    <TouchableOpacity
                      key={`month-${monthNumber}`}
                      style={[
                        styles.monthCell,
                        { backgroundColor: themeColors.background },
                        isSelected && { backgroundColor: themeColors.primary },
                        isDisabled && { backgroundColor: themeColors.surface, borderWidth: spacing.borderWidth, borderColor: themeColors.border },
                      ]}
                      onPress={() => handleSelectMonth(monthNumber)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.monthText,
                          { color: themeColors.text.primary },
                          isSelected && { color: themeColors.text.inverse },
                          isDisabled && { color: themeColors.text.secondary },
                        ]}
                      >
                        {monthNumber}月
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: themeColors.primary }]} onPress={onClose}>
                  <Text style={[styles.closeButtonText, { color: themeColors.text.inverse }]}>閉じる</Text>
                </TouchableOpacity>
              </View>
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
    maxWidth: 300,
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
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  yearButton: {
    padding: spacing.xs,
    borderRadius: spacing.borderRadius.small,
  },
  yearText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    marginHorizontal: spacing.md,
    ...textBase,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthCell: {
    width: '23%',
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
  },
  monthText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.small,
  },
  closeButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
});

export default YearMonthPickerModal;
